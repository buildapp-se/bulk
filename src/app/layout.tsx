import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { Header } from '@/components/Header';
import { SwRegister } from '@/components/SwRegister';
import './globals.css';

const hanken = Hanken_Grotesk({ variable: '--font-hanken', subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const plex = IBM_Plex_Mono({ variable: '--font-plex', subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Bulk.',
  description: 'Laga en bas, byt smak per låda. Mealprep med macros, inköpslista och ugnsschema.',
  manifest: '/bulk/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Bulk.', statusBarStyle: 'default' },
  icons: { icon: '/bulk/icon-192.png', apple: '/bulk/apple-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#161412' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="sv" className={`${hanken.variable} ${plex.variable}`}>
      <body className="min-h-dvh font-sans text-[15px] leading-[1.45]">
        <Header />
        <main className="mx-auto max-w-[1120px] px-4 pt-8 pb-28 sm:px-5">{children}</main>
        <SwRegister />
      </body>
    </html>
  );
}
