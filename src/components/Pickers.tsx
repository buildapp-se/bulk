'use client';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment } from 'react';
import { t } from '@/i18n/sv';
import { KITS, PROTEINS, INGR, CARBS, VEGS, byId, DEFAULT_METHOD, type KitItem, type MethodId } from '@/lib/data';
import { calcBox, fmtMin, fmtQty, nf, split } from '@/lib/calc';
import { setBoxes, setMethod, setVegMode, toggleKit, toggleProtein } from '@/lib/actions';
import { useBatch } from '@/lib/useBatch';
import { Num } from './Num';
import { Segmented, spring, stagger } from './ui';
import { KitArt } from './KitArt';

export function ProteinPicker() {
  const { plan } = useBatch();
  return (
    <motion.div variants={stagger.parent} initial="hidden" animate="show" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PROTEINS.map((p) => {
        const sel = plan.proteins.find((x) => x.id === p.id);
        const n = INGR[p.ingr].n;
        const methods = Object.keys(p.methods) as MethodId[];
        return (
          // Whole card is the target. Inner method toggle stops the click so it doesn't also toggle the card.
          <motion.div key={p.id} variants={stagger.child} layout transition={spring}
            role="checkbox" aria-checked={!!sel} tabIndex={0}
            onClick={() => toggleProtein(p.id)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleProtein(p.id); } }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            className={`flex cursor-pointer select-none flex-col gap-1 rounded-xl border p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink ${sel ? 'border-ink bg-surface shadow-[0_6px_20px_-12px_rgba(35,33,29,.45)]' : 'border-line hover:border-muted'}`}>
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-semibold">{p.name}</span>
              <Check on={!!sel} />
            </span>
            <span className="font-mono text-[11px] text-muted">{nf(n[1], 1)} g P / 100 g</span>
            <AnimatePresence initial={false}>
              {sel && methods.length > 1 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                  <div className="pt-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Segmented id={`m-${p.id}`} small value={sel.method} onChange={(m) => setMethod(p.id, m)}
                      options={methods.map((m) => [m, t.method[m]] as const)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {sel && <span className="text-[11px] text-muted">{p.methods[sel.method]!.temp} °C · {fmtMin(p.methods[sel.method]!.min)}</span>}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function BoxCount() {
  const { plan } = useBatch();
  const n = plan.boxes;
  return (
    <div className="flex items-stretch gap-2">
      {[4, 8, 12].map((v) => (
        <motion.button key={v} whileTap={{ scale: 0.95 }} onClick={() => setBoxes(v)}
          className={`relative h-14 flex-1 rounded-xl border text-[22px] font-semibold tracking-tight ${v === n ? 'border-ink text-on-ink' : 'border-line'}`}>
          {v === n && <motion.span layoutId="count-pill" className="absolute inset-0 rounded-xl bg-ink" transition={spring} />}
          <span className="relative">{v}</span>
        </motion.button>
      ))}
      <div className="flex h-14 flex-[1.4] items-center justify-between rounded-xl border border-line px-1">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setBoxes(n - 1)} className="h-11 w-11 rounded-lg text-xl" aria-label="Färre">−</motion.button>
        <Num v={n} className="text-[22px] font-semibold" />
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setBoxes(n + 1)} className="h-11 w-11 rounded-lg text-xl" aria-label="Fler">+</motion.button>
      </div>
    </div>
  );
}

export function KitPicker() {
  const { plan, t: tg } = useBatch();
  const counts = split(plan.boxes, Math.max(1, plan.kits.length));
  return (
    <motion.div variants={stagger.parent} initial="hidden" animate="show" className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-2">
      {KITS.map((k) => {
        const idx = plan.kits.indexOf(k.id);
        const sel = idx >= 0;
        // Preview box: the kit's own defaults, sized to the current goal.
        const pr = byId(PROTEINS, k.protein[0]);
        const box = calcBox({ i: 0, kit: k, protein: pr, method: DEFAULT_METHOD(pr), carb: byId(CARBS, k.carb), veg: byId(VEGS, k.veg) }, plan, tg);
        const list = (xs: readonly KitItem[]) => xs.map((x) => x.name.toLowerCase()).join(', ');
        return (
          <motion.button key={k.id} layout variants={stagger.child} whileTap={{ scale: 0.985 }} onClick={() => toggleKit(k.id)}
            aria-pressed={sel} style={{ '--hue': k.hue } as React.CSSProperties} transition={spring}
            className={`group relative flex flex-col gap-2 overflow-hidden rounded-xl border p-3 text-left transition-colors ${sel ? 'border-ink bg-surface shadow-[0_8px_24px_-16px_rgba(35,33,29,.5)]' : 'border-line hover:border-muted'}`}>
            <span className="flex w-full items-center gap-3">
              <span className="relative shrink-0">
                <KitArt kit={k} size={64} spin={sel} />
                <AnimatePresence initial={false}>
                  {sel && (
                    <motion.span key={counts[idx]} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}
                      className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1 font-mono text-[11px] text-on-ink">
                      ×{counts[idx]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{k.name}</span>
                <span className="text-[13px] text-muted">{k.tagline}</span>
              </span>
              <span className="flex flex-col items-end font-mono text-[11px] leading-tight">
                <span>{nf(box.m[0])} kcal</span><span className="text-muted">{nf(box.m[1])} g P</span>
              </span>
            </span>
            <span className="text-[12px] leading-snug text-muted">
              <span className="text-ink">{pr.name}, {byId(CARBS, k.carb).name.toLowerCase()}, {byId(VEGS, k.veg).name.toLowerCase()}.</span>{' '}
              {k.mix.length > 0 && <>I såsen: {list(k.mix)}. </>}
              {k.top.length > 0 && <>Toppas: {list(k.top)}.</>}
            </span>
            <AnimatePresence initial={false}>
              {sel && (
                <motion.span initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="block overflow-hidden">
                  <span className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-t border-line-soft pt-2 text-[12px]">
                    {box.parts.filter((x) => x.role !== 'olja').map((x, i) => (
                      <Fragment key={i}>
                        <span className={x.role === 'topp' ? 'text-muted' : ''}>{x.role === 'topp' ? '+ ' : ''}{x.name}</span>
                        <span className="font-mono">{x.u === 'g' && x.cooked ? `${nf(x.q)} g rå` : fmtQty(x.q, x.u)}</span>
                      </Fragment>
                    ))}
                  </span>
                  <span className="mt-2 block rounded-lg bg-bg px-2.5 py-1.5 text-[12px] text-muted">{k.tip}</span>
                </motion.span>
              )}
            </AnimatePresence>
            {sel && <motion.span layoutId={`kitbar-${k.id}`} className="kit-bg absolute inset-y-0 left-0 w-1" />}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export function VegMode() {
  const { plan } = useBatch();
  return (
    <Segmented id="veg" value={plan.vegMode} onChange={setVegMode}
      options={(['rostade', 'frysta'] as const).map((id) => [id, <span key={id} className="flex flex-col items-start"><span className="font-semibold">{t.veg[id][0]}</span><span className="text-[11px] font-normal text-muted">{t.veg[id][1]}</span></span>] as const)} />
  );
}

export function Check({ on }: { on: boolean }) {
  return (
    <span className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-colors ${on ? 'border-ink bg-ink' : 'border-line'}`}>
      <motion.svg viewBox="0 0 16 16" className="h-3 w-3" initial={false} animate={{ opacity: on ? 1 : 0 }}>
        <motion.path d="M3 8.5l3 3 7-7" fill="none" stroke="var(--on-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          initial={false} animate={{ pathLength: on ? 1 : 0 }} transition={{ duration: 0.25 }} />
      </motion.svg>
    </span>
  );
}
