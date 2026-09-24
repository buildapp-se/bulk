'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { t } from '@/i18n/sv';
import { fmtMin, isLong, type Step, type StepLine } from '@/lib/calc';
import { fmtAt, fmtAtStr, leftMs, MIN, ringing, running, zeroAt, type Clock } from '@/lib/clock';
import { useBatch } from '@/lib/useBatch';
import { setCook, useCook } from '@/lib/store';
import { haptic } from '@/lib/haptics';
import { Check } from './Pickers';
import { Segmented, spring } from './ui';
import { ClockPanel, Digits, clocks, useNow } from './Timers';

const TRACK_COLOR: Record<string, string> = { prep: 'var(--muted)', ugn: 'var(--f)', spis: 'var(--c)', sousvide: 'oklch(0.62 0.1 240)', form: 'oklch(0.55 0.1 30)', klar: 'var(--p)' };

/** Screen Wake Lock while `on` (re-acquired when the tab becomes visible again, since the browser drops it on hide). */
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
  const now = useNow(true); // the clock at the top ticks whether or not a timer runs
  const awake = useWakeLock(true); // whole cooking view: phones must not lock mid-recipe, timer or not
  const [perm, setPerm] = useState<NotificationPermission | 'na'>('na');
  useEffect(() => { setPerm(typeof Notification === 'undefined' ? 'na' : Notification.permission); }, []);

  const steps = sched.steps;
  const doneN = steps.filter((s) => cook.done[s.id]).length;
  const next = steps.find((s) => !cook.done[s.id] && !cook.clocks[s.id]);

  // Clock times. A running timer (least time left; rung ones may be stale) pins minute 0 live, so pause and ±1 move the
  // schedule; after that the time stored when a timer started; before any timer, "start now" or "klart kl".
  const first = Math.min(...steps.map((s) => s.t));
  const last = Math.max(...steps.map((s) => s.t + s.dur));
  const anchor = steps.filter((s) => cook.clocks[s.id] && running(cook.clocks[s.id]) && !ringing(cook.clocks[s.id], now))
    .sort((a, b) => leftMs(cook.clocks[a.id], now) - leftMs(cook.clocks[b.id], now))[0];
  const live = anchor ? now + leftMs(cook.clocks[anchor.id], now) - (anchor.t + anchor.dur) * MIN : null;
  const pinned = live ?? cook.at;
  const zero = zeroAt(first, last, now, pinned, cook.ready);
  const at = (m: number) => zero + m * MIN;
  const end = at(last);
  const late = pinned === null && !!cook.ready && at(first) < now;
  // Default "klart kl": the next half hour after the schedule would end if started now.
  const suggest = () => fmtAt(Math.ceil((now + (last - first) * MIN) / (30 * MIN)) * 30 * MIN, now).time;

  const toggleDone = (s: Step) => {
    haptic(cook.done[s.id] ? 6 : 14);
    setCook((c) => {
      const cl = { ...c.clocks }; delete cl[s.id];
      const undo = !!c.done[s.id];
      // Un-ticking a step also clears its row ticks, so it doesn't sit there fully ticked but open.
      const sub = undo ? Object.fromEntries(Object.entries(c.sub).filter(([k]) => !k.startsWith(`${s.id}:`))) : c.sub;
      return { ...c, done: { ...c.done, [s.id]: !undo }, clocks: cl, sub };
    });
  };
  // Ticking the last row of a step ticks the step (which folds it); un-ticking a row reopens it.
  const toggleSub = (s: Step, key: string) => {
    haptic(cook.sub[key] ? 6 : 10);
    setCook((c) => {
      const sub = { ...c.sub, [key]: !c.sub[key] };
      const all = (s.rows ?? []).every((r, i) => sub[rowKey(s, i, r)]);
      const cl = { ...c.clocks }; if (all) delete cl[s.id];
      return { ...c, sub, clocks: cl, done: { ...c.done, [s.id]: all } };
    });
  };

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(26px,5vw,38px)] font-semibold tracking-[-0.03em]">{t.cook.title}</h1>
        <p className="text-muted">{t.cook.summary(sched.trays, fmtMin(sched.total))}</p>
        {sched.warnings.map((w) => <p key={w} className="text-[13px] text-warn">{w}</p>)}
      </div>

      {now > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[34px] font-semibold leading-none tabular-nums" aria-label={t.cook.nowLabel}>{fmtAt(now, now).time}</span>
            <span className={`text-[13px] ${late ? 'text-warn' : 'text-muted'}`}>
              {late ? t.cook.late(fmtAtStr(now + (last - first) * MIN, now)) : t.cook.plan(fmtAtStr(at(first), now), fmtAtStr(end, now))}
              {pinned !== null && ` · ${t.cook.follows}`}
            </span>
          </div>
          {pinned === null && (
            <div className="flex items-center gap-2">
              <Segmented id="anchor" small value={cook.ready ? 'ready' : 'now'} onChange={(v) => setCook((c) => ({ ...c, ready: v === 'ready' ? suggest() : null }))}
                options={[['now', <span key="n" className="whitespace-nowrap">{t.cook.startNow}</span>], ['ready', <span key="r" className="whitespace-nowrap">{t.cook.readyAt}</span>]] as const} />
              {cook.ready && (
                <input type="time" value={cook.ready} aria-label={t.cook.readyAt} onChange={(e) => { const v = e.target.value; if (v) setCook((c) => ({ ...c, ready: v })); }}
                  className="h-9 rounded-lg border border-line bg-bg px-2 font-mono text-[14px]" />
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[13px] text-muted">
          <span>{t.cook.progress(doneN, steps.length)}</span>
          <div className="flex items-center gap-3">
            {awake && <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--p)]" />{t.cook.awake}</span>}
            {perm !== 'na' && perm !== 'granted' && (
              <button className="underline" onClick={async () => setPerm(await Notification.requestPermission())} title={t.cook.notifyHint}>{t.cook.notify}</button>
            )}
            <button className="underline" onClick={() => { haptic(); setCook((c) => ({ ...c, done: {}, clocks: {}, sub: {}, at: null })); }}>{t.cook.reset}</button>
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full bg-ink" animate={{ width: `${(doneN / Math.max(1, steps.length)) * 100}%` }} transition={spring} />
        </div>
      </div>

      <Timeline steps={steps} clocks={cook.clocks} done={cook.done} now={now} nowT={live === null ? null : (now - live) / MIN} at={at} end={end} />

      <div className="flex flex-col">
        {steps.map((s) => (
          <StepRow key={s.id} s={s} when={now > 0 ? fmtAt(at(s.t), now, end) : null} isNext={s.id === next?.id} done={!!cook.done[s.id]} c={cook.clocks[s.id]} now={now} onDone={() => toggleDone(s)}
            ticked={cook.sub} onTick={(k) => toggleSub(s, k)} />
        ))}
      </div>

      <Labels />
      <p className="text-[12px] text-muted">{t.cook.disclaimer}</p>
    </div>
  );
}

const rowKey = (s: Step, i: number, r: StepLine) => `${s.id}:${i}:${r.name}`;

function StepRow({ s, when, isNext, done, c, now, onDone, ticked, onTick }: {
  s: Step; when: { day: string; time: string } | null; isNext: boolean; done: boolean; c?: Clock; now: number; onDone: () => void; ticked: Record<string, boolean>; onTick: (key: string) => void;
}) {
  const timed = !!s.what && s.dur > 0;
  // Done steps fold to their title so the list shrinks as you cook; tapping a folded step peeks inside.
  const [peek, setPeek] = useState(false);
  useEffect(() => { if (!done) setPeek(false); }, [done]);
  const open = !done || peek;
  const tap = () => (done ? setPeek((p) => !p) : onDone());
  return (
    // Open row: tap ticks it done. Folded row: tap opens/closes it. The checkbox always toggles done.
    <motion.div layout transition={spring} id={`step-${s.id}`}
      tabIndex={0} onClick={tap} aria-expanded={done ? open : undefined}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } }}
      whileTap={{ scale: 0.99 }}
      className={`relative grid scroll-mt-40 cursor-pointer select-none grid-cols-[64px_28px_minmax(0,1fr)_auto] items-start gap-3 border-b border-line outline-none transition-[padding] focus-visible:ring-2 focus-visible:ring-ink ${open ? 'py-4' : 'py-2.5'}`}>
      {isNext && <motion.span layoutId="next-glow" className="absolute -inset-x-3 inset-y-1 -z-10 rounded-2xl bg-surface ring-1 ring-line" transition={spring} />}
      <span className="flex flex-col pt-1 font-mono text-xs text-muted">
        {when?.day && <span className="text-[10px]">{when.day}</span>}
        <span>{when?.time}</span>
      </span>
      <button role="checkbox" aria-checked={done} aria-label={s.title} className="-m-2 p-2 pt-2.5"
        onClick={(e) => { e.stopPropagation(); onDone(); }} onKeyDown={(e) => e.stopPropagation()}>
        <Check on={done} />
      </button>
      <span className={`flex flex-col gap-1 transition-opacity ${done ? 'opacity-45' : ''}`}>
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="relative text-base font-semibold">
            {s.title}
            <motion.span className="absolute inset-x-0 top-1/2 h-px origin-left bg-ink" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={spring} />
          </span>
          <span className="rounded-full px-2 py-0.5 font-mono text-[10px] text-white" style={{ background: TRACK_COLOR[s.track] }}>{t.cook.tracks[s.track]}{s.temp ? ` · ${s.temp} °C` : ''}</span>
          {s.dur > 0 && <span className="font-mono text-[11px] text-muted">{fmtMin(s.dur)}</span>}
        </span>
        <AnimatePresence initial={false}>
          {open && (s.rows || s.details) && (
            <motion.span key="body" className="flex flex-col gap-1 overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
              {s.rows && <Lines rows={s.rows} keyOf={(i, r) => rowKey(s, i, r)} ticked={ticked} onTick={onTick} />}
              {s.details && <span className={`text-sm text-muted [text-wrap:pretty] ${s.rows ? 'mt-1.5' : ''}`}>{s.details}</span>}
            </motion.span>
          )}
        </AnimatePresence>
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

/** A step's list, each row tickable: ingredient amounts as a tight table, kits as blocks with twist and tip. */
function Lines({ rows, keyOf, ticked, onTick }: { rows: StepLine[]; keyOf: (i: number, r: StepLine) => string; ticked: Record<string, boolean>; onTick: (key: string) => void }) {
  const kits = rows.some((r) => r.sub || r.note);
  return (
    <span className={`mt-1 flex flex-col ${kits ? 'gap-2' : 'gap-0'}`}>
      {rows.map((r, i) => {
        const k = keyOf(i, r);
        const on = !!ticked[k];
        return (
          <button key={k} role="checkbox" aria-checked={on} onClick={(e) => { e.stopPropagation(); onTick(k); }} onKeyDown={(e) => e.stopPropagation()}
            className="-mx-2 grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5 rounded-lg px-2 py-1 text-left hover:bg-bg"
            style={r.hue !== undefined ? ({ '--hue': r.hue } as React.CSSProperties) : undefined}>
            <span className="pt-0.5"><Check on={on} /></span>
            <span className={`flex flex-col gap-0.5 transition-opacity ${on ? 'opacity-45' : ''}`}>
              <span className="flex items-baseline gap-2 text-sm">
                {r.hue !== undefined && <span className="kit-bg h-2 w-2 shrink-0 translate-y-[-1px] rounded-sm" />}
                <span className={`${kits ? 'font-semibold' : ''} ${on ? 'line-through' : ''}`}>{r.name}</span>
                <span className="ml-auto whitespace-nowrap font-mono text-[12px] text-muted">{r.right}</span>
              </span>
              {r.sub && <span className="text-sm text-muted">{r.sub}</span>}
              {r.note && <span className="text-[12px] text-muted opacity-80 [text-wrap:pretty]">{r.note}</span>}
            </span>
          </button>
        );
      })}
    </span>
  );
}

/** Start time over its day word, for the narrow right-hand column. */
function When({ w }: { w: { day: string; time: string } }) {
  return <span className="flex flex-col items-end font-mono font-normal leading-tight text-muted">{w.day && <span className="text-[9px]">{w.day}</span>}<span>{w.time}</span></span>;
}

function Timeline({ steps: all, clocks: cl, done, now, nowT, at, end }: {
  steps: Step[]; clocks: Record<string, Clock>; done: Record<string, boolean>; now: number; nowT: number | null; at: (m: number) => number; end: number;
}) {
  // Long jobs get their own full-width rows on their own scale, so they don't squash the short steps' axis.
  const long = all.filter(isLong);
  const steps = all.filter((s) => !isLong(s));
  const t0 = Math.min(...steps.map((s) => s.t));
  const t1 = Math.max(...steps.map((s) => s.t + Math.max(s.dur, 5)));
  const span = Math.max(1, t1 - t0);
  const x = (v: number) => ((v - t0) / span) * 100;
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  // Share of a step that has passed: its own clock if it has one, else the now line. Done = all of it.
  const passed = (s: Step) => {
    if (done[s.id]) return 1;
    const c = cl[s.id];
    if (c && s.dur) return clamp01(1 - leftMs(c, now) / (s.dur * MIN));
    if (nowT !== null) return s.dur ? clamp01((nowT - s.t) / s.dur) : nowT >= s.t ? 1 : 0;
    return 0;
  };
  // Axis ticks on whole clock times, at most ~4 so they fit at 390 px.
  const tickStep = [15, 30, 60, 120, 180].find((m) => span / m <= 4) ?? 240;
  const ticks: number[] = [];
  if (now > 0) for (let v = Math.ceil(at(t0) / (tickStep * MIN)) * tickStep * MIN; v <= at(t1); v += tickStep * MIN) ticks.push(v);
  const cols = 'grid-cols-[minmax(0,7rem)_1fr_3.25rem_1.75rem] sm:grid-cols-[minmax(0,12rem)_1fr_3.5rem_1.75rem]';
  const jump = (s: Step) => document.getElementById(`step-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const right = (s: Step) => {
    const c = cl[s.id];
    if (c && !done[s.id]) return ringing(c, now)
      ? <motion.span className="font-mono" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>{t.cook.done}</motion.span>
      : <Digits ms={leftMs(c, now)} className={running(c) ? '' : 'opacity-40'} />;
    return now > 0 ? <When w={fmtAt(at(s.t), now, end)} /> : null;
  };
  // Start a step's timer straight from the overview; same clock as the list's button.
  const play = (s: Step) => (s.what && s.dur > 0 && !done[s.id] && !cl[s.id]
    ? <motion.button whileTap={{ scale: 0.9 }} aria-label={`${t.cook.start}: ${s.what}`} onClick={(e) => { e.stopPropagation(); clocks.start(s); }} onKeyDown={(e) => e.stopPropagation()}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[9px] text-on-ink"><span aria-hidden>▶</span></motion.button>
    : <span />);
  // Rows are divs acting as buttons (they jump to the step), so the play button inside is valid HTML.
  const rowProps = (s: Step) => ({ role: 'button', tabIndex: 0, onClick: () => jump(s),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(s); } } });
  const fade = (p: number) => (
    // Time that has gone loses its colour; what is left stays full.
    <motion.span className="absolute inset-y-0 left-0 bg-surface/70" initial={false} animate={{ width: `${p * 100}%` }} transition={{ type: 'tween', duration: 0.9, ease: 'linear' }} />
  );
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
      <div className="label mb-1">{t.cook.live}</div>
      {long.map((s) => (
        <div key={s.id} {...rowProps(s)} className={`grid ${cols} cursor-pointer items-start gap-2 rounded-md pb-1 text-left outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-ink`}>
          <span className={`truncate pt-0.5 text-[12px] ${done[s.id] ? 'text-muted line-through' : ''}`}>{s.title}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="relative mt-0.5 h-4 overflow-hidden rounded" style={{ background: TRACK_COLOR[s.track] }}>{fade(passed(s))}</span>
            {now > 0 && <span className="truncate font-mono text-[10px] text-muted">{fmtAtStr(at(s.t), now, end)} → {fmtAtStr(at(s.t + s.dur), now, end)} · {fmtMin(s.dur)}</span>}
          </span>
          <span className="text-right text-[12px] font-semibold">{right(s)}</span>
          {play(s)}
        </div>
      ))}
      {long.length > 0 && <div className="my-1 h-px bg-line" />}
      {steps.map((s, i) => (
        // Each row jumps to its step in the list below.
        <div key={s.id} {...rowProps(s)} className={`grid ${cols} cursor-pointer items-center gap-2 rounded-md text-left outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-ink`}>
          <span className={`truncate text-[12px] ${done[s.id] ? 'text-muted line-through' : ''}`}>{s.title}</span>
          <span className="relative h-5 rounded-md bg-bg">
            <motion.span className="absolute inset-y-0.5 overflow-hidden rounded" style={{ left: `${x(s.t)}%`, background: TRACK_COLOR[s.track] }}
              initial={{ width: 0 }} animate={{ width: `${Math.max(1.5, (Math.max(s.dur, 2) / span) * 100)}%` }} transition={{ ...spring, delay: 0.03 * i }}>
              {fade(passed(s))}
            </motion.span>
          </span>
          <span className="text-right text-[12px] font-semibold">{right(s)}</span>
          {play(s)}
        </div>
      ))}
      <div className={`grid ${cols} gap-2 font-mono text-[10px] text-muted`}>
        <span />
        <span className="relative h-3">
          {ticks.map((v) => {
            const l = x(t0 + (v - at(t0)) / MIN);
            return l > 4 && l < 96 && <span key={v} className="absolute -translate-x-1/2" style={{ left: `${l}%` }}>{fmtAt(v, now).time}</span>;
          })}
        </span>
        <span />
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
