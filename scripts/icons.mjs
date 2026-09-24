// Regenerate PWA icons: `node scripts/icons.mjs`. Renders an SVG with sharp (already in node_modules via next).
import sharp from 'sharp';

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#23211d"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
    <rect x="96" y="150" width="148" height="100" rx="18" fill="#e0a05a"/>
    <rect x="268" y="150" width="148" height="100" rx="18" fill="#7fb49a"/>
    <rect x="96" y="262" width="148" height="100" rx="18" fill="#d9c27a"/>
    <rect x="268" y="262" width="148" height="100" rx="18" fill="#f6f4f0"/>
  </g>
</svg>`;

const out = [['public/icon-192.png', 192, 0], ['public/icon-512.png', 512, 0], ['public/apple-icon.png', 180, 0], ['public/icon-maskable.png', 512, 60]];
for (const [file, size, pad] of out) await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(file);
console.log('icons ok');
