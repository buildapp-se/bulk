// Prep tree: knife work is what costs time, spices and jars are free. A job (hacka gul lök) done once serves every dish
// that needs it, so the best batch is the one where many kits share few jobs. No React.
import { BASES, byId, KITS, PROTEINS, type Base, type Kit, type KitItem, type MethodId, type Protein } from './data.ts';

export interface Job { key: string; label: string; w: number }

// "Riven ingefära" and "Vitlöksklyftor" are the same job as the base's ingefära and vitlök.
const noun = (name: string) => {
  const n = name.split(',')[0].toLowerCase().replace(/^(riven|färsk|hackad|rå) /, '').replace(/sklyft(a|or)$/, '');
  return n === 'gullök' ? 'gul lök' : n;
};
const job = (it: KitItem): Job => ({ key: noun(it.name), label: `${it.prep} ${noun(it.name)}`, w: 1 });
const cuts = (items: readonly KitItem[]) => items.filter((x) => x.prep).map(job);

export const baseJobs = (b: Base) => cuts(b.items);
/** The kit's own knife work, not counting its base. */
export const ownJobs = (k: Kit) => cuts([...k.mix, ...k.top]);
export const kitJobs = (k: Kit) => [...(k.base ? baseJobs(byId(BASES, k.base)) : []), ...ownJobs(k)];

/**
 * A protein at its least knife work. Whole fillets (oven or sous vide) only need slicing once, at portioning: half a job.
 * Ties keep the first method, so whole in the oven wins over sous vide.
 */
export function protPrep(p: Protein): { m: MethodId; job?: Job } {
  const opts = (Object.keys(p.methods) as MethodId[]).map((m) => {
    const prep = p.methods[m]!.prep;
    const knife = !!prep && /skär|tärna|dela/i.test(prep);
    const whole = !knife && (m === 'hel' || (m === 'sousvide' && p.id === 'kyckling'));
    const w = knife ? 1 : whole ? 0.5 : 0;
    return { m, job: w ? { key: p.id, label: whole ? `Skiva ${p.name.toLowerCase()} efter` : `${prep} (${p.name.toLowerCase()})`, w } : undefined };
  });
  return opts.reduce((a, b) => ((b.job?.w ?? 0) < (a.job?.w ?? 0) ? b : a));
}

export interface Combo { kits: readonly Kit[]; proteins: readonly Protein[]; jobs: readonly Job[]; cost: number; variants: number; pots: number }

const uniq = (jobs: Job[]) => [...new Map(jobs.map((j) => [j.key, j])).values()];

export function combo(kits: readonly Kit[], proteins: readonly Protein[]): Combo {
  const jobs = uniq([...proteins.flatMap((p) => protPrep(p).job ?? []), ...kits.flatMap(kitJobs)]);
  return {
    kits, proteins, jobs,
    cost: jobs.reduce((s, j) => s + j.w, 0),
    variants: kits.reduce((s, k) => s + k.protein.filter((id) => proteins.some((p) => p.id === id)).length, 0),
    pots: new Set(kits.map((k) => k.base ?? k.id)).size,
  };
}

/** Kits that pair with at least one of the proteins. */
export const eligible = (proteins: readonly Protein[]) => KITS.filter((k) => k.protein.some((id) => proteins.some((p) => p.id === id)));

/**
 * The `top` n-kit batches with the least knife work, then the most kit × protein variants, then the fewest pots.
 * ponytail: brute force over all n-kit subsets with job bitmasks; C(32,6) ≈ 900k is the ceiling, fine up to n = 6.
 */
export function best(proteins: readonly Protein[], n: number, top = 3): Combo[] {
  const ks = eligible(proteins);
  const keys = [...new Set(ks.flatMap(kitJobs).map((j) => j.key))];
  if (keys.length > 31) throw new Error(`prep: ${keys.length} jobs, bitmask holds 31`);
  const mask = ks.map((k) => kitJobs(k).reduce((m, j) => m | (1 << keys.indexOf(j.key)), 0));
  const vars = ks.map((k) => k.protein.filter((id) => proteins.some((p) => p.id === id)).length);
  const bits = (m: number) => { let c = 0; for (; m; m &= m - 1) c++; return c; };
  // Keep only the best few while walking, so up to a million subsets never sit in one array.
  const keep = top * 4;
  const found: { idx: number[]; cost: number; v: number }[] = [];
  const worse = (a: { cost: number; v: number }, b: { cost: number; v: number }) => a.cost - b.cost || b.v - a.v;
  const pick: number[] = [];
  const walk = (from: number, m: number, v: number) => {
    if (pick.length === n) {
      const f = { idx: pick, cost: bits(m), v };
      if (found.length === keep && worse(f, found[keep - 1]) >= 0) return;
      found.push({ ...f, idx: [...pick] });
      found.sort(worse);
      if (found.length > keep) found.pop();
      return;
    }
    for (let i = from; i <= ks.length - (n - pick.length); i++) { pick.push(i); walk(i + 1, m | mask[i], v + vars[i]); pick.pop(); }
  };
  walk(0, 0, 0);
  // Knife jobs in kits all weigh 1, so the bit count orders them; combo() adds the protein jobs, the same for every candidate.
  return found.map((f) => combo(f.idx.map((i) => ks[i]), proteins))
    .sort((a, b) => a.cost - b.cost || b.variants - a.variants || a.pots - b.pots).slice(0, top);
}

export interface Easy { kit: Kit; protein: Protein; m: MethodId; jobs: readonly Job[]; cost: number }

/** Every kit with its cheapest paired protein, least knife work first. */
export const nearZero = (): Easy[] => KITS.map((kit) => {
  const opts = kit.protein.map((id) => { const protein = byId(PROTEINS, id); const pp = protPrep(protein); return { protein, m: pp.m, jobs: uniq([...(pp.job ? [pp.job] : []), ...kitJobs(kit)]) }; })
    .map((o) => ({ ...o, cost: o.jobs.reduce((s, j) => s + j.w, 0) }));
  return { kit, ...opts.reduce((a, b) => (b.cost < a.cost ? b : a)) };
}).sort((a, b) => a.cost - b.cost || a.kit.name.localeCompare(b.kit.name, 'sv'));

/** Spices (non-knife mix items) shared by at least two of the kits: stir them into the pot before splitting. */
export function sharedSpices(kits: readonly Kit[]): { name: string; n: number }[] {
  const c = new Map<string, { name: string; n: number }>();
  for (const k of kits) for (const key of new Set(k.mix.filter((x) => !x.prep).map((x) => noun(x.name).replace(/^torkad /, '')))) {
    const e = c.get(key) ?? { name: key, n: 0 };
    e.n++;
    c.set(key, e);
  }
  return [...c.values()].filter((e) => e.n > 1).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'sv'));
}
