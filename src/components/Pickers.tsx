'use client';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { KITS, PROTEINS, INGR, CARBS, VEGS, byId, type MethodId } from '@/lib/data';
import { fmtMin, nf, split } from '@/lib/calc';
import { setBoxes, setMethod, setVegMode, toggleKit, toggleProtein } from '@/lib/actions';
import { useBatch } from '@/lib/useBatch';
import { Num } from './Num';
import { Segmented, spring, stagger } from './ui';

export function ProteinPicker() {
  const { plan } = useBatch();
  return (
    <motion.div variants={stagger.parent} initial="hidden" animate="show" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PROTEINS.map((p) => {
        const sel = plan.proteins.find((x) => x.id === p.id);
        const n = INGR[p.ingr].n;
        const methods = Object.keys(p.methods) as MethodId[];
        return (
          <motion.div key={p.id} variants={stagger.child} layout transition={spring}
            className={`flex flex-col gap-1 rounded-xl border p-3 transition-colors ${sel ? 'border-ink bg-surface' : 'border-line'}`}>
            <button onClick={() => toggleProtein(p.id)} className="flex flex-col items-start gap-0.5 text-left">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <Check on={!!sel} />
              </span>
              <span className="font-mono text-[11px] text-muted">{nf(n[1], 1)} g P / 100 g</span>
            </button>
            <AnimatePresence initial={false}>
              {sel && methods.length > 1 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                  <div className="pt-1.5">
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
  const { plan } = useBatch();
  const counts = split(plan.boxes, Math.max(1, plan.kits.length));
  return (
    <motion.div variants={stagger.parent} initial="hidden" animate="show" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {KITS.map((k) => {
        const idx = plan.kits.indexOf(k.id);
        const sel = idx >= 0;
        const kcal = k.mix.concat(k.top).reduce((s, x) => s + (x.ingr && (x.u === 'g' || x.u === 'ml') ? (INGR[x.ingr].n[0] * x.q) / 100 : 0), 0);
        return (
          <motion.button key={k.id} variants={stagger.child} whileTap={{ scale: 0.98 }} onClick={() => toggleKit(k.id)}
            style={{ '--hue': k.hue } as React.CSSProperties}
            className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 text-left transition-colors ${sel ? 'border-ink bg-surface' : 'border-line hover:border-muted'}`}>
            <span className="kit-bg relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] text-[#23211d]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={sel ? counts[idx] : 'x'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring}>
                  {sel ? `×${counts[idx]}` : ''}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{k.name}</span>
              <span className="truncate text-[13px] text-muted">{k.tagline} · {byId(PROTEINS, k.protein[0]).name.toLowerCase()}, {byId(CARBS, k.carb).name.toLowerCase()}, {byId(VEGS, k.veg).name.toLowerCase()}</span>
            </span>
            <span className="font-mono text-[11px] text-muted">+{nf(kcal)}</span>
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
