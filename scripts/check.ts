// Self-check: `node scripts/check.ts`. Prints one line per failure, exits non-zero on any.
// Expected numbers are hand-computed from the per-100 g values in data.ts (see comments).
import { existsSync, readFileSync } from 'node:fs';
import { DEFAULT_METHOD, INGR, KITS, PROTEINS, CARBS, VEGS, byId, type Protein } from '../src/lib/data.ts';
import { fmtAtStr, fmtClock, leftMs, MIN, nudge, pause, readyAt, resume, ringing, running, start, zeroAt } from '../src/lib/clock.ts';
import { baseBatches, boxShare, calcBox, DEFAULT_PLAN, fmtMin, fmtPacks, fmtQty, isLong, migratePlan, missing, partMacro, pickPacks, pruneOverrides, recipes, resolveBoxes, schedule, shopping, spare, split, targets, vegRoasted, type Box, type BoxCalc, type Plan, type Step } from '../src/lib/calc.ts';
import { cost, kitJobs, nearZero, noun, prepTree, protPrep, type PNode } from '../src/lib/prep.ts';
import { atStore, basket, boxCost, CHAINS, deals, forRegion, krPerProtein, live, matches, needs, norm, pantryCost, PRICES, regular, unit, type Prices, type Region } from '../src/lib/price.ts';
import type { ShopRow } from '../src/lib/calc.ts';

