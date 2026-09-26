// Pure calculation engine: plan in, boxes/nutrition/shopping/schedule out. No React, no DOM.
import {
  BASES, byId, CARBS, DEFAULT_METHOD, INGR, isOven, KITS, OIL_G_PER_RAW_G, PROTEINS, TRAY_CAPACITY_G, VEGS,
  type Base, type Carb, type IngrId, type Kit, type Macro, type MethodId, type Protein, type Unit, type Veg,
} from './data.ts';

// ---------- Plan (persisted state) ----------

export type GoalKind = 'bulk' | 'behall' | 'deff';
export interface Goal {
  mode: 'off' | 'simple' | 'advanced';
  kind: GoalKind;
  weight: number;
  height: number;
  age: number;
  sex: 'm' | 'k';
  activity: number; // PAL multiplier
  perDay: number; // boxes eaten per day
  proteinBox: number | null; // manual slider override, g
  kcalBox: number | null; // manual slider override
}

export type Slot = 'protein' | 'kit' | 'carb' | 'veg';
export interface Plan {
  v: 1;
  boxes: number;
  proteins: { id: string; method: MethodId }[];
  kits: string[];
  kitProtein: Record<string, string>; // protein for all boxes of a kit; any protein, not only the selected ones
  kitCarb: Record<string, string>;
  kitVeg: Record<string, string>;
  vegMode: 'rostade' | 'frysta';
  overrides: Record<number, Partial<Record<Slot, string | null>>>; // null = cleared on purpose
  goal: Goal;
}

export const DEFAULT_PLAN: Plan = {
  v: 1,
  boxes: 8,
  proteins: [{ id: 'kyckling', method: 'ugn' }, { id: 'notfars', method: 'ugn' }],
  kits: ['teriyaki', 'grekisk', 'texmex'],
  kitProtein: {},
  kitCarb: {},
  kitVeg: {},
  vegMode: 'rostade',
  overrides: {},
  goal: { mode: 'simple', kind: 'behall', weight: 75, height: 180, age: 30, sex: 'm', activity: 1.55, perDay: 2, proteinBox: null, kcalBox: null },
};

// ---------- Boxes ----------

export interface Box {
  i: number;
  kit?: Kit;
  protein?: Protein;
  method?: MethodId;
  carb?: Carb;
  veg?: Veg;
}

/** Split n into k near-equal counts, earlier ones get the remainder. */
export const split = (n: number, k: number): number[] =>
  Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));

export function resolveBoxes(p: Plan): Box[] {
  const kits = p.kits.map((id) => byId(KITS, id));
  const kitCounts = split(p.boxes, Math.max(1, kits.length));
  const kitOf: (Kit | undefined)[] = kits.length ? kits.flatMap((k, i) => Array<Kit>(kitCounts[i]).fill(k)) : Array(p.boxes).fill(undefined);

  // Proteins: even counts, then each box greedily takes the protein its kit prefers.
  const left = new Map<string, number>();
  split(p.boxes, Math.max(1, p.proteins.length)).forEach((c, i) => p.proteins[i] && left.set(p.proteins[i].id, c));
  // Kits with a chosen protein take it first (and use up its share); the rest share what is left.
  const fixed = (k?: Kit) => { const id = k && p.kitProtein[k.id]; return id && PROTEINS.some((x) => x.id === id) ? id : undefined; };
  for (const k of kitOf) { const f = fixed(k); if (f && left.has(f)) left.set(f, left.get(f)! - 1); }
  const pinned = new Set(kitOf.map(fixed).filter(Boolean));
  const protOf: (string | undefined)[] = kitOf.map((k) => {
    const f = fixed(k);
    if (f) return f;
    const pref = (k?.protein ?? []).find((id) => (left.get(id) ?? 0) > 0);
    // Fallback: the unpinned protein with most share left, even past its share: a protein pinned to a kit
    // stays there instead of spilling into other kits. Only if every protein is pinned does a pinned one fill in.
    const byLeft = (xs: [string, number][]) => xs.sort((a, b) => b[1] - a[1])[0]?.[0];
    const pick = pref ?? byLeft([...left.entries()].filter(([id]) => !pinned.has(id))) ?? byLeft([...left.entries()].filter(([, c]) => c > 0));
    if (pick) left.set(pick, (left.get(pick) ?? 0) - 1);
    return pick;
  });

  return kitOf.map((k, i) => {
    const o = p.overrides[i] ?? {};
    const pick = (slot: Slot, dflt: string | undefined) => (slot in o ? o[slot] ?? undefined : dflt);
    const kitId = pick('kit', k?.id);
    const kit = kitId ? byId(KITS, kitId) : undefined;
    const protId = pick('protein', protOf[i]);
    const protein = protId ? byId(PROTEINS, protId) : undefined;
    const carbId = pick('carb', kit ? p.kitCarb[kit.id] ?? kit.carb : undefined);
    const vegId = pick('veg', kit ? p.kitVeg[kit.id] ?? kit.veg : undefined);
    const method = protein ? p.proteins.find((x) => x.id === protein.id)?.method ?? DEFAULT_METHOD(protein) : undefined;
    return {
      i, kit, protein,
      method: protein && method && protein.methods[method] ? method : protein ? DEFAULT_METHOD(protein) : undefined,
      carb: carbId ? byId(CARBS, carbId) : undefined,
      veg: vegId ? byId(VEGS, vegId) : undefined,
    };
  });
}

