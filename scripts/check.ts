// Self-check: `node scripts/check.ts`. Prints one line per failure, exits non-zero on any.
// Expected numbers are hand-computed from the per-100 g values in data.ts (see comments).
import { existsSync, readFileSync } from 'node:fs';
import { INGR, KITS, PROTEINS, CARBS, VEGS, byId } from '../src/lib/data.ts';
import { fmtAtStr, fmtClock, leftMs, MIN, nudge, pause, readyAt, resume, ringing, start, zeroAt } from '../src/lib/clock.ts';
import { baseBatches, calcBox, DEFAULT_PLAN, fmtQty, isLong, pickPacks, resolveBoxes, schedule, shopping, split, targets, type Box, type Plan } from '../src/lib/calc.ts';

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
// Protein per kit. Default 8 boxes: teriyaki 3, grekisk 3, texmex 2; kyckling 4, nötfärs 4.
// Teriyaki -> nötfärs uses 3 of nötfärs' 4; grekisk takes kyckling ×3, texmex the last nötfärs, then kyckling.
const pid = (p: Plan) => resolveBoxes(p).map((b) => b.protein?.id[0]);
eq('kit protein fixed', pid({ ...DEFAULT_PLAN, kitProtein: { teriyaki: 'notfars' } }), ['n', 'n', 'n', 'k', 'k', 'k', 'n', 'k']);
// A protein not selected in step 2 (lax) works too; the others share 4/4 over the remaining 6 boxes.
eq('kit protein unselected', pid({ ...DEFAULT_PLAN, kitProtein: { texmex: 'lax' } }), ['k', 'k', 'k', 'k', 'n', 'n', 'l', 'l']);
// Pinned protein that is also ticked in step 2 must not spill. Lax, kyckling, nötfärs share 3/3/2; tex-mex (2 boxes) pinned
// to lax leaves lax 1 over. Teriyaki takes kyckling ×3, grekisk has no listed protein left, so it gets nötfärs ×2 then kyckling.
eq('pinned protein stays in its kit', pid({ ...DEFAULT_PLAN, proteins: [{ id: 'lax', method: 'ugn' }, ...DEFAULT_PLAN.proteins], kitProtein: { texmex: 'lax' } }),
  ['k', 'k', 'k', 'n', 'n', 'k', 'l', 'l']);
// Veg mode Frysta: broccoli goes frozen, aubergine (freshOnly) is still roasted.
const frys: Plan = { ...DEFAULT_PLAN, vegMode: 'frysta', kits: ['teriyaki', 'moussaka'] };
const frysSch = schedule(resolveBoxes(frys).map((b) => calcBox(b, frys, null)), frys);
eq('frysta: aubergine still roasted', frysSch.steps.find((s) => s.id === 'veg')?.details, 'Aubergine på egen plåt.');
eq('frysta: broccoli frozen', calcBox(resolveBoxes(frys)[0], frys, null).parts.find((x) => x.role === 'veg')?.name, 'Broccoli (fryst)');
eq('kit veg', resolveBoxes({ ...DEFAULT_PLAN, kitVeg: { teriyaki: 'haricots' } })[0].veg?.id, 'haricots');
const cleared: Plan = { ...DEFAULT_PLAN, overrides: { 2: { protein: null } } };
eq('override clears slot', resolveBoxes(cleared)[2].protein, undefined);

// One box: kyckling 175 g (ugn) + ris 60 g + broccoli 140 g rostad + teriyaki kit.
// Teriyaki sits on the asia base: teriyakisås 25 g + base soja 8 g.
// kcal: 182 + olja 40,22 + 212,4 + 50,4 + olja 32,18 + 27,5 + soja 5,76 + 52 + 17,19 = 619,65
// protein: 40,43 + 4,5 + 4,06 + 0,8 + soja 0,62 + 4,36 + 0,53 = 55,30
const box: Box = { i: 0, kit: byId(KITS, 'teriyaki'), protein: byId(PROTEINS, 'kyckling'), method: 'ugn', carb: byId(CARBS, 'ris'), veg: byId(VEGS, 'broccoli') };
const c = calcBox(box, DEFAULT_PLAN, null);
near('box kcal', c.m[0], 619.65);
near('box protein', c.m[1], 55.30, 0.05);