const fails: string[] = [];
const eq = (name: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const near = (name: string, got: number, want: number, tol = 0.5) => {
  if (!(Math.abs(got - want) <= tol)) fails.push(`${name}: got ${got.toFixed(2)}, want ${want} ±${tol}`);
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
const cleared: Plan = { ...DEFAULT_PLAN, overrides: { 'teriyaki:2': { protein: null } } };
eq('override clears slot', resolveBoxes(cleared)[2].protein, undefined);

// Stable box ids: default kit + its n-th box. Default 8 boxes = teriyaki 3, grekisk 3, texmex 2.
eq('box ids', resolveBoxes(DEFAULT_PLAN).map((b) => b.id), ['teriyaki:0', 'teriyaki:1', 'teriyaki:2', 'grekisk:0', 'grekisk:1', 'grekisk:2', 'texmex:0', 'texmex:1']);
// An edit on grekisk's first box (index 3) follows it: 10 boxes split 4/3/3 -> index 4; a 4th kit, 2/2/2/2 -> index 2;
// another protein moves nothing. Box ids are made from the default kit, so a kit override doesn't move the id either.
const pasta: Plan = { ...DEFAULT_PLAN, overrides: { 'grekisk:0': { carb: 'pasta', kit: 'chili' } } };
const carbAt = (p: Plan) => resolveBoxes(p).findIndex((b) => b.carb?.id === 'pasta');
eq('edit survives structure', [carbAt(pasta), carbAt({ ...pasta, boxes: 10 }), carbAt({ ...pasta, kits: [...pasta.kits, 'chili'] }),
  carbAt({ ...pasta, proteins: [...pasta.proteins, { id: 'lax', method: 'ugn' }] })], [3, 4, 2, 3]);
eq('kit override keeps id', resolveBoxes(pasta)[3].id, 'grekisk:0');
// Boxes that are gone lose their edits: 6 boxes = 2/2/2, no teriyaki:2; grekisk removed, no grekisk:0.
const two: Plan = { ...DEFAULT_PLAN, overrides: { 'teriyaki:2': { veg: 'spenat' }, 'grekisk:0': { veg: 'spenat' }, 'texmex:1': { veg: 'spenat' } } };
eq('prune gone boxes', [Object.keys(pruneOverrides({ ...two, boxes: 6 })), Object.keys(pruneOverrides({ ...two, kits: ['teriyaki', 'texmex'] }))],
  [['grekisk:0', 'texmex:1'], ['teriyaki:2', 'texmex:1']]);
// Migration v1 -> v2: index 3 was grekisk's first box, index 9 doesn't exist in 8 boxes and goes. The box looks the same after.
const v1 = { ...DEFAULT_PLAN, v: 1 as const, overrides: { 3: { carb: 'pasta' }, 9: { carb: 'ris' } } };
const v2 = migratePlan(v1);
eq('migrate v1', [v2.v, v2.overrides], [2, { 'grekisk:0': { carb: 'pasta' } }]);
eq('migrate keeps the box', resolveBoxes(v2)[3].carb?.id, 'pasta');
eq('migrate leaves v2 alone', migratePlan(pasta), pasta);

// One box: kyckling 175 g (ugn) + ris 60 g + broccoli 140 g rostad + teriyaki kit.
// Teriyaki sits on the asia base: teriyakisås 25 g + base soja 8 g.
// kcal: 182 + olja 40,22 + 212,4 + 50,4 + olja 32,18 + 27,5 + soja 5,76 + 52 + 17,19 = 619,65
// protein: 40,43 + 4,5 + 4,06 + 0,8 + soja 0,62 + 4,36 + 0,53 = 55,30
const box: Box = { i: 0, id: '', kit: byId(KITS, 'teriyaki'), protein: byId(PROTEINS, 'kyckling'), method: 'ugn', carb: byId(CARBS, 'ris'), veg: byId(VEGS, 'broccoli') };
const c = calcBox(box, DEFAULT_PLAN, null);
near('box kcal', c.m[0], 619.65);
near('box protein', c.m[1], 55.30, 0.05);
// The per-ingredient macros on Ingredienser (including the tray oil) add up to the box.
for (let i = 0; i < 4; i++) near(`parts add up ${i}`, c.parts.reduce((s, x) => s + (partMacro(x)?.[i] ?? 0), 0), c.m[i], 0.001);
near('kyckling part kcal', partMacro(c.parts[0])![0], 182, 0.001); // 175 g × 104 kcal/100 g

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

// Splitting a base names each kit's share and its twist scaled to its boxes. 20 karré boxes, two krämiga kit -> 10 each.
// Svampsås per box: 50 ml Flora, 75 ml mjölk, ½ msk fond, ½ msk soja, ¼ tsk dijon; ×10.
const svMarry: Plan = { ...DEFAULT_PLAN, boxes: 20, kits: ['filips-svampsas', 'filips-marryme'], proteins: [{ id: 'flaskkarre', method: 'form' }] };
const kramC = resolveBoxes(svMarry).map((b) => calcBox(b, svMarry, null));
eq('split kram: svampsås row', schedule(kramC, svMarry).steps.find((s) => s.id === 'split-kram')?.rows?.[0].sub,
  '10 av 20 lådors bas · + flora matlagning 4 % 5 dl, lättmjölk 7,5 dl, kalvfond 5 msk, japansk soja 5 msk, dijonsenap 2,5 tsk');
// Recipe per dish: Philadelphia 25 g × 10.
eq('recipes: two dishes, base scaled', recipes(kramC).map((r) => [r.n, r.rows.find((x) => x.name === 'Philadelphia light')?.right]), [[10, '250 g'], [10, '250 g']]);
// Spare meat: taking "Gör N lådor" uses the karré already bought and needs no extra pack.
const sp = spare(kramC)[0];
const more: Plan = { ...svMarry, boxes: svMarry.boxes + (sp?.extra ?? 0) };
const spMore = shopping(resolveBoxes(more).map((b) => calcBox(b, more, null))).find((r) => r.key === 'flaskkarre')!;
eq('spare: more boxes, same karré bought', [sp?.extra > 0, spMore.packs.reduce((s, x) => s + x.n * x.size, 0)], [true, sp?.bought]);

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
// then knife jobs, one row each. Asia base for 3 teriyaki boxes: 3 × ½ tsk ginger = 1,5 tsk, 3 × ½ clove; grekisk ×3 adds
// 3 × ½ clove -> vitlök 3 st. Teriyaki salladslök 3 × 1, grekisk gurka 3 × 50 g, tex-mex ×2 lime 2 × ¼.
const prep = sch.steps.find((s) => s.id === 'prep')!;
eq('prep rows', prep.rows?.map((r) => `${r.name}: ${r.right}`),
  ['Kyckling: 700 g', 'Potatisklyftor: 675 g', 'Broccoli: 420 g', 'Haricots verts: 330 g', 'Paprikamix: 280 g', 'Ingefära: 1,5 tsk', 'Vitlök: 3 st',
    'Salladslök: 3 st', 'Gurka: 150 g', 'Rödlök: efter smak', 'Lime: 0,5 st', 'Koriander: efter smak']);
eq('shared knife job names who', prep.rows?.find((r) => r.name === 'Vitlök')?.sub, 'asiatisk bas, Grekisk citron');
// Pad krapow ×8: base ½ tsk ingefära = 4 tsk (shown 1,5 msk), ½ clove + own 1½ = 16 st vitlök, 8 chili.
const kp8: Plan = { ...DEFAULT_PLAN, kits: ['krapow'] };
eq('krapow knife jobs', schedule(resolveBoxes(kp8).map((b) => calcBox(b, kp8, null)), kp8).steps.find((s) => s.id === 'prep')?.rows?.slice(-4).map((r) => `${r.name}: ${r.right}`),
  ['Ingefära: 1,5 msk', 'Vitlök: 16 st', 'Chili: 8 st', 'Basilika: efter smak']);
// Grekisk rödlök efter smak + buffalo 4 × ½ msk hackad rödlök.
const rb: Plan = { ...DEFAULT_PLAN, boxes: 8, kits: ['grekisk', 'filips-buffalo'] };
eq('knife amount + efter smak', schedule(resolveBoxes(rb).map((b) => calcBox(b, rb, null)), rb).steps.find((s) => s.id === 'prep')?.rows?.find((r) => r.name === 'Rödlök')?.right, '2 msk + efter smak');
eq('prep time scales, capped', prep.dur, 30);
eq('tomato base onion for 6 boxes', schedule(mixedCalcs, mixed).steps.find((s) => s.id === 'prep')?.rows?.find((r) => r.name.startsWith('Gul lök'))?.right, '180 g');
// Portions: one row per box type, cooked weights (kyckling 175 × 0,75 = 131 -> 130 g, ris 60 × 2,8 = 168 -> 170 g).
const portion = sch.steps.find((s) => s.id === 'portion')!;
eq('portion rows', portion.rows?.map((r) => `${r.name} ${r.right}`), ['Teriyaki ×3', 'Grekisk citron ×1', 'Grekisk citron ×2', 'Tex-mex ×2']);
eq('portion cooked weights', portion.rows?.[0].sub?.startsWith('Kyckling ca 130 g · Ris ca 170 g'), true);

// LV and label values (2026-09-29): each ingredient's share of one default box of a kit that uses it, per 100 g × grams.
const share = (kitId: string, ingr: string) => {
  const kit = byId(KITS, kitId);
  const b: Box = { i: 0, id: '', kit, protein: byId(PROTEINS, kit.protein[0]), method: 'ugn', carb: byId(CARBS, kit.carb), veg: byId(VEGS, kit.veg) };
  return calcBox(b, DEFAULT_PLAN, null).parts.filter((x) => x.ingr === ingr).reduce((s, x) => [s[0] + partMacro(x)![0], s[1] + partMacro(x)![1]], [0, 0]);
};
const shareIs = (name: string, got: number[], kcal: number, prot: number) => { near(`${name} kcal`, got[0], kcal, 0.01); near(`${name} protein`, got[1], prot, 0.01); };
shareIs('bulgur 60 g (LV 829)', share('shawarma', 'bulgur'), 60 * 3.53, 60 * 0.123); // 211,8 / 7,38 (was 205,2 / 7,38)
shareIs('matvete 60 g (etikett)', share('kryddbonor', 'matvete'), 60 * 3.5, 60 * 0.1); // 210 / 6 (was 210 / 7,5)
shareIs('bbq-sås 30 g (etikett)', share('bbq', 'bbq'), 30 * 1.68, 30 * 0.006); // 50,4 / 0,18 (was 45 / 0,3)
shareIs('ostronsås 9 g (etikett)', share('krapow', 'ostronsas'), 9 * 0.77, 9 * 0.026); // 6,93 / 0,234 (was 9,9 / 0,18)
// Marry me: base 25 g + mix 5 g Philadelphia = 30 g; 80 ml Flora 4 %.
shareIs('philadelphia 30 g (etikett)', share('filips-marryme', 'philadelphia'), 30 * 1.45, 30 * 0.072); // 43,5 / 2,16
shareIs('flora 4 % 80 ml (etikett)', share('filips-marryme', 'mildamat'), 80 * 0.6, 80 * 0.011); // 48 / 0,88 (was 49,6 / 2,4)
shareIs('mini fraiche 33 g (LV 2046)', share('filips-currymango', 'minifraiche'), 33 * 0.84, 33 * 0.038); // 27,72 / 1,254
// 2026-10-06: fifteen more estimates replaced (LV API and labels on willys.se).
shareIs('turkisk yoghurt 30 g (LV 6113)', share('kryddbonor', 'yoghurt'), 30 * 1.09, 30 * 0.036); // 32,7 / 1,08 (was 28,5 / 1,05)
shareIs('ärtor och morötter 75 g (LV 388)', share('shepherd', 'artmorot'), 75 * 0.6, 75 * 0.037); // 45 / 2,775
shareIs('soltorkade 15 g (LV 4938)', share('toscansk', 'soltorkade'), 15 * 1.67, 15 * 0.094); // 25,05 / 1,41 (was 30 / 0,6)
shareIs('sirap 10 g (LV 1894)', share('kalpudding', 'sirap'), 10 * 3.23, 0);
shareIs('lingonsylt 20 g (LV 1798)', share('kalpudding', 'lingon'), 20 * 1.48, 20 * 0.002); // 29,6 (was 36)
shareIs('lättmjölk 65 ml (LV 151)', share('filips-currymango', 'lattmjolk'), 65 * 0.39, 65 * 0.036);
shareIs('ajvar 12 g (LV 417)', share('filips-ajvar', 'ajvar'), 12 * 0.7, 12 * 0.012);
shareIs('mager ost 6 g (LV 95)', share('filips-philly', 'ost'), 6 * 2.87, 6 * 0.304);
shareIs('grekisk yoghurt 20 g (etikett)', share('gochujang', 'grekisk'), 20 * 0.59, 20 * 0.095); // 11,8 / 1,9
shareIs('gochujang 15 g (etikett)', share('gochujang', 'gochujang'), 15 * 2.18, 15 * 0.043); // 32,7 / 0,645
shareIs('chipotlepasta 8 g (etikett)', share('chipotle', 'chipotle'), 8 * 0.43, 8 * 0.018);
shareIs('sriracha 5 g (etikett)', share('jordnot', 'sriracha'), 5 * 1.39, 5 * 0.023);
shareIs('röd kebabsås 10 g (etikett)', share('filips-kebab', 'kebabsas'), 10 * 1.7, 10 * 0.016); // 17 / 0,16 (was 12 / 0,1)
// Estimates left on purpose, see BACKLOG: a new 'est' must be a decision, not a slip.
eq('remaining estimates', Object.entries(INGR).filter(([, x]) => x.src === 'est').map(([id]) => id), ['coleslaw', 'kesella', 'pbpulver', 'hotsauce']);
// Every label value names its product.
for (const [id, x] of Object.entries(INGR)) if (x.src === 'etikett' && !x.label) fails.push(`etikett utan källa: ${id}`);

// Data integrity: every kit/protein/carb/veg ingredient exists, every kit default resolves.
for (const k of KITS) { byId(CARBS, k.carb); byId(VEGS, k.veg); k.protein.forEach((p) => byId(PROTEINS, p)); }

// Prep tree: knife jobs count once. Kyckling whole in the oven = ½ job (slice at portioning), färs = 0, lax in bitar = 1.
eq('prep kyckling', [protPrep(byId(PROTEINS, 'kyckling')).m, protPrep(byId(PROTEINS, 'kyckling')).job?.w], ['hel', 0.5]);
eq('prep nötfärs', protPrep(byId(PROTEINS, 'notfars')).job, undefined);
eq('prep lax', protPrep(byId(PROTEINS, 'lax')).job?.w, 1);
// Keema: base gul lök + vitlök, own riven ingefära + koriander.
eq('prep keema jobs', kitJobs(byId(KITS, 'keema')).map((j) => j.key), ['gul lök', 'vitlök', 'ingefära', 'koriander']);
// Teriyaki + sweet chili share the asia base (ingefära, vitlök) and salladslök; sweet chili's ingefära is the base's: 3 + ½.
// Ingredients: soja, ingefära, vitlök (base), teriyakisås, edamame, sesam, salladslök, sweet chilisås, kycklingfilé = 9. One pot.
const kyc = byId(PROTEINS, 'kyckling');
const tc = cost([{ kit: byId(KITS, 'teriyaki'), protein: kyc }, { kit: byId(KITS, 'sweetchili'), protein: kyc }]);
eq('prep shared cost', [tc.knife, tc.ingr, tc.pots], [3.5, 9, 1]);
// Lax: pesto needs no knife, teriyaki + sweet chili share ingefära, vitlök, salladslök, dill och citron has its own three.
const lt = prepTree(byId(PROTEINS, 'lax'));
const show = (n: PNode): unknown => [n.jobs.map((j) => j.key), n.kits.map((k) => k.id), n.kids.map(show)];
eq('prep lax tree', show(lt), [['lax'], ['pesto'], [
  [['ingefära', 'vitlök', 'salladslök'], ['teriyaki', 'sweetchili'], []],
  [['citron', 'dill', 'rödlök'], ['dill'], []],
]]);
// Every kit ends up in exactly one leaf of its protein's tree.
const leaves = (n: PNode): string[] => [...n.kits.map((k) => k.id), ...n.kids.flatMap(leaves)];
for (const p of PROTEINS) eq(`prep tree ${p.id} leaves`, leaves(prepTree(p)).sort(), KITS.filter((k) => k.protein.includes(p.id)).map((k) => k.id).sort());
// Whole fillets go in the oven session with their own step and count on the trays.
const hel: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'kyckling', method: 'hel' }, { id: 'notfars', method: 'ugn' }] };
const helSch = schedule(resolveBoxes(hel).map((b) => calcBox(b, hel, null)), hel);
eq('hel step', helSch.steps.find((s) => s.id === 'prot-kyckling-hel')?.dur, 25);
eq('hel on trays', helSch.trays, schedule(resolveBoxes(DEFAULT_PLAN).map((b) => calcBox(b, DEFAULT_PLAN, null)), DEFAULT_PLAN).trays);
// Frying pan (2026-10-06): a stove step that ends with the oven (out at 35, 10 min -> starts at 25), off the trays,
// with the same oil per gram as the tray. The oven stays the default and the prep tree's choice.
const pan: Plan = { ...DEFAULT_PLAN, proteins: [{ id: 'kyckling', method: 'ugn' }, { id: 'notfars', method: 'panna' }] };
const panCalcs = resolveBoxes(pan).map((b) => calcBox(b, pan, null));
const panSch = schedule(panCalcs, pan);
const panStep = panSch.steps.find((s) => s.id === 'panna-notfars');
eq('pan step', [panStep?.track, panStep?.t, panStep?.dur, panStep?.what], ['spis', 25, 10, 'Nötfärs i stekpannan']);
eq('pan has no oven step', panSch.steps.some((s) => s.id === 'prot-notfars'), false);
const panBox = panCalcs.find((c) => c.box.protein?.id === 'notfars')!;
near('pan oil', panBox.parts.filter((x) => x.role === 'olja' && x.q === 175 * (13 / 500)).length, 1, 0);
eq('pan is never the default', PROTEINS.filter((p) => p.methods.panna).map((p) => [DEFAULT_METHOD(p), protPrep(p).m].includes('panna')), [false, false, false, false, false]);

