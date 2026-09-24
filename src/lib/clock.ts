// Countdown clocks for the cooking steps. Pure: no React, no DOM, so scripts/check.ts runs it.
// Running = absolute end time, paused = ms left. Pause/resume and ± minutes then need no extra fields.
export type Clock = { end: number } | { left: number };

export const start = (min: number, now: number): Clock => ({ end: now + min * 60000 });
export const leftMs = (c: Clock, now: number) => ('end' in c ? c.end - now : c.left);
export const running = (c: Clock) => 'end' in c;
/** Finished and still running: this is what rings. */
export const ringing = (c: Clock, now: number) => 'end' in c && c.end <= now;
export const pause = (c: Clock, now: number): Clock => ('end' in c ? { left: Math.max(0, c.end - now) } : c);
export const resume = (c: Clock, now: number): Clock => ('left' in c ? { end: now + c.left } : c);
/** Add or remove time. Never below zero; +1 on a finished clock counts from now, not from when it rang. */
export const nudge = (c: Clock, ms: number, now: number): Clock =>
  'end' in c ? { end: Math.max(now, Math.max(now, c.end) + ms) } : { left: Math.max(0, c.left + ms) };

/** m:ss, or h:mm:ss from an hour. Rounds up so it shows 0:00 only when actually done. */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}