export const missing = (b: Box): Slot[] =>
  (['protein', 'kit', 'carb', 'veg'] as const).filter((s) => !b[s]);

// ---------- Goals ----------

const KIND = {
  bulk: { kcalKg: 38, protKg: 2.0, delta: 400, label: 'Bulka' },
  behall: { kcalKg: 33, protKg: 1.8, delta: 0, label: 'Behåll' },
  deff: { kcalKg: 28, protKg: 2.2, delta: -450, label: 'Deffa' },
} as const;
export const GOAL_KINDS = KIND;

/** Share of the day's energy one box covers (other meals exist). */
export const boxShare = (perDay: number) => Math.min(0.35, 0.6 / Math.max(1, perDay));

export interface Targets { kcal: number; protein: number; dailyKcal: number; dailyProtein: number }
export function targets(g: Goal): Targets | null {
  if (g.mode === 'off') return null;
  const k = KIND[g.kind];
  const dailyKcal = g.mode === 'simple'
    ? g.weight * k.kcalKg
    : (10 * g.weight + 6.25 * g.height - 5 * g.age + (g.sex === 'm' ? 5 : -161)) * g.activity + k.delta; // Mifflin-St Jeor
  const dailyProtein = g.weight * k.protKg;
  const share = boxShare(g.mode === 'simple' ? 2 : g.perDay);
  return {
    dailyKcal, dailyProtein,
    kcal: g.kcalBox ?? Math.round(dailyKcal * share / 10) * 10,
    protein: g.proteinBox ?? Math.round(dailyProtein * share),
  };
}

// ---------- Nutrition per box ----------

export type Role = 'protein' | 'carb' | 'veg' | 'olja' | 'bas' | 'kit' | 'topp';
export interface Part { role: Role; ingr?: IngrId; name: string; q: number; u: Unit; cooked?: number }
export interface BoxCalc { box: Box; parts: Part[]; m: Macro; missing: Slot[] }

const macroOf = (id: IngrId, grams: number): Macro => INGR[id].n.map((v) => (v * grams) / 100) as unknown as Macro;
const addM = (a: Macro, b: Macro): Macro => a.map((v, i) => v + b[i]) as unknown as Macro;
const ZERO: Macro = [0, 0, 0, 0];
/** One part's kcal, protein, carbs, fat; null for items that don't count (spices, "efter smak"). */
export const partMacro = (x: Part): Macro | null => (x.ingr && (x.u === 'g' || x.u === 'ml') ? macroOf(x.ingr, x.q) : null);
const sumParts = (parts: Part[]): Macro =>
  parts.reduce<Macro>((acc, x) => (x.ingr && (x.u === 'g' || x.u === 'ml') ? addM(acc, macroOf(x.ingr, x.q)) : acc), ZERO);

/** The one rule for veg: roasted if it can be and the mode says so, or if it is never bought frozen. */
export const vegRoasted = (v: Veg, mode: Plan['vegMode']) => !!v.oven && !v.frozenOnly && (mode === 'rostade' || !!v.freshOnly);
const roasted = (b: Box, role: 'protein' | 'carb' | 'veg', vegMode: Plan['vegMode']) =>
  role === 'protein' ? isOven(b.method) : role === 'carb' ? !!b.carb?.oven : !!b.veg && vegRoasted(b.veg, vegMode);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r5 = (v: number) => Math.round(v / 5) * 5;