// Prices, on a fixed table so the weekly fetch never moves the numbers. The same teriyaki box as above:
// kyckling 175 g, olja 4,55 + 3,64 g, ris 60 g, broccoli 140 g, soja 8 g (base), teriyaki 25 g, edamame 40 g, sesam 3 g.
// Two Willys stores (A has kyckling on offer at 80), one Coop, one ICA with a live broccoli offer but no ordinary prices.
const shelfOf = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).map(([id, krKg]) => [id, { krKg, kr: 0, pack: '', name: id, brand: '', code: '' }]));
const offer = (ingr: string, chain: 'Willys' | 'ICA' | 'Coop', store: string, krKg: number, until: string, ordKrKg?: number) =>
  ({ ingr, chain, store, name: ingr, brand: '', pack: '', krKg, ordKrKg, label: '', member: false, until }) as Prices['offers'][number];
const FIX: Prices = {
  at: '2026-09-26',
  stores: [{ chain: 'Willys', name: 'A' }, { chain: 'Willys', name: 'B' }, { chain: 'Coop', name: 'C' }, { chain: 'ICA', name: 'I' }],
  shelf: {
    Willys: shelfOf({ kycklingfile: 100, ris: 20, broccoli: 30, teriyaki: 100, soja: 50, edamame: 60, sesam: 70, olja: 20 }),
    Coop: shelfOf({ kycklingfile: 90, ris: 25, broccoli: 30, teriyaki: 100, soja: 50, edamame: 60, sesam: 70, olja: 20, gochujang: 200 }),
    ICA: {}, Lidl: {},
  },
  offers: [offer('kycklingfile', 'Willys', 'A', 80, '2026-09-27', 110), offer('broccoli', 'ICA', 'I', 5, '2026-09-27'), offer('ris', 'Willys', 'B', 1, '2026-09-20')],
};
const fixLive = live(FIX, '2026-09-26');
eq('expired offer dropped', fixLive.map((o) => o.ingr), ['broccoli', 'kycklingfile']);
// Willys B: 17,5 + olja 8,19 g × 20 = 0,1638 + ris 1,2 + 4,2 + 0,4 + 2,5 + 2,4 + 0,21 = 28,5738.
// Willys A: kyckling at 80 = 14 instead of 17,5 -> 25,0738. Coop: kyckling 15,75, ris 1,5 -> 27,1238.
// ICA's 5 kr broccoli is not used: ICA has no ordinary prices, so it can't sell the whole box, and one store buys it all.
const one = boxCost(c, FIX, fixLive)!;
eq('box at one store', one.store.name, 'A');
near('box price one store', one.kr, 25.0738, 0.001);
eq('box deals', one.deals.map((o) => o.ingr), ['kycklingfile']);
near('box price no offers', boxCost(c, FIX, [])!.kr, 27.1238, 0.001);
// Lidl has offers but no ordinary prices, like ICA: a 10 kr/kg kyckling at Lidl shows in the overview but the box stays at A.
const withLidl: Prices = { ...FIX, stores: [...FIX.stores, { chain: 'Lidl', name: 'L' }], offers: [...FIX.offers, { ...offer('kycklingfile', 'Willys', 'L', 10, '2026-09-27'), chain: 'Lidl' }] };
const lidlLive = live(withLidl, '2026-09-26');
eq('lidl never a whole basket', [boxCost(c, withLidl, lidlLive)!.store.name, deals(withLidl, lidlLive).find((d) => d.id === 'kycklingfile')!.best.store], ['A', 'L']);
// Regions: a Stockholm Coop with kyckling at 50 must never price a box for Umeå, and wins for Stockholm.
// Stockholm sees only S + Lidl; S is Coop, so the box costs 27,1238 - 15,75 + 0,175 × 50 = 20,1238.
// A file without regions (written before 2026-10-03) counts its stores as Umeå.
const reg: Prices = { ...FIX, stores: [...FIX.stores.map((s) => ({ ...s, region: 'Umeå' as const })), { chain: 'Coop', name: 'S', region: 'Stockholm' }, { chain: 'Lidl', name: 'L' }],
  offers: [...FIX.offers, { ...offer('kycklingfile', 'Coop', 'S', 50, '2026-09-27') }] };
