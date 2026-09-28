const { app, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const settings = {
  appBounds: null,
  appMaximized: false,
  engineBounds: null,
  miniBounds: null,
  classicPos: null,
  minimizeToMini: true,
  miniOnTop: true,
  miniStyle: 'modern', // 'modern' | 'classic'
  classicScale: 1,
  classicArt: true,
  skin: null, // file name in the skins folder; null = Webamp's base skin
  theme: 'midnight',
  glass: 60, // 0 = solid surfaces, 100 = clearest glass
  userName: null, // null = not asked yet; '' = skipped
  volume: null,
};

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    // v0.1 stored the YTM window as mainBounds; it is now the engine window.
    if (saved.mainBounds && !saved.engineBounds) saved.engineBounds = saved.mainBounds;
    delete saved.mainBounds;
    delete saved.mainMaximized;
    Object.assign(settings, saved);
  } catch {
    // first run or unreadable file: keep defaults
  }
}

let saveTimer = null;
function writeSettings() {
  clearTimeout(saveTimer);
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch {
    // not fatal
  }
}
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeSettings, 400);
}

// Saved bounds may point at a monitor that is no longer attached.
function onScreen(b) {
  if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return false;
  const w = b.width || 100;
  const h = b.height || 100;
  return screen.getAllDisplays().some(({ workArea: a }) =>
    b.x < a.x + a.width - 40 && b.x + w > a.x + 40 &&
    b.y >= a.y - 10 && b.y < a.y + a.height - Math.min(40, h));
}

module.exports = { settings, loadSettings, saveSettings, writeSettings, onScreen };
