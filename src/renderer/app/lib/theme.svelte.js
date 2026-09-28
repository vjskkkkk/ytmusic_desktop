import { ytm } from './bridge.js';
import { player } from './player.svelte.js';
import { paletteFromImage } from './color.js';
import { readPledit, classicVars } from './skin-colors.js';
import { applyGlass } from './glass.js';

export const BUILT_IN = [
  { id: 'midnight', name: 'Midnight', note: 'Plum ink with brass', swatch: ['#15131c', '#272433', '#d9ae52'] },
  { id: 'daylight', name: 'Daylight', note: 'Cool paper with teal', swatch: ['#ecebf2', '#e2e0ea', '#0f6e74'] },
  { id: 'adaptive', name: 'Adaptive', note: 'Takes its colours from the song that is playing', swatch: null },
  { id: 'classic', name: 'Classic match', note: 'Uses the colours of your Winamp skin', swatch: null },
];

export const theme = $state({ id: 'midnight', user: [] });

const root = document.documentElement;
const userStyle = document.createElement('style');
userStyle.id = 'user-theme';
document.head.appendChild(userStyle);

let inline = [];
function setVars(vars) {
  clearVars();
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  inline = Object.keys(vars);
}
function clearVars() {
  for (const k of inline) root.style.removeProperty(k);
  inline = [];
}

function syncTitleBar() {
  requestAnimationFrame(() => {
    const text = getComputedStyle(root).getPropertyValue('--text').trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) ytm.setTitleBar('#00000000', text);
  });
}

let adaptedArt = '';
async function adaptTo(art) {
  if (!art || art === adaptedArt) return;
  adaptedArt = art;
  try {
    const bytes = await ytm.image(art);
    if (!bytes || theme.id !== 'adaptive' || adaptedArt !== art) return;
    setVars(await paletteFromImage(bytes));
    syncTitleBar();
  } catch {
    // keep the previous colours
  }
}

async function classicMatch() {
  const skin = await ytm.currentSkin();
  if (theme.id !== 'classic') return;
  setVars(classicVars(await readPledit(skin?.bytes)));
}

export async function applyTheme(id) {
  theme.id = id;
  clearVars();
  userStyle.textContent = '';
  adaptedArt = '';
  root.dataset.theme = id === 'daylight' ? 'daylight' : 'midnight';
  if (id.startsWith('user:')) {
    const t = theme.user.find((u) => u.id === id);
    if (t) userStyle.textContent = t.css;
  } else if (id === 'adaptive') {
    await adaptTo(player.state.art);
  } else if (id === 'classic') {
    await classicMatch();
  }
  syncTitleBar();
}

export async function setTheme(id) {
  await applyTheme(id);
  ytm.setSetting('theme', id);
}

export async function reloadUserThemes() {
  theme.user = (await ytm.userThemes()) || [];
}

let lastSkin;
export async function initTheme() {
  const settings = await ytm.getSettings();
  await reloadUserThemes();
  lastSkin = settings?.skin ?? null;
  applyGlass(settings?.glass ?? 60);
  await applyTheme(settings?.theme || 'midnight');

  ytm.onSettings((s) => {
    const skinChanged = s.skin !== lastSkin;
    lastSkin = s.skin;
    applyGlass(s.glass);
    if (s.theme !== theme.id || (skinChanged && theme.id === 'classic')) applyTheme(s.theme);
  });

  $effect.root(() => {
    $effect(() => {
      const art = player.state.art;
      if (theme.id === 'adaptive') adaptTo(art);
    });
  });
}
