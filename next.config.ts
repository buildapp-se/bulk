import type { NextConfig } from 'next';

// Static export for GitHub Pages: buildapp.se/bulk via the buildapp-se org user-site.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/bulk',
  trailingSlash: true, // /bulk/ingredienser/ -> ingredienser/index.html, which Pages serves
};

export default nextConfig;
