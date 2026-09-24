// Self-check: `node scripts/check.ts`. Prints one line per failure, exits non-zero on any.
// Expected numbers are hand-computed from the per-100 g values in data.ts (see comments).
import { existsSync, readFileSync } from 'node:fs';
import { INGR, KITS, PROTEINS, CARBS, VEGS, byId } from '../src/lib/data.ts';
import { calcBox, DEFAULT_PLAN, fmtQty, pickPacks, resolveBoxes, schedule, shopping, split, targets, type Box, type Plan } from '../src/lib/calc.ts';

const fails: string[] = [];
const eq = (name: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const near = (name: string, got: number, want: number, tol = 0.5) => {
  if (Math.abs(got - want) > tol) fails.push(`${name}: got ${got.toFixed(2)}, want ${want} ±${tol}`);
};

// Distribution
eq('split 8/3', split(8, 3), [3, 3, 2]);
eq('default proteins', resolveBoxes(DEFAULT_PLAN).map((b) => b.protein?.id), ['kyckling', 'kyckling', 'kyckling', 'kyckling', 'notfars', 'notfars', 'notfars', 'notfars']);
const cleared: Plan = { ...DEFAULT_PLAN, overrides: { 2: { protein: null } } };
eq('override clears slot', resolveBoxes(cleared)[2].protein, undefined);

// One box: kyckling 175 g (ugn) + ris 60 g + broccoli 140 g rostad + teriyaki kit.
// kcal: 182 + olja 40,22 + 212,4 + 50,4 + olja 32,18 + 33 + 52 + 17,19 = 619,39
// protein: 40,43 + 4,5 + 4,06 + 0,96 + 4,36 + 0,53 = 54,84
const box: Box = { i: 0, kit: byId(KITS, 'teriyaki'), protein: byId(PROTEINS, 'kyckling'), method: 'ugn', carb: byId(CARBS, 'ris'), veg: byId(VEGS, 'broccoli') };
const c = calcBox(box, DEFAULT_PLAN, null);
near('box kcal', c.m[0], 619.39);
near('box protein', c.m[1], 54.84, 0.05);

// Goal solver, fixed point: round 2 gives kyckling (50 - 16,66) / 0,231 = 144,3 -> 145 g,
// ris (700 - 368,9) / 3,54 = 93,5 -> 95 g; round 3 is stable. Result: 50,5 g protein.
const solved = calcBox(box, DEFAULT_PLAN, { kcal: 700, protein: 50, dailyKcal: 0, dailyProtein: 0 });
eq('solved protein raw', solved.parts.find((x) => x.role === 'protein')?.q, 145);
eq('solved carb raw', solved.parts.find((x) => x.role === 'carb')?.q, 95);
near('solved hits protein goal', solved.m[1], 50, 1.5);
near('solved hits kcal goal', solved.m[0], 700, 15);

// Simple goal: 80 kg bulk -> 80 × 38 × 0,3 = 912 -> 910 kcal, 80 × 2 × 0,3 = 48 g.
const tg = targets({ ...DEFAULT_PLAN.goal, mode: 'simple' });
eq('simple targets', tg && [tg.kcal, tg.protein], [910, 48]);

// Packages
eq('packs exact combo', pickPacks(1400, [500, 900, 1500]), [{ size: 900, n: 1 }, { size: 500, n: 1 }]);
eq('packs tie -> fewer', pickPacks(870, [500, 1000]), [{ size: 1000, n: 1 }]);
eq('packs none', pickPacks(0, [500]), []);

// Formatting
eq('fmt g', fmtQty(1234, 'g'), '1,2 kg');
eq('fmt tsk->msk', fmtQty(4.5, 'tsk'), '1,5 msk');
eq('fmt ml->dl', fmtQty(250, 'ml'), '2,5 dl');

// Schedule: default plan, longest oven item is potatis 35 min.
const calcs = resolveBoxes(DEFAULT_PLAN).map((b) => calcBox(b, DEFAULT_PLAN, null));
const sch = schedule(calcs, DEFAULT_PLAN);
eq('oven out at', sch.steps.find((s) => s.id === 'out')?.t, 35);
const sv: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'kyckling', method: 'sousvide' }, { id: 'notfars', method: 'ugn' }] };
const svSch = schedule(resolveBoxes(sv).map((b) => calcBox(b, sv, null)), sv);
eq('sous vide starts before oven', svSch.steps.find((s) => s.id === 'sv-kyckling')?.t, -120);
eq('shopping has kyckling', shopping(calcs).some((r) => r.key === 'kycklingfile' && r.packs.length > 0), true);

// Data integrity: every kit/protein/carb/veg ingredient exists, every kit default resolves.
for (const k of KITS) { byId(CARBS, k.carb); byId(VEGS, k.veg); k.protein.forEach((p) => byId(PROTEINS, p)); }

// Drift vs grammat (only where the sibling repo exists, i.e. locally).
const gpath = new URL('../../recept/nutrients.json', import.meta.url);
if (existsSync(gpath)) {
  const gm = JSON.parse(readFileSync(gpath, 'utf8')) as Record<string, { kcal: number; protein: number; carbs: number; fat: number }>;
  for (const [id, x] of Object.entries(INGR)) {
    if (!('gm' in x) || !x.gm) continue;
    const r = gm[x.gm];
    if (!r) { fails.push(`grammat saknar ${x.gm}`); continue; }
    eq(`grammat ${id}`, x.n, [r.kcal, r.protein, r.carbs, r.fat]);
  }
}

if (fails.length) { console.error(`FAIL ${fails.length}\n` + fails.join('\n')); process.exit(1); }
console.log('check ok');
