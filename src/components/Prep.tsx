'use client';
import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { BASES, byId, CARBS, KITS, PROTEINS, VEGS, type Kit, type Protein } from '@/lib/data';
import { calcBox, fmtQty, nf, type Part } from '@/lib/calc';
import { cost, nearZero, prepTree, protPrep, type Cost, type Job, type Pick, type PNode } from '@/lib/prep';
import { sendPrep } from '@/lib/actions';
import { useBatch } from '@/lib/useBatch';
import { haptic } from '@/lib/haptics';
import { KitArt } from './KitArt';
import { DealTag, fmtBox, fmtKr, useCombos, usePricing, WeekPrices, type Pricing } from './Prices';
import { PRICES, unit } from '@/lib/price';
import { spring } from './ui';

const num = (n: number) => String(n).replace('.', ',');
type Sel = Readonly<Record<string, string>>; // kit id -> protein id it was marked under
interface View { kit: string; protein: string }

/** The prep explorer: not a step in the flow. Browse each protein's tree, open recipes, mark kit × protein, send to Välj. */
export function Prep() {
  const router = useRouter();
  const [sel, setSel] = useState<Sel>({});
  const [view, setView] = useState<View | null>(null);
  const picks = useMemo<Pick[]>(() => Object.entries(sel).map(([k, p]) => ({ kit: byId(KITS, k), protein: byId(PROTEINS, p) })), [sel]);
  const now = useMemo(() => cost(picks), [picks]);
  const pr = usePricing();
  const bill = useMemo(() => (picks.length ? pr.shop(picks) : null), [pr, picks]);
  const avgBox = picks.length ? picks.reduce((s, x) => s + pr.box(x.kit, x.protein).cost.kr, 0) / picks.length : 0;
  const mark = (kit: Kit, p: Protein) => {
    haptic();
    setSel((s) => { const n = { ...s }; if (n[kit.id] === p.id) delete n[kit.id]; else n[kit.id] = p.id; return n; });
  };
  const open = (kit: Kit, p: Protein) => { haptic(); setView((v) => (v?.kit === kit.id && v.protein === p.id ? null : { kit: kit.id, protein: p.id })); };
  const send = () => {
    haptic(14);
    sendPrep({ ...sel }, [...new Set(Object.values(sel))].map((id) => ({ id, method: protPrep(byId(PROTEINS, id)).m })));
    router.push('/', { transitionTypes: ['nav-back'] });
  };
  const c: Ctx = { sel, picks, now, mark, view, open, pr };
  const shown = view && { kit: byId(KITS, view.kit), p: byId(PROTEINS, view.protein) };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-7 pb-28 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">{t.prep.title}</h1>
          <p className="max-w-[62ch] text-muted [text-wrap:pretty]">{t.prep.sub}</p>
        </div>
        <WeekPrices offers={pr.offers} />
        <div className="flex flex-col gap-3">
          {PROTEINS.map((p) => <ProteinTree key={p.id} p={p} {...c} />)}
        </div>
        <Cheapest {...c} />
        <Easy {...c} />
      </div>

      {/* Wide screens: the open recipe sits to the right. Phones open it in place under the row instead. */}
      <aside className="hidden lg:sticky lg:top-24 lg:block">
        {shown ? (
          <Recipe key={`${shown.kit.id}:${shown.p.id}`} kit={shown.kit} p={shown.p} {...c} onClose={() => setView(null)} />
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">{t.prep.empty}</p>
        )}
      </aside>

      <AnimatePresence>
        {picks.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring}
            className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-5">
            <div className="mx-auto flex max-w-[1120px] flex-col gap-2 rounded-2xl bg-ink px-4 py-3 text-on-ink shadow-[0_8px_30px_rgba(35,33,29,.25)] sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[12px] sm:flex-1 [&>span]:whitespace-nowrap">
                <span className="font-semibold">{t.prep.marked(picks.length)}</span>
                <span>✂ {t.prep.knife(now.knife)}</span>
                <span className="opacity-75">{t.prep.ingr(now.ingr)}</span>
                <span className="opacity-75">{t.prep.pots(now.pots)}</span>
                <span>{t.price.avg(nf(avgBox))}</span>
                {bill && <span className="opacity-75">{t.price.shop(bill.n, nf(bill.buy), nf(bill.buy - bill.use))}</span>}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { haptic(); setSel({}); }} className="px-2 py-1.5 text-sm opacity-75 hover:opacity-100">{t.prep.clear}</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={send} className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink">{t.prep.send} →</motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Ctx { sel: Sel; picks: readonly Pick[]; now: Cost; mark: (kit: Kit, p: Protein) => void; view: View | null; open: (kit: Kit, p: Protein) => void; pr: Pricing }
