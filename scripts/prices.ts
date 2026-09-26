// Weekly price fetch: `node scripts/prices.ts`. Writes src/lib/prices.json, which the app imports at build time.
// Ordinary price per ingredient and chain (Willys, ICA, Coop), plus this week's offers per Umeå store. No worker:
// .github/workflows/prices.yml runs it and redeploys.
// Fetched pages are data only: ICA's embedded object is parsed as JSON after stripping two JS constructs, never evaluated.
import { writeFileSync } from 'node:fs';
import { BUY, type IngrId } from '../src/lib/data.ts';
import { CHAINS, matches, type Chain, type Offer, type Prices, type Shelf, type Store } from '../src/lib/price.ts';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';
const WILLYS = [[2203, 'Willys Ersboda'], [2276, 'Willys Umeå Syd'], [2333, 'Willys Klockarbäcken'], [2872, 'Willys Hemma Rådhusesplanaden']] as const;
const ICA = [
  ['maxi-ica-stormarknad-umea-1003828', 'Maxi ICA Stormarknad'], ['ica-kvantum-ersboda-1106008', 'ICA Kvantum Ersboda'],
  ['ica-kvantum-kronoparken-1004229', 'ICA Kvantum Kronoparken'], ['ica-kvantum-mariehem-1003786', 'ICA Kvantum Mariehem'],
  ['ica-supermarket-alidhem-1004111', 'ICA Supermarket Ålidhem'], ['ica-supermarket-boleang-1004302', 'ICA Supermarket Boleäng'],
  ['ica-supermarket-city-umea-1003465', 'ICA Supermarket City'], ['ica-supermarket-teg-1003487', 'ICA Supermarket Teg'],
] as const;
const COOP = [[232400, 'Stora Coop Avion'], [231400, 'Stora Coop Ersboda'], [235660, 'Stora Coop Tomtebo'], [235560, 'Coop City Umeå']] as const;

// "59:90 kr/kg", "87,90 kr", "72:73-100:00/kg" -> first number.
const num = (s: string | null | undefined) => {
  const m = String(s ?? '').replace(/\s/g, '').match(/\d+(?:[.,:]\d+)?/);
  return m ? Number(m[0].replace(/[,:]/, '.')) : NaN;
};
const perKg = (s: string | null | undefined) => (/\/(kg|l)\b|kr\/kg/.test(String(s)) ? num(s) : NaN);
const r2 = (v: number) => Math.round(v * 100) / 100;
const ok = (v: number) => Number.isFinite(v) && v > 0;

async function get(url: string, json = true): Promise<any> {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html' } });
    if (r.ok) return json ? r.json() : r.text();
    if (i >= 2 || r.status < 500) throw new Error(`${r.status} ${url}`);
    await new Promise((f) => setTimeout(f, 2000));
  }
}

const ids = Object.keys(BUY) as IngrId[];
const match = (name: string) => ids.filter((id) => matches(id, name));

// ---------- Ordinary prices, per chain ----------
// Willys: national prices. Coop: coop.se's online shop (the Umeå stores have none), for every Coop store.
// ICA: none. Its online shop sits behind an AWS WAF bot challenge (tested 2026-09-26), which we do not work around, so ICA
// stores only contribute offers and can't be priced as a whole basket.
// Coop's API wants the public frontend keys coop.se ships in its own page config; read from the page each run, never stored.
const home: string = await get('https://www.coop.se/', false);
const coopKey = home.match(/"dkeKey":"([0-9a-f]{32})"/)?.[1];
const coopSearchKey = home.match(/"extApimSubscriptionKey":"([0-9a-f]{32})"/)?.[1];
if (!coopKey || !coopSearchKey) console.log('Coop: nycklarna saknas på coop.se, hoppar över det som saknas');