const inRegion = (r: Region) => { const P = forRegion(reg, r); return boxCost(c, P, live(P, '2026-09-26'))!; };
eq('umeå never sees stockholm', [inRegion('Umeå').store.name, forRegion(reg, 'Umeå').stores.map((s) => s.name)], ['A', ['A', 'B', 'C', 'I', 'L']]);
eq('stockholm store wins there', inRegion('Stockholm').store.name, 'S');
near('stockholm box price', inRegion('Stockholm').kr, 20.1238, 0.001);
eq('old file = umeå', forRegion(FIX, 'Umeå').stores.length, 4);
eq('old file has no stockholm stores', forRegion(FIX, 'Stockholm').stores.length, 0);
// A store missing an ingredient loses to one that has everything: gochujang only at Coop. 100 g × 200 + 1 kg × 90 = 110.
const g = basket([{ ingr: 'gochujang', g: 100 }, { ingr: 'kycklingfile', g: 1000 }], FIX, fixLive)!;
eq('complete store wins', [g.store.name, g.elsewhere], ['C', []]);
near('complete store price', g.kr, 110, 0.001);
// Pantry if you lack it, at store A: whole packs of skafferi kit items only. Teriyakisås 50 g -> one 250 g pack at 100 = 25;
// soja 16 g with no packs -> 0,8. Ris (carb) and kyckling (kött) never count.
const rows = [
  { key: 'teriyaki', need: 50, cat: 'skafferi', role: 'kit', packs: pickPacks(50, [250, 500]) },
  { key: 'soja', need: 16, cat: 'skafferi', role: 'bas', packs: [] },
  { key: 'ris', need: 120, cat: 'skafferi', role: 'carb', packs: pickPacks(120, [1000]) },
  { key: 'kycklingfile', need: 350, cat: 'kött', role: 'protein', packs: pickPacks(350, [500]) },
] as unknown as ShopRow[];
eq('pantry cost', pantryCost(rows, FIX, fixLive, one.store), { kr: 25.8, n: 2 });
// Green is measured against the usual cheapest across chains: kyckling 80 vs Coop's 90 = 11 %, vs its own 110 = 27 %.
const dk = deals(FIX, fixLive).find((d) => d.id === 'kycklingfile')!;
near('vs usual cheapest', dk.vsShelf ?? 0, 1 - 80 / 90, 0.001);
near('vs ordinary', dk.vsOrd ?? 0, 1 - 80 / 110, 0.001);
// 100 kr/kg ÷ 231 g protein per kg × 100 g = 43,29 kr per 100 g protein.
near('kr per protein', krPerProtein('kycklingfile', 100), 43.29, 0.01);
// Matching: pet food and flavoured tomatoes out, 18 % coconut milk in, "Färsk" prefix ignored.
eq('match', [matches('notfars', 'Nötfärs Bitar i Gelé Kattmat Våt'), matches('notfars', 'Färsk nötfärs'), matches('krossade', 'Smaksatta krossade tomater'),
  matches('kokosmjolk', 'Kokosmjölk 18%'), matches('kokosmjolk', 'Kokosmjölk 7%')], [false, true, false, true, false]);
