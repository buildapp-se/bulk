'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { bestPath, LABEL, node, RECIPES, type Recipe, type TreeNode } from '@/lib/tree';
import { haptic } from '@/lib/haptics';
import { KitArt } from './KitArt';
import { spring } from './ui';

const TOTAL = RECIPES.length;
const name = (k: string) => LABEL.get(k) ?? k;
const SHOW = 10;

export function Tree() {
  const [path, setPath] = useState<readonly string[]>([]);
  const [all, setAll] = useState(false);
  const [list, setList] = useState(false);
  const levels = useMemo(() => Array.from({ length: path.length + 1 }, (_, d) => node(path.slice(0, d))), [path]);
  const cur = levels[path.length];
  const best = useMemo(() => bestPath(path), [path]);
  const go = (p: readonly string[]) => { haptic(); setPath(p); setAll(false); };
  const kids = all ? cur.kids : cur.kids.slice(0, SHOW);

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t.tree.title}</h1>
        <p className="max-w-[60ch] text-muted [text-wrap:pretty]">{t.tree.sub}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <motion.button whileTap={{ scale: 0.96 }} disabled={best.length === path.length} onClick={() => go(best)}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-on-ink disabled:opacity-40">
          {t.tree.best}
        </motion.button>
        {path.length > 0 && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => go([])} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-muted">
            {t.tree.reset}
          </motion.button>
        )}
      </div>

      <ol className="flex flex-col">
        {levels.map((lv, d) => {
          const key = d === 0 ? null : path[d - 1];
          const last = d === path.length;
          return (
            <motion.li key={`${d}:${key}`} layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
              className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
              {/* Rail: dot for the node, line down to the next level. */}
              <div className="relative flex justify-center">
                <span className={`relative z-10 mt-[7px] h-3 w-3 rounded-full border-2 ${last ? 'border-[color:var(--c)] bg-[color:var(--c)]' : 'border-ink bg-surface'}`} />
                {!last && <span className="absolute top-4 bottom-0 w-px bg-line" />}
              </div>
              <div className={`flex min-w-0 flex-col gap-2.5 ${last ? '' : 'pb-5'}`}>
                <button onClick={() => d < path.length && go(path.slice(0, d))} disabled={last}
                  className="flex items-baseline justify-between gap-3 text-left">
                  <span className={`text-lg font-semibold tracking-tight ${last ? '' : 'hover:underline'}`}>{key ? name(key) : t.tree.all}</span>
                  <span className="num font-mono text-sm text-muted">{lv.recipes.length}<span className="opacity-60">/{TOTAL}</span></span>
                </button>
                <Bar n={lv.recipes.length} of={TOTAL} />
                {d > 0 && lv.shared.length > 0 && (
                  <p className="text-[13px] text-muted"><span className="label mr-1.5">{t.tree.shared}</span>{lv.shared.map(name).join(', ')}</p>
                )}
                {!last && <Chips d={d} kids={lv.kids} on={path[d]} pick={(k) => go(k === path[d] ? path.slice(0, d) : [...path.slice(0, d), k])} />}
                {last && (lv.kids.length ? (
                  <div className="flex flex-col gap-1">
                    <div className="label mt-1">{t.tree.branches(lv.kids.length)}</div>
                    <AnimatePresence initial={false}>
                      {kids.map(([k, n]) => (
                        <motion.button key={k} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          whileTap={{ scale: 0.98 }} onClick={() => go([...path, k])}
                          className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-left hover:bg-sunken">
                          <span className="truncate font-medium">{name(k)}{best[path.length] === k && <span className="ml-2 text-[11px] text-[color:var(--c)]">★</span>}</span>
                          <span className="num font-mono text-sm">{n}</span>
                          <span className="col-span-2 flex items-center gap-2">
                            <Bar n={n} of={lv.recipes.length} thin />
                            <span className="shrink-0 font-mono text-[11px] text-muted">{t.tree.forks(node([...path, k]).kids.length)}</span>
                          </span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    {lv.kids.length > SHOW && (
                      <button onClick={() => setAll(!all)} className="self-start px-3 py-1.5 text-sm text-muted hover:text-ink">
                        {all ? t.tree.less : t.tree.more(lv.kids.length)}
                      </button>
                    )}
                  </div>
                ) : <p className="text-sm text-muted">{t.tree.leaf}</p>)}
              </div>
            </motion.li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-2.5">
        <button onClick={() => setList(!list)} className="label flex items-center gap-2 self-start">
          {t.tree.recipes(cur.recipes.length)} <span aria-hidden>{list ? '−' : '+'}</span>
        </button>
        {list && (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {cur.recipes.map((r) => <RecipeRow key={r.id} r={r} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function Bar({ n, of, thin }: { n: number; of: number; thin?: boolean }) {
  return (
    <span className={`block w-full overflow-hidden rounded-full bg-sunken ${thin ? 'h-1' : 'h-1.5'}`}>
      <motion.span className="block h-full rounded-full bg-[color:var(--c)]" initial={false} animate={{ width: `${(n / of) * 100}%` }} transition={spring} />
    </span>
  );
}

/** Siblings at one level: tap another to switch branch, tap the chosen one to fold back up. */
function Chips({ d, kids, on, pick }: { d: number; kids: TreeNode['kids']; on: string; pick: (k: string) => void }) {
  const row = useRef<HTMLDivElement>(null);
  // Keep the chosen chip in view; scrollLeft, not scrollIntoView, so the page itself never jumps.
  useEffect(() => {
    const el = row.current;
    const sel = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (el && sel) el.scrollLeft = sel.offsetLeft - el.clientWidth / 2 + sel.clientWidth / 2;
  }, [on]);
  return (
    <div ref={row} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
      {kids.map(([k, n]) => (
        <motion.button key={k} whileTap={{ scale: 0.94 }} onClick={() => pick(k)} aria-pressed={k === on}
          className={`relative shrink-0 rounded-full border px-3 py-1 text-[13px] ${k === on ? 'border-ink text-on-ink' : 'border-line text-muted hover:border-muted hover:text-ink'}`}>
          {k === on && <motion.span layoutId={`tree-chip-${d}`} className="absolute inset-0 rounded-full bg-ink" transition={spring} />}
          <span className="relative">{name(k)} <span className="num font-mono text-[11px] opacity-70">{n}</span></span>
        </motion.button>
      ))}
    </div>
  );
}

function RecipeRow({ r }: { r: Recipe }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
      <KitArt kit={r.kit} size={36} spin />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{r.kit.name}</span>
        <span className="block truncate text-[13px] text-muted">{r.protein.name}</span>
      </span>
    </li>
  );
}
