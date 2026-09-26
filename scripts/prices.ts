// Weekly price fetch: `node scripts/prices.ts`. Writes src/lib/prices.json, which the app imports at build time.
// Shelf price per ingredient: Willys search (national prices, no key). This week's offers: Willys campaigns and
// ICA's offer pages for the Umeå stores below. No key, no worker: .github/workflows/prices.yml runs it and redeploys.
// Fetched pages are data only: ICA's embedded object is parsed as JSON after stripping two JS constructs, never evaluated.
import { writeFileSync } from 'node:fs';
import { BUY, type IngrId } from '../src/lib/data.ts';
import { matches, type Offer, type Prices, type Shelf } from '../src/lib/price.ts';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';
const WILLYS = [[2203, 'Willys Ersboda'], [2276, 'Willys Umeå Syd'], [2333, 'Willys Klockarbäcken'], [2872, 'Willys Hemma Rådhusesplanaden']] as const;
const ICA = [
  ['maxi-ica-stormarknad-umea-1003828', 'Maxi ICA Stormarknad'], ['ica-kvantum-ersboda-1106008', 'ICA Kvantum Ersboda'],
  ['ica-kvantum-kronoparken-1004229', 'ICA Kvantum Kronoparken'], ['ica-kvantum-mariehem-1003786', 'ICA Kvantum Mariehem'],
  ['ica-supermarket-alidhem-1004111', 'ICA Supermarket Ålidhem'], ['ica-supermarket-boleang-1004302', 'ICA Supermarket Boleäng'],
  ['ica-supermarket-city-umea-1003465', 'ICA Supermarket City'], ['ica-supermarket-teg-1003487', 'ICA Supermarket Teg'],
] as const;

// "59:90 kr/kg", "87,90 kr", "72:73-100:00/kg" -> first number.
const num = (s: string | null | undefined) => {
  const m = String(s ?? '').replace(/\s/g, '').match(/\d+(?:[.,:]\d+)?/);
  return m ? Number(m[0].replace(/[,:]/, '.')) : NaN;
};
const perKg = (s: string | null | undefined) => (/\/(kg|l)\b/.test(String(s)) ? num(s) : NaN);
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

// ---------- Shelf prices ----------
const shelf: Partial<Record<IngrId, Shelf>> = {};
for (const id of ids) {
  const j = await get(`https://www.willys.se/search?q=${encodeURIComponent(BUY[id][0])}&size=60`);
  const best = (j.results ?? [])
    .filter((x: any) => /^(kg|l)$/.test(x.comparePriceUnit ?? '') && matches(id, x.name))
    .map((x: any): Shelf => ({ krKg: num(x.comparePrice), kr: x.priceValue, pack: x.displayVolume ?? '', name: x.name, brand: x.manufacturer ?? '', code: x.code }))
    .filter((x: Shelf) => ok(x.krKg))
    .sort((a: Shelf, b: Shelf) => a.krKg - b.krKg)[0];
  if (best) shelf[id] = best;
  else console.log(`ingen träff: ${id} (${BUY[id][0]})`);
}

// ---------- Offers ----------
const offers: Offer[] = [];
const push = (o: Omit<Offer, 'ingr'>) => { if (ok(o.krKg)) for (const ingr of match(o.name)) offers.push({ ingr, ...o }); };

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

const out: Prices = { at: new Date().toISOString().slice(0, 10), shelf, offers };
writeFileSync(new URL('../src/lib/prices.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(shelf).length}/${ids.length} hyllpriser, ${offers.length} erbjudanden på ${new Set(offers.map((o) => o.ingr)).size} ingredienser`);
