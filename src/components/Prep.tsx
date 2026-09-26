'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { BASES, byId, KITS, PROTEINS, type Kit, type Protein } from '@/lib/data';
import { cost, nearZero, prepTree, protPrep, type Cost, type Job, type Pick, type PNode } from '@/lib/prep';
import { applyPrep } from '@/lib/actions';
import { haptic } from '@/lib/haptics';
import { KitArt } from './KitArt';
import { Pill, spring } from './ui';

const num = (n: number) => String(n).replace('.', ',');
type Sel = Readonly<Record<string, string>>; // kit id -> protein id it was picked under

export function Prep() {
  const router = useRouter();
  const [pids, setPids] = useState<readonly string[]>(['kyckling']);
  const [sel, setSel] = useState<Sel>({});
  const picks = useMemo<Pick[]>(() => Object.entries(sel).map(([k, p]) => ({ kit: byId(KITS, k), protein: byId(PROTEINS, p) })), [sel]);
  const now = useMemo(() => cost(picks), [picks]);
  const toggleProtein = (id: string) => { haptic(); setPids((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const pick = (kit: Kit, p: Protein) => {
    haptic();
    setSel((s) => { const n = { ...s }; if (n[kit.id] === p.id) delete n[kit.id]; else n[kit.id] = p.id; return n; });
  };
  const use = () => {
    haptic(14);
    applyPrep({ ...sel }, [...new Set(Object.values(sel))].map((id) => ({ id, method: protPrep(byId(PROTEINS, id)).m })));
    router.push('/', { transitionTypes: ['nav-back'] });
  };

  return (
    <div className="flex max-w-[760px] flex-col gap-7 pb-28">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t.prep.title}</h1>
        <p className="max-w-[62ch] text-muted [text-wrap:pretty]">{t.prep.sub}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="label">{t.prep.proteins}</div>
        <div className="flex flex-wrap gap-1.5">
          {PROTEINS.map((p) => {
            const w = protPrep(p).job?.w ?? 0;
            return <Pill key={p.id} on={pids.includes(p.id)} onClick={() => toggleProtein(p.id)}>{p.name} <span className="font-mono text-[10px] opacity-60">{w ? `✂ ${num(w)}` : '0'}</span></Pill>;
          })}
        </div>
      </div>

      {pids.length === 0 && <p className="text-muted">{t.prep.pickProtein}</p>}
      {PROTEINS.filter((p) => pids.includes(p.id)).map((p) => <ProteinTree key={p.id} p={p} sel={sel} picks={picks} now={now} pick={pick} />)}

      <Easy />

      <AnimatePresence>
        {picks.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring}
            className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-5">
            <div className="mx-auto flex max-w-[1120px] flex-col gap-2 rounded-2xl bg-ink px-4 py-3 text-on-ink shadow sm:flex-row sm:items-center-[0_8px_30px_rgba(35,33,29,.25)]">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[12px] [&>span]:whitespace-nowrap sm:flex-1">
                <span className="font-semibold">{t.prep.picked(picks.length)}</span>
                <span>✂ {t.prep.knife(now.knife)}</span>
                <span className="opacity-75">{t.prep.ingr(now.ingr)}</span>
                <span className="opacity-75">{t.prep.pots(now.pots)}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { haptic(); setSel({}); }} className="px-2 py-1.5 text-sm opacity-75 hover:opacity-100">{t.prep.clear}</button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={use} className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink">{t.prep.use} →</motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Ctx { p: Protein; sel: Sel; picks: readonly Pick[]; now: Cost; pick: (kit: Kit, p: Protein) => void }
const holds = (n: PNode, p: Protein, sel: Sel): boolean => n.kits.some((k) => sel[k.id] === p.id) || n.kids.some((c) => holds(c, p, sel));

function ProteinTree(c: Ctx) {
  const root = useMemo(() => prepTree(c.p), [c.p]);
  const pp = protPrep(c.p);
  return (
    <section className="flex flex-col">
      <div className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 transition-colors ${holds(root, c.p, c.sel) ? 'border-ink' : 'border-line'} bg-surface`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-semibold tracking-tight">{c.p.name} <span className="text-sm font-normal text-muted">· {t.method[pp.m].toLowerCase()}</span></span>
          <span className="shrink-0 font-mono text-[11px] text-muted">{t.prep.dishes(root.n)}</span>
        </div>
        <Jobs jobs={root.jobs} />
      </div>
      <Children node={root} {...c} />
    </section>
  );
}

function Jobs({ jobs }: { jobs: readonly Job[] }) {
  if (!jobs.length) return <span className="text-[13px] text-muted">{t.prep.nothing}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {jobs.map((j) => <span key={j.key} className="rounded-full bg-sunken px-2 py-0.5 text-[12px]">✂ {j.label}</span>)}
    </span>
  );
}

/** Leaves first (kits done at this node), then branches, joined by elbow lines. */
function Children({ node, ...c }: Ctx & { node: PNode }) {
  const items = [...node.kits.map((k) => ({ k })), ...node.kids.map((n) => ({ n }))];
  return (
    <ul className="ml-2 flex flex-col gap-2 pt-2 pl-3.5 sm:ml-[15px] sm:pl-5">
      {items.map((it, i) => {
        const on = 'k' in it ? c.sel[it.k.id] === c.p.id : holds(it.n, c.p, c.sel);
        const line = on ? 'border-ink' : 'border-line';
        return (
          <li key={'k' in it ? it.k.id : it.n.id} className="relative">
            <span className={`absolute -left-3.5 -top-2 h-[30px] w-2.5 rounded-bl-[8px] sm:-left-5 sm:w-4 sm:rounded-bl-[10px] border-b border-l ${line}`} />
            {i < items.length - 1 && <span className={`absolute -left-3.5 top-0 -bottom-2 border-l sm:-left-5 ${items.slice(i + 1).some((x) => ('k' in x ? c.sel[x.k.id] === c.p.id : holds(x.n, c.p, c.sel))) ? 'border-ink' : 'border-line'}`} />}
            {'k' in it ? <Leaf kit={it.k} {...c} /> : <Branch node={it.n} {...c} />}
          </li>
        );
      })}
    </ul>
  );
}

function Branch({ node, ...c }: Ctx & { node: PNode }) {
  const [open, setOpen] = useState(true);
  const on = holds(node, c.p, c.sel);
  return (
    <div>
      <button onClick={() => { haptic(); setOpen(!open); }} aria-expanded={open}
        className={`flex w-full items-start justify-between gap-3 rounded-xl border bg-surface px-3 py-2 text-left transition-colors ${on ? 'border-ink' : 'border-line hover:border-muted'}`}>
        <Jobs jobs={node.jobs} />
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 font-mono text-[11px] text-muted">
          {t.prep.dishes(node.n)}
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={spring} aria-hidden>▾</motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <Children node={node} {...c} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A kit: tap to pick it under this protein. Unpicked, it shows what it would add to the current picks. */
function Leaf({ kit, ...c }: Ctx & { kit: Kit }) {
  const on = c.sel[kit.id] === c.p.id;
  const add = useMemo(() => {
    if (on) return null;
    const next = cost([...c.picks.filter((x) => x.kit.id !== kit.id), { kit, protein: c.p }]);
    return { k: next.knife - c.now.knife, i: next.ingr - c.now.ingr };
  }, [on, c.picks, c.now, c.p, kit]);
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={() => c.pick(kit, c.p)} aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors ${on ? 'bg-surface ring-1 ring-ink' : 'hover:bg-sunken'}`}>
      <KitArt kit={kit} size={34} spin={on} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{kit.name}</span>
        <span className="block truncate text-[12px] text-muted">{kit.base ? byId(BASES, kit.base).name : kit.tagline}</span>
      </span>
      {on ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] text-on-ink">✓</span>
      ) : add && (
        <span className={`shrink-0 font-mono text-[11px] ${add.k > 0 ? 'text-[color:var(--warn)]' : 'text-muted'}`}>{t.prep.plus(num(add.k), add.i)}</span>
      )}
    </motion.button>
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