export function calcBox(b: Box, p: Plan, t: Targets | null): BoxCalc {
  const mk = (role: 'protein' | 'carb' | 'veg', ingr: IngrId, name: string, q: number): Part[] => {
    const y = INGR[ingr].y;
    const part: Part = { role, ingr, name, q, u: 'g', cooked: y ? r5(q * y) : undefined };
    return roasted(b, role, p.vegMode) ? [part, { role: 'olja', ingr: 'olja', name: 'Olja', q: q * OIL_G_PER_RAW_G, u: 'g' }] : [part];
  };
  const base = b.kit?.base ? byId(BASES, b.kit.base) : undefined;
  const kitParts: Part[] = b.kit
    ? [...(base?.items ?? []).map((x): Part => ({ role: 'bas', ingr: x.ingr, name: x.name, q: x.q, u: x.u })),
       ...b.kit.mix.map((x): Part => ({ role: 'kit', ingr: x.ingr, name: x.name, q: x.q, u: x.u })),
       ...b.kit.top.map((x): Part => ({ role: 'topp', ingr: x.ingr, name: x.name, q: x.q, u: x.u }))]
    : [];
  const veg = b.veg ? mk('veg', b.veg.ingr, b.veg.name + (vegRoasted(b.veg, p.vegMode) ? '' : ' (fryst)'), b.veg.raw) : [];

  // Goal solver: protein grams hit the protein target, carb grams hit the kcal target.
  // They affect each other (rice has protein, meat has kcal), so iterate to a fixed point; 4 rounds is plenty.
  let protRaw = b.protein?.raw ?? 0;
  let carbRaw = b.carb?.raw ?? 0;
  const carbOf = (g: number) => (b.carb ? mk('carb', b.carb.ingr, b.carb.name, g) : []);
  const protOf = (g: number) => (b.protein ? mk('protein', b.protein.ingr, b.protein.name, g) : []);
  for (let round = 0; t && round < 4; round++) {
    if (b.protein) {
      const others = sumParts([...kitParts, ...veg, ...carbOf(carbRaw)])[1];
      protRaw = r5(clamp((t.protein - others) / (INGR[b.protein.ingr].n[1] / 100), 60, 400));
    }
    if (b.carb) {
      const rest = sumParts([...kitParts, ...veg, ...protOf(protRaw)])[0];
      const oil = roasted(b, 'carb', p.vegMode) ? OIL_G_PER_RAW_G * 8.84 : 0;
      carbRaw = r5(clamp((t.kcal - rest) / (INGR[b.carb.ingr].n[0] / 100 + oil), 20, b.carb.raw * 3));
    }
  }
  const prot = protOf(protRaw);
  const carb = carbOf(carbRaw);

  const parts = [...prot, ...carb, ...veg, ...kitParts];
  return { box: b, parts, m: sumParts(parts), missing: missing(b) };
}

// ---------- Shopping ----------

export interface Pack { size: number; n: number }
/** Fewest-waste package combo (max two sizes) covering `need`. Ties: fewer packages. */
export function pickPacks(need: number, sizes: readonly number[]): Pack[] {
  if (need <= 0 || !sizes.length) return [];
  let best: { packs: Pack[]; total: number; count: number } | null = null;
  const consider = (packs: Pack[]) => {
    const total = packs.reduce((s, x) => s + x.size * x.n, 0);
    const count = packs.reduce((s, x) => s + x.n, 0);
    if (total < need) return;
    if (!best || total < best.total || (total === best.total && count < best.count)) best = { packs: packs.filter((x) => x.n > 0), total, count };
  };
  for (const a of sizes) {
    consider([{ size: a, n: Math.ceil(need / a) }]);
    for (const b of sizes) {
      if (b >= a) continue;
      for (let na = 1; na * a < need + a; na++) consider([{ size: a, n: na }, { size: b, n: Math.max(0, Math.ceil((need - na * a) / b)) }]);
    }
  }
  return (best as { packs: Pack[] } | null)?.packs.sort((x, y) => y.size - x.size) ?? [];
}