// Goal solver, fixed point: kyckling (50 - 17,49) / 0,231 = 140,7 -> 140 g,
// ris (700 - 362,8) / 3,54 = 95,3 -> 95 g; stable. Result: ca 50 g protein.
const solved = calcBox(box, DEFAULT_PLAN, { kcal: 700, protein: 50, dailyKcal: 0, dailyProtein: 0 });
eq('solved protein raw', solved.parts.find((x) => x.role === 'protein')?.q, 140);
eq('solved carb raw', solved.parts.find((x) => x.role === 'carb')?.q, 95);
near('solved hits protein goal', solved.m[1], 50, 1.5);
near('solved hits kcal goal', solved.m[0], 700, 15);

// Simple goal: 80 kg bulk -> 80 × 38 × 0,3 = 912 -> 910 kcal, 80 × 2 × 0,3 = 48 g.
const tg = targets({ ...DEFAULT_PLAN.goal, mode: 'simple', kind: 'bulk', weight: 80 });
eq('simple targets', tg && [tg.kcal, tg.protein], [910, 48]);

// Packages
eq('packs exact combo', pickPacks(1400, [500, 900, 1500]), [{ size: 900, n: 1 }, { size: 500, n: 1 }]);
eq('packs tie -> fewer', pickPacks(870, [500, 1000]), [{ size: 1000, n: 1 }]);
eq('packs none', pickPacks(0, [500]), []);

// Formatting
eq('fmt g', fmtQty(1234, 'g'), '1,2 kg');
eq('fmt small g exact', fmtQty(3, 'g'), '3 g');
// Default = Behåll, 75 kg: 75 × 33 × 0,3 = 742,5 -> 740 kcal, 75 × 1,8 × 0,3 = 40,5 -> 41 g.
const dflt = targets(DEFAULT_PLAN.goal);
eq('default is behåll', dflt && [dflt.kcal, dflt.protein], [740, 41]);
eq('fmt tsk->msk', fmtQty(4.5, 'tsk'), '1,5 msk');
eq('fmt ml->dl', fmtQty(250, 'ml'), '2,5 dl');

// Schedule: default plan, longest oven item is potatis 35 min.
const calcs = resolveBoxes(DEFAULT_PLAN).map((b) => calcBox(b, DEFAULT_PLAN, null));
const sch = schedule(calcs, DEFAULT_PLAN);
eq('oven out at', sch.steps.find((s) => s.id === 'out')?.t, 35);
const sv: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'kyckling', method: 'sousvide' }, { id: 'notfars', method: 'ugn' }] };
const svSch = schedule(resolveBoxes(sv).map((b) => calcBox(b, sv, null)), sv);
eq('sous vide starts before oven', svSch.steps.find((s) => s.id === 'sv-kyckling')?.t, -120);
// Karré rub scaled to the whole piece bought. 6 boxes of karré only -> one 1,5 kg pack.
// Per kg 1 tsk spiskummin, 1,5 tsk oregano (2,25 -> 2,5), 2 vitlök, 1,25 tsk salt (1,875 -> 2), 90 ml juice (135 -> 1,4 dl).
const k6: Plan = { ...DEFAULT_PLAN, boxes: 6, proteins: [{ id: 'flaskkarre', method: 'form' }] };
eq('karré rub for 1,5 kg', schedule(resolveBoxes(k6).map((b) => calcBox(b, k6, null)), k6).steps.find((s) => s.id === 'form-flaskkarre')?.rows?.map((r) => r.right),
  ['1,5 kg', '1,5 tsk', '2,5 tsk', '3 st', '2 tsk', '1,4 dl']);

// Clock times (local time, as on the phone). Default batch + karré i form: form -225, prep -45, potatis 0, klart 60.
// Klart 18:00 -> minute 0 = 17:00 -> form 17:00 - 3 h 45 = 13:15, prep 16:15.
const kp: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'flaskkarre', method: 'form' }, ...DEFAULT_PLAN.proteins] };
const ks = schedule(resolveBoxes(kp).map((b) => calcBox(b, kp, null)), kp).steps;
const span = (st: typeof ks) => [Math.min(...st.map((s) => s.t)), Math.max(...st.map((s) => s.t + s.dur))] as const;
const thu10 = new Date(2026, 8, 24, 10, 0).getTime(); // torsdag
// Day words are relative to the day the short session starts (as in Cook.tsx).
const hm = (st: typeof ks, zero: number, now: number, id: string) =>
  fmtAtStr(zero + st.find((s) => s.id === id)!.t * MIN, now, zero + Math.min(...st.filter((s) => !isLong(s)).map((s) => s.t)) * MIN);
