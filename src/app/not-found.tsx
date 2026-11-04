import Link from 'next/link';
import { t } from '@/i18n/sv';

export const metadata = { title: `${t.notFound.title} · Bulk.` };

/** The exported 404.html, which GitHub Pages serves for every missing path under /bulk/. */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-[clamp(26px,5vw,38px)] font-semibold tracking-[-0.03em]">{t.notFound.title}</h1>
      <p className="text-muted">{t.notFound.sub}</p>
      <Link href="/" className="rounded-full bg-ink px-5 py-3 font-semibold text-on-ink">{t.notFound.home}</Link>
    </div>
  );
}
