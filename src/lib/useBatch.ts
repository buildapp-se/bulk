'use client';
import { useMemo } from 'react';
import { calcBox, resolveBoxes, schedule, shopping, targets, type BoxCalc } from './calc.ts';
import { usePlan } from './store.ts';

/** Everything the views need, derived from the persisted plan. */
export function useBatch() {
  const plan = usePlan();
  return useMemo(() => {
    const t = targets(plan.goal);
    const calcs = resolveBoxes(plan).map((b) => calcBox(b, plan, t));
    const full = calcs.filter((c) => c.missing.length === 0);
    const avg = full.length ? full.reduce((s, c) => s.map((v, i) => v + c.m[i] / full.length), [0, 0, 0, 0]) : [0, 0, 0, 0];
    const offGoal = (c: BoxCalc) => !!t && !c.missing.length && (c.m[1] < t.protein - 3 || Math.abs(c.m[0] - t.kcal) > 60);
    return { plan, t, calcs, avg, incomplete: calcs.filter((c) => c.missing.length), offGoal, sched: schedule(full, plan), shop: shopping(full) };
  }, [plan]);
}