const kz = zeroAt(...span(ks), thu10, null, '18:00');
eq('klart 18:00: times', ['form-flaskkarre', 'prep', 'form-up', 'carb-potatis', 'store'].map((id) => hm(ks, kz, thu10, id)), ['13:15', '16:15', '16:45', '17:00', '18:00']);
// Start now: the first step (the form) starts at 10:00, klart 14:45 (285 min later).
const nz = zeroAt(...span(ks), thu10, null, null);
eq('start now: times', ['form-flaskkarre', 'store'].map((id) => hm(ks, nz, thu10, id)), ['10:00', '14:45']);
// Karré sous vide at 20:00 Thursday, klart 18:00 -> Friday 18:00. Sous vide at -1080, klart at 60: 19 h before = Thursday 23:00.
const svk: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'flaskkarre', method: 'sousvide' }, ...DEFAULT_PLAN.proteins] };
const svs = schedule(resolveBoxes(svk).map((b) => calcBox(b, svk, null)), svk).steps;
const thu20 = new Date(2026, 8, 24, 20, 0).getTime();
const sz = zeroAt(...span(svs), thu20, null, '18:00');
eq('sous vide the evening before', [hm(svs, sz, thu20, 'sv-flaskkarre'), hm(svs, sz, thu20, 'store')], ['i kväll 23:00', '18:00']);
// Default batch (prep -30, klart 60) started at 22:30: only the step after midnight gets a day word.
const ds = sch.steps;
const d2230 = new Date(2026, 8, 24, 22, 30).getTime();
eq('evening batch past midnight', [hm(ds, zeroAt(...span(ds), d2230, null, null), d2230, 'prep'), hm(ds, zeroAt(...span(ds), d2230, null, null), d2230, 'store')], ['22:30', 'i morgon 00:00']);
eq('passed klart time is tomorrow', new Date(readyAt('18:00', new Date(2026, 8, 24, 19, 0).getTime())).getDate(), 25);
eq('day words', [new Date(2026, 8, 23, 23, 0), new Date(2026, 8, 25, 7, 0), new Date(2026, 8, 26, 7, 0)].map((d) => fmtAtStr(d.getTime(), thu20, 0)), ['i går 23:00', 'i morgon 07:00', 'lör 07:00']);
// Lax sous vide (45 min) ends with the oven (35), so it starts at -10; the bath is heated in prep.
const lx: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'lax', method: 'sousvide' }, ...DEFAULT_PLAN.proteins] };
const lxs = schedule(resolveBoxes(lx).map((b) => calcBox(b, lx, null)), lx).steps;
eq('lax sous vide timing', [lxs.find((s) => s.id === 'sv-lax')?.t, lxs.find((s) => s.id === 'prep')?.details.includes('badet på 52 °C')], [-10, true]);
eq('shopping has kyckling', shopping(calcs).some((r) => r.key === 'kycklingfile' && r.packs.length > 0), true);

// Bases. Mixed batch: 8 boxes over chili, keema (tomat) and teriyaki (asia) -> split 3/3/2.
// Tomato base is 100 g krossade per box and no kit adds its own, so 6 boxes need 600 g; asia soja 8 g × 2 = 16 g.
const mixed: Plan = { ...DEFAULT_PLAN, kits: ['chili', 'keema', 'teriyaki'] };
const mixedCalcs = resolveBoxes(mixed).map((b) => calcBox(b, mixed, null));
eq('base batches', baseBatches(mixedCalcs).map((x) => [x.base.id, x.n, x.kits.map((k) => `${k.kit.id}:${k.n}`)]), [['tomat', 6, ['chili:3', 'keema:3']], ['asia', 2, ['teriyaki:2']]]);
const need = (key: string) => shopping(mixedCalcs).find((r) => r.key === key)?.need;
eq('tomatbas krossade', need('krossade'), 600);
eq('asia soja', need('soja'), 16);
// Base + twist sum to the box: base kcal = krossade 22 + puré 8 × 0,84 = 6,72 + lök 30 × 0,39 = 11,7 -> 40,42.
const chili = mixedCalcs[0];
const noBase = calcBox({ ...chili.box, kit: { ...chili.box.kit!, base: undefined } }, mixed, null);
near('tomatbas kcal in box', chili.m[0] - noBase.m[0], 40.42, 0.01);
near('tomatbas protein in box', chili.m[1] - noBase.m[1], 0.8 + 0.352 + 0.36, 0.01);
const mixedSch = schedule(mixedCalcs, mixed).steps;
eq('split rows per kit', mixedSch.find((s) => s.id === 'split-tomat')?.rows?.map((r) => [r.name, r.right]), [['Chili con carne', '×3'], ['Keema matar', '×3']]);
eq('base rows scaled', mixedSch.find((s) => s.id === 'base-tomat')?.rows?.map((r) => r.right), ['600 g', '50 g', '180 g', '3 st']);
eq('split step names kits', schedule(mixedCalcs, mixed).steps.find((s) => s.id === 'split-tomat')?.title, 'Dela tomatbasen i 2');

