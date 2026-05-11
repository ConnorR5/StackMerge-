#!/usr/bin/env node
/**
 * Generates the Stack & Merge app icon (1024×1024).
 * Black background, red ampersand centered. Run from mobile/:
 *   node scripts/build-icon.mjs
 */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'assets', 'icon.png');
const OUT_ADAPTIVE = resolve(__dirname, '..', 'assets', 'adaptive-icon.png');
const OUT_SPLASH = resolve(__dirname, '..', 'assets', 'splash-icon.png');
const OUT_FAVICON = resolve(__dirname, '..', 'assets', 'favicon.png');

const BG = '#1a1612';      // brand ink (dark, near-black, slightly warm)
const FG = '#d94f3a';      // brand accent red

/**
 * Render the ampersand as an SVG. The font-size + viewBox geometry below
 * was picked so the glyph optical-centers in the squircle Apple applies.
 */
function svg(size, opts = {}) {
  const { transparent = false } = opts;
  const bg = transparent
    ? ''
    : `<rect width="${size}" height="${size}" fill="${BG}"/>`;
  // Use a generic stack so the platform falls back gracefully if Helvetica
  // isn't installed. Bold 900 weight reads at thumbnail sizes.
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"
     xmlns="http://www.w3.org/2000/svg">
  ${bg}
  <text x="${size / 2}" y="${size * 0.54}"
        font-family="Helvetica, Arial, 'SF Pro Display', sans-serif"
        font-weight="900"
        font-size="${Math.round(size * 0.78)}"
        fill="${FG}"
        text-anchor="middle"
        dominant-baseline="central">&amp;</text>
</svg>`.trim();
}

async function render(svgString, outPath, size) {
  await sharp(Buffer.from(svgString)).resize(size, size).png().toFile(outPath);
  console.log('  wrote', outPath);
}

console.log('Building Stack & Merge icons…');
await render(svg(1024), OUT, 1024);
await render(svg(1024), OUT_ADAPTIVE, 1024);
await render(svg(1024), OUT_SPLASH, 1024);
await render(svg(64), OUT_FAVICON, 64);
console.log('Done.');
