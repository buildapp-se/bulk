'use client';
import Link from 'next/link';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n/sv';
import { CARBS, KITS, PROTEINS, VEGS } from '@/lib/data';
import { fmtMin, nf, type BoxCalc, type Slot } from '@/lib/calc';
import { clearAll, resetBox, setKitCarb, setKitProtein, setKitVeg, setSlot, swapBoxes } from '@/lib/actions';
import { useBatch } from '@/lib/useBatch';
import { haptic } from '@/lib/haptics';
import { Num } from './Num';
import { Pill, spring } from './ui';
import { KitArt } from './KitArt';

export function BatchPanel() {
  const { plan, calcs, avg, incomplete, offGoal, sched } = useBatch();
  const [open, setOpen] = useState<number | null>(null);
  const off = calcs.filter(offGoal);
  const kitRows = plan.kits.map((id) => {
    const mine = calcs.filter((c) => c.box.kit?.id === id && !c.missing.length);
    const kit = KITS.find((k) => k.id === id)!;
    const prots = [...new Set(calcs.filter((c) => c.box.kit?.id === id).map((c) => c.box.protein?.id ?? ''))];
    return {
      id, kit, n: calcs.filter((c) => c.box.kit?.id === id).length, kcal: mine.length ? mine.reduce((s, c) => s + c.m[0], 0) / mine.length : 0,
      // '' = mixed or none: the select shows a placeholder.
      protein: plan.kitProtein[id] ?? (prots.length === 1 ? prots[0] : ''), mixed: prots.length > 1,
      carb: plan.kitCarb[id] ?? kit.carb, veg: plan.kitVeg[id] ?? kit.veg,
    };
  });
  const chosen = PROTEINS.filter((p) => plan.proteins.some((x) => x.id === p.id));
  const others = PROTEINS.filter((p) => !chosen.includes(p));

  return (
    <aside className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-1.5"><span className="text-[17px] font-semibold">{t.batch}</span><ClearAll /></div>
        <div className="font-mono text-xs text-muted">{t.trays(sched.trays, fmtMin(sched.total))}</div>
      </div>

      <motion.div layout className="grid grid-cols-4 gap-x-1.5 gap-y-3 pt-2.5">
        {calcs.map((c) => <BoxTile key={c.box.i} c={c} warn={offGoal(c)} onOpen={() => setOpen(c.box.i)} />)}
      </motion.div>
      <p className="-mt-3 text-[11px] text-muted">{t.box.drag}</p>

      <AnimatePresence>
        {incomplete.length > 0 && (
          <motion.button key="miss" layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            onClick={() => setOpen(incomplete[0].box.i)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-warn px-3 py-2 text-left text-[13px] text-warn">
            <span className="h-2 w-2 animate-pulse rounded-full bg-warn" /> {t.missing(incomplete.length)}
          </motion.button>
        )}
        {off.length > 0 && (
          <motion.div key="off" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="text-[13px] text-warn">
            {t.offGoal(off.length)} {off[0].box.protein && `${off[0].box.protein.name} räcker inte hela vägen, byt protein eller sänk målet.`}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col">
        {kitRows.map((r) => (
          <motion.div layout key={r.id} className="flex flex-col gap-2 border-t border-line-soft py-3" style={{ '--hue': r.kit.hue } as React.CSSProperties}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="kit-bg h-2.5 w-2.5 rounded-[3px]" />
                <span className="font-semibold">{r.kit.name}</span>
                <span className="text-[13px] text-muted">{r.n} {r.n === 1 ? 'låda' : 'lådor'}</span>
              </div>
              <span className="font-mono text-xs"><Num v={r.kcal} /> kcal</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label={t.slots.protein} value={r.protein} onChange={(v) => setKitProtein(r.id, v)}>
                {!r.protein && <option value="" disabled>{r.mixed ? t.box.mixed : t.box.pick}</option>}
                {chosen.length > 0 && <optgroup label={t.box.chosen}>{chosen.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>}
                <optgroup label={chosen.length ? t.box.others : t.slots.protein}>{others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
              </Field>
              <Field label={t.slots.carb} value={r.carb} onChange={(v) => setKitCarb(r.id, v)}>
                {CARBS.map((cb) => <option key={cb.id} value={cb.id}>{cb.short ?? cb.name}</option>)}
              </Field>
              <Field label={t.slots.veg} value={r.veg} onChange={(v) => setKitVeg(r.id, v)}>
                {VEGS.map((v) => <option key={v.id} value={v.id}>{v.name}{v.frozenOnly ? ` ${t.box.frozen}` : ''}</option>)}
              </Field>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-line pt-4">
        {avg.map((v, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="text-xl font-semibold tracking-tight"><Num v={v} />{i > 0 && <span className="text-sm"> g</span>}</span>
            <span className="text-[12px] text-muted">{i === 0 ? 'ø ' : ''}{t.avg[i]}</span>
          </div>
        ))}
      </div>

      <Link href="/ingredienser" transitionTypes={['nav-forward']} onClick={() => haptic()}
        className="group flex justify-between rounded-xl bg-ink px-4 py-3.5 font-semibold text-on-ink">
        <span>{t.toIngredients}</span><span className="transition-transform group-hover:translate-x-1">→</span>
      </Link>

      <AnimatePresence>{open !== null && calcs[open] && <BoxSheet c={calcs[open]} onClose={() => setOpen(null)} />}</AnimatePresence>
    </aside>
  );
}

/** Native select dressed as a field: the phone's own picker, labelled, never wider than its column. */
function Field({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</span>
      <span className="relative">
        {/* 16px on phones: iOS zooms into smaller selects on focus. */}
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none truncate rounded-lg border border-line bg-bg py-2 pl-2 pr-5 text-base outline-none transition-colors hover:border-muted focus-visible:ring-2 focus-visible:ring-ink sm:text-[13px]">
          {children}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted">▾</span>
      </span>
    </label>
  );
}

/** Two taps to clear: the first arms it for 3 s, so a stray tap never wipes the batch. */
function ClearAll() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <motion.button layout transition={spring} onClick={() => { if (armed) { clearAll(); setArmed(false); } else { haptic(); setArmed(true); } }}
      aria-label={t.box.clearAll} title={t.box.clearAll}
      className={`flex h-8 items-center justify-center rounded-full text-[13px] transition-colors ${armed ? 'bg-warn px-3 font-semibold text-white' : 'w-8 text-muted hover:bg-sunken hover:text-ink'}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={String(armed)} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
          {armed ? t.box.clearAsk : '↺'}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function BoxTile({ c, warn, onOpen }: { c: BoxCalc; warn: boolean; onOpen: () => void }) {
  const drag = useDragControls();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lifted, setLifted] = useState(false);
  const moved = useRef(false);
  const hue = c.box.kit?.hue;
  const empty = c.missing.length > 0;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <motion.button
      layout
      layoutId={`box-${c.box.i}`}
      data-box={c.box.i}
      drag
      dragControls={drag}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0.2}
      whileDrag={{ scale: 1.12, zIndex: 20, boxShadow: '0 12px 30px rgba(0,0,0,.25)' }}
      animate={{ scale: lifted ? 1.06 : 1 }}
      transition={spring}
      onPointerDown={(e) => {
        moved.current = false;
        const ev = e.nativeEvent;
        timer.current = setTimeout(() => { setLifted(true); haptic(12); drag.start(ev); }, 320);
      }}
      onPointerUp={() => { if (timer.current) clearTimeout(timer.current); if (!lifted && !moved.current) onOpen(); setLifted(false); }}
      onPointerLeave={() => { if (timer.current && !lifted) clearTimeout(timer.current); }}
      onPointerMove={() => { if (!lifted) moved.current = true; }}
      onDragEnd={(e) => {
        setLifted(false);
        const pt = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0] : (e as PointerEvent);
        const el = document.elementsFromPoint(pt.clientX, pt.clientY).find((x) => x instanceof HTMLElement && x.dataset.box !== undefined && Number(x.dataset.box) !== c.box.i) as HTMLElement | undefined;
        if (el) swapBoxes(c.box.i, Number(el.dataset.box));
      }}
      style={hue !== undefined ? ({ '--hue': hue, touchAction: lifted ? 'none' : 'manipulation' } as React.CSSProperties) : undefined}
      // Neutral tile: the kit's art carries the identity, its colour only as a small dot (Patrik 2026-09-24).
      className={`relative flex aspect-[1.2] select-none flex-col justify-between rounded-lg border p-1.5 text-left ${empty ? 'border-dashed border-warn bg-transparent' : 'border-line bg-bg'}`}
    >
      <span className="flex items-center gap-1 font-mono text-[10px] text-muted">
        {String(c.box.i + 1).padStart(2, '0')}
        {(warn || empty) && <span className="h-1.5 w-1.5 rounded-full bg-warn" />}
      </span>
      {/* The bowl sits on the box's corner, a quarter hanging over. 46 px, scaled to 38 on phones where the tile is ~75 px wide. */}
      {c.box.kit && <span className="pointer-events-none absolute -right-2.5 -top-2.5 origin-top-right scale-[0.83] sm:scale-100"><KitArt kit={c.box.kit} size={46} spin /></span>}
      <span className="flex flex-col leading-[1.1]">
        <span className="flex items-center gap-1 text-[11px] font-semibold">
          {c.box.kit && <span className="kit-bg h-1.5 w-1.5 shrink-0 rounded-full" />}
          <span className="truncate">{c.box.kit?.name ?? t.box.empty}</span>
        </span>
        <span className="truncate text-[10px] opacity-70">{c.box.protein?.name ?? '—'}</span>
      </span>
    </motion.button>
  );
}

function BoxSheet({ c, onClose }: { c: BoxCalc; onClose: () => void }) {
  const i = c.box.i;
  const hue = c.box.kit?.hue ?? 60;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const rows: { slot: Slot; opts: { id: string; name: string; hue?: number }[]; cur?: string }[] = [
    { slot: 'kit', opts: KITS.map((k) => ({ id: k.id, name: k.name, hue: k.hue })), cur: c.box.kit?.id },
    { slot: 'protein', opts: PROTEINS.map((p) => ({ id: p.id, name: p.name })), cur: c.box.protein?.id },
    { slot: 'carb', opts: CARBS.map((p) => ({ id: p.id, name: p.name })), cur: c.box.carb?.id },
    { slot: 'veg', opts: VEGS.map((p) => ({ id: p.id, name: p.name })), cur: c.box.veg?.id },
  ];
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={t.box.title(i + 1)}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] max-w-lg overflow-y-auto rounded-t-3xl bg-surface pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:bottom-6 sm:rounded-3xl"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 600) onClose(); }}
      >
        <motion.div layoutId={`box-${i}`} className={`relative m-3 mt-12 flex items-end justify-between rounded-2xl p-4 pr-28 ${c.missing.length ? 'border border-dashed border-warn' : 'border border-line bg-bg'}`} style={{ '--hue': hue } as React.CSSProperties}>
          <div>
            <div className="font-mono text-xs opacity-70">{t.box.title(i + 1)}</div>
            <div className="text-2xl font-semibold tracking-tight">{c.box.kit?.name ?? t.box.empty}</div>
          </div>
          {!c.missing.length && <div className="text-right font-mono text-sm"><Num v={c.m[0]} /> kcal<br /><Num v={c.m[1]} /> g P</div>}
          {c.box.kit && <span className="pointer-events-none absolute -right-2 -top-10"><KitArt kit={c.box.kit} size={112} spin /></span>}
        </motion.div>
        <div className="flex flex-col gap-4 px-4 pt-1">
          {rows.map((r) => (
            <div key={r.slot} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className={`label ${!r.cur ? '!text-warn' : ''}`}>{t.slots[r.slot]}{!r.cur && ` · ${t.box.empty}`}</span>
                {r.cur && <button className="text-[12px] text-muted underline" onClick={() => setSlot(i, r.slot, null)}>{t.box.clear}</button>}
              </div>
              <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                {r.opts.map((o) => <Pill key={o.id} on={o.id === r.cur} hue={o.hue} onClick={() => setSlot(i, r.slot, o.id)}>{o.name}</Pill>)}
              </div>
            </div>
          ))}
          {!c.missing.length && (
            <div className="rounded-xl bg-bg p-3 text-[13px]">
              {c.parts.filter((x) => x.role !== 'olja' && x.u === 'g' && x.role !== 'kit' && x.role !== 'topp').map((x) => (
                <div key={x.name} className="flex justify-between"><span>{x.name}</span><span className="font-mono">{nf(x.q)} g rå{x.cooked ? ` → ${nf(x.cooked)} g` : ''}</span></div>
              ))}
            </div>
          )}
          <button onClick={() => { resetBox(i); }} className="self-start text-[13px] text-muted underline">{t.box.reset}</button>
        </div>
      </motion.div>
    </>
  );
}