export interface ShopRow { key: string; name: string; need: number; u: Unit; cat: string; packs: Pack[]; cooked?: number; role: Role }
export function shopping(calcs: BoxCalc[]): ShopRow[] {
  const rows = new Map<string, ShopRow>();
  for (const c of calcs) for (const x of c.parts) {
    if (x.role === 'olja') continue;
    const key = x.ingr && (x.u === 'g' || x.u === 'ml') ? x.ingr : `${x.name}|${x.u}`;
    const r = rows.get(key) ?? { key, name: x.ingr ? INGR[x.ingr].name : x.name, need: 0, u: x.u, cat: x.ingr ? INGR[x.ingr].cat : 'skafferi', packs: [], role: x.role, cooked: x.cooked === undefined ? undefined : 0 };
    r.need += x.q;
    if (r.cooked !== undefined && x.cooked) r.cooked += x.cooked;
    rows.set(key, r);
  }
  return [...rows.values()].map((r) => ({ ...r, packs: INGR[r.key as IngrId]?.packs ? pickPacks(r.need, INGR[r.key as IngrId].packs ?? []) : [] }));
}

/** Boxes grouped by identical recipe (kit + protein + carb + veg), first box of each group as the sample. */
export function boxTypes(calcs: BoxCalc[]): { c: BoxCalc; n: number }[] {
  const m = new Map<string, { c: BoxCalc; n: number }>();
  for (const c of calcs) {
    const k = [c.box.kit?.id, c.box.protein?.id, c.box.carb?.id, c.box.veg?.id].join('|');
    const cur = m.get(k);
    m.set(k, cur ? { ...cur, n: cur.n + 1 } : { c, n: 1 });
  }
  return [...m.values()];
}

// ---------- Bases ----------

export interface BaseBatch { base: Base; n: number; kits: { kit: Kit; n: number }[] }
/** Boxes grouped by the shared base their kit sits on, in BASES order. */
export function baseBatches(calcs: BoxCalc[]): BaseBatch[] {
  return BASES.map((base) => {
    const mine = calcs.filter((c) => c.box.kit?.base === base.id);
    const kits = [...new Map(mine.map((c) => [c.box.kit!.id, c.box.kit!])).values()]
      .map((kit) => ({ kit, n: mine.filter((c) => c.box.kit!.id === kit.id).length }));
    return { base, n: mine.length, kits };
  }).filter((x) => x.n > 0);
}

// ---------- Schedule ----------

export type Track = 'prep' | 'ugn' | 'spis' | 'sousvide' | 'form' | 'klar';
// `what` = short caption under a running clock ("Kyckling i ugnen"); only steps that have it get a timer.
export interface Step { id: string; track: Track; t: number; dur: number; title: string; details: string; temp?: number; what?: string; rows?: StepLine[] }
/** Long jobs (overnight sous vide, the form) start hours ahead: own row in the live view, own prep in their step. */
export const LONG_MIN = 120;
export const isLong = (s: Step) => (s.track === 'sousvide' || s.track === 'form') && s.dur >= LONG_MIN;
/** One line in a step's list: an ingredient with its amount, or a kit with its twist and tip. */
export interface StepLine { name: string; right: string; sub?: string; note?: string; hue?: number }
export interface Schedule { steps: Step[]; trays: number; total: number; warnings: string[] }

