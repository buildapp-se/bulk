'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { t } from '@/i18n/sv';
import { useBatch } from '@/lib/useBatch';
import { Num } from './Num';
import { haptic } from '@/lib/haptics';
import { TimerDock } from './Timers';

export const ROUTES = ['/', '/ingredienser', '/tillagning'] as const;

export function Header() {
  const path = usePathname();
  const cur = ROUTES.findIndex((r) => (r === '/' ? path === '/' : path.startsWith(r)));
  const explore = path.startsWith('/prepp');
  const { plan, avg, calcs } = useBatch();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-3.5">
          <Link href="/" className="text-xl font-bold tracking-tight" transitionTypes={cur > 0 ? ['nav-back'] : undefined}>
            Bulk<span className="text-[color:var(--c)]">.</span>
          </Link>
          <span className="font-mono text-xs text-muted">
            {calcs.length} lådor · {plan.kits.length} smaker · ø <Num v={avg[0]} /> kcal
          </span>
        </div>
        {/* Prepp is a side tool, not a step: its own button, first row on a phone, after the steps on a wide screen. */}
        <Link href="/prepp" onClick={() => haptic()} transitionTypes={['nav-forward']} aria-current={explore ? 'page' : undefined} aria-label={t.explore}
          className={`order-2 ml-auto flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors sm:order-3 sm:ml-0 ${explore ? 'border-ink bg-surface text-ink' : 'border-line text-muted hover:border-muted hover:text-ink'}`}>
          <span aria-hidden className="font-mono text-[12px]">✂</span><span className="hidden sm:inline">{t.explore}</span>
        </Link>
        <nav className="relative order-3 flex gap-0.5 rounded-xl bg-sunken p-[3px] sm:order-2 sm:ml-auto" aria-label="Steg">
          {ROUTES.map((r, i) => {
            const active = i === cur;
            return (
              <Link
                key={r}
                href={r}
                onClick={() => haptic()}
                transitionTypes={i > cur ? ['nav-forward'] : i < cur ? ['nav-back'] : undefined}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                {active && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-surface shadow-[0_1px_2px_rgba(35,33,29,.1)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                )}
                <span className="relative font-mono text-[11px]">0{i + 1}</span>
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
