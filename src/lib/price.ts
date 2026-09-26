// Prices: what a box costs and where this week's deals are. Pure, no React. Data from scripts/prices.ts (prices.json).
// Only ingredients with an id and a weight count; spices, lime and herbs "efter smak" are left out (and say so in the UI).
// A dish is priced at the cheapest single store (Patrik 2026-09-26: shop it all in one place, not five items in five stores).
import { BUY, INGR, type IngrId } from './data.ts';
import type { BoxCalc, ShopRow } from './calc.ts';
import raw from './prices.json' with { type: 'json' };

export type Chain = 'Willys' | 'ICA' | 'Coop';
/** A chain's ordinary price for an ingredient: its cheapest matching product per kg or litre. */
export interface Shelf { krKg: number; kr: number; pack: string; name: string; brand: string; code: string }
export interface Offer {
  ingr: IngrId; chain: Chain; store: string; name: string; brand: string; pack: string;
  krKg: number; ordKrKg?: number; label: string; member: boolean; until: string; // until = last valid day, YYYY-MM-DD
}
export interface Store { chain: Chain; name: string }
export interface Prices { at: string; stores: Store[]; shelf: Record<Chain, Partial<Record<IngrId, Shelf>>>; offers: Offer[] }
export const PRICES = raw as Prices;
export const CHAINS: readonly Chain[] = ['Willys', 'ICA', 'Coop'];

// Product names in lower case without accents or a leading "färsk/fryst/svensk", so "Färsk nötfärs" is "notfars".
export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/^((farsk|fryst|svensk)a? )+/, '').trim();
const PET = /kattmat|hundmat|hundgodis|kattgodis|\bhund|\bkatt/;
export function matches(id: IngrId, name: string): boolean {
  const [, re, not] = BUY[id];
  const n = norm(name);
  return new RegExp(re).test(n) && !(not && new RegExp(not).test(n)) && !PET.test(n);
}

// ---------- Price per ingredient ----------

export interface Price { krKg: number; chain: Chain; offer?: Offer }
/** Offers still valid on `today` (YYYY-MM-DD), cheapest first. */
export const live = (P: Prices, today: string) => P.offers.filter((o) => o.until >= today).sort((a, b) => a.krKg - b.krKg);

/** The usual cheapest: the lowest ordinary price across the chains. */
export function regular(P: Prices, id: IngrId): Price | null {
  let best: Price | null = null;
  for (const chain of CHAINS) { const s = P.shelf[chain]?.[id]; if (s && (!best || s.krKg < best.krKg)) best = { krKg: s.krKg, chain }; }
  return best;
}

/** Cheapest anywhere this week: the best offer if it beats the usual cheapest. For the ingredient overview only. */
export function unit(P: Prices, id: IngrId, offers: readonly Offer[]): Price | null {
  const reg = regular(P, id);
  const offer = offers.find((o) => o.ingr === id);
  return offer && (!reg || offer.krKg < reg.krKg) ? { krKg: offer.krKg, chain: offer.chain, offer } : reg;
}

/** What one store charges: its own offer if cheaper than its chain's ordinary price. */
export function atStore(P: Prices, s: Store, id: IngrId, offers: readonly Offer[]): Price | null {
  const shelf = P.shelf[s.chain]?.[id];
  const offer = offers.find((o) => o.ingr === id && o.store === s.name);
  if (offer && (!shelf || offer.krKg < shelf.krKg)) return { krKg: offer.krKg, chain: s.chain, offer };
  return shelf ? { krKg: shelf.krKg, chain: s.chain } : null;
}

// ---------- Baskets ----------

export interface Need { ingr: IngrId; g: number }
/** Weighed ingredients of some boxes, `n` of each. */
export const needs = (boxes: readonly { c: BoxCalc; n: number }[]): Need[] => {
  const m = new Map<IngrId, number>();
  for (const { c, n } of boxes) for (const x of c.parts) if (x.ingr && (x.u === 'g' || x.u === 'ml')) m.set(x.ingr, (m.get(x.ingr) ?? 0) + x.q * n);
  return [...m].map(([ingr, g]) => ({ ingr, g }));
};

