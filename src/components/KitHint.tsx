'use client';
import { t } from '@/i18n/sv';
import { usePlan } from '@/lib/store';

export function KitHint() {
  return <>{t.kitHint(usePlan().kits.length)}</>;
}