// The fetched file has the shape the app reads (every shelf price positive, every offer on a known ingredient).
for (const [chain, rows] of Object.entries(PRICES.shelf)) for (const [id, r] of Object.entries(rows)) if (!(id in INGR) || !(r!.krKg >= 3)) fails.push(`prices.json: dålig hyllrad ${chain} ${id}`);
for (const o of PRICES.offers) if (!PRICES.stores.some((st) => st.name === o.store)) fails.push(`prices.json: okänd butik ${o.store}`);
for (const o of PRICES.offers) if (!(o.ingr in INGR) || !(o.krKg > 0) || !/^\d{4}-\d\d-\d\d$/.test(o.until)) fails.push(`prices.json: dåligt erbjudande ${o.store} ${o.name}`);

// ---------- Mutation test 2026-11-04: boundaries and tie-breaks Stryker showed unchecked ----------
// Clock: paused clocks keep their ms, nudge on a paused clock never goes below zero.
eq('leftMs running/paused', [leftMs({ end: 100 }, 40), leftMs({ left: 5 }, 999)], [60, 5]);
eq('running', [running({ end: 1 }), running({ left: 1 })], [true, false]);
eq('nudge paused', [nudge({ left: 1000 }, 500, 0), nudge({ left: 1000 }, -2000, 0)], [{ left: 1500 }, { left: 0 }]);
// "Klart kl 18:00" asked at exactly 18:00 is now, not tomorrow; 17:00 asks for later today.
const at18 = new Date(2026, 8, 24, 18, 0).getTime();
eq('readyAt now is today', [readyAt('18:00', at18), readyAt('18:00', at18 - 60 * MIN)], [at18, at18]);
// Day word when the step is today but the reference (first step) was yesterday: 17:00 and later is "i kväll".
const day24 = (h: number, m = 0) => new Date(2026, 8, 24, h, m).getTime();
eq('i kväll from 17', [fmtAtStr(day24(17), day24(12), day24(-1)), fmtAtStr(day24(16, 59), day24(12), day24(-1))], ['i kväll 17:00', 'i dag 16:59']);