export function schedule(calcs: BoxCalc[], p: Plan): Schedule {
  const raw = (pred: (c: BoxCalc, x: Part) => boolean) => calcs.reduce((s, c) => s + c.parts.filter((x) => pred(c, x)).reduce((a, x) => a + x.q, 0), 0);
  const used = <T extends { id: string }>(get: (b: Box) => T | undefined) => [...new Map(calcs.map((c) => get(c.box)).filter((x): x is T => !!x).map((x) => [x.id, x])).values()];

  const protMethods = [...new Map(calcs.filter((c) => c.box.protein && c.box.method).map((c) => [`${c.box.protein!.id}:${c.box.method}`, { pr: c.box.protein!, m: c.box.method! }])).values()];
  const ovenProt = protMethods.filter((x) => isOven(x.m));
  const ovenCarbs = used((b) => (b.carb?.oven ? b.carb : undefined));
  const stoveCarbs = used((b) => (b.carb?.stove ? b.carb : undefined));
  const ovenVegs = used((b) => (b.veg && vegRoasted(b.veg, p.vegMode) ? b.veg : undefined));
  const frozen = used((b) => (b.veg && !vegRoasted(b.veg, p.vegMode) ? b.veg : undefined));

  const E = Math.max(0, ...ovenProt.map((x) => x.pr.methods[x.m]!.min), ...ovenCarbs.map((c) => c.oven!), ...ovenVegs.map((v) => v.oven!));
  const steps: Step[] = [];
  const warnings: string[] = [];

  const protRaw = raw((c, x) => x.role === 'protein' && isOven(c.box.method));
  const carbRaw = raw((c, x) => x.role === 'carb' && !!c.box.carb?.oven);
  const vegRaw = raw((c, x) => x.role === 'veg' && roasted(c.box, 'veg', p.vegMode));
  const trays = [protRaw, carbRaw, vegRaw].reduce((s, g) => s + Math.ceil(g / TRAY_CAPACITY_G), 0);
  if (trays > 3) warnings.push(`${trays} plåtar ryms inte på en gång. Kör två omgångar eller flytta ett protein till sous vide.`);
  if (p.proteins.length > 3) warnings.push('Fler än 3 proteiner gör schemat rörigt.');
  if (p.kits.length > 3) warnings.push('Fler än 3 smakkit: fler kastruller samtidigt.');

  // Prep list: every ingredient that needs knife work before cooking, with the batch's raw amount.
  // Sous vide and form proteins carry their own prep in their step, since the long ones start before this list.
  const batches = baseBatches(calcs);
  const protRaw_ = (pr: Protein, m: MethodId) => raw((c, x) => x.role === 'protein' && c.box.protein?.id === pr.id && c.box.method === m);
  const prepRows: StepLine[] = [
    ...protMethods.filter(({ pr, m }) => pr.methods[m]!.prep && m !== 'sousvide' && m !== 'form').map(({ pr, m }) =>
      ({ name: pr.name, right: fmtG(protRaw_(pr, m)), note: pr.methods[m]!.prep })),
    ...used((b) => (b.carb?.prep ? b.carb : undefined)).map((cb) =>
      ({ name: cb.name, right: fmtG(raw((c, x) => x.role === 'carb' && c.box.carb?.id === cb.id)), note: cb.prep })),
    ...ovenVegs.filter((v) => v.prep).map((v) =>
      ({ name: v.name, right: fmtG(raw((c, x) => x.role === 'veg' && c.box.veg?.id === v.id && roasted(c.box, 'veg', p.vegMode))), note: v.prep })),
    ...batches.flatMap(({ base, n }) => base.items.filter((x) => x.prep).map((x) =>
      ({ name: `${x.name} (${base.name.toLowerCase()})`, right: fmtQty(x.q * n, x.u), note: x.prep }))),
  ];
  const prepDur = clamp(prepRows.length * 5, 10, 30);

  // Sous vide and form. Long ones run before the oven session and end as it starts; short ones (lax) end with the oven.
  for (const { pr, m } of protMethods) {
    const md = pr.methods[m]!;
    if (m !== 'sousvide' && m !== 'form') continue;
    const need = protRaw_(pr, m);
    // A whole piece (karré) goes in as bought, so its rub is scaled to the packs, not to what the boxes need.
    const packs = INGR[pr.ingr].packs;
    const w = pr.rub && packs ? pickPacks(need, packs).reduce((s, x) => s + x.n * x.size, 0) : need;
    const rows: StepLine[] = [{ name: INGR[pr.ingr].name, right: fmtG(w), note: md.prep }, ...(pr.rub ?? []).map((x) => ({ name: x.name, right: fmtQty((x.q * w) / 1000, x.u) }))];
    if (m === 'sousvide') {
      // A short bath (lax) is heated during prep, a long one when it starts.
      const long = md.min >= LONG_MIN;
      steps.push({ id: `sv-${pr.id}`, track: 'sousvide', t: long ? -md.min : E - md.min, dur: md.min, temp: md.temp, title: `${pr.name} i sous vide`, what: `${pr.name} i sous vide`,
        details: long ? `Sätt badet på ${md.temp} °C. ${md.note}` : md.note, rows });
      if (md.sear) steps.push({ id: `sear-${pr.id}`, track: 'spis', t: E, dur: 5, title: `Bryn ${pr.name.toLowerCase()}`, details: md.sear });
    } else {
      steps.push({ id: `form-${pr.id}`, track: 'form', t: -md.min - 15, dur: md.min, temp: md.temp, title: `${pr.name} i form`, what: `${pr.name} i formen`, details: `Sätt ugnen på ${md.temp} °C. ${md.note}`, rows });
      steps.push({ id: `form-up`, track: 'ugn', t: -15, dur: 15, temp: 200, title: 'Ta ut formen, höj ugnen till 200 °C', details: 'Låt köttet vila under folien medan ugnen blir varm.' });
    }
  }
  if (steps.filter((s) => s.track === 'sousvide').length > 1) warnings.push('Flera proteiner i sous vide: ett bad per temperatur, eller kör dem efter varandra.');
  // Prep sits right before the oven session, after the long jobs are already going.
  const t0 = Math.min(0, ...steps.filter((s) => !isLong(s)).map((s) => s.t));
  const form = steps.some((s) => s.track === 'form');
  steps.unshift({ id: 'prep', track: 'prep', t: t0 - prepDur, dur: prepDur, title: 'Förbered allt', rows: prepRows.length ? prepRows : undefined,
    details: `${form ? '' : 'Sätt ugnen på 200 °C varmluft. '}${steps.filter((s) => s.track === 'sousvide' && !isLong(s)).map((s) => `Sätt sous vide-badet på ${s.temp} °C. `).join('')}Det som ska in i ugnen: blanda med olja, salt, peppar och vitlökspulver. Ingen smaksättning ännu.` });

  for (const c of ovenCarbs) steps.push({ id: `carb-${c.id}`, track: 'ugn', t: E - c.oven!, dur: c.oven!, temp: 200, title: `${c.name} in`, what: `${c.name} i ugnen`, details: 'Ett lager på bakplåtspapper. Vänd halvvägs.' });
  // Whole fillets get their own id, so kyckling in bitar and hel can share one oven session.
  for (const { pr, m } of ovenProt) { const md = pr.methods[m]!; const nm = m === 'hel' ? `${pr.name}, hela filéer` : pr.name; steps.push({ id: m === 'ugn' ? `prot-${pr.id}` : `prot-${pr.id}-${m}`, track: 'ugn', t: E - md.min, dur: md.min, temp: md.temp, title: `${nm} in`, what: `${nm} i ugnen`, details: md.note }); }
  if (ovenVegs.length) steps.push({ id: 'veg', track: 'ugn', t: E - Math.max(...ovenVegs.map((v) => v.oven!)), dur: Math.max(...ovenVegs.map((v) => v.oven!)), temp: 200, title: 'Grönsaker in', what: 'Grönsaker i ugnen', details: ovenVegs.map((v) => v.name).join(' och ') + ' på egen plåt.' });
  for (const { pr } of protMethods.filter((x) => x.m === 'gryta')) { const md = pr.methods.gryta!; steps.push({ id: `gryta-${pr.id}`, track: 'spis', t: Math.max(0, E - md.min), dur: md.min, title: `Koka ${pr.name.toLowerCase()}`, what: `${pr.name} kokar`, details: md.note }); }
  if (stoveCarbs.length) {
    const d = Math.max(...stoveCarbs.map((c) => c.stoveMin ?? 10));
    const names = stoveCarbs.map((c) => c.name.toLowerCase()).join(' och ');
    steps.push({ id: 'stove', track: 'spis', t: Math.max(0, E - d), dur: d, title: 'Koka ' + names, what: names.replace(/^./, (m) => m.toUpperCase()) + ' på spisen', details: stoveCarbs.map((c) => c.stove).join('. ') + '.' });
  }
  // Each shared base is cooked once for all its boxes while the oven runs.
  for (const { base, n } of batches) {
    steps.push({ id: `base-${base.id}`, track: 'spis', t: Math.max(0, E - base.min), dur: base.min, title: `${base.title} för ${n} lådor`,
      what: base.min >= 5 ? `${base.name} puttrar` : undefined, details: base.how,
      rows: base.items.map((x) => ({ name: x.name, right: fmtQty(x.q * n, x.u) })) });
  }
  steps.push({ id: 'out', track: 'ugn', t: E, dur: 5, title: 'Ta ut allt', details: 'Låt ånga av.' });
  let T = E + 5;
  // Split each base between its kits, then the sauce kits that have no base. One row per kit.
  const kitRow = (kit: Kit): StepLine => {
    const n = calcs.filter((c) => c.box.kit?.id === kit.id).length;
    return { name: kit.name, right: `×${n}`, sub: kit.mix.length ? '+ ' + kit.mix.map((x) => x.name.toLowerCase()).join(', ') : undefined, note: kit.tip, hue: kit.hue };
  };
  const splitDur = batches.length ? Math.max(...batches.map((x) => (x.kits.some((k) => k.kit.sauce) ? 10 : 5))) : 0;
  for (const { base, kits } of batches) {
    steps.push({ id: `split-${base.id}`, track: 'spis', t: T, dur: splitDur, title: kits.length > 1 ? `Dela ${base.def} i ${kits.length}` : `Smaksätt ${base.def}`,
      details: '', rows: kits.map(({ kit }) => kitRow(kit)) });
  }
  const sauceKits = used((b) => (b.kit?.sauce && !b.kit.base ? b.kit : undefined));
  if (sauceKits.length) steps.push({ id: 'sauce', track: 'spis', t: T, dur: 10, title: 'Koka ihop såserna', details: '', rows: sauceKits.map(kitRow) });
  T += Math.max(splitDur, sauceKits.length ? 10 : 0);
  // What goes in each box, by box type: cooked weights (what goes on the scale), frozen veg as is, toppings on the side.
  const perKit = (id: string) => calcs.filter((c) => c.box.kit?.id === id).length;
  const portionRows: StepLine[] = boxTypes(calcs).map(({ c, n }) => {
    const kit = c.box.kit!;
    const main = c.parts.filter((x) => x.role === 'protein' || x.role === 'carb' || x.role === 'veg')
      .map((x) => `${x.name} ${x.cooked ? `ca ${fmtG(x.cooked)}` : fmtG(x.q)}`);
    if (kit.base || kit.mix.length) main.push(`${kit.sauce || kit.base === 'tomat' || kit.base === 'kram' ? 'Såsen' : 'Smaksättningen'} delad på ${perKit(kit.id)}`);
    const top = kit.top.map((x) => (x.u ? `${x.name.toLowerCase()} ${fmtQty(x.q, x.u)}` : x.name.toLowerCase()));
    return { name: kit.name, right: `×${n}`, hue: kit.hue, sub: main.join(' · '), note: top.length ? `Egen burk: ${top.join(', ')}` : undefined };
  });
  steps.push({ id: 'portion', track: 'klar', t: T, dur: 15, title: 'Kyl ner och portionera', rows: portionRows,
    details: `Låt allt svalna först.${frozen.length ? ` ${frozen.map((v) => v.name).join(', ')} läggs frysta direkt i lådan.` : ''} Toppings i separata burkar.` });
  T += 15;
  steps.push({ id: 'store', track: 'klar', t: T, dur: 0, title: 'Märk och kyl', details: 'Håller 3–4 dagar i kylen, lax 2 dagar. Ät de känsligaste först och frys resten.' });

  return { steps: steps.sort((a, b) => a.t - b.t), trays, total: T - Math.min(...steps.map((s) => s.t)), warnings };
}

