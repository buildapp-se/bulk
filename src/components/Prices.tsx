'use client';
import { useEffect, useMemo, useState } from 'react';
import { t } from '@/i18n/sv';
import { BASES, byId, CARBS, INGR, KITS, PROTEINS, VEGS, type IngrId, type Kit, type Protein } from '@/lib/data';
import { calcBox, nf, split, shopping, type BoxCalc } from '@/lib/calc';
import { protPrep, type Pick } from '@/lib/prep';
import { boxCost, deals, krPerProtein, live, pantryCost, PRICES, unit, type BoxCost, type Deal, type Offer } from '@/lib/price';
import { useBatch } from '@/lib/useBatch';
import { haptic } from '@/lib/haptics';

// kr/kg: whole kronor from 20 up, one decimal below (potatis 9,9).
export const fmtKr = (v: number) => nf(v, v < 20 ? 1 : 0);
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const fmtDay = (d: string) => (d ? `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}` : '');
const pct = (f: number) => Math.round(f * 100);
/** Green = cheaper than the usual cheapest by at least this much. */
const GREEN = 0.05;

export interface Priced { c: BoxCalc; cost: BoxCost }
export interface Pricing { offers: Offer[]; box: (kit: Kit, p: Protein) => Priced; shop: (picks: readonly Pick[]) => { n: number; use: number; pantry: { kr: number; n: number } } }

/** Prices for the prep explorer: every kit × protein as one box sized to the goal, with this week's live offers. */
export function usePricing(): Pricing {
  const { plan, t: goal } = useBatch();
  // Offers expire on their last day. Build time first (static export), the device's date after mount.
  const [today, setToday] = useState('');
  useEffect(() => setToday(new Date().toLocaleDateString('sv-SE')), []);
  return useMemo(() => {
    const offers = live(PRICES, today);
    const memo = new Map<string, Priced>();
    const box = (kit: Kit, p: Protein): Priced => {
      const key = `${kit.id}:${p.id}`;
      let x = memo.get(key);
      if (!x) {
        const c = calcBox({ i: 0, kit, protein: p, method: protPrep(p).m, carb: byId(CARBS, kit.carb), veg: byId(VEGS, kit.veg) }, plan, goal);
        x = { c, cost: boxCost(c, PRICES, offers) };
        memo.set(key, x);
      }
      return x;
    };
    // The batch's boxes spread over the marked kits, as Välj would split them. Cost = what they consume.
    const shop = (picks: readonly Pick[]) => {
      const counts = split(Math.max(plan.boxes, picks.length), picks.length);
      const calcs = picks.flatMap((x, i) => Array<BoxCalc>(counts[i]).fill(box(x.kit, x.protein).c));
      const use = picks.reduce((s, x, i) => s + counts[i] * box(x.kit, x.protein).cost.kr, 0);
      return { n: calcs.length, use, pantry: pantryCost(shopping(calcs), PRICES, offers) };
    };
    return { offers, box, shop };
  }, [plan, goal, today]);
}

export function DealTag({ o, small }: { o: Offer; small?: boolean }) {
  const shelf = PRICES.shelf[o.ingr]?.krKg;
  const vs = shelf ? 1 - o.krKg / shelf : 0;
  const cls = `whitespace-nowrap rounded-full px-1.5 py-px font-mono ${small ? 'text-[10px]' : 'text-[11px]'}`;
  if (vs >= GREEN) return <span className={`${cls} bg-deal-bg text-deal`}>{t.price.vsShelf(pct(vs))}</span>;
  return o.ordKrKg ? <span className={`${cls} bg-sunken text-muted`}>{t.price.vsOrd(pct(1 - o.krKg / o.ordKrKg))}</span> : null;
}

// ---------- Week overview ----------

const uniq = (ids: IngrId[]) => [...new Set(ids)];
const kitIngr = uniq(KITS.flatMap((k) => [...k.mix, ...k.top].flatMap((x) => (x.ingr ? [x.ingr] : []))));
const GROUPS: [string, IngrId[]][] = (() => {
  const protein = uniq(PROTEINS.map((p) => p.ingr));
  const carb = uniq(CARBS.map((c) => c.ingr));
  const veg = uniq(VEGS.map((v) => v.ingr));
  const base = uniq(BASES.flatMap((b) => b.items.flatMap((x) => (x.ingr ? [x.ingr] : []))));
  const taken = new Set([...protein, ...carb, ...veg, ...base]);
  return [['protein', protein], ['carb', carb], ['veg', veg], ['base', base], ['kit', kitIngr.filter((id) => !taken.has(id))]];
})();

/** Every ingredient's price this week, grouped. Green = an offer beats the usual cheapest; proteins ranked by kr per 100 g protein. */
export function WeekPrices({ offers }: { offers: Offer[] }) {
  const byIngr = useMemo(() => new Map(deals(PRICES, offers).map((d) => [d.id, d])), [offers]);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{t.price.week}</h2>
        <p className="max-w-[62ch] text-sm text-muted [text-wrap:pretty]">{t.price.weekSub(fmtDay(PRICES.at))}</p>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {GROUPS.map(([g, ids]) => <Group key={g} g={g} ids={ids} byIngr={byIngr} offers={offers} />)}
      </div>
    </section>
  );
}