// Prices.
eq('chains', CHAINS, ['Willys', 'ICA', 'Coop', 'Lidl']);
eq('norm', [norm('Färska Svenska Kycklingfilé '), norm('Fryst lax'), norm('Kyckling färsk lårfilé')], ['kycklingfile', 'lax', 'kyckling farsk larfile']);
eq('offer valid on its last day', live(FIX, '2026-09-27').map((o) => o.ingr), ['broccoli', 'kycklingfile']);
eq('region filters offers, Lidl is national', [forRegion(reg, 'Stockholm').offers.map((o) => o.store), forRegion(reg, 'Stockholm').stores.map((s) => s.name)], [['S'], ['S', 'L']]);
eq('a regionless Coop is Umeå', forRegion({ ...FIX, stores: [{ chain: 'Coop', name: 'C' }] }, 'Umeå').stores.length, 1);
// Usual cheapest: Coop's 90 beats Willys' 100; a tie keeps the first chain; a chain missing from the file is skipped.
const partial = { ...FIX, shelf: { Coop: FIX.shelf.Coop } } as unknown as Prices;
eq('regular', [regular(FIX, 'kycklingfile'), regular(FIX, 'broccoli'), regular(partial, 'gochujang'), regular(FIX, 'kokosmjolk')],
  [{ krKg: 90, chain: 'Coop' }, { krKg: 30, chain: 'Willys' }, { krKg: 200, chain: 'Coop' }, null]);
const o80 = offer('kycklingfile', 'Willys', 'A', 80, '2026-09-27'), o95 = offer('kycklingfile', 'Willys', 'A', 95, '2026-09-27');
const kk = offer('kokosmjolk', 'ICA', 'I', 40, '2026-09-27');
eq('unit: offer only when cheaper than usual', [unit(FIX, 'kycklingfile', [o80])?.krKg, unit(FIX, 'kycklingfile', [o95])?.krKg, unit(FIX, 'kycklingfile', [kk])?.krKg,
  unit(FIX, 'kokosmjolk', [kk])?.chain, unit(FIX, 'kokosmjolk', [])], [80, 90, 90, 'ICA', null]);
eq('unit: an equal offer is not a deal', unit(FIX, 'kycklingfile', [offer('kycklingfile', 'Coop', 'C', 90, '2026-09-27')])?.offer, undefined);
const storeA = FIX.stores[0], storeB = FIX.stores[1], storeI = FIX.stores[3];
const o100 = offer('kycklingfile', 'Willys', 'A', 100, '2026-09-27');
eq('atStore: chain missing from the file', atStore(partial, storeA, 'kycklingfile', []), null);
eq('atStore', [atStore(FIX, storeA, 'kycklingfile', [o80])?.krKg, atStore(FIX, storeB, 'kycklingfile', [o80])?.krKg, atStore(FIX, storeA, 'kycklingfile', [o100])?.offer,
  atStore(FIX, storeI, 'kokosmjolk', [kk])?.krKg, atStore(FIX, storeI, 'kokosmjolk', [])], [80, 100, undefined, 40, null]);
// needs: grams and ml summed × n per box, pieces and unweighed items left out.
const fakeCalc = (parts: { ingr?: string; q: number; u: string }[]) => ({ parts }) as unknown as BoxCalc;
eq('needs', needs([{ c: fakeCalc([{ ingr: 'ris', q: 100, u: 'g' }, { ingr: 'soja', q: 10, u: 'ml' }, { ingr: 'lime', q: 1, u: 'st' }, { q: 5, u: 'g' }]), n: 2 },
  { c: fakeCalc([{ ingr: 'ris', q: 50, u: 'g' }]), n: 1 }]), [{ ingr: 'ris', g: 250 }, { ingr: 'soja', g: 20 }]);
// Basket: fewest gaps beats a cheaper store; an equal price keeps the first store; unsold items are named in missing.
// The cheaper Coop with a gap comes last, so a later cheaper store cannot win on price alone.
const gap: Prices = { ...FIX, stores: [{ chain: 'Willys', name: 'A' }, { chain: 'Willys', name: 'B' }, { chain: 'Coop', name: 'C' }],
  shelf: { ...FIX.shelf, Coop: shelfOf({ kycklingfile: 10 }) } };
