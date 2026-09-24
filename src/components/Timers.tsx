'use client';
// Cooking timers: rolling digital clocks, the dock in the header and the alarm.
// The dock lives in the (persistent) header, so alarms ring on every page, not only on Tillagning.
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { t } from '@/i18n/sv';
import type { Step } from '@/lib/calc';
import { fmtClock, leftMs, nudge, pause, resume, ringing, running, start, type Clock } from '@/lib/clock';
import { setCook, useCook } from '@/lib/store';
import { useBatch } from '@/lib/useBatch';
import { haptic } from '@/lib/haptics';
import { spring } from './ui';

// ---------- One shared ticker, so the dock and the big clocks never disagree ----------
let now = Date.now();
const subs = new Set<() => void>();
let iv: ReturnType<typeof setInterval> | undefined;
const tick = (f: () => void) => {
  subs.add(f);
  iv ??= setInterval(() => { now = Date.now(); subs.forEach((g) => g()); }, 250);
  return () => { subs.delete(f); if (!subs.size) { clearInterval(iv); iv = undefined; } };
};
const idle = () => () => {};
/** Current time, re-rendering 4×/s while `active`. */
export const useNow = (active: boolean) => useSyncExternalStore(active ? tick : idle, () => now, () => 0);

// ---------- Alarm sound: Web Audio, unlocked by a tap (iOS needs a gesture) ----------
let ctx: AudioContext | null = null;
function unlockAudio() {
  try { ctx ??= new AudioContext(); void ctx.resume(); } catch { /* no Web Audio */ }
}
function chime() {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = ctx!.createOscillator(), g = ctx!.createGain();
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
    o.connect(g).connect(ctx!.destination);
    o.start(t0 + d); o.stop(t0 + d + 0.2);
  });
}

async function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/bulk/icon-192.png', tag: title, requireInteraction: true });
    else new Notification(title, { body });
  } catch { /* notification blocked */ }
}

// ---------- Actions ----------
const edit = (id: string, f: (c: Clock | undefined, now: number) => Clock | undefined) => {
  now = Date.now();
  setCook((s) => {
    const clocks = { ...s.clocks };
    const next = f(clocks[id], now);
    if (next) clocks[id] = next; else delete clocks[id];
    return { ...s, clocks };
  });
};
export const clocks = {
  // Starting a step also pins the schedule's clock times to now: that step starts this minute.
  start: (s: Step) => { unlockAudio(); haptic(12); edit(s.id, (_, n) => start(s.dur, n)); setCook((c) => ({ ...c, at: now - s.t * 60000, last: now })); },
  toggle: (id: string) => { unlockAudio(); haptic(); edit(id, (c, n) => c && (running(c) ? pause(c, n) : resume(c, n))); },
  nudge: (id: string, min: number) => { haptic(); edit(id, (c, n) => c && nudge(c, min * 60000, n)); },
  stop: (id: string) => { haptic(); edit(id, () => undefined); },
  /** Silence a finished clock and tick its step off. */
  ack: (id: string) => {
    haptic(14);
    setCook((s) => { const c = { ...s.clocks }; delete c[id]; return { ...s, clocks: c, done: { ...s.done, [id]: true } }; });
  },
};

export const caption = (s: Step) => `${s.what ?? s.title}${s.temp ? ` · ${s.temp} °C` : ''}`;

// ---------- Rolling digits ----------
/** Each digit rolls in from above when it changes. Keyed by position from the right, so seconds stay seconds. */
export function Digits({ ms, className = '' }: { ms: number; className?: string }) {
  const txt = fmtClock(ms);
  const n = txt.length;
  return (
    <span className={`inline-flex font-mono tabular-nums ${className}`} role="timer" aria-label={txt}>
      {[...txt].map((ch, i) =>
        ch === ':' ? <span key={`c${n - i}`} className="opacity-50">:</span> : (
          <span key={n - i} className="relative inline-block w-[0.62em] overflow-hidden text-center">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span key={ch} className="inline-block" initial={{ y: '-90%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '90%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}>{ch}</motion.span>
            </AnimatePresence>
          </span>
        ))}
    </span>
  );
}

function Btn({ onClick, children, label, primary }: { onClick: () => void; children: React.ReactNode; label?: string; primary?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} aria-label={label}
      className={`h-11 min-w-11 rounded-full px-4 font-mono text-sm font-semibold ${primary ? 'bg-[color:var(--p)] text-white' : 'border border-current/20'}`}>
      {children}
    </motion.button>
  );
}

