'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { t } from '@/i18n/sv';
import { fmtMin, type Step, type StepLine } from '@/lib/calc';
import { leftMs, ringing, running, type Clock } from '@/lib/clock';
import { useBatch } from '@/lib/useBatch';
import { setCook, useCook } from '@/lib/store';
import { haptic } from '@/lib/haptics';
import { Check } from './Pickers';
import { spring } from './ui';
import { ClockPanel, Digits, clocks, useNow } from './Timers';

const TRACK_COLOR: Record<string, string> = { prep: 'var(--muted)', ugn: 'var(--f)', spis: 'var(--c)', sousvide: 'oklch(0.62 0.1 240)', form: 'oklch(0.55 0.1 30)', klar: 'var(--p)' };

/** Screen Wake Lock while any timer runs (re-acquired when the tab becomes visible again). */
function useWakeLock(on: boolean) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let dead = false;
    const get = async () => { try { lock = await navigator.wakeLock.request('screen'); if (!dead) setHeld(true); lock.addEventListener('release', () => setHeld(false)); } catch { setHeld(false); } };
    const vis = () => document.visibilityState === 'visible' && get();
    get();
    document.addEventListener('visibilitychange', vis);
    return () => { dead = true; document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}); setHeld(false); };
  }, [on]);
  return held;
}

export function Cook() {
  const { sched } = useBatch();
  const cook = useCook();
  const anyClock = Object.keys(cook.clocks).length > 0;
  const now = useNow(anyClock);
  const awake = useWakeLock(Object.values(cook.clocks).some(running));
  const [perm, setPerm] = useState<NotificationPermission | 'na'>('na');
  useEffect(() => { setPerm(typeof Notification === 'undefined' ? 'na' : Notification.permission); }, []);

  const steps = sched.steps;
  const doneN = steps.filter((s) => cook.done[s.id]).length;
  const next = steps.find((s) => !cook.done[s.id] && !cook.clocks[s.id]);

  const toggleDone = (s: Step) => {
    haptic(cook.done[s.id] ? 6 : 14);
    setCook((c) => { const cl = { ...c.clocks }; delete cl[s.id]; return { ...c, done: { ...c.done, [s.id]: !c.done[s.id] }, clocks: cl }; });
  };

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(26px,5vw,38px)] font-semibold tracking-[-0.03em]">{t.cook.title}</h1>
        <p className="text-muted">{t.cook.summary(sched.trays, fmtMin(sched.total))}</p>
        {sched.warnings.map((w) => <p key={w} className="text-[13px] text-warn">{w}</p>)}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[13px] text-muted">
          <span>{t.cook.progress(doneN, steps.length)}</span>
          <div className="flex items-center gap-3">
            {awake && <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--p)]" />{t.cook.awake}</span>}
            {perm !== 'na' && perm !== 'granted' && (
              <button className="underline" onClick={async () => setPerm(await Notification.requestPermission())} title={t.cook.notifyHint}>{t.cook.notify}</button>
            )}
            <button className="underline" onClick={() => { haptic(); setCook((c) => ({ ...c, done: {}, clocks: {} })); }}>{t.cook.reset}</button>
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full bg-ink" animate={{ width: `${(doneN / Math.max(1, steps.length)) * 100}%` }} transition={spring} />
        </div>
      </div>

      <Timeline steps={steps} clocks={cook.clocks} done={cook.done} now={now} />

      <div className="flex flex-col">
        {steps.map((s) => (
          <StepRow key={s.id} s={s} isNext={s.id === next?.id} done={!!cook.done[s.id]} c={cook.clocks[s.id]} now={now} onDone={() => toggleDone(s)} />
        ))}
      </div>

      <Labels />
      <p className="text-[12px] text-muted">{t.cook.disclaimer}</p>
    </div>
  );
}