const bk = basket([{ ingr: 'kycklingfile', g: 1000 }, { ingr: 'ris', g: 1000 }, { ingr: 'kokosmjolk', g: 400 }], gap, [])!;
eq('basket gaps first, tie keeps first', [bk.store.name, bk.kr, bk.elsewhere, bk.missing], ['A', 120, [], [INGR.kokosmjolk.name]]);
eq('basket gap priced elsewhere', basket([{ ingr: 'ris', g: 1000 }], { ...gap, stores: [gap.stores[2]] }, [])!.elsewhere, [INGR.ris.name]);
eq('no basket at a chain without ordinary prices', basket([{ ingr: 'ris', g: 1000 }], { ...FIX, stores: [FIX.stores[3]] }, []), null);
// Pantry: rows not in INGR or with no price anywhere are skipped, a missing store price falls back to the usual cheapest.
const pRows = [
  { key: 'gochujang', need: 100, cat: 'skafferi', role: 'kit', packs: [] },
  { key: 'kokosmjolk', need: 400, cat: 'skafferi', role: 'kit', packs: [] },
  { key: 'Lime|st', need: 1, cat: 'skafferi', role: 'topp', packs: [] },
  { key: 'soja', need: 100, cat: 'skafferi', role: 'protein', packs: [] },
  { key: 'teriyaki', need: 100, cat: 'kylvara', role: 'kit', packs: [] },
  { key: 'olja', need: 100, cat: 'skafferi', role: 'carb', packs: [] },
] as unknown as ShopRow[];
eq('pantry fallback and skips', pantryCost(pRows, FIX, [], storeA), { kr: 20, n: 1 });
const dNo = deals(FIX, [kk])[0];
eq('deal without usual or ordinary price', [dNo.vsShelf, dNo.vsOrd], [undefined, undefined]);

// Prep.
eq('noun', [noun('Riven ingefära'), noun('Vitlöksklyftor, pressade'), noun('Gullök'), noun('Rödlök')], ['ingefära', 'vitlök', 'gul lök', 'rödlök']);
eq('job label ends with the noun', kitJobs(byId(KITS, 'keema')).every((j) => j.label.endsWith(' ' + j.key) && j.label.length > j.key.length + 1), true);
eq('protein job labels', [protPrep(kyc).job?.label, protPrep(byId(PROTEINS, 'lax')).job?.label], ['Skiva kyckling efter', 'Skär i portionsbitar (lax)']);
// No knife and not whole: no job (kikärtor rinse, linser in a sieve). Only kyckling counts whole in sous vide.
eq('no-knife prep is free', [protPrep(byId(PROTEINS, 'kikartor')).job, protPrep(byId(PROTEINS, 'linser')).job], [undefined, undefined]);
const svOnly = { ...byId(PROTEINS, 'lax'), id: 'x', methods: { sousvide: { ...byId(PROTEINS, 'lax').methods.sousvide!, prep: 'Salta' } } } as Protein;
eq('sous vide whole only for kyckling', protPrep(svOnly).job, undefined);
eq('cost: two bases two pots, empty is zero', [cost([{ kit: byId(KITS, 'teriyaki'), protein: kyc }, { kit: byId(KITS, 'keema'), protein: kyc }]).pots, cost([])],
  [2, { jobs: [], knife: 0, ingr: 0, pots: 0 }]);
// Near zero: one row per kit, its cheapest protein (same count as cost()), cheapest first, ties by name.
const easy = nearZero();
eq('nearZero one per kit', easy.map((e) => e.kit.id).sort(), KITS.map((k) => k.id).sort());
for (const e of easy) {
  const best = Math.min(...e.kit.protein.map((id) => cost([{ kit: e.kit, protein: byId(PROTEINS, id) }]).knife));
  // A tie keeps the first protein listed for the kit.
  const first = e.kit.protein.find((id) => cost([{ kit: e.kit, protein: byId(PROTEINS, id) }]).knife === best);
  if (e.protein.id !== first) fails.push(`nearZero ${e.kit.id}: ${e.protein.id}, want first cheapest ${first}`);
  if (e.cost !== best || e.jobs.reduce((s, j) => s + j.w, 0) !== e.cost || cost([{ kit: e.kit, protein: e.protein }]).knife !== best || protPrep(e.protein).m !== e.m) fails.push(`nearZero ${e.kit.id}: cost ${e.cost}, best ${best}`);
}
for (let i = 1; i < easy.length; i++) {
  const a = easy[i - 1], b = easy[i];
  if (a.cost > b.cost || (a.cost === b.cost && a.kit.name.localeCompare(b.kit.name, 'sv') > 0)) fails.push(`nearZero order: ${a.kit.id} before ${b.kit.id}`);
}
// Tree: branches biggest first, every node's n is its kits plus its branches' kits.
const walk = (n: PNode): void => {
  for (let i = 1; i < n.kids.length; i++) if (n.kids[i - 1].n < n.kids[i].n) fails.push(`prep tree ${n.id}: branches out of order`);
  if (n.n !== n.kits.length + n.kids.reduce((s, k) => s + k.n, 0)) fails.push(`prep tree ${n.id}: n ${n.n}`);
  n.kids.forEach(walk);
};
for (const p of PROTEINS) walk(prepTree(p));

// Goals: Mifflin-St Jeor in advanced mode. 80 kg, 180 cm, 30 år, PAL 1,5, bulk (+400), 3 lådor/dag = 20 % per låda.
// Man: (800 + 1125 - 150 + 5) × 1,5 + 400 = 3070 -> 614 -> 610 kcal; 80 × 2,0 × 0,2 = 32 g. Kvinna: -161 -> 2821 -> 560.
const adv = { ...DEFAULT_PLAN.goal, mode: 'advanced' as const, kind: 'bulk' as const, weight: 80, height: 180, age: 30, activity: 1.5, perDay: 3 };
const tm = targets(adv)!, tk = targets({ ...adv, sex: 'k' })!;
eq('advanced targets', [tm.dailyKcal, tm.kcal, tm.protein, tk.dailyKcal, tk.kcal], [3070, 610, 32, 2821, 560]);
eq('simple ignores boxes per day', targets({ ...DEFAULT_PLAN.goal, mode: 'simple', kind: 'bulk', weight: 80, perDay: 3 })!.kcal, 910);
eq('overrides and off', [targets({ ...adv, kcalBox: 700, proteinBox: 50 }), targets({ ...adv, mode: 'off' })], [{ dailyKcal: 3070, dailyProtein: 160, kcal: 700, protein: 50 }, null]);
eq('box share', [boxShare(0), boxShare(1), boxShare(2), boxShare(4)], [0.35, 0.35, 0.3, 0.15]);

