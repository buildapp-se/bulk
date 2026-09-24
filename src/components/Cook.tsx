'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n/sv';
import { fmtMin, type Step } from '@/lib/calc';
import { useBatch } from '@/lib/useBatch';
import { setCook, useCook } from '@/lib/store';
import { haptic } from '@/lib/haptics';
import { Check } from './Pickers';
import { spring } from './ui';

const TRACK_COLOR: Record<string, string> = { prep: 'var(--muted)', ugn: 'var(--f)', spis: 'var(--c)', sousvide: 'oklch(0.62 0.1 240)', form: 'oklch(0.55 0.1 30)', klar: 'var(--p)' };

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

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

async function notify(title: string, body: string) {
  haptic(40);
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/bulk/icon-192.png', tag: title });
    else new Notification(title, { body });
  } catch { /* notification blocked */ }
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

export function Cook() {
  const { sched, calcs } = useBatch();
  const cook = useCook();
  const running = Object.keys(cook.timers).length > 0;
  const now = useNow(running);
  const awake = useWakeLock(running);
  const [perm, setPerm] = useState<NotificationPermission | 'na'>('na');
  useEffect(() => { setPerm(typeof Notification === 'undefined' ? 'na' : Notification.permission); }, []);
  const notified = useRef(new Set<string>());

  const steps = sched.steps;
  const doneN = steps.filter((s) => cook.done[s.id]).length;
  const next = steps.find((s) => !cook.done[s.id] && !cook.timers[s.id]);

  // Fire a notification once when a running timer passes its duration (only if just now, not after a reload).
  useEffect(() => {
    for (const s of steps) {
      const at = cook.timers[s.id];
      if (!at || !s.dur) continue;
      const over = now - at - s.dur * 60000;
      if (over >= 0 && over < 60000 && !notified.current.has(s.id)) {
        notified.current.add(s.id);
        notify(t.cook.notifDone(s.title), next ? t.cook.notifTitle(next.title) : '');
      }
    }
  }, [now, steps, cook.timers, next]);

  const start = (s: Step) => { haptic(12); notified.current.delete(s.id); setCook((c) => ({ ...c, timers: { ...c.timers, [s.id]: Date.now() } })); };
  const stop = (s: Step) => { haptic(); setCook((c) => { const tm = { ...c.timers }; delete tm[s.id]; return { ...c, timers: tm }; }); };
  const toggleDone = (s: Step) => {
    haptic(cook.done[s.id] ? 6 : 14);
    setCook((c) => { const tm = { ...c.timers }; delete tm[s.id]; return { ...c, done: { ...c.done, [s.id]: !c.done[s.id] }, timers: tm }; });
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
            <button className="underline" onClick={() => { haptic(); setCook((c) => ({ ...c, done: {}, timers: {} })); }}>{t.cook.reset}</button>
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full bg-ink" animate={{ width: `${(doneN / Math.max(1, steps.length)) * 100}%` }} transition={spring} />
        </div>
      </div>

      <Timeline steps={steps} timers={cook.timers} done={cook.done} now={now} />
      <Oven steps={steps} timers={cook.timers} done={cook.done} now={now} calcsN={calcs.length} />

      <div className="flex flex-col">
        {steps.map((s) => (
          <StepRow key={s.id} s={s} isNext={s.id === next?.id} done={!!cook.done[s.id]} at={cook.timers[s.id]} now={now}
            onStart={() => start(s)} onStop={() => stop(s)} onDone={() => toggleDone(s)} />
        ))}
      </div>

      <Labels />
      <p className="text-[12px] text-muted">{t.cook.disclaimer}</p>
    </div>
  );
}

function StepRow({ s, isNext, done, at, now, onStart, onStop, onDone }: {
  s: Step; isNext: boolean; done: boolean; at?: number; now: number; onStart: () => void; onStop: () => void; onDone: () => void;
}) {
  const ms = s.dur * 60000;
  const left = at ? ms - (now - at) : ms;
  const frac = at && ms ? Math.min(1, (now - at) / ms) : 0;
  const over = !!at && left <= 0;
  return (
    <motion.div layout transition={spring}
      className={`grid grid-cols-[64px_28px_minmax(0,1fr)_auto] items-start gap-3 border-b border-line py-4 ${isNext ? 'relative' : ''}`}>
      {isNext && <motion.span layoutId="next-glow" className="absolute -inset-x-3 inset-y-1 -z-10 rounded-2xl bg-surface ring-1 ring-line" transition={spring} />}
      <span className="pt-1 font-mono text-xs text-muted">{s.label ?? `${s.t} min`}</span>
      <button onClick={onDone} aria-label={done ? 'Ångra' : t.cook.done} className="pt-0.5"><Check on={done} /></button>
      <span className={`flex flex-col gap-1 transition-opacity ${done ? 'opacity-45' : ''}`}>
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="relative text-base font-semibold">
            {s.title}
            <motion.span className="absolute inset-x-0 top-1/2 h-px origin-left bg-ink" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={spring} />
          </span>
          <span className="rounded-full px-2 py-0.5 font-mono text-[10px] text-white" style={{ background: TRACK_COLOR[s.track] }}>{t.cook.tracks[s.track]}{s.temp ? ` · ${s.temp} °C` : ''}</span>
          {s.dur > 0 && <span className="font-mono text-[11px] text-muted">{fmtMin(s.dur)}</span>}
        </span>
        <span className="text-sm text-muted [text-wrap:pretty]">{s.details}</span>
      </span>
      {s.dur > 0 && !done ? (
        <button onClick={at ? onStop : onStart} className="relative flex h-14 w-14 items-center justify-center" aria-label={at ? t.cook.stop : t.cook.start}>
          <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
            <circle cx="28" cy="28" r="25" fill="none" stroke="var(--line)" strokeWidth="3" />
            <motion.circle cx="28" cy="28" r="25" fill="none" stroke={over ? 'var(--p)' : TRACK_COLOR[s.track]} strokeWidth="3" strokeLinecap="round"
              style={{ pathLength: frac }} animate={over ? { opacity: [1, 0.4, 1] } : { opacity: 1 }} transition={over ? { repeat: Infinity, duration: 1.2 } : spring} />
          </svg>
          <span className="relative font-mono text-[10px] leading-tight">
            {at ? (over ? t.cook.over : clock(left)) : <span className="text-[12px] font-semibold">{t.cook.start}</span>}
          </span>
        </button>
      ) : <span className="w-14" />}
    </motion.div>
  );
}