type Hit = Shelf;
const willys = async (q: string): Promise<Hit[]> => {
  const j = await get(`https://www.willys.se/search?q=${encodeURIComponent(q)}&size=60`);
  return (j.results ?? []).filter((x: any) => /^(kg|l)$/.test(x.comparePriceUnit ?? ''))
    .map((x: any) => ({ krKg: num(x.comparePrice), kr: x.priceValue, pack: x.displayVolume ?? '', name: x.name, brand: x.manufacturer ?? '', code: x.code }));
};
const coop = async (q: string): Promise<Hit[]> => {
  if (!coopSearchKey) return [];
  const r = await fetch('https://external.api.coop.se/personalization/search/products?api-version=v1&store=251300&direct=false', {
    method: 'POST', headers: { 'User-Agent': UA, 'Ocp-Apim-Subscription-Key': coopSearchKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, resultsOptions: { skip: 0, take: 40 } }),
  });
  if (!r.ok) return [];
  const j = await r.json() as any;
  return (j.results?.items ?? []).filter((x: any) => /^(kg|l)$/i.test(x.comparativePriceUnit?.unit ?? ''))
    .map((x: any) => ({ krKg: x.comparativePriceData?.b2cPrice, kr: x.salesPriceData?.b2cPrice, pack: x.packageSizeInformation ?? '', name: x.name ?? '', brand: x.manufacturerName ?? '', code: String(x.id ?? '') }));
};
const FETCH: Record<Chain, (q: string) => Promise<Hit[]>> = { Willys: willys, ICA: async () => [], Coop: coop };

const shelf: Record<Chain, Partial<Record<IngrId, Shelf>>> = { Willys: {}, ICA: {}, Coop: {} };
for (const id of ids) {
  await Promise.all(CHAINS.map(async (chain) => {
    const hits = await FETCH[chain](BUY[id][0]).catch((e) => { console.log(`${chain} ${id}: ${e.message}`); return []; });
    // Floor 3 kr/kg: the cheapest real item is onions at ~10; below that is a per-gram price on a weighed item (Coop nötfärs 0,20).
    const best = hits.filter((x) => x.krKg >= 3 && matches(id, x.name)).sort((a, b) => a.krKg - b.krKg)[0];
    if (best) shelf[chain][id] = { ...best, krKg: r2(best.krKg) };
  }));
  if (!CHAINS.some((c) => shelf[c][id])) console.log(`ingen träff: ${id} (${BUY[id][0]})`);
}

// ---------- Offers ----------
const offers: Offer[] = [];
// Coop lists one offer under several sorting groups: one row per store, name and price.
const seen = new Set<string>();
const push = (o: Omit<Offer, 'ingr'>) => {
  const k = `${o.store}|${o.name}|${o.krKg}|${o.label}`;
  if (!ok(o.krKg) || seen.has(k)) return;
  seen.add(k);
  for (const ingr of match(o.name)) offers.push({ ingr, ...o });
};

for (const [store, storeName] of WILLYS) {
  const j = await get(`https://www.willys.se/search/campaigns/offline?q=${store}&type=PERSONAL_GENERAL&page=0&size=500`);
  for (const x of j.results ?? []) {
    const p = x.potentialPromotions?.[0];
    if (!p) continue;
    const krKg = perKg(p.comparePrice);
    // Ordinary price per kg: the promo per kg scaled by ordinary unit price / promo unit price ("3 för 66" = 22 each).
    const n = Number(String(p.conditionLabel ?? '').match(/^(\d+) för/)?.[1] ?? 1);
    const promoUnit = num(p.rewardLabel) / n;
    const ord = x.priceUnit === 'kr/kg' ? num(x.price) : krKg * num(x.price) / promoUnit;
    push({ chain: 'Willys', store: storeName, name: x.name, brand: x.manufacturer ?? '', pack: x.displayVolume ?? '', krKg, ordKrKg: ok(ord) ? r2(ord) : undefined,
      label: [p.conditionLabel, p.rewardLabel].filter(Boolean).join(' '), member: p.campaignType === 'LOYALTY', until: p.endDate?.replace(/(\d+)\/(\d+)-(\d+)/, '$3-$2-$1') ?? '' });
  }
}

