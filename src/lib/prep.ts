// Prep tree: knife work is what costs time, spices and jars are free. A job (hacka gul lök) done once serves every dish
// that needs it, so a protein's kits form a tree: shared jobs are the trunk, it branches where the kits' knife work differs.
// No React.
import { BASES, byId, KITS, PROTEINS, type Base, type Kit, type KitItem, type MethodId, type Protein } from './data.ts';

export interface Job { key: string; label: string; w: number }

// "Riven ingefära" and "Vitlöksklyftor" are the same job as the base's ingefära and vitlök.
const noun = (name: string) => {
  const n = name.split(',')[0].toLowerCase().replace(/^(riven|färsk|hackad|rå) /, '').replace(/sklyft(a|or)$/, '');
  return n === 'gullök' ? 'gul lök' : n;
};
const job = (it: KitItem): Job => ({ key: noun(it.name), label: `${it.prep} ${noun(it.name)}`, w: 1 });
const cuts = (items: readonly KitItem[]) => items.filter((x) => x.prep).map(job);
const uniq = (jobs: Job[]) => [...new Map(jobs.map((j) => [j.key, j])).values()];

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

// ---------- Tree ----------

/** A node: knife jobs every kit below still needs, kits that are done once these are done, and the branches that need more. */
export interface PNode { id: string; jobs: readonly Job[]; kits: readonly Kit[]; kids: readonly PNode[]; n: number }

/**
 * Greedy split: jobs all kits share stay in the node, then the job most of the rest need opens a branch, and so on.
 * ponytail: greedy, not the provably smallest tree; with at most 23 kits per protein it reads right, revisit if it doesn't.
 */
function split(kits: readonly Kit[], done: ReadonlySet<string>, id: string): PNode {
  const left = (k: Kit, d: ReadonlySet<string>) => kitJobs(k).filter((j) => !d.has(j.key));
  const jobs = uniq(kits.length ? left(kits[0], done).filter((j) => kits.every((k) => left(k, done).some((x) => x.key === j.key))) : []);
  const d = new Set([...done, ...jobs.map((j) => j.key)]);
  const kids: PNode[] = [];
  let rest = kits.filter((k) => left(k, d).length);
  while (rest.length) {
    const count = new Map<string, number>();
    for (const k of rest) for (const j of uniq(left(k, d))) count.set(j.key, (count.get(j.key) ?? 0) + 1);
    const top = [...count].sort((a, b) => b[1] - a[1])[0][0];
    const group = rest.filter((k) => left(k, d).some((j) => j.key === top));
    kids.push(split(group, d, `${id}/${top}`));
    rest = rest.filter((k) => !group.includes(k));
  }
  return { id, jobs, kits: kits.filter((k) => !left(k, d).length), kids: kids.sort((a, b) => b.n - a.n), n: kits.length };
}

/** Every kit that pairs with the protein, as one tree. The protein's own job sits in the root. */
export function prepTree(p: Protein): PNode {
  const root = split(KITS.filter((k) => k.protein.includes(p.id)), new Set(), p.id);
  const pj = protPrep(p).job;
  return pj ? { ...root, jobs: [pj, ...root.jobs] } : root;
}

// ---------- Cost ----------

// One ingredient per jar, spice or fresh item; the base counts with its own items.
const itemKey = (it: KitItem) => it.ingr ?? noun(it.name).replace(/^torkad /, '');
const kitIngr = (k: Kit) => [...(k.base ? byId(BASES, k.base).items : []), ...k.mix, ...k.top].map(itemKey);

export interface Pick { kit: Kit; protein: Protein }
export interface Cost { knife: number; ingr: number; pots: number; jobs: readonly Job[] }

/** What a set of kit × protein picks costs: knife jobs (each once), distinct ingredients, pots (a base = one pot). */
export function cost(picks: readonly Pick[]): Cost {
  const proteins = [...new Set(picks.map((x) => x.protein))];
  const jobs = uniq([...proteins.flatMap((p) => protPrep(p).job ?? []), ...picks.flatMap((x) => kitJobs(x.kit))]);
  return {
    jobs,
    knife: jobs.reduce((s, j) => s + j.w, 0),
    ingr: new Set([...proteins.map((p) => p.ingr), ...picks.flatMap((x) => kitIngr(x.kit))]).size,
    pots: new Set(picks.map((x) => x.kit.base ?? x.kit.id)).size,
  };
}

// ---------- Near zero ----------

export interface Easy { kit: Kit; protein: Protein; m: MethodId; jobs: readonly Job[]; cost: number }

/** Every kit with its cheapest paired protein, least knife work first. */
export const nearZero = (): Easy[] => KITS.map((kit) => {
  const opts = kit.protein.map((id) => { const protein = byId(PROTEINS, id); const pp = protPrep(protein); return { protein, m: pp.m, jobs: uniq([...(pp.job ? [pp.job] : []), ...kitJobs(kit)]) }; })
    .map((o) => ({ ...o, cost: o.jobs.reduce((s, j) => s + j.w, 0) }));
  return { kit, ...opts.reduce((a, b) => (b.cost < a.cost ? b : a)) };
}).sort((a, b) => a.cost - b.cost || a.kit.name.localeCompare(b.kit.name, 'sv'));