function Timeline({ steps, timers, done, now }: { steps: Step[]; timers: Record<string, number>; done: Record<string, boolean>; now: number }) {
  const t0 = Math.min(...steps.map((s) => s.t));
  const t1 = Math.max(...steps.map((s) => s.t + Math.max(s.dur, 5)));
  const span = Math.max(1, t1 - t0);
  const x = (v: number) => ((v - t0) / span) * 100;
  const tracks = [...new Set(steps.map((s) => s.track))];
  // "Now" line: anchored on the most recently started timer.
  const anchor = Object.entries(timers).sort((a, b) => b[1] - a[1])[0];
  const nowT = anchor ? (steps.find((s) => s.id === anchor[0])?.t ?? 0) + (now - anchor[1]) / 60000 : null;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4">
      <div className="label mb-1">{t.cook.live}</div>
      {tracks.map((tr) => (
        <div key={tr} className="grid grid-cols-[76px_1fr] items-center gap-2">
          <span className="text-[11px] text-muted">{t.cook.tracks[tr]}</span>
          <div className="relative h-5 rounded-md bg-bg">
            {steps.filter((s) => s.track === tr).map((s, i) => (
              <motion.div key={s.id} title={s.title}
                className="absolute inset-y-0.5 rounded"
                style={{ left: `${x(s.t)}%`, background: TRACK_COLOR[tr], opacity: done[s.id] ? 0.35 : 1 }}
                initial={{ width: 0 }} animate={{ width: `${Math.max(1.5, (Math.max(s.dur, 2) / span) * 100)}%` }}
                transition={{ ...spring, delay: 0.05 * i }} />
            ))}
            {nowT !== null && nowT >= t0 && nowT <= t1 && (
              <motion.div className="absolute -inset-y-1 w-0.5 rounded bg-ink" animate={{ left: `${x(nowT)}%` }} transition={{ type: 'tween', duration: 0.9, ease: 'linear' }} />
            )}
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[76px_1fr] gap-2 font-mono text-[10px] text-muted">
        <span />
        <span className="flex justify-between"><span>{t0} min</span><span>0</span><span>{t1} min</span></span>
      </div>
    </div>
  );
}

function Oven({ steps, timers, done, now, calcsN }: { steps: Step[]; timers: Record<string, number>; done: Record<string, boolean>; now: number; calcsN: number }) {
  const oven = steps.filter((s) => s.track === 'ugn' && s.dur > 0 && s.id !== 'out' && s.id !== 'form-up');
  if (!oven.length || !calcsN) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="label">{t.cook.trayView}</div>
      <div className="relative overflow-hidden rounded-2xl bg-[#1d1a17] p-3 shadow-inner">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,140,60,.28),transparent_70%)]" />
        <div className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, oven.length)}, minmax(0,1fr))` }}>
          {oven.map((s) => {
            const at = timers[s.id];
            const inOven = !!at && !done[s.id];
            const frac = at ? Math.min(1, (now - at) / (s.dur * 60000)) : 0;
            return (
              <div key={s.id} className="relative flex h-24 flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-[#2a2622] p-2">
                <AnimatePresence>
                  {(inOven || done[s.id]) && (
                    <motion.div className="absolute inset-1.5 rounded-md"
                      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: done[s.id] ? 0.35 : 1 }} exit={{ y: 80, opacity: 0 }} transition={spring}
                      style={{ background: `repeating-radial-gradient(circle at 30% 40%, ${TRACK_COLOR.ugn} 0 5px, transparent 6px 12px)` }} />
                  )}
                </AnimatePresence>
                {inOven && <motion.div className="absolute inset-x-0 bottom-0 h-1 origin-left bg-orange-400" animate={{ scaleX: frac }} transition={{ ease: 'linear', duration: 0.9 }} />}
                <span className="relative text-[11px] font-semibold text-white/90">{s.title.replace(/ in$/, '')}</span>
                <span className="relative font-mono text-[10px] text-white/60">{inOven ? clock(s.dur * 60000 - (now - at)) : `${s.temp} °C · ${fmtMin(s.dur)}`}</span>
              </div>
            );
          })}
        </div>
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
