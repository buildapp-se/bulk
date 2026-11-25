import type { Metadata } from 'next';

/** Per-page title, description, canonical and Open Graph. A page's openGraph replaces the layout's whole object, so
 *  every page builds the full one here (before 2026-11-25 all four pages shared one description and og:url). */
export function meta(path: string, title: string, description: string): Metadata {
  const url = `https://buildapp.se/bulk/${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      locale: 'sv_SE',
      images: [{ url: 'https://buildapp.se/bulk/og.png', width: 1200, height: 630, alt: 'Bulk: välj protein, lådor och smakkit, med batchen och dess macros till höger' }],
    },
  };
}
