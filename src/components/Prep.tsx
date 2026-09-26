'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { BASES, byId, PROTEINS, type Kit, type Protein } from '@/lib/data';
import { best, kitJobs, nearZero, ownJobs, protPrep, sharedSpices, type Combo } from '@/lib/prep';
import { applyPrep } from '@/lib/actions';
import { haptic } from '@/lib/haptics';
import { KitArt } from './KitArt';
import { Pill, Segmented, spring } from './ui';

const NS = ['2', '3', '4', '5', '6'] as const;
const jobsTxt = (n: number) => t.prep.jobs(n);

export function Prep() {
  const [pids, setPids] = useState<readonly string[]>(['kyckling', 'notfars']);
  const [n, setN] = useState<(typeof NS)[number]>('4');
  const [sel, setSel] = useState(0);
  const proteins = useMemo(() => PROTEINS.filter((p) => pids.includes(p.id)), [pids]);
  const combos = useMemo(() => (proteins.length ? best(proteins, Number(n)) : []), [proteins, n]);
  const cur = combos[Math.min(sel, combos.length - 1)];
  const toggle = (id: string) => { haptic(); setSel(0); setPids((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };

  return (
    <div className="flex max-w-[760px] flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t.prep.title}</h1>
        <p className="max-w-[62ch] text-muted [text-wrap:pretty]">{t.prep.sub}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="label">{t.prep.proteins}</div>
          <div className="flex flex-wrap gap-1.5">
            {PROTEINS.map((p) => {
              const w = protPrep(p).job?.w ?? 0;
              return <Pill key={p.id} on={pids.includes(p.id)} onClick={() => toggle(p.id)}>{p.name} <span className="font-mono text-[10px] opacity-60">{w ? `✂ ${String(w).replace('.', ',')}` : '0'}</span></Pill>;
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="label">{t.prep.n}</div>
          <div className="max-w-[320px]"><Segmented id="prep-n" value={n} onChange={(v) => { setSel(0); setN(v); }} options={NS.map((x) => [x, x] as const)} small /></div>
        </div>
      </div>

      {!proteins.length ? <p className="text-muted">{t.prep.pickProtein}</p> : !cur ? <p className="text-muted">{t.prep.none}</p> : (
        <>
          <section className="flex flex-col gap-2.5">
            <div className="label">{t.prep.options(Number(n))}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {combos.map((c, i) => (
                <motion.button key={c.kits.map((k) => k.id).join()} whileTap={{ scale: 0.97 }} onClick={() => { haptic(); setSel(i); }} aria-pressed={c === cur}
                  className={`relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors ${c === cur ? 'border-ink bg-surface' : 'border-line hover:border-muted'}`}>
                  <span className="flex -space-x-2">{c.kits.map((k) => <KitArt key={k.id} kit={k} size={30} spin />)}</span>
                  <span className="text-sm font-semibold">{jobsTxt(c.cost)}</span>
                  <span className="font-mono text-[11px] text-muted">{t.prep.variants(c.variants)} · {t.prep.pots(c.pots)}</span>
                </motion.button>
              ))}
            </div>
          </section>
          <PrepTree c={cur} />
        </>
      )}

      <Easy />
    </div>
  );
}

/** One level of the tree: a dot on the rail, a title, content. */
function Level({ title, right, last, children }: { title: string; right?: React.ReactNode; last?: boolean; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
      <div className="relative flex justify-center">
        <span className={`relative z-10 mt-[5px] h-3 w-3 rounded-full border-2 ${last ? 'border-[color:var(--c)] bg-[color:var(--c)]' : 'border-ink bg-surface'}`} />
        {!last && <span className="absolute top-4 bottom-0 w-px bg-line" />}
      </div>
      <div className={`flex min-w-0 flex-col gap-2 ${last ? '' : 'pb-6'}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="label">{title}</span>
          {right && <span className="font-mono text-[11px] text-muted">{right}</span>}
        </div>
        {children}
      </div>
    </li>
  );
}

function PrepTree({ c }: { c: Combo }) {
  const router = useRouter();
  // Directions: one per base, kits without a base each make their own sauce.
  const groups = useMemo(() => {
    const m = new Map<string, Kit[]>();
    for (const k of c.kits) m.set(k.base ?? '', [...(m.get(k.base ?? '') ?? []), k]);
    return [...m].sort((a, b) => b[1].length - a[1].length || (a[0] ? -1 : 1));
  }, [c]);
  const serves = (key: string) => c.kits.filter((k) => kitJobs(k).some((j) => j.key === key)).length;
  const use = () => {
    applyPrep(c.kits.map((k) => k.id), c.proteins.map((p) => ({ id: p.id, method: protPrep(p).m })));
    router.push('/', { transitionTypes: ['nav-back'] });
  };

  return (
    <motion.section key={c.kits.map((k) => k.id).join()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-col gap-4">
      <ol className="flex flex-col">
        <Level title={t.prep.lvProtein}>
          <div className="flex flex-wrap gap-1.5">
            {c.proteins.map((p) => <ProteinTag key={p.id} p={p} />)}
          </div>
        </Level>
        <Level title={t.prep.lvShared} right={jobsTxt(c.cost)}>
          {c.jobs.length ? (
            <ul className="flex flex-col gap-1">
              {c.jobs.map((j) => (
                <li key={j.key} className="flex items-baseline justify-between gap-3 rounded-lg bg-surface px-3 py-1.5 text-sm">
                  <span>✂ {j.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">{c.proteins.some((p) => p.id === j.key) ? `½ · ${t.prep.serves(c.variants)}` : t.prep.serves(serves(j.key))}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">{t.prep.noKnife}</p>}
        </Level>
        <Level title={t.prep.lvDirs} right={t.prep.pots(c.pots)} last>
          <div className="flex flex-col gap-3">
            {groups.map(([base, kits]) => <Direction key={base || 'own'} base={base} kits={kits} proteins={c.proteins} />)}
          </div>
        </Level>
      </ol>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => { haptic(); use(); }} className="self-start rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-on-ink">
        {t.prep.use} →
      </motion.button>
    </motion.section>
  );
}

function ProteinTag({ p }: { p: Protein }) {
  const pp = protPrep(p);
  return (
    <span className="rounded-full border border-line bg-surface px-3 py-1 text-[13px]">
      {p.name} <span className="text-muted">· {t.method[pp.m].toLowerCase()}</span>
    </span>
  );
}

/** A base pot that splits into kits. Tap to fold; tap a kit to see what goes into its share. */
function Direction({ base, kits, proteins }: { base: string; kits: readonly Kit[]; proteins: readonly Protein[] }) {
  const [open, setOpen] = useState(true);
  const [kit, setKit] = useState<string | null>(null);
  const b = base ? byId(BASES, base as (typeof BASES)[number]['id']) : null;
  const spices = b ? sharedSpices(kits) : [];
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button onClick={() => { haptic(); setOpen(!open); }} className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left">
        <span className="font-semibold">{b ? b.name : t.prep.own}</span>
        <span className="font-mono text-[11px] text-muted">{kits.length} kit {open ? '−' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <div className="flex flex-col gap-2 px-4 pb-4">
              {spices.length > 0 && (
                <p className="rounded-lg bg-sunken px-3 py-2 text-[13px]"><span className="label mr-1.5">{t.prep.potShared}</span>{spices.map((s, i) => `${i ? s.name : s.name[0].toUpperCase() + s.name.slice(1)} ×${s.n}`).join(', ')}</p>
              )}
              <ul className="flex flex-col border-l border-line pl-3">
                {kits.map((k) => {
                  const own = ownJobs(k);
                  const on = kit === k.id;
                  return (
                    <li key={k.id}>
                      <button onClick={() => { haptic(); setKit(on ? null : k.id); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sunken">
                        <KitArt kit={k} size={36} spin={on} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{k.name}</span>
                          <span className="block truncate text-[12px] text-muted">{k.protein.filter((id) => proteins.some((p) => p.id === id)).map((id) => byId(PROTEINS, id).name).join(' · ')}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${own.length ? 'bg-[color:var(--warn)]/15 text-[color:var(--warn)]' : 'bg-sunken text-muted'}`}>
                          {own.length ? `✂ ${own.length}` : t.prep.spicesOnly}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                            <div className="flex flex-col gap-1 px-2 pb-2 pl-[60px] text-[13px] text-muted">
                              {k.mix.length > 0 && <p>{k.mix.map((x) => x.name).join(', ')}</p>}
                              {own.length > 0 && <p className="text-ink">{t.prep.extra}: {own.map((j) => j.label).join(', ')}</p>}
                              <p className="italic">{k.tip}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Every kit at its cheapest, grouped: no knife, one job, two jobs. */
function Easy() {
  const all = useMemo(nearZero, []);
  const groups = [all.filter((e) => e.cost === 0), all.filter((e) => e.cost > 0 && e.cost <= 1), all.filter((e) => e.cost > 1 && e.cost <= 2)];
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{t.prep.easy}</h2>
        <p className="text-sm text-muted">{t.prep.easySub}</p>
      </div>
      {groups.map((g, i) => g.length > 0 && (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="label">{t.prep.groups[i]}</div>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {g.map((e) => (
              <li key={e.kit.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
                <KitArt kit={e.kit} size={34} spin />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{e.kit.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {e.protein.name} · {t.method[e.m].toLowerCase()}{e.jobs.length > 0 && ` · ✂ ${e.jobs.map((j) => j.label).join(', ')}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
