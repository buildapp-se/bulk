'use client';
import { motion } from 'motion/react';
import { haptic } from '@/lib/haptics';

/** iOS-style segmented control with a sliding pill (shared layoutId per control). */
export function Segmented<T extends string>({ id, value, onChange, options, small }: {
  id: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, React.ReactNode])[]; small?: boolean;
}) {
  return (
    <div className="flex gap-0.5 rounded-xl bg-sunken p-[3px]" role="radiogroup">
      {options.map(([v, l]) => (
        <button
          key={v}
          role="radio"
          aria-checked={v === value}
          onClick={() => { haptic(); onChange(v); }}
          className={`relative flex-1 rounded-lg ${small ? 'px-2 py-1 text-[13px]' : 'px-3 py-2 text-sm'} font-medium transition-colors ${v === value ? 'text-ink' : 'text-muted'}`}
        >
          {v === value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg bg-surface shadow-[0_1px_2px_rgba(35,33,29,.1)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  );
}

export function Pill({ on, onClick, children, hue }: { on: boolean; onClick: () => void; children: React.ReactNode; hue?: number }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={hue !== undefined ? ({ '--hue': hue } as React.CSSProperties) : undefined}
      className={`shrink-0 rounded-full border px-3 py-1 text-[12px] transition-colors ${on ? 'border-ink bg-ink text-on-ink' : 'border-line hover:border-muted'}`}
    >
      {children}
    </motion.button>
  );
}

export const spring = { type: 'spring', stiffness: 380, damping: 32 } as const;
export const stagger = {
  parent: { hidden: {}, show: { transition: { staggerChildren: 0.035 } } },
  child: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: spring } },
} as const;
