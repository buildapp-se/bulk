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

// ---------- Wall-clock times for the schedule (device local time, which is the kitchen clock) ----------
export const MIN = 60000;

/** "HH:MM" as the next such moment: today, or tomorrow if it has already passed. */
export function readyAt(hhmm: string, now: number): number {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d.getTime() < now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Wall-clock ms of schedule minute 0. A started timer wins; else "klart kl" puts the last step there; else the first step starts now. */
export const zeroAt = (first: number, last: number, now: number, timer: number | null, ready: string | null) =>
  timer ?? (ready ? readyAt(ready, now) - last * MIN : now - first * MIN);

// Local calendar day number, so "i går"/"i morgon" follow midnight, not 24 h.
const dayNo = (ms: number) => { const d = new Date(ms); return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000); };

/** "14:30", with a day word only when `ms` falls on another day than `ref`: i dag / i kväll / i morgon / i går / tors. */
export function fmtAt(ms: number, now: number, ref = now): { day: string; time: string } {
  const d = new Date(ms);
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  if (dayNo(ms) === dayNo(ref)) return { day: '', time };
  const rel = dayNo(ms) - dayNo(now);
  const day = rel === 0 ? (d.getHours() >= 17 ? 'i kväll' : 'i dag') : rel === 1 ? 'i morgon' : rel === -1 ? 'i går' : d.toLocaleDateString('sv-SE', { weekday: 'short' });
  return { day, time };
}
export const fmtAtStr = (ms: number, now: number, ref = now) => { const x = fmtAt(ms, now, ref); return x.day ? `${x.day} ${x.time}` : x.time; };
