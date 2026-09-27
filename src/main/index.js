const { app, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { settings, loadSettings, saveSettings, writeSettings } = require('./settings');
const engine = require('./engine');
const ytmusic = require('./ytmusic');
const skins = require('./skins');
const win = require('./windows');

app.setAppUserModelId('com.ytmini.app');

const PLAYER_COMMANDS = new Set(['playPause', 'next', 'prev', 'seek', 'volume', 'like', 'shuffle', 'repeat', 'play', 'playQueueIndex', 'eq']);
const MAX_THEME_BYTES = 256 * 1024;

// ---------- sender checks ----------

const isWin = (bw, e) => !!bw && !bw.isDestroyed() && e.sender === bw.webContents;
const fromApp = (e) => isWin(win.w.app, e);
const fromClassic = (e) => isWin(win.w.classic, e);
const trusted = (e) => fromApp(e) || isWin(win.w.mini, e) || fromClassic(e);

// ---------- settings exposed to renderers ----------

const SETTABLE = {
  theme: (v) => typeof v === 'string' && v.length < 100,
  minimizeToMini: (v) => typeof v === 'boolean',
  miniOnTop: (v) => typeof v === 'boolean',
  miniStyle: (v) => v === 'modern' || v === 'classic',
  classicScale: (v) => v === 1 || v === 2 || v === 3,
  classicArt: (v) => typeof v === 'boolean',
  skin: (v) => v === null || (typeof v === 'string' && skins.list().some((s) => s.file === v)),
};

const publicSettings = () => Object.fromEntries(Object.keys(SETTABLE).map((k) => [k, settings[k]]));

function setSetting(key, value) {
  if (!SETTABLE[key] || !SETTABLE[key](value)) return false;
  if (key === 'miniStyle') win.setMiniStyle(value);
  else if (key === 'miniOnTop') win.setPinned(value);
  else {
    settings[key] = value;
    saveSettings();
    if (key === 'classicScale') win.applyClassicScale();
  }
  win.sendToAll('settings:changed', publicSettings());
  win.buildTrayMenu();
  return true;
}

// ---------- user themes ----------

const themesDir = () => path.join(app.getPath('userData'), 'themes');

function listUserThemes() {
  try {
    return fs.readdirSync(themesDir())
      .filter((f) => f.toLowerCase().endsWith('.css'))
      .map((f) => {
        const file = path.join(themesDir(), f);
        if (fs.statSync(file).size > MAX_THEME_BYTES) return null;
        const css = fs.readFileSync(file, 'utf8');
        const name = /\/\*\s*name:\s*(.+?)\s*\*\//i.exec(css)?.[1] || f.replace(/\.css$/i, '');
        return { id: `user:${f}`, name, css };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ---------- skins ----------

function selectSkin(file) {
  settings.skin = file;
  saveSettings();
  win.sendToAll('skins:changed', file);
  win.sendToAll('settings:changed', publicSettings());
}

async function importSkinsWithDialog(parent) {
  const res = await dialog.showOpenDialog(parent, {
    title: 'Load Winamp skin',
    filters: [{ name: 'Winamp 2 skins', extensions: ['wsz', 'zip'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (res.canceled || !res.filePaths.length) return null;
  let last = null;
  for (const p of res.filePaths) {
    try {
      last = skins.importFile(p);
    } catch (err) {
      dialog.showErrorBox('Could not load skin', `${path.basename(p)}: ${err.message}`);
    }
  }
  if (last) selectSkin(last);
  return last;
}

function classicMenu() {
  const skinItems = [
    { label: 'Base skin', type: 'radio', checked: !settings.skin, click: () => selectSkin(null) },
    ...skins.list().map((s) => ({
      label: s.name, type: 'radio', checked: settings.skin === s.file, click: () => selectSkin(s.file),
    })),
  ];
  return Menu.buildFromTemplate([
    {
      label: 'Skins',
      submenu: [
        ...skinItems,
        { type: 'separator' },
        { label: 'Load skin…', click: () => importSkinsWithDialog(win.w.classic) },
        { label: 'Browse skins online', click: () => shell.openExternal('https://skins.webamp.org/') },
      ],
    },
    {
      label: 'Size',
      submenu: [1, 2, 3].map((n) => ({
        label: `${n}×`, type: 'radio', checked: settings.classicScale === n, click: () => setSetting('classicScale', n),
      })),
    },
    { label: 'Album art', type: 'checkbox', checked: settings.classicArt, click: (i) => setSetting('classicArt', i.checked) },
    { label: 'Keep on top', type: 'checkbox', checked: settings.miniOnTop, click: (i) => setSetting('miniOnTop', i.checked) },
    { type: 'separator' },
    { label: 'Switch to modern mini player', click: () => setSetting('miniStyle', 'modern') },
    { label: 'Open YT Mini', click: win.showApp },
  ]);
}

// ---------- IPC ----------

function wireIpc() {
  // data + player
  ipcMain.handle('ytm:api', (e, method, args) => {
    if (!fromApp(e)) throw new Error('Not allowed');
    return ytmusic.call(method, Array.isArray(args) ? args : []);
  });
  ipcMain.handle('ytm:image', (e, url) => (trusted(e) ? ytmusic.image(url) : null));
  ipcMain.on('player:cmd', (e, cmd, arg) => {
    if (trusted(e) && PLAYER_COMMANDS.has(cmd)) engine.send(cmd, arg);
  });
  ipcMain.handle('player:get', (e) => (trusted(e) ? { state: engine.state, queue: engine.queue } : null));

  // sign-in and the classic YTM view
  ipcMain.handle('auth:status', (e) => (trusted(e) ? engine.isSignedIn() : false));
  ipcMain.on('auth:signin', (e) => { if (fromApp(e)) engine.signIn(); });
  ipcMain.on('engine:show', (e) => { if (trusted(e)) engine.showClassic(); });

  // windows
  ipcMain.on('ytm:show-mini', (e) => { if (isWin(engine.win, e)) win.showMini(); });
  ipcMain.on('mini:show', (e) => { if (trusted(e)) win.showMini(); });
  ipcMain.on('mini:expand', (e) => { if (trusted(e)) win.showApp(); });
  ipcMain.on('mini:toggle-pin', (e) => { if (trusted(e)) win.setPinned(!settings.miniOnTop); });
  ipcMain.on('app:titlebar', (e, color, symbolColor) => {
    if (fromApp(e) && typeof color === 'string' && typeof symbolColor === 'string') win.setTitleBarColors(color, symbolColor);
  });
  ipcMain.on('app:open-external', (e, url) => { if (trusted(e)) engine.openExternal(String(url)); });

  // settings + themes
  ipcMain.handle('settings:get', (e) => (trusted(e) ? publicSettings() : null));
  ipcMain.handle('settings:set', (e, key, value) => (trusted(e) ? setSetting(key, value) : false));
  ipcMain.handle('themes:list', (e) => (fromApp(e) ? listUserThemes() : []));
  ipcMain.on('themes:open-folder', (e) => {
    if (!fromApp(e)) return;
    fs.mkdirSync(themesDir(), { recursive: true });
    shell.openPath(themesDir());
  });

  // skins
  ipcMain.handle('skins:list', (e) => (trusted(e) ? skins.list() : []));
  ipcMain.handle('skins:import', (e) => (trusted(e) ? importSkinsWithDialog(fromClassic(e) ? win.w.classic : win.w.app) : null));
  ipcMain.handle('skins:import-path', (e, p) => {
    if (!trusted(e) || typeof p !== 'string') return null;
    const file = skins.importFile(p);
    selectSkin(file);
    return file;
  });
  ipcMain.handle('skins:current', (e) => {
    if (!trusted(e) || !settings.skin) return null;
    try {
      return { file: settings.skin, bytes: skins.read(settings.skin) };
    } catch {
      return null;
    }
  });
  ipcMain.handle('skins:delete', (e, file) => {
    if (!fromApp(e)) return false;
    skins.remove(file);
    if (settings.skin === file) selectSkin(null);
    return true;
  });
  ipcMain.on('skins:select', (e, file) => {
    if (trusted(e) && SETTABLE.skin(file)) selectSkin(file);
  });

  // classic mini window
  ipcMain.on('classic:resize', (e, width, height) => {
    if (fromClassic(e) && Number.isFinite(width) && Number.isFinite(height)) win.resizeClassic(width, height);
  });
  ipcMain.on('classic:minimize', (e) => { if (fromClassic(e)) win.w.classic.minimize(); });
  ipcMain.on('classic:menu', (e) => {
    if (fromClassic(e)) classicMenu().popup({ window: win.w.classic });
  });
}

// ---------- engine events ----------

function wireEngine() {
  engine.on('state', (s) => {
    win.broadcast('player:state', s);
    win.updateTrayTip(s);
  });
  engine.on('queue', (q) => win.broadcast('player:queue', q));
  engine.on('viz', (frame) => {
    const c = win.w.classic;
    if (c && !c.isDestroyed() && c.isVisible()) c.webContents.send('player:viz', frame);
  });
  engine.on('auth', async () => {
    ytmusic.reset();
    win.sendToAll('auth:changed', await engine.isSignedIn());
  });
}

// ---------- lifecycle ----------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', win.showApp);
  app.whenReady().then(() => {
    loadSettings();
    wireIpc();
    wireEngine();
    engine.create();
    win.createApp();
    win.createMini();
    win.createClassic();
    win.createTray();
  });
  app.on('before-quit', () => {
    engine.quitting = true;
    writeSettings();
  });
  app.on('window-all-closed', () => app.quit());
}