type PCtx = Ctx & { p: Protein };
const holds = (n: PNode, p: Protein, sel: Sel): boolean => n.kits.some((k) => sel[k.id] === p.id) || n.kids.some((x) => holds(x, p, sel));

function Fold({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
const Chevron = ({ open }: { open: boolean }) => <motion.span animate={{ rotate: open ? 0 : -90 }} transition={spring} aria-hidden>▾</motion.span>;

/** A protein: folded card, opens into its tree. Every branch starts folded too. */
function ProteinTree(c: PCtx) {
  const [open, setOpen] = useState(false);
  const root = useMemo(() => prepTree(c.p), [c.p]);
  const pp = protPrep(c.p);
  const on = holds(root, c.p, c.sel);
  const u = unit(PRICES, c.p.ingr, c.pr.offers);
  return (
    <section className="flex flex-col">
      <button onClick={() => { haptic(); setOpen(!open); }} aria-expanded={open}
        className={`flex flex-col gap-2 rounded-2xl border bg-surface px-4 py-3 text-left transition-colors ${on ? 'border-ink' : 'border-line hover:border-muted'}`}>
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="text-lg font-semibold tracking-tight">{c.p.name} <span className="text-sm font-normal text-muted">· {t.method[pp.m].toLowerCase()}</span></span>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted">{t.prep.dishes(root.n)} <Chevron open={open} /></span>
        </span>
        {u && (
          <span className="flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
            {t.price.perKg(fmtKr(u.krKg))}{u.offer && <><span className="text-muted">· {u.offer.store}</span><DealTag o={u.offer} /></>}
          </span>
        )}
        <Jobs jobs={root.jobs} />
      </button>
      <Fold open={open}><Children node={root} {...c} /></Fold>
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

/** Leaves first (kits done at this node), then branches, joined by elbow lines; the path to marked kits turns ink. */
function Children({ node, ...c }: PCtx & { node: PNode }) {
  const items = [...node.kits.map((k) => ({ k })), ...node.kids.map((n) => ({ n }))];
  const lit = (x: (typeof items)[number]) => ('k' in x ? c.sel[x.k.id] === c.p.id : holds(x.n, c.p, c.sel));
  return (
    <ul className="ml-2 flex flex-col gap-2 pt-2 pl-3.5 sm:ml-[15px] sm:pl-5">
      {items.map((it, i) => (
        <li key={'k' in it ? it.k.id : it.n.id} className="relative">
          <span className={`absolute -left-3.5 -top-2 h-[30px] w-2.5 rounded-bl-[8px] border-b border-l sm:-left-5 sm:w-4 sm:rounded-bl-[10px] ${lit(it) ? 'border-ink' : 'border-line'}`} />
          {i < items.length - 1 && <span className={`absolute -left-3.5 top-0 -bottom-2 border-l sm:-left-5 ${items.slice(i + 1).some(lit) ? 'border-ink' : 'border-line'}`} />}
          {'k' in it ? <Leaf kit={it.k} {...c} /> : <Branch node={it.n} {...c} />}
        </li>
      ))}
    </ul>
  );
}

function Branch({ node, ...c }: PCtx & { node: PNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => { haptic(); setOpen(!open); }} aria-expanded={open}
        className={`flex w-full items-start justify-between gap-3 rounded-xl border bg-surface px-3 py-2 text-left transition-colors ${holds(node, c.p, c.sel) ? 'border-ink' : 'border-line hover:border-muted'}`}>
        <Jobs jobs={node.jobs} />
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 font-mono text-[11px] text-muted">{t.prep.dishes(node.n)} <Chevron open={open} /></span>
      </button>
      <Fold open={open}><Children node={node} {...c} /></Fold>
    </div>
  );
}

/** A kit in a tree: the row opens its recipe, the round button marks it. Unmarked, it shows what it would add. */
function Leaf({ kit, ...c }: PCtx & { kit: Kit }) {
  const on = c.sel[kit.id] === c.p.id;
  const viewing = c.view?.kit === kit.id && c.view.protein === c.p.id;
  const add = useMemo(() => {
    if (on) return null;
    const next = cost([...c.picks.filter((x) => x.kit.id !== kit.id), { kit, protein: c.p }]);
    return { k: next.knife - c.now.knife, i: next.ingr - c.now.ingr };
  }, [on, c.picks, c.now, c.p, kit]);
  return (
    <div>
      <div className={`flex items-center gap-2 rounded-xl pr-1.5 transition-colors ${on ? 'bg-surface ring-1 ring-ink' : viewing ? 'bg-surface ring-1 ring-line' : ''}`}>
        <button onClick={() => c.open(kit, c.p)} aria-expanded={viewing} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-sunken">
          <KitArt kit={kit} size={34} spin={on || viewing} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{kit.name}</span>
            <span className="block truncate text-[12px] text-muted">{kit.base ? byId(BASES, kit.base).name : kit.tagline} · <span className="font-mono text-ink">{fmtBox(c.pr.box(kit, c.p).cost.kr)}</span></span>
          </span>
          {add && <span className={`shrink-0 font-mono text-[11px] ${add.k > 0 ? 'text-[color:var(--warn)]' : 'text-muted'}`}>{t.prep.plus(num(add.k), add.i)}</span>}
        </button>
        <MarkButton on={on} label={t.prep.markOne(kit.name)} onClick={() => c.mark(kit, c.p)} />
      </div>
      <Fold open={viewing}><div className="pt-2 lg:hidden"><Recipe {...c} kit={kit} /></div></Fold>
    </div>
  );
}

function MarkButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={onClick} aria-pressed={on} aria-label={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[13px] transition-colors ${on ? 'border-ink bg-ink text-on-ink' : 'border-line text-muted hover:border-ink hover:text-ink'}`}>
      {on ? '✓' : '+'}
    </motion.button>
  );
}

/** The recipe card: one box of this kit with this protein, sized to the goal like on Välj, plus its knife work. */
function Recipe({ kit, p, onClose, ...c }: Ctx & { kit: Kit; p: Protein; onClose?: () => void }) {
  const { plan, t: goal } = useBatch();
  const m = protPrep(p).m;
  const box = calcBox({ i: 0, kit, protein: p, method: m, carb: byId(CARBS, kit.carb), veg: byId(VEGS, kit.veg) }, plan, goal);
  const bc = c.pr.box(kit, p).cost;
  const krOf = (x: Part) => { const u = x.ingr && (x.u === 'g' || x.u === 'ml') ? unit(PRICES, x.ingr, c.pr.offers) : null; return u ? (x.q / 1000) * u.krKg : null; };
  const jobs = cost([{ kit, protein: p }]).jobs;
  const on = c.sel[kit.id] === p.id;
  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} style={{ '--hue': kit.hue } as React.CSSProperties}
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-4">
      <span className="kit-bg absolute inset-y-0 left-0 w-1" />
      <div className="flex items-center gap-3">
        <KitArt kit={kit} size={72} spin />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-tight">{kit.name}</h2>
          <p className="text-[13px] text-muted">{kit.tagline}</p>
          <p className="mt-0.5 text-[13px]">{p.name} · {t.method[m].toLowerCase()}</p>
        </div>
        {onClose && <button onClick={onClose} aria-label={t.prep.close} className="self-start px-1 text-lg leading-none text-muted hover:text-ink">×</button>}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-lg font-semibold">{fmtBox(bc.kr)}</span>
        <span className="text-[12px] text-muted">{t.price.excl}{bc.missing.length > 0 && ` · ${t.price.missing(bc.missing.join(', '))}`}</span>
      </div>
      {bc.deals.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-deal-bg/60 px-3 py-2 text-[12px]">
          <div className="label !text-deal">{t.price.dealsUsed}</div>
          {bc.deals.map((o) => <span key={o.ingr} className="flex flex-wrap items-center gap-1.5">{o.name} · {o.store} <DealTag o={o} small /></span>)}
        </div>
      )}
      <div className="flex gap-4 font-mono text-[12px]">
        <span>{nf(box.m[0])} kcal</span><span>{nf(box.m[1])} g P</span><span className="text-muted">{nf(box.m[2])} g K · {nf(box.m[3])} g F</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {jobs.length ? jobs.map((j) => <span key={j.key} className="rounded-full bg-sunken px-2 py-0.5 text-[12px]">✂ {j.label}</span>)
          : <span className="rounded-full bg-sunken px-2 py-0.5 text-[12px] text-muted">{t.prep.noKnife}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <div className="label">{t.prep.perBox}</div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0.5 text-[13px]">
          {kit.base && <><span>{byId(BASES, kit.base).name}</span><span className="font-mono">{t.base.portion}</span><span className="text-right font-mono text-muted">{nf(box.parts.filter((x) => x.role === 'bas').reduce((s, x) => s + (krOf(x) ?? 0), 0), 1)} kr</span></>}
          {box.parts.filter((x) => x.role !== 'olja' && x.role !== 'bas').map((x, i) => (
            <Fragment key={i}>
              <span className={x.role === 'topp' ? 'text-muted' : ''}>{x.role === 'topp' ? '+ ' : ''}{x.name}</span>
              <span className="font-mono">{x.u === 'g' && x.cooked ? `${nf(x.q)} g rå` : fmtQty(x.q, x.u)}</span>
              <span className="text-right font-mono text-muted">{krOf(x) === null ? '' : `${nf(krOf(x)!, 1)} kr`}</span>
            </Fragment>
          ))}
        </div>
      </div>
      <p className="rounded-lg bg-bg px-3 py-2 text-[13px] text-muted">{kit.tip}</p>
      <p className="text-[12px] text-muted"><span className="label mr-1.5">{t.prep.heat}</span>{kit.heat}</p>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => c.mark(kit, p)} aria-pressed={on}
        className={`self-start rounded-full px-4 py-2 text-sm font-medium ${on ? 'border border-ink' : 'bg-ink text-on-ink'}`}>
        {on ? `✓ ${t.prep.unmark}` : t.prep.mark}
      </motion.button>
    </motion.article>
  );
}

/** Every kit at its cheapest, grouped: no knife, one job, two jobs. Tap to open the recipe. */
function Easy(c: Ctx) {
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
          <ul className="flex flex-col gap-1.5">
            {g.map((e) => {
              const viewing = c.view?.kit === e.kit.id && c.view.protein === e.protein.id;
              const on = c.sel[e.kit.id] === e.protein.id;
              return (
                <li key={e.kit.id}>
                  <div className={`flex items-center gap-2 rounded-xl bg-surface pr-2 ${on ? 'ring-1 ring-ink' : viewing ? 'ring-1 ring-line' : ''}`}>
                    <button onClick={() => c.open(e.kit, e.protein)} aria-expanded={viewing} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-sunken">
                      <KitArt kit={e.kit} size={34} spin={viewing} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{e.kit.name}</span>
                        <span className="block truncate text-[12px] text-muted">
                          <span className="font-mono text-ink">{fmtBox(c.pr.box(e.kit, e.protein).cost.kr)}</span> · {e.protein.name} · {t.method[e.m].toLowerCase()}{e.jobs.length > 0 && ` · ✂ ${e.jobs.map((j) => j.label).join(', ')}`}
                        </span>
                      </span>
                    </button>
                    <MarkButton on={on} label={t.prep.markOne(e.kit.name)} onClick={() => c.mark(e.kit, e.protein)} />
                  </div>
                  <Fold open={viewing}><div className="pt-2 lg:hidden"><Recipe kit={e.kit} p={e.protein} {...c} /></div></Fold>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** The cheapest boxes this week: every kit × protein pairing, priced with the best live offers. Same rows as Nästan noll prepp. */
function Cheapest(c: Ctx) {
  const all = useCombos(c.pr);
  const [more, setMore] = useState(false);
  const shown = all.slice(0, more ? 30 : 10);
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{t.price.cheapest}</h2>
        <p className="text-sm text-muted">{t.price.cheapestSub}</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {shown.map((e) => {
          const viewing = c.view?.kit === e.kit.id && c.view.protein === e.protein.id;
          const on = c.sel[e.kit.id] === e.protein.id;
          return (
            <li key={`${e.kit.id}:${e.protein.id}`}>
              <div className={`flex items-center gap-2 rounded-xl bg-surface pr-2 ${on ? 'ring-1 ring-ink' : viewing ? 'ring-1 ring-line' : ''}`}>
                <button onClick={() => c.open(e.kit, e.protein)} aria-expanded={viewing} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-sunken">
                  <KitArt kit={e.kit} size={34} spin={viewing} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.kit.name} <span className="font-normal text-muted">· {e.protein.name}</span></span>
                    <span className="flex flex-wrap items-center gap-1 text-[12px] text-muted">
                      {e.deals.length ? e.deals.map((o) => <DealTag key={o.ingr} o={o} small />) : null}
                      <span className="truncate">{e.deals.map((o) => o.name.toLowerCase()).join(', ')}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[13px]">{fmtBox(e.kr)}</span>
                </button>
                <MarkButton on={on} label={t.prep.markOne(e.kit.name)} onClick={() => c.mark(e.kit, e.protein)} />
              </div>
              <Fold open={viewing}><div className="pt-2 lg:hidden"><Recipe kit={e.kit} p={e.protein} {...c} /></div></Fold>
            </li>
          );
        })}
      </ul>
      {!more && all.length > 10 && <button onClick={() => { haptic(); setMore(true); }} className="self-start text-sm text-muted underline">+{Math.min(20, all.length - 10)}</button>}
    </section>
  );
}
