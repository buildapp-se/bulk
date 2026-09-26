'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { useBatch } from '@/lib/useBatch';
import { Num } from './Num';
import { haptic } from '@/lib/haptics';
import { TimerDock } from './Timers';

export const ROUTES = ['/', '/ingredienser', '/tillagning', '/trad'] as const;

export function Header() {
  const path = usePathname();
  const cur = ROUTES.findIndex((r) => (r === '/' ? path === '/' : path.startsWith(r)));
  const { plan, avg, calcs } = useBatch();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-3.5">
          <Link href="/" className="text-xl font-bold tracking-tight" transitionTypes={cur > 0 ? ['nav-back'] : undefined}>
            Bulk<span className="text-[color:var(--c)]">.</span>
          </Link>
          <span className="font-mono text-xs text-muted">
            {calcs.length} lådor · {plan.kits.length} smaker · ø <Num v={avg[0]} /> kcal
          </span>
        </div>
        <nav className="relative flex gap-0.5 rounded-xl bg-sunken p-[3px]" aria-label="Steg">
          {ROUTES.map((r, i) => {
            const active = i === cur;
            return (
              <Link
                key={r}
                href={r}
                onClick={() => haptic()}
                transitionTypes={i > cur ? ['nav-forward'] : i < cur ? ['nav-back'] : undefined}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3.5 ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                {active && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-surface shadow-[0_1px_2px_rgba(35,33,29,.1)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                )}
                {/* Four tabs don't fit 390 px with the numbers. */}
                <span className="relative hidden font-mono text-[11px] sm:inline">0{i + 1}</span>
                <span className="relative">{t.tabs[i]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <TimerDock />
    </header>
  );
}