function Group({ g, ids, byIngr, offers }: { g: string; ids: IngrId[]; byIngr: Map<IngrId, Deal>; offers: Offer[] }) {
  const [all, setAll] = useState(g === 'protein');
  const rows = ids.map((id) => ({ id, d: byIngr.get(id), u: unit(PRICES, id, offers) }));
  const score = (r: (typeof rows)[number]) => (r.d?.vsShelf ?? -1);
  // Proteins: cheapest per 100 g protein first. Others: best deal first, then by name.
  const sorted = g === 'protein'
    ? rows.sort((a, b) => (a.u ? krPerProtein(a.id, a.u.krKg) : 1e9) - (b.u ? krPerProtein(b.id, b.u.krKg) : 1e9))
    : rows.sort((a, b) => score(b) - score(a) || INGR[a.id].name.localeCompare(INGR[b.id].name, 'sv'));
  const hot = sorted.filter((r) => r.d);
  const shown = all ? sorted : hot;
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div className="label">{t.price.groups[g]}</div>
        {!all && sorted.length > hot.length && (
          <button onClick={() => { haptic(); setAll(true); }} className="text-[12px] text-muted underline">+{sorted.length - hot.length}</button>
        )}
      </div>
      {shown.length === 0 && <p className="px-1 text-[13px] text-muted">–</p>}
      <ul className="flex flex-col">
        {shown.map((r, i) => <Row key={r.id} id={r.id} d={r.d} krKg={r.u?.krKg} top={g === 'protein' && i === 0} protein={g === 'protein'} />)}
      </ul>
    </div>
  );
}

function Row({ id, d, krKg, top, protein }: { id: IngrId; d?: Deal; krKg?: number; top: boolean; protein: boolean }) {
  const [open, setOpen] = useState(false);
  const shelf = PRICES.shelf[id];
  const stores = d ? new Set(d.all.map((o) => o.store)).size : 0;
  return (
    <li className="border-t border-line-soft first:border-t-0">
      <button onClick={() => { haptic(); setOpen(!open); }} aria-expanded={open} className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-sunken">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="truncate">{INGR[id].name}</span>
            {top && <span className="whitespace-nowrap rounded-full bg-deal-bg px-1.5 py-px font-mono text-[11px] text-deal">{t.price.cheapestProtein}</span>}
            {d && <DealTag o={d.best} />}
          </span>
          <span className="block truncate text-[12px] text-muted">
            {protein && krKg !== undefined ? `${t.price.perProtein(fmtKr(krPerProtein(id, krKg)))} · ` : ''}
            {d && krKg === d.best.krKg ? `${d.best.store}${stores > 1 ? ` +${stores - 1}` : ''}` : shelf ? `Willys · ${shelf.brand || shelf.name}` : t.price.noPrice}
          </span>
        </span>
        <span className={`shrink-0 font-mono text-[12px] ${d && d.vsShelf !== undefined && d.vsShelf >= GREEN ? 'text-deal' : ''}`}>{krKg !== undefined ? t.price.perKg(fmtKr(krKg)) : ''}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 px-1 pb-2 text-[12px]">
          {shelf && (
            <div className="flex justify-between gap-3 text-muted">
              <span className="min-w-0 truncate">Willys hyllpris · {shelf.name}{shelf.brand ? `, ${shelf.brand}` : ''} {shelf.pack}</span>
              <span className="shrink-0 font-mono">{t.price.perKg(fmtKr(shelf.krKg))}</span>
            </div>
          )}
          {d?.all.map((o, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-medium">{o.store}</span> · {o.name}{o.brand ? `, ${o.brand}` : ''} {o.pack} · {o.label}
                <span className="text-muted"> · {t.price.until(fmtDay(o.until))}{o.member ? ` · ${t.price.member}` : ''}</span>
              </span>
              <span className="shrink-0 font-mono">{t.price.perKg(fmtKr(o.krKg))}</span>
            </div>
          ))}
          {d && d.vsShelf !== undefined && d.vsShelf < GREEN && <p className="text-muted">{t.price.onlyOrd}</p>}
        </div>
      )}
    </li>
  );
}

// ---------- Cheapest now ----------

export interface Combo { kit: Kit; protein: Protein; kr: number; deals: Offer[] }
/** Every kit with every protein it pairs with, cheapest box first. */
export function useCombos(pr: Pricing): Combo[] {
  return useMemo(() => KITS.flatMap((kit) => kit.protein.map((id) => {
    const protein = byId(PROTEINS, id);
    const { cost } = pr.box(kit, protein);
    return { kit, protein, kr: cost.kr, deals: cost.deals };
  })).sort((a, b) => a.kr - b.kr), [pr]);
}

export const fmtBox = (kr: number) => t.price.box(nf(kr));
export const fmtDayShort = fmtDay;