for (const [slug, storeName] of ICA) {
  const h: string = await get(`https://www.ica.se/erbjudanden/${slug}/`, false);
  const i = h.indexOf('window.__INITIAL_DATA__');
  if (i < 0) { console.log(`inga erbjudanden hittades: ${storeName}`); continue; }
  const s = h.slice(h.indexOf('{', i), h.indexOf('</script>', i));
  const d = JSON.parse(s.slice(0, s.lastIndexOf('}') + 1).replace(/\bundefined\b/g, 'null').replace(/new (Map|Set)\((\[[^()]*\])\)/g, '$2'));
  for (const x of d.offers?.weeklyOffers ?? []) {
    const m = x.details?.mechanicInfo ?? '';
    const krKg = ok(perKg(x.comparisonPrice)) ? perKg(x.comparisonPrice) : / kr\/kg$/.test(m) ? num(m) : NaN;
    const q = x.parsedMechanics?.quantity || 1;
    const promoUnit = num(x.parsedMechanics?.value2) / q;
    const ord = krKg * num(x.stores?.[0]?.regularPrice) / (/ kr\/kg$/.test(m) ? krKg : promoUnit);
    push({ chain: 'ICA', store: storeName, name: x.details.name, brand: String(x.details.brand ?? '').split('.')[0], pack: x.details.packageInformation ?? '', krKg,
      ordKrKg: ok(ord) && ord > krKg ? r2(ord) : undefined, label: m, member: (x.traits ?? []).includes('Stammis'), until: String(x.validTo ?? '').slice(0, 10) });
  }
}

// Coop: no ordinary price in the API, so only the shelf comparison applies. Per kg from the comparison text, a kg price,
// or the price over a single stated weight ("1 kg.", "800 g").
const grams = (a: string) => { const m = String(a).replace(/\s/g, '').match(/^(?:ca)?(\d+(?:[.,]\d+)?)(kg|g|l|ml|dl)\.?$/i);
  return m ? Number(m[1].replace(',', '.')) * { kg: 1000, g: 1, l: 1000, ml: 1, dl: 100 }[m[2].toLowerCase() as 'kg'] : NaN; };
for (const [store, storeName] of coopKey ? COOP : []) {
  const r = await fetch(`https://external.api.coop.se/dke/offers/sorting-groups/${store}?api-version=v3&clustered=true&grouped=true`,
    { headers: { 'User-Agent': UA, 'Ocp-Apim-Subscription-Key': coopKey! } });
  if (!r.ok) { console.log(`Coop ${storeName}: ${r.status}`); continue; }
  const j = await r.json() as any;
  for (const x of (j.sortingGroups ?? []).flatMap((g: any) => g.offers ?? [])) {
    const c = x.content ?? {}, pi = x.priceInformation ?? {};
    const each = pi.discountValue / (pi.quantity || 1);
    const krKg = ok(perKg(c.comparativePriceText)) ? perKg(c.comparativePriceText) : pi.unit === 'kg' ? pi.discountValue : each / (grams(c.amountInformation) / 1000);
    push({ chain: 'Coop', store: storeName, name: c.title ?? '', brand: String(c.brand ?? '').split('/').pop()!.trim(), pack: c.amountInformation ?? '', krKg: r2(krKg),
      label: pi.quantity > 1 ? `${pi.quantity} för ${pi.discountValue} kr` : `${pi.discountValue} kr`, member: !!pi.isMemberPrice, until: String(x.campaignEndDate ?? '').slice(0, 10) });
  }
}

const stores: Store[] = [...WILLYS.map(([, name]) => ({ chain: 'Willys' as const, name })), ...ICA.map(([, name]) => ({ chain: 'ICA' as const, name })),
  ...(coopKey ? COOP : []).map(([, name]) => ({ chain: 'Coop' as const, name }))];
const out: Prices = { at: new Date().toISOString().slice(0, 10), stores, shelf, offers };
writeFileSync(new URL('../src/lib/prices.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`${CHAINS.map((c) => `${c} ${Object.keys(shelf[c]).length}`).join(', ')} av ${ids.length} hyllpriser, ${offers.length} erbjudanden på ${new Set(offers.map((o) => o.ingr)).size} ingredienser`);