export interface Basket { kr: number; store: Store; deals: Offer[]; missing: string[]; elsewhere: string[] }
/**
 * The cheapest single store for everything in `need`. Ingredients no chain sells are left out (`missing`). A store has to
 * carry all the rest; if none does, the store with fewest gaps wins and the gaps are priced at the usual cheapest (`elsewhere`).
 */
export function basket(need: readonly Need[], P: Prices, offers: readonly Offer[]): Basket | null {
  const known = need.filter((x) => regular(P, x.ingr));
  const missing = need.filter((x) => !regular(P, x.ingr)).map((x) => INGR[x.ingr].name);
  let best: (Basket & { gaps: number }) | null = null;
  // A chain without ordinary prices (ICA, see scripts/prices.ts) can't be priced as a whole basket.
  for (const store of P.stores.filter((s) => Object.keys(P.shelf[s.chain] ?? {}).length)) {
    let kr = 0;
    const deals: Offer[] = [], elsewhere: string[] = [];
    for (const x of known) {
      const u = atStore(P, store, x.ingr, offers) ?? regular(P, x.ingr)!;
      if (!atStore(P, store, x.ingr, offers)) elsewhere.push(INGR[x.ingr].name);
      kr += (x.g / 1000) * u.krKg;
      if (u.offer) deals.push(u.offer);
    }
    const gaps = elsewhere.length;
    if (!best || gaps < best.gaps || (gaps === best.gaps && kr < best.kr)) best = { kr, store, deals, missing, elsewhere, gaps };
  }
  return best;
}

/** One box at its cheapest single store. */
export const boxCost = (c: BoxCalc, P: Prices, offers: readonly Offer[]) => basket(needs([{ c, n: 1 }]), P, offers);

/**
 * Cost is what the boxes consume (Patrik 2026-09-26: most jars are already at home). This is the "if you lack them" figure:
 * pantry jars, sauces and oils (skafferi, not the protein or carb) in whole packs, at the given store.
 */
export function pantryCost(rows: readonly ShopRow[], P: Prices, offers: readonly Offer[], store: Store): { kr: number; n: number } {
  let kr = 0, n = 0;
  for (const r of rows) {
    if (r.cat !== 'skafferi' || r.role === 'protein' || r.role === 'carb' || !(r.key in INGR)) continue;
    const u = atStore(P, store, r.key as IngrId, offers) ?? regular(P, r.key as IngrId);
    if (!u) continue;
    const g = r.packs.length ? r.packs.reduce((s, p) => s + p.n * p.size, 0) : r.need;
    kr += (g / 1000) * u.krKg;
    n++;
  }
  return { kr, n };
}

// ---------- Deals overview ----------

export interface Deal { id: IngrId; best: Offer; all: Offer[]; vsShelf?: number; vsOrd?: number }
/**
 * One row per ingredient on offer somewhere this week: the best offer, every store's offer, and how much cheaper it is
 * than the usual cheapest (lowest ordinary price across chains) and than the product's own ordinary price. 0.25 = 25 %.
 */
export function deals(P: Prices, offers: readonly Offer[]): Deal[] {
  const by = new Map<IngrId, Offer[]>();
  for (const o of offers) by.set(o.ingr, [...(by.get(o.ingr) ?? []), o]);
  return [...by].map(([id, all]) => {
    const best = all[0];
    const reg = regular(P, id)?.krKg;
    return { id, best, all, vsShelf: reg ? 1 - best.krKg / reg : undefined, vsOrd: best.ordKrKg ? 1 - best.krKg / best.ordKrKg : undefined };
  });
}

/** Kronor per 100 g protein: kr/kg ÷ protein g per kg × 100 = krKg × 10 / protein per 100 g. */
export const krPerProtein = (id: IngrId, krKg: number) => (krKg * 10) / INGR[id].n[1];
