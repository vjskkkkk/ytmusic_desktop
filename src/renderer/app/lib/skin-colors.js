// Reads the playlist colours from a Winamp 2 skin (pledit.txt inside the .wsz zip).
import JSZip from 'jszip';
import { mix, luminance } from './color.js';

// Winamp's base skin
const BASE = { normal: '#00ff00', current: '#ffffff', normalBg: '#000000', selectedBg: '#0000c6', font: 'Arial' };

export async function readPledit(bytes) {
  if (!bytes) return BASE;
  try {
    const zip = await JSZip.loadAsync(bytes);
    const file = Object.values(zip.files).find((f) => /(^|\/)pledit\.txt$/i.test(f.name));
    if (!file) return BASE;
    const txt = await file.async('string');
    const get = (key) => {
      const m = new RegExp(`^\\s*${key}\\s*=\\s*#?([0-9a-f]{6})`, 'im').exec(txt);
      return m ? `#${m[1].toLowerCase()}` : null;
    };
    return {
      normal: get('Normal') || BASE.normal,
      current: get('Current') || BASE.current,
      normalBg: get('NormalBG') || BASE.normalBg,
      selectedBg: get('SelectedBG') || BASE.selectedBg,
      font: /^\s*Font\s*=\s*(.+?)\s*$/im.exec(txt)?.[1] || BASE.font,
    };
  } catch {
    return BASE;
  }
}

export function classicVars(p) {
  const dark = luminance(p.normalBg) < 0.4;
  const font = p.font.replace(/["';{}]/g, '');
  return {
    '--bg': p.normalBg,
    '--bg-elev': mix(p.normalBg, p.normal, 0.05),
    '--bg-elev-2': mix(p.normalBg, p.normal, 0.09),
    '--bg-hover': mix(p.selectedBg, p.normalBg, 0.35),
    '--line': mix(p.normalBg, p.normal, 0.16),
    '--text': p.normal,
    '--text-dim': mix(p.normal, p.normalBg, 0.3),
    '--text-faint': mix(p.normal, p.normalBg, 0.52),
    '--accent': p.current,
    '--accent-ink': p.normalBg,
    '--glass': `${p.normalBg}e6`,
    '--hero-wash': p.normalBg,
    '--font-ui': `'${font}', 'Onest Variable', sans-serif`,
    'color-scheme': dark ? 'dark' : 'light',
  };
}
