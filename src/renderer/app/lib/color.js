// Colour helpers for the Adaptive and Classic match themes.

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgbToHex = ([r, g, b]) =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

export function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

export function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Pick the most characterful hue in an image and build a dark palette around it.
export async function paletteFromImage(bytes) {
  const bmp = await createImageBitmap(new Blob([bytes]));
  const size = 40;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const bins = Array.from({ length: 24 }, () => ({ w: 0, h: 0, s: 0 }));
  let sumH = 0;
  let sumW = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.1 || l > 0.92) continue;
    const w = (0.15 + s) * (1 - Math.abs(l - 0.5));
    const bin = bins[Math.floor(h * 24) % 24];
    bin.w += w * s;
    bin.h += h * w * s;
    bin.s += s * w * s;
    sumH += h * w;
    sumW += w;
  }
  const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
  const hue = best.w > 0.5 ? best.h / best.w : sumW ? sumH / sumW : 0.75;
  const sat = best.w > 0.5 ? best.s / best.w : 0.15;

  const bgSat = Math.min(0.32, sat * 0.6 + 0.06);
  const bg = hslToHex(hue, bgSat, 0.085);
  const accent = hslToHex(hue, Math.min(0.85, Math.max(0.45, sat + 0.1)), 0.66);
  return {
    '--bg': bg,
    '--bg-elev': hslToHex(hue, bgSat, 0.12),
    '--bg-elev-2': hslToHex(hue, bgSat, 0.155),
    '--bg-hover': hslToHex(hue, bgSat, 0.2),
    '--line': hslToHex(hue, bgSat, 0.18),
    '--text': hslToHex(hue, 0.2, 0.94),
    '--text-dim': hslToHex(hue, 0.12, 0.68),
    '--text-faint': hslToHex(hue, 0.1, 0.46),
    '--accent': accent,
    '--accent-ink': hslToHex(hue, 0.5, 0.1),
    '--glass': `${bg}d9`,
    '--hero-wash': bg,
  };
}
