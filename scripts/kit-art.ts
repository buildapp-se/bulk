// Kit illustrations via Codex imagegen: `node scripts/kit-art.ts [kitId ...]`.
// Raw PNGs (transparent) land in design/art/, app-ready 640 px WebP in public/kits/. Existing files are skipped.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { KITS, PROTEINS, CARBS, VEGS, byId } from '../src/lib/data.ts';

const CODEX = 'C:/Users/patri/AppData/Roaming/npm/node_modules/@openai/codex/bin/codex.js';
const RAW = 'C:/dev/bulk/design/art';
const OUT = 'C:/dev/bulk/public/kits';
const STYLE = 'hand-painted gouache illustration with risograph texture, limited palette of ochre, sage green, terracotta and ink black, slightly naive shapes, top-down view of the bowl, editorial cookbook illustration';
const PARALLEL = 4;
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const only = process.argv.slice(2);
const todo = KITS.filter((k) => (only.length ? only.includes(k.id) : true) && !existsSync(`${OUT}/${k.id}.webp`));

function dish(k: (typeof KITS)[number]) {
  const names = (xs: readonly { name: string }[]) => xs.map((x) => x.name.toLowerCase()).join(', ');
  return `${byId(PROTEINS, k.protein[0]).name.toLowerCase()} with ${byId(CARBS, k.carb).name.toLowerCase()} and ${byId(VEGS, k.veg).name.toLowerCase()}, flavoured as "${k.name}" (${k.tagline}): sauce with ${names(k.mix) || 'none'}; topped with ${names(k.top) || 'nothing'}`;
}

function gen(k: (typeof KITS)[number]) {
  return new Promise<void>((done) => {
    // One folder per job: parallel Codex runs sharing a folder grabbed each other's images once.
    const dir = `${RAW}/${k.id}`;
    mkdirSync(dir, { recursive: true });
    const file = `${k.id}.png`;
    const prompt = `Use your image generation tool with a TRANSPARENT background (PNG with alpha channel, no paper, no backdrop, no shadow outside the bowl) to create ONE image and save it as ${file} in the current directory. Do nothing else. Image: a meal-prep portion of ${dish(k)}, served in a round ceramic bowl. Style: ${STYLE}. Square 1:1. No text, no hands, no cutlery.`;
    const p = spawn(process.execPath, [CODEX, 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', dir, '--ephemeral', prompt], { stdio: ['ignore', 'ignore', 'ignore'] });
    p.on('close', async () => {
      try {
        await sharp(`${dir}/${file}`).resize(640, 640).webp({ quality: 82, alphaQuality: 90 }).toFile(`${OUT}/${k.id}.webp`);
        console.log('ok', k.id);
      } catch { console.log('FAIL', k.id); }
      done();
    });
  });
}

const queue = [...todo];
await Promise.all(Array.from({ length: PARALLEL }, async () => { while (queue.length) await gen(queue.shift()!); }));
console.log(`done ${todo.length}`);
