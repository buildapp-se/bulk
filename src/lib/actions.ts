'use client';
import { DEFAULT_METHOD, PROTEINS, byId, type MethodId } from './data.ts';
import { resolveBoxes, type Goal, type Plan, type Slot } from './calc.ts';
import { FRESH_COOK, setCook, setPlan } from './store.ts';
import { haptic } from './haptics.ts';

// ponytail: structural changes (boxes/kits/proteins) drop per-box overrides, since indexes shift.
// Upgrade path: key overrides by stable box ids if people complain about losing edits.
const structural = (f: (p: Plan) => Partial<Plan>) => { haptic(); setPlan((p) => ({ ...p, ...f(p), overrides: {} })); };

export const setBoxes = (n: number) => structural(() => ({ boxes: Math.min(40, Math.max(1, n)) }));

export const toggleKit = (id: string) =>
  structural((p) => ({ kits: p.kits.includes(id) ? p.kits.filter((k) => k !== id) : [...p.kits, id] }));

export const toggleProtein = (id: string) =>
  structural((p) => {
    const off = p.proteins.some((x) => x.id === id);
    return {
      proteins: off ? p.proteins.filter((x) => x.id !== id) : [...p.proteins, { id, method: DEFAULT_METHOD(byId(PROTEINS, id)) }],
      // Unticking a protein also unpins it from kits, so no kit keeps a protein you removed.
      kitProtein: off ? Object.fromEntries(Object.entries(p.kitProtein).filter(([, pr]) => pr !== id)) : p.kitProtein,
    };
  });

export const setMethod = (id: string, method: MethodId) => {
  haptic();
  setPlan((p) => ({ ...p, proteins: p.proteins.map((x) => (x.id === id ? { ...x, method } : x)) }));
};

/** Pin a protein to every box of a kit, and tick it in step 2 if it isn't already. */
export const setKitProtein = (kit: string, protein: string) => {
  haptic();
  setPlan((p) => ({
    ...p,
    kitProtein: { ...p.kitProtein, [kit]: protein },
    proteins: p.proteins.some((x) => x.id === protein) ? p.proteins : [...p.proteins, { id: protein, method: DEFAULT_METHOD(byId(PROTEINS, protein)) }],
  }));
};
/** From the prep tab: exactly these kits and proteins, each protein at its low-prep method. Per-kit choices start over. */
export const applyPrep = (kits: string[], proteins: { id: string; method: MethodId }[]) =>
  structural(() => ({ kits, proteins, kitProtein: {}, kitCarb: {}, kitVeg: {} }));
export const setKitVeg = (kit: string, veg: string) => { haptic(); setPlan((p) => ({ ...p, kitVeg: { ...p.kitVeg, [kit]: veg } })); };
/** Empty the batch: kits, proteins, per-kit and per-box choices. Goal, box count and veg mode stay. */
// A new batch starts clean: cooking progress and the shopping ticks go too, goal and box count stay.
export const clearAll = () => {
  haptic(14);
  setPlan((p) => ({ ...p, kits: [], proteins: [], kitProtein: {}, kitCarb: {}, kitVeg: {}, overrides: {} }));
  setCook((c) => ({ ...c, ...FRESH_COOK, bought: {}, ready: null }));
};
export const setKitCarb = (kit: string, carb: string) => { haptic(); setPlan((p) => ({ ...p, kitCarb: { ...p.kitCarb, [kit]: carb } })); };
export const setVegMode = (vegMode: Plan['vegMode']) => { haptic(); setPlan((p) => ({ ...p, vegMode })); };
export const setGoal = (g: Partial<Goal>) => setPlan((p) => ({ ...p, goal: { ...p.goal, ...g } }));

export const setSlot = (i: number, slot: Slot, id: string | null) => {
  haptic();
  setPlan((p) => ({ ...p, overrides: { ...p.overrides, [i]: { ...p.overrides[i], [slot]: id } } }));
};

export const resetBox = (i: number) => {
  haptic();
  setPlan((p) => { const o = { ...p.overrides }; delete o[i]; return { ...p, overrides: o }; });
};

/** Swap the full contents of two boxes. */
export const swapBoxes = (a: number, b: number) => {
  if (a === b) return;
  haptic(14);
  setPlan((p) => {
    const boxes = resolveBoxes(p);
    const slots = (i: number) => ({ protein: boxes[i].protein?.id ?? null, kit: boxes[i].kit?.id ?? null, carb: boxes[i].carb?.id ?? null, veg: boxes[i].veg?.id ?? null });
    return { ...p, overrides: { ...p.overrides, [a]: slots(b), [b]: slots(a) } };
  });
};