function StepRow({ s, isNext, done, c, now, onDone }: { s: Step; isNext: boolean; done: boolean; c?: Clock; now: number; onDone: () => void }) {
  const timed = !!s.what && s.dur > 0;
  return (
    // Whole row toggles done; the timer controls stop the click.
    <motion.div layout transition={spring} id={`step-${s.id}`}
      role="checkbox" aria-checked={done} tabIndex={0} onClick={onDone}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onDone(); } }}
      whileTap={{ scale: 0.99 }}
      className="relative grid scroll-mt-40 cursor-pointer select-none grid-cols-[64px_28px_minmax(0,1fr)_auto] items-start gap-3 border-b border-line py-4 outline-none focus-visible:ring-2 focus-visible:ring-ink">
      {isNext && <motion.span layoutId="next-glow" className="absolute -inset-x-3 inset-y-1 -z-10 rounded-2xl bg-surface ring-1 ring-line" transition={spring} />}
      <span className="pt-1 font-mono text-xs text-muted">{s.label ?? `${s.t} min`}</span>
      <span className="pt-0.5"><Check on={done} /></span>
      <span className={`flex flex-col gap-1 transition-opacity ${done ? 'opacity-45' : ''}`}>
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="relative text-base font-semibold">
            {s.title}
            <motion.span className="absolute inset-x-0 top-1/2 h-px origin-left bg-ink" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={spring} />
          </span>
          <span className="rounded-full px-2 py-0.5 font-mono text-[10px] text-white" style={{ background: TRACK_COLOR[s.track] }}>{t.cook.tracks[s.track]}{s.temp ? ` · ${s.temp} °C` : ''}</span>
          {s.dur > 0 && <span className="font-mono text-[11px] text-muted">{fmtMin(s.dur)}</span>}
        </span>
        {s.rows && <Lines rows={s.rows} />}
        {s.details && <span className={`text-sm text-muted [text-wrap:pretty] ${s.rows ? 'mt-1.5' : ''}`}>{s.details}</span>}
      </span>
      {timed && !done && !c ? (
        <motion.button whileTap={{ scale: 0.92 }} onClick={(e) => { e.stopPropagation(); clocks.start(s); }} onKeyDown={(e) => e.stopPropagation()}
          aria-label={`${t.cook.start}: ${s.what}`}
          className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-ink text-[13px] font-semibold text-on-ink sm:px-4">
          <span aria-hidden>▶</span><span className="hidden sm:inline">{t.cook.start}</span>
        </motion.button>
      ) : <span />}
      <AnimatePresence initial={false}>
        {c && !done && (
          <motion.div key="clock" className="col-span-4 cursor-default overflow-hidden" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
            <ClockPanel s={s} c={c} now={now} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** A step's list: ingredient amounts as a tight table, kits as blocks with twist and tip. */
function Lines({ rows }: { rows: StepLine[] }) {
  const kits = rows.some((r) => r.sub || r.note);
  return (
    <span className={`mt-1 flex flex-col ${kits ? 'gap-3' : 'gap-0.5'}`}>
      {rows.map((r) => (
        <span key={r.name} className="flex flex-col gap-0.5" style={r.hue !== undefined ? ({ '--hue': r.hue } as React.CSSProperties) : undefined}>
          <span className="flex items-baseline gap-2 text-sm">
            {r.hue !== undefined && <span className="kit-bg h-2 w-2 shrink-0 translate-y-[-1px] rounded-sm" />}
            <span className={kits ? 'font-semibold' : ''}>{r.name}</span>
            <span className="ml-auto whitespace-nowrap font-mono text-[12px] text-muted">{r.right}</span>
          </span>
          {r.sub && <span className={`text-sm text-muted ${r.hue !== undefined ? 'pl-4' : ''}`}>{r.sub}</span>}
          {r.note && <span className={`text-[12px] text-muted opacity-80 [text-wrap:pretty] ${r.hue !== undefined ? 'pl-4' : ''}`}>{r.note}</span>}
        </span>
      ))}
    </span>
  );
}

function Timeline({ steps, clocks: cl, done, now }: { steps: Step[]; clocks: Record<string, Clock>; done: Record<string, boolean>; now: number }) {
  const t0 = Math.min(...steps.map((s) => s.t));
  const t1 = Math.max(...steps.map((s) => s.t + Math.max(s.dur, 5)));
  const span = Math.max(1, t1 - t0);
  const x = (v: number) => ((v - t0) / span) * 100;
  // "Now" line: where the running clock with least time left is in its step. Rung clocks may be stale, so they don't count.
  const anchor = steps.filter((s) => cl[s.id] && running(cl[s.id]) && !ringing(cl[s.id], now)).sort((a, b) => leftMs(cl[a.id], now) - leftMs(cl[b.id], now))[0];
  const nowT = anchor ? anchor.t + anchor.dur - Math.max(0, leftMs(cl[anchor.id], now)) / 60000 : null;
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  // Share of a step that has passed: its own clock if it has one, else the now line. Done = all of it.
  const passed = (s: Step) => {
    if (done[s.id]) return 1;
    const c = cl[s.id];
    if (c && s.dur) return clamp01(1 - leftMs(c, now) / (s.dur * 60000));
    if (nowT !== null) return s.dur ? clamp01((nowT - s.t) / s.dur) : nowT >= s.t ? 1 : 0;
    return 0;
  };
  const cols = 'grid-cols-[minmax(0,7.5rem)_1fr_3.25rem] sm:grid-cols-[minmax(0,12rem)_1fr_3.5rem]';
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
      <div className="label mb-1">{t.cook.live}</div>
      {steps.map((s, i) => {
        const c = cl[s.id];
        const p = passed(s);
        return (
          // Each row jumps to its step in the list below.
          <button key={s.id} onClick={() => document.getElementById(`step-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className={`grid ${cols} items-center gap-2 rounded-md text-left hover:bg-bg`}>
            <span className={`truncate text-[12px] ${done[s.id] ? 'text-muted line-through' : ''}`}>{s.title}</span>
            <span className="relative h-5 rounded-md bg-bg">
              <motion.span className="absolute inset-y-0.5 overflow-hidden rounded" style={{ left: `${x(s.t)}%`, background: TRACK_COLOR[s.track] }}
                initial={{ width: 0 }} animate={{ width: `${Math.max(1.5, (Math.max(s.dur, 2) / span) * 100)}%` }} transition={{ ...spring, delay: 0.03 * i }}>
                {/* Time that has gone loses its colour; what is left stays full. */}
                <motion.span className="absolute inset-y-0 left-0 bg-surface/70" initial={false} animate={{ width: `${p * 100}%` }}
                  transition={{ type: 'tween', duration: 0.9, ease: 'linear' }} />
              </motion.span>
              {nowT !== null && nowT >= t0 && nowT <= t1 && (
                <motion.span className="absolute -inset-y-0.5 w-0.5 rounded bg-ink" animate={{ left: `${x(nowT)}%` }} transition={{ type: 'tween', duration: 0.9, ease: 'linear' }} />
              )}
            </span>
            <span className="text-right text-[12px] font-semibold">
              {c && !done[s.id] && (ringing(c, now)
                ? <motion.span className="font-mono" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>{t.cook.done}</motion.span>
                : <Digits ms={leftMs(c, now)} className={running(c) ? '' : 'opacity-40'} />)}
            </span>
          </button>
        );
      })}
      <div className={`grid ${cols} gap-2 font-mono text-[10px] text-muted`}>
        <span />
        <span className="relative h-3">
          <span className="absolute left-0">{t0} min</span>
          {x(0) > 15 && x(0) < 85 && <span className="absolute -translate-x-1/2" style={{ left: `${x(0)}%` }}>0</span>}
          <span className="absolute right-0">{t1} min</span>
        </span>
        <span />
      </div>
    </div>
  );
}

function Labels() {
  const { calcs } = useBatch();
  const today = new Date();
  const last = new Date(today.getTime() + 3 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  const kinds = [...new Map(calcs.filter((c) => !c.missing.length).map((c) => [c.box.kit!.id + c.box.protein!.id, c])).values()];
  if (!kinds.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="label">{t.cook.labels}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {kinds.map((c) => (
          <div key={c.box.i} className="flex flex-col gap-0.5 rounded-xl border border-dashed border-line bg-surface p-3 text-[12px]" style={{ '--hue': c.box.kit!.hue } as React.CSSProperties}>
            <span className="flex items-center gap-1.5 font-semibold"><span className="kit-bg h-2 w-2 rounded-sm" />{c.box.kit!.name}</span>
            <span className="text-muted">{c.box.protein!.name} · {Math.round(c.m[0])} kcal · {Math.round(c.m[1])} g P</span>
            <span className="text-muted">Lagad {fmt(today)} · ät senast {fmt(c.box.protein!.id === 'lax' ? new Date(today.getTime() + 2 * 86400000) : last)}</span>
            <span className="text-muted">{c.box.kit!.heat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