// Packs: equal total keeps fewer packs whichever size is listed first; nothing to buy -> none.
eq('packs tie, big first', pickPacks(1000, [1000, 500]), [{ size: 1000, n: 1 }]);
eq('packs none', [pickPacks(-5, [500]), pickPacks(100, [])], [[], []]);

// Formatting boundaries.
eq('fmtQty', [fmtQty(1000, 'g'), fmtQty(21, 'g'), fmtQty(0.2, 'g'), fmtQty(100, 'ml'), fmtQty(99, 'ml'), fmtQty(5, 'krm'), fmtQty(4, 'krm'), fmtQty(3, 'tsk'),
  fmtQty(1.2, 'st'), fmtQty(2, ''), fmtQty(1.2, 'msk')], ['1 kg', '20 g', '1 g', '1 dl', '100 ml', '1 tsk', '4 krm', '1 msk', '1,5 st', 'efter smak', '1 msk']);
eq('fmtMin', [fmtMin(119), fmtMin(120), fmtMin(150)], ['119 min', '2 h', '2,5 h']);
eq('fmtPacks', fmtPacks([{ size: 500, n: 2 }, { size: 1000, n: 1 }]), '2 × 500 g + 1 × 1 kg');
const stp = (track: Step['track'], dur: number) => ({ id: '', track, t: 0, dur, title: '', details: '' });
eq('isLong', [isLong(stp('sousvide', 120)), isLong(stp('form', 119)), isLong(stp('ugn', 300))], [true, false, false]);
// Shopping: oil is not a shopping row, unweighed items are keyed by name and unit, cooked weight is summed.
const shop = shopping(calcs);
const row = (k: string) => shop.find((r) => r.key === k);
eq('shopping rows', [shop.some((r) => r.role === 'olja'), [row('kycklingfile')?.need, row('kycklingfile')?.cooked, row('kycklingfile')?.packs],
  [row('Vitlöksklyfta|st')?.need, row('Vitlöksklyfta|st')?.cooked, row('Vitlöksklyfta|st')?.packs]], [false, [700, 520, [{ size: 900, n: 1 }]], [3, undefined, []]]);
// Spare protein: 8 boxes, 4 × 175 g each, 900 g and 1000 g bought -> 1 more box of each. 3 boxes: kyckling 2 × 175 in a
// 500 g pack leaves 150 g, less than a box, so only nötfärs (1 × 175, 325 g over) is listed; 4 boxes list none.
const spareAt = (n: number) => { const p = { ...DEFAULT_PLAN, boxes: n }; return spare(resolveBoxes(p).map((b) => calcBox(b, p, null))).map((x) => [x.name, x.extra]); };
eq('spare', [spareAt(8), spareAt(3), spareAt(4)], [[['Kycklingfilé', 1], ['Nötfärs 10 %', 1]], [['Nötfärs 10 %', 1]], []]);
eq('partMacro only for weighed parts', [partMacro({ role: 'kit', ingr: 'ris', name: '', q: 100, u: 'st' }), partMacro({ role: 'kit', ingr: 'soja', name: '', q: 100, u: 'ml' }) !== null], [null, true]);
const vg = (id: string) => byId(VEGS, id);
eq('vegRoasted', [vegRoasted(vg('broccoli'), 'rostade'), vegRoasted(vg('broccoli'), 'frysta'), vegRoasted(vg('aubergine'), 'frysta'), vegRoasted(vg('wokmix'), 'rostade')], [true, false, true, false]);
eq('missing slots', missing({ i: 0, id: '', kit: byId(KITS, 'teriyaki'), protein: kyc }), ['carb', 'veg']);

// Schedule warnings. 6 boxes fill exactly 3 trays and do not warn; the default 8 need 4 and do. 4 proteins and 4 kits warn
// about both, 3 and 3 do not.
const six: Plan = { ...DEFAULT_PLAN, boxes: 6 };
const sixS = schedule(resolveBoxes(six).map((b) => calcBox(b, six, null)), six);
const dfltS = schedule(calcs, DEFAULT_PLAN);
eq('trays at the limit', [sixS.trays, sixS.warnings, dfltS.trays, dfltS.warnings], [3, [], 4, ['4 plåtar ryms inte på en gång. Kör två omgångar eller flytta ett protein till sous vide.']]);
const busy: Plan = { ...DEFAULT_PLAN, proteins: [...DEFAULT_PLAN.proteins, { id: 'lax', method: 'ugn' }, { id: 'halloumi', method: 'ugn' }], kits: [...DEFAULT_PLAN.kits, 'pesto'] };
const busyW = schedule(resolveBoxes(busy).map((b) => calcBox(b, busy, null)), busy).warnings;
eq('4 proteins and 4 kits warn', ['Fler än 3 proteiner gör schemat rörigt.', 'Fler än 3 smakkit: fler kastruller samtidigt.'].map((w) => busyW.includes(w)), [true, true]);
const three: Plan = { ...DEFAULT_PLAN, proteins: [...DEFAULT_PLAN.proteins, { id: 'lax', method: 'ugn' }] };
eq('3 proteins and 3 kits do not warn', schedule(resolveBoxes(three).map((b) => calcBox(b, three, null)), three).warnings.filter((w) => w.startsWith('Fler än')), []);

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
