'use client';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { GOAL_KINDS, nf, type Goal, type GoalKind } from '@/lib/calc';
import { setGoal } from '@/lib/actions';
import { useBatch } from '@/lib/useBatch';
import { haptic } from '@/lib/haptics';
import { Num } from './Num';
import { Segmented } from './ui';

const TYPICAL: Record<GoalKind, { p: [number, number]; kcal: [number, number] }> = {
  bulk: { p: [45, 55], kcal: [750, 950] },
  behall: { p: [35, 45], kcal: [550, 700] },
  deff: { p: [40, 50], kcal: [400, 550] },
};

export function GoalPanel() {
  const { plan, t: tg } = useBatch();
  const g = plan.goal;
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        id="goal-mode"
        value={g.mode}
        onChange={(mode) => setGoal({ mode, proteinBox: null, kcalBox: null })}
        options={[['off', t.goal.off], ['simple', t.goal.simple], ['advanced', t.goal.advanced]]}
      />
      <AnimatePresence mode="popLayout" initial={false}>
        {g.mode === 'off' ? (
          <motion.p key="off" {...fade} className="text-[13px] text-muted">{t.goal.offHint}</motion.p>
        ) : (
          <motion.div key="on" {...fade} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(GOAL_KINDS) as GoalKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => { haptic(); setGoal({ kind: k, proteinBox: null, kcalBox: null }); }}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${g.kind === k ? 'border-ink bg-ink text-on-ink' : 'border-line hover:border-muted'}`}
                >
                  <div className="font-semibold">{GOAL_KINDS[k].label}</div>
                  <div className={`font-mono text-[11px] ${g.kind === k ? 'opacity-70' : 'text-muted'}`}>{GOAL_KINDS[k].delta > 0 ? '+' : ''}{GOAL_KINDS[k].delta} kcal</div>
                </button>
              ))}
            </div>
            <Range label={t.goal.weight} unit="kg" min={40} max={150} value={g.weight} onChange={(weight) => setGoal({ weight, proteinBox: null, kcalBox: null })} />
            {g.mode === 'advanced' && <Advanced g={g} />}
            {tg && (
              <div className="grid grid-cols-2 gap-3 border-t border-line-soft pt-3">
                <Target label={t.goal.protein} unit=" g" value={tg.protein} min={25} max={80} step={1} band={TYPICAL[g.kind].p} onChange={(v) => setGoal({ proteinBox: v })} manual={g.proteinBox !== null} />
                <Target label={t.goal.kcal} unit=" kcal" value={tg.kcal} min={350} max={1300} step={10} band={TYPICAL[g.kind].kcal} onChange={(v) => setGoal({ kcalBox: v })} manual={g.kcalBox !== null} />
                <p className="col-span-2 text-[12px] text-muted">
                  {t.goal.daily(nf(tg.dailyKcal), nf(tg.dailyProtein))} {t.goal.rule}
                  {(g.proteinBox !== null || g.kcalBox !== null) && (
                    <button className="ml-1 underline" onClick={() => setGoal({ proteinBox: null, kcalBox: null })}>{t.goal.reset}</button>
                  )}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const fade = { initial: { opacity: 0, y: 8, filter: 'blur(4px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: -6, filter: 'blur(4px)' }, transition: { type: 'spring', stiffness: 300, damping: 30 } } as const;

function Advanced({ g }: { g: Goal }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Range label={t.goal.height} unit="cm" min={140} max={210} value={g.height} onChange={(height) => setGoal({ height, kcalBox: null })} />
      <Range label={t.goal.age} unit="år" min={15} max={80} value={g.age} onChange={(age) => setGoal({ age, kcalBox: null })} />
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] text-muted">{t.goal.sex}</span>
        <Segmented id="sex" small value={g.sex} onChange={(sex) => setGoal({ sex, kcalBox: null })} options={[['m', t.goal.male], ['k', t.goal.female]]} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] text-muted">{t.goal.perDay}</span>
        <Segmented id="perday" small value={String(g.perDay)} onChange={(v) => setGoal({ perDay: Number(v), kcalBox: null, proteinBox: null })} options={[['1', '1'], ['2', '2'], ['3', '3']]} />
      </div>
      <label className="col-span-2 flex flex-col gap-1.5">
        <span className="text-[12px] text-muted">{t.goal.activity}</span>
        <select
          value={g.activity}
          onChange={(e) => setGoal({ activity: Number(e.target.value), kcalBox: null })}
          className="rounded-xl border border-line bg-bg px-3 py-2"
        >
          {t.activity.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    </div>
  );
}

function Range({ label, unit, min, max, value, onChange }: { label: string; unit: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[12px] text-muted">
        <span>{label}</span><span className="font-mono text-ink"><Num v={value} /> {unit}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[var(--ink)]" />
    </label>
  );
}

function Target({ label, unit, value, min, max, step, band, onChange, manual }: {
  label: string; unit: string; value: number; min: number; max: number; step: number; band: [number, number]; onChange: (v: number) => void; manual: boolean;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="text-2xl font-semibold tracking-tight"><Num v={value} suffix={unit} /></span>
      <span className="relative block h-6">
        <span className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[color:var(--p)] opacity-30" style={{ left: `${pct(band[0])}%`, width: `${pct(band[1]) - pct(band[0])}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full accent-[var(--ink)]"
          aria-label={label}
        />
      </span>
      <span className={`font-mono text-[10px] ${manual ? 'text-ink' : 'text-muted'}`}>{t.goal.typical(band[0], band[1])}{unit}</span>
    </label>
  );
}
