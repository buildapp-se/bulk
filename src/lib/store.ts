'use client';
// Tiny persisted store: localStorage + useSyncExternalStore. Server snapshot = defaults, so hydration matches.
import { useSyncExternalStore } from 'react';
import { DEFAULT_PLAN, type Plan } from './calc.ts';
import type { Clock } from './clock.ts';

export interface Cook {
  done: Record<string, boolean>;
  clocks: Record<string, Clock>; // step id -> countdown (was `timers`: start times, ignored now)
  bought: Record<string, boolean>; // shopping row key -> ticked
}
const DEFAULT_COOK: Cook = { done: {}, clocks: {}, bought: {} };

function createStore<T extends object>(key: string, initial: T) {
  let state = initial;
  let loaded = false;
  const subs = new Set<() => void>();
  const load = () => {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) state = { ...initial, ...(JSON.parse(raw) as Partial<T>) };
    } catch { /* private mode or bad JSON: keep defaults */ }
  };
  return {
    get: () => (load(), state),
    set(next: T | ((s: T) => T)) {
      load();
      state = typeof next === 'function' ? (next as (s: T) => T)(state) : next;
      try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* quota/private mode */ }
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    initial,
  };
}

// Key carries the schema version: bump v when Plan changes shape incompatibly.
export const planStore = createStore<Plan>('bulk:plan:v2', DEFAULT_PLAN);
export const cookStore = createStore<Cook>('bulk:cook:v1', DEFAULT_COOK);

export const usePlan = () => useSyncExternalStore(planStore.subscribe, planStore.get, () => planStore.initial);
export const useCook = () => useSyncExternalStore(cookStore.subscribe, cookStore.get, () => cookStore.initial);
export const setPlan = planStore.set;
export const setCook = cookStore.set;
