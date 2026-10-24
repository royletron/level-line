// Regenerates the app icons in assets/. Run with: node scripts/make-icons.mjs
import sharp from 'sharp';

const BG = '#101218';
const GREEN = '#4cc38a';
const RED = '#ff6b6b';
const HEIGHTS = [0.34, 0.58, 0.86, 0.5, 0.7];

// Level bars with a floating peak cap, drawn inside a square of `size` centred on 512,512.
function bars({ size, bar = GREEN, cap = RED }) {
  const w = size / 9;
  const gap = w / 2;
  const total = HEIGHTS.length * w + (HEIGHTS.length - 1) * gap;
  const x0 = 512 - total / 2;
  const base = 512 + size / 2 - size * 0.0865; // centre bars and caps together
  return HEIGHTS.map((h, i) => {
    const x = x0 + i * (w + gap);
    const bh = h * size * 0.82;
    const r = w / 2;
    return (
      `<rect x="${x}" y="${base - bh}" width="${w}" height="${bh}" rx="${r}" fill="${bar}"/>` +
      `<rect x="${x}" y="${base - bh - w * 1.1}" width="${w}" height="${w * 0.5}" rx="${w * 0.25}" fill="${cap}"/>`
    );
  }).join('');
}

const svg = (body, bg) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">` +
      (bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : '') +
      body +
      `</svg>`,
  );

const out = (name, buf, size = 1024) =>
  sharp(buf).resize(size, size).png().toFile(`assets/${name}`);

await Promise.all([
  out('icon.png', svg(bars({ size: 640 }), BG)),
  out('android-icon-foreground.png', svg(bars({ size: 520 })), 512),
  out('android-icon-background.png', svg('', BG), 512),
  out('android-icon-monochrome.png', svg(bars({ size: 520, bar: '#fff', cap: '#fff' })), 432),
  out('splash-icon.png', svg(bars({ size: 640 }))),
  out('favicon.png', svg(bars({ size: 760 }), BG), 48),
]);
