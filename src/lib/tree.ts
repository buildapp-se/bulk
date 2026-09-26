// Ingredient tree: every step adds one ingredient, a node counts the box types (kit + paired protein) that contain the whole path.
// Built lazily from data.ts, so the UI asks for one node at a time. No React.
import { BASES, byId, CARBS, INGR, KITS, PROTEINS, VEGS, type Kit, type KitItem, type Protein } from './data.ts';

export interface Recipe { id: string; kit: Kit; protein: Protein; ing: ReadonlySet<string> }

export const LABEL = new Map<string, string>();
// Untyped items spelled two ways in the kits.
const ALIAS: Record<string, string> = { 'vitlöksklyftor': 'vitlöksklyfta', 'torkad oregano': 'oregano' };

const add = (ing: Set<string>, key: string, label: string) => {
  ing.add(key);
  if (!LABEL.has(key)) LABEL.set(key, label);
};
const item = (ing: Set<string>, it: KitItem) => {
  if (it.ingr) return add(ing, it.ingr, it.name);
  const name = it.name.split(',')[0].trim();
  add(ing, ALIAS[name.toLowerCase()] ?? name.toLowerCase(), name);
};

// ponytail: the base is one ingredient (Tomatbas), its own items are not split out. Kits' pairing lists decide the proteins.
export const RECIPES: readonly Recipe[] = KITS.flatMap((kit) => kit.protein.map((pid) => {
  const protein = byId(PROTEINS, pid);
  const carb = byId(CARBS, kit.carb);
  const veg = byId(VEGS, kit.veg);
  const ing = new Set<string>();
  if (kit.base) add(ing, `bas:${kit.base}`, byId(BASES, kit.base).name);
  add(ing, protein.ingr, protein.name);
  add(ing, carb.ingr, INGR[carb.ingr].name);
  add(ing, veg.ingr, veg.name);
  for (const it of [...kit.mix, ...kit.top]) item(ing, it);
  return { id: `${kit.id}:${pid}`, kit, protein, ing };
}));

export interface TreeNode {
  recipes: readonly Recipe[];
  shared: readonly string[]; // in every recipe left but not on the path: comes along, not a branch
  kids: readonly (readonly [key: string, n: number])[]; // most recipes first
}

const byLabel = (a: string, b: string) => (LABEL.get(a) ?? a).localeCompare(LABEL.get(b) ?? b, 'sv');

export function node(path: readonly string[]): TreeNode {
  const recipes = RECIPES.filter((r) => path.every((k) => r.ing.has(k)));
  const count = new Map<string, number>();
  for (const r of recipes) for (const k of r.ing) if (!path.includes(k)) count.set(k, (count.get(k) ?? 0) + 1);
  const all = recipes.length;
  const shared = [...count].filter(([, n]) => n === all).map(([k]) => k).sort(byLabel);
  const kids = [...count].filter(([, n]) => n < all).sort((a, b) => b[1] - a[1] || byLabel(a[0], b[0]));
  return { recipes, shared, kids };
}

/** Greedy: from `path`, keep taking the branch that keeps the most recipes, while it still keeps at least two. */
export function bestPath(path: readonly string[]): string[] {
  const out = [...path];
  for (;;) {
    const top = node(out).kids[0];
    if (!top || top[1] < 2) return out;
    out.push(top[0]);
  }
}