/** The big clock under a running step. */
export function ClockPanel({ s, c, now }: { s: Step; c: Clock; now: number }) {
  const ring = ringing(c, now);
  const run = running(c);
  return (
    <div className={`flex flex-col items-center gap-3 rounded-2xl px-4 py-5 transition-colors ${ring ? 'bg-ink text-on-ink' : 'bg-surface ring-1 ring-line'}`}>
      <motion.div className={`text-[clamp(56px,17vw,104px)] font-semibold leading-none tracking-tight ${!run && !ring ? 'opacity-40' : ''}`}
        animate={ring ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={ring ? { repeat: Infinity, duration: 1 } : spring}>
        {ring ? t.cook.done : <Digits ms={leftMs(c, now)} />}
      </motion.div>
      <div className="text-center text-sm opacity-70">{caption(s)}{!run && !ring ? ` · ${t.cook.paused}` : ''}</div>
      <div className="flex flex-wrap justify-center gap-2">
        {ring ? (
          <>
            <Btn onClick={() => clocks.nudge(s.id, 1)}>+1 min</Btn>
            <Btn primary onClick={() => clocks.ack(s.id)}>{t.cook.ack}</Btn>
          </>
        ) : (
          <>
            <Btn label={t.cook.minus} onClick={() => clocks.nudge(s.id, -1)}>−1</Btn>
            <Btn onClick={() => clocks.toggle(s.id)}>{run ? t.cook.pause : t.cook.resume}</Btn>
            <Btn label={t.cook.plus} onClick={() => clocks.nudge(s.id, 1)}>+1</Btn>
            <Btn onClick={() => clocks.stop(s.id)}>{t.cook.stop}</Btn>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Dock + alarm ----------
/** Started clocks as chips under the header, soonest first. Also rings, vibrates and notifies. */
export function TimerDock() {
  const { sched } = useBatch();
  const cook = useCook();
  const now = useNow(Object.keys(cook.clocks).length > 0);
  // Clocks whose step left the schedule (plan changed) are ignored.
  const items = sched.steps.filter((s) => cook.clocks[s.id])
    .map((s) => ({ s, c: cook.clocks[s.id], left: leftMs(cook.clocks[s.id], now) }))
    .sort((a, b) => a.left - b.left);
  const ringingNow = items.filter((x) => ringing(x.c, now));
  const loud = ringingNow.length > 0;

  // Sound + vibration repeat until every finished clock is acknowledged.
  useEffect(() => {
    if (!loud) return;
    const go = () => { chime(); if ('vibrate' in navigator) navigator.vibrate([300, 120, 300]); };
    go();
    const id = setInterval(go, 2000);
    return () => clearInterval(id);
  }, [loud]);

  // A tap anywhere unlocks audio, so a clock that finishes after a reload can still ring.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  // One notification per finish (keyed on end time, so +1 min that runs out again notifies again). Skip stale ones after a reload.
  const notified = useRef(new Set<string>());
  useEffect(() => {
    for (const { s, c } of ringingNow) {
      const key = `${s.id}:${'end' in c ? c.end : 0}`;
      if (notified.current.has(key) || !('end' in c) || now - c.end > 60000) continue;
      notified.current.add(key);
      void notify(t.cook.notifDone(s.what ?? s.title), caption(s));
    }
  }, [ringingNow, now]);

  return (
    <AnimatePresence initial={false}>
      {items.length > 0 && (
        <motion.div key="dock" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
          <div className="no-scrollbar mx-auto flex max-w-[1120px] gap-2 overflow-x-auto px-4 pb-3 sm:px-5">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map(({ s, c, left }) => {
                const ring = ringing(c, now);
                return (
                  <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.8, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} transition={spring}
                    className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-3 pr-1 ${ring ? 'bg-ink text-on-ink' : 'bg-surface ring-1 ring-line'}`}>
                    <Link href={`/tillagning#step-${s.id}`} className="flex items-center gap-2">
                      {ring
                        ? <motion.span className="font-mono text-[15px] font-semibold" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>{t.cook.done}</motion.span>
                        : <Digits ms={left} className={`text-[15px] font-semibold ${running(c) ? '' : 'opacity-40'}`} />}
                      <span className="max-w-[16ch] truncate text-[12px] opacity-70">{s.what ?? s.title}</span>
                    </Link>
                    {ring
                      ? <button onClick={() => clocks.ack(s.id)} className="h-8 rounded-full bg-[color:var(--p)] px-3 text-[12px] font-semibold text-white">{t.cook.ack}</button>
                      : <button onClick={() => clocks.toggle(s.id)} aria-label={running(c) ? t.cook.pause : t.cook.resume} className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] opacity-70">{running(c) ? '❚❚' : '▶'}</button>}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
