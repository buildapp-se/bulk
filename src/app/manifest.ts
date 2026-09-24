import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bulk. Mealprep',
    short_name: 'Bulk.',
    description: 'Laga en bas, byt smak per låda.',
    id: '/bulk/',
    start_url: '/bulk/',
    scope: '/bulk/',
    display: 'standalone',
    background_color: '#f6f4f0',
    theme_color: '#f6f4f0',
    lang: 'sv',
    icons: [
      { src: '/bulk/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/bulk/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/bulk/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