// Clocks: 20 min started at 0, paused at 5 min, resumed at 8 min, +1 min at 10 min -> ends at 20 + 3 + 1 = 24 min.
const M = 60000;
let ck = start(20, 0);
ck = pause(ck, 5 * M);
eq('paused keeps 15 min', leftMs(ck, 7 * M), 15 * M);
ck = resume(ck, 8 * M);
ck = nudge(ck, M, 10 * M);
eq('pause + nudge end', 'end' in ck && ck.end, 24 * M);
eq('rings at end', [ringing(ck, 24 * M - 1), ringing(ck, 24 * M)], [false, true]);
eq('+1 on a rung clock counts from now', nudge(ck, M, 30 * M), { end: 31 * M });
eq('−1 never below zero', nudge(start(0.5, 0), -M, 0), { end: 0 });
eq('clock format', [fmtClock(65_000), fmtClock(3_723_000), fmtClock(400)], ['1:05', '1:02:03', '0:01']);

// Vegetarian proteins. Halloumi (22,3 g P, 21,9 g fat/100 g) reaches 41 g P and 740 kcal only by cutting
// the potatoes to ~95 g: the box ends ~52 g fat, ~25 g carbs. Sojafärs lands on the plate like mince.
const veg: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'halloumi', method: 'ugn' }, { id: 'sojafars', method: 'ugn' }], kits: ['grekisk', 'chili'] };
const vegSch = schedule(resolveBoxes(veg).map((b) => calcBox(b, veg, null)), veg);
eq('veg proteins go to kits that list them', resolveBoxes(veg).map((b) => b.protein?.id), ['halloumi', 'halloumi', 'halloumi', 'halloumi', 'sojafars', 'sojafars', 'sojafars', 'sojafars']);
eq('halloumi and sojafärs in the oven', ['prot-halloumi', 'prot-sojafars'].map((id) => vegSch.steps.find((s) => s.id === id)?.temp), [200, 200]);
const hal = calcBox(resolveBoxes(veg)[0], veg, { kcal: 740, protein: 41, dailyKcal: 0, dailyProtein: 0 });
eq('halloumi: goal hit, carbs traded for fat', [Math.abs(hal.m[1] - 41) < 2, Math.abs(hal.m[0] - 740) < 15, hal.m[3] > 45, hal.m[2] < 30], [true, true, true, true]);

// Prep list, default plan (no goal): kyckling in the oven 4 × 175 g = 700 g, then carbs/veg needing knife work,
// then the asia base for 3 teriyaki boxes: 3 × ½ tsk ginger = 1,5 tsk, 3 × ½ clove = 1,5 st.
const prep = sch.steps.find((s) => s.id === 'prep')!;
eq('prep rows', prep.rows?.map((r) => `${r.name}: ${r.right}`),
  ['Kyckling: 700 g', 'Potatisklyftor: 675 g', 'Broccoli: 420 g', 'Haricots verts: 330 g', 'Paprikamix: 280 g', 'Riven ingefära (asiatisk bas): 1,5 tsk', 'Vitlöksklyfta (asiatisk bas): 1,5 st']);
eq('prep time scales, capped', prep.dur, 30);
eq('tomato base onion for 6 boxes', schedule(mixedCalcs, mixed).steps.find((s) => s.id === 'prep')?.rows?.find((r) => r.name.startsWith('Gul lök'))?.right, '180 g');
// Portions: one row per box type, cooked weights (kyckling 175 × 0,75 = 131 -> 130 g, ris 60 × 2,8 = 168 -> 170 g).
const portion = sch.steps.find((s) => s.id === 'portion')!;
eq('portion rows', portion.rows?.map((r) => `${r.name} ${r.right}`), ['Teriyaki ×3', 'Grekisk citron ×1', 'Grekisk citron ×2', 'Tex-mex ×2']);
eq('portion cooked weights', portion.rows?.[0].sub?.startsWith('Kyckling ca 130 g · Ris ca 170 g'), true);

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
