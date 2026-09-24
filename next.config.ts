import type { NextConfig } from 'next';

// Static export for GitHub Pages: buildapp.se/bulk via the buildapp-se org user-site.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/bulk',
  trailingSlash: true, // /bulk/ingredienser/ -> ingredienser/index.html, which Pages serves
  // Cloudflare caches Pages responses 4 h (a 404 too). Unhashed files (kit art) get ?v=<commit> so each deploy busts it.
  env: { NEXT_PUBLIC_V: process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev' },
};

export default nextConfig;
