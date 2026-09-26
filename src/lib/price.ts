// Prices: what a box costs and where this week's deals are. Pure, no React. Data from scripts/prices.ts (prices.json).
// Only ingredients with an id and a weight count; spices, lime and herbs "efter smak" are left out (and say so in the UI).
import { BUY, INGR, type IngrId } from './data.ts';
import type { BoxCalc, ShopRow } from './calc.ts';
import raw from './prices.json' with { type: 'json' };

/** The cheapest matching Willys product, per kg or litre. */
export interface Shelf { krKg: number; kr: number; pack: string; name: string; brand: string; code: string }
export interface Offer {
  ingr: IngrId; chain: 'Willys' | 'ICA'; store: string; name: string; brand: string; pack: string;
  krKg: number; ordKrKg?: number; label: string; member: boolean; until: string; // until = last valid day, YYYY-MM-DD
}
export interface Prices { at: string; shelf: Partial<Record<IngrId, Shelf>>; offers: Offer[] }
export const PRICES = raw as Prices;

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

export interface Price { krKg: number; offer?: Offer; shelf?: Shelf }
/** Offers still valid on `today` (YYYY-MM-DD), best first per ingredient. */
export const live = (P: Prices, today: string) => P.offers.filter((o) => o.until >= today).sort((a, b) => a.krKg - b.krKg);

/** Cheapest known price: this week's best offer if it beats the shelf price, else the shelf. Null = no price found. */
export function unit(P: Prices, id: IngrId, offers: readonly Offer[]): Price | null {
  const shelf = P.shelf[id];
  const offer = offers.find((o) => o.ingr === id);
  if (offer && (!shelf || offer.krKg < shelf.krKg)) return { krKg: offer.krKg, offer, shelf };
  return shelf ? { krKg: shelf.krKg, shelf } : null;
}

// ---------- Box and shopping ----------

export interface BoxCost { kr: number; deals: Offer[]; missing: string[] }
/** One box: grams × kr/kg for every weighed ingredient. `deals` = the offers that made it cheaper. */
export function boxCost(c: BoxCalc, P: Prices, offers: readonly Offer[]): BoxCost {
  let kr = 0;
  const deals = new Map<string, Offer>();
  const missing: string[] = [];
  for (const x of c.parts) {
    if (!x.ingr || (x.u !== 'g' && x.u !== 'ml')) continue;
    const u = unit(P, x.ingr, offers);
    if (!u) { missing.push(INGR[x.ingr].name); continue; }
    kr += (x.q / 1000) * u.krKg;
    if (u.offer) deals.set(x.ingr, u.offer);
  }
  return { kr, deals: [...deals.values()], missing };
}

/**
 * Cost is what the boxes consume (Patrik 2026-09-26: most jars are already at home). This is the "if you lack them" figure:
 * pantry jars, sauces and oils (skafferi, not the protein or carb) in whole packs.
 */
export function pantryCost(rows: readonly ShopRow[], P: Prices, offers: readonly Offer[]): { kr: number; n: number } {
  let kr = 0, n = 0;
  for (const r of rows) {
    if (r.cat !== 'skafferi' || r.role === 'protein' || r.role === 'carb') continue;
    const u = r.key in INGR ? unit(P, r.key as IngrId, offers) : null;
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
 * than the usual cheapest (Willys shelf) and than the product's own ordinary price. Fractions, 0.25 = 25 % cheaper.
 */
export function deals(P: Prices, offers: readonly Offer[]): Deal[] {
  const by = new Map<IngrId, Offer[]>();
  for (const o of offers) by.set(o.ingr, [...(by.get(o.ingr) ?? []), o]);
  return [...by].map(([id, all]) => {
    const best = all[0];
    const shelf = P.shelf[id]?.krKg;
    return { id, best, all, vsShelf: shelf ? 1 - best.krKg / shelf : undefined, vsOrd: best.ordKrKg ? 1 - best.krKg / best.ordKrKg : undefined };
  });
}

/** Kronor per 100 g protein at the best price: the fair way to compare proteins. */
// kr/kg ÷ protein g per kg × 100 = krKg × 10 / protein per 100 g.
export const krPerProtein = (id: IngrId, krKg: number) => (krKg * 10) / INGR[id].n[1];
