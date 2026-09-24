'use client';
import { DEFAULT_METHOD, PROTEINS, byId, type MethodId } from './data.ts';
import { resolveBoxes, type Goal, type Plan, type Slot } from './calc.ts';
import { setPlan } from './store.ts';
import { haptic } from './haptics.ts';

// ponytail: structural changes (boxes/kits/proteins) drop per-box overrides, since indexes shift.
// Upgrade path: key overrides by stable box ids if people complain about losing edits.
const structural = (f: (p: Plan) => Partial<Plan>) => { haptic(); setPlan((p) => ({ ...p, ...f(p), overrides: {} })); };

export const setBoxes = (n: number) => structural(() => ({ boxes: Math.min(40, Math.max(1, n)) }));

export const toggleKit = (id: string) =>
  structural((p) => ({ kits: p.kits.includes(id) ? p.kits.filter((k) => k !== id) : [...p.kits, id] }));

export const toggleProtein = (id: string) =>
  structural((p) => ({
    proteins: p.proteins.some((x) => x.id === id)
      ? p.proteins.filter((x) => x.id !== id)
      : [...p.proteins, { id, method: DEFAULT_METHOD(byId(PROTEINS, id)) }],
  }));

export const setMethod = (id: string, method: MethodId) => {
  haptic();
  setPlan((p) => ({ ...p, proteins: p.proteins.map((x) => (x.id === id ? { ...x, method } : x)) }));
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