// ---------- Formatting (sv-SE: decimal comma, space thousands) ----------

export const nf = (v: number, d = 0) => v.toLocaleString('sv-SE', { maximumFractionDigits: d, minimumFractionDigits: 0 });
// Small amounts (sesame, feta) in whole grams; larger ones to the nearest 5.
export const fmtG = (g: number) => (g >= 1000 ? nf(g / 1000, 1) + ' kg' : g < 20 ? nf(Math.max(1, Math.round(g))) + ' g' : nf(r5(g)) + ' g');
export function fmtQty(q: number, u: Unit): string {
  if (!u) return 'efter smak';
  if (u === 'g') return fmtG(q);
  if (u === 'ml') return q >= 100 ? nf(Math.round(q / 10) / 10, 1) + ' dl' : nf(r5(q)) + ' ml';
  if (u === 'krm' && q >= 5) return fmtQty(q / 5, 'tsk');
  if (u === 'tsk' && q >= 3) return nf(Math.round((q / 3) * 2) / 2, 1) + ' msk';
  if (u === 'st') return nf(Math.ceil(q * 2) / 2, 1) + ' st';
  return nf(Math.round(q * 2) / 2, 1) + ' ' + u;
}
export const fmtPacks = (packs: Pack[]) => packs.map((x) => `${x.n} × ${fmtG(x.size)}`).join(' + ');
export const fmtMin = (m: number) => (m >= 120 ? `${nf(m / 60, 1)} h` : `${m} min`);
