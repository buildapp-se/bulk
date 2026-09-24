import { ViewTransition } from 'react';

/** Directional route transition. Must wrap each page (layouts persist, so they never enter/exit). */
export function Page({ children }: { children: React.ReactNode }) {
  const dir = { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' };
  return (
    <ViewTransition enter={dir} exit={dir} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}

export function Section({ n, title, aside, children }: { n: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="label">{String(n).padStart(2, '0')} · {title}</div>
        {aside && <div className="text-[13px] text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
