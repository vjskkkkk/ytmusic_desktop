const { app, BrowserWindow, ipcMain, Tray, Menu, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const YTM_URL = 'https://music.youtube.com/';
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');
const COMMANDS = new Set(['playPause', 'next', 'prev', 'seek']);

// Keep Electron's own user agent. Google's sign-in rejects a spoofed browser UA whose
// other signals don't match ("This browser or app may not be secure"); Pear Desktop
// (a widely used YTM Electron app) also leaves the UA untouched by default.
app.setAppUserModelId('com.ytmini.app');

let mainWin = null;
let miniWin = null;
let tray = null;
let quitting = false;
let state = { hasTrack: false };

// ---------- settings ----------

const settings = {
  mainBounds: null,
  mainMaximized: false,
  miniBounds: null,
  minimizeToMini: true,
  miniOnTop: true,
};
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    Object.assign(settings, JSON.parse(fs.readFileSync(settingsPath(), 'utf8')));
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
  if (!b) return false;
  return screen.getAllDisplays().some(({ workArea: a }) =>
    b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 &&
    b.y >= a.y - 10 && b.y < a.y + a.height - 40);
}

function defaultMiniBounds() {
  const a = screen.getPrimaryDisplay().workArea;
  const size = 280;
  return { width: size, height: size, x: a.x + a.width - size - 24, y: a.y + a.height - size - 24 };
}

// ---------- windows ----------

function createMain() {
  const bounds = onScreen(settings.mainBounds) ? settings.mainBounds : { width: 1280, height: 820 };
  mainWin = new BrowserWindow({
    ...bounds,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'YT Mini',
    icon: ICON,
    backgroundColor: '#030303',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-ytm.js'),
      // keep state updates flowing while the window is hidden behind the mini player
      backgroundThrottling: false,
    },
  });
  if (settings.mainMaximized) mainWin.maximize();
  mainWin.once('ready-to-show', () => mainWin.show());
  mainWin.loadURL(YTM_URL);

  const wc = mainWin.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (isGoogleUrl(url)) return { action: 'allow' };
    openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!isGoogleUrl(url)) {
      e.preventDefault();
      openExternal(url);
    }
  });
  handleShortcuts(mainWin);

  const rememberBounds = () => {
    if (mainWin.isMinimized()) return;
    settings.mainMaximized = mainWin.isMaximized();
    if (!settings.mainMaximized) settings.mainBounds = mainWin.getBounds();
    saveSettings();
  };
  mainWin.on('resize', rememberBounds);
  mainWin.on('move', rememberBounds);

  mainWin.on('minimize', () => {
    if (settings.minimizeToMini && state.hasTrack) showMini();
  });
  mainWin.on('closed', () => {
    mainWin = null;
    app.quit();
  });
}

function createMini() {
  const bounds = onScreen(settings.miniBounds) ? settings.miniBounds : defaultMiniBounds();
  miniWin = new BrowserWindow({
    ...bounds,
    minWidth: 120,
    minHeight: 48,
    show: false,
    frame: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: settings.miniOnTop,
    title: 'YT Mini',
    icon: ICON,
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'mini', 'preload-mini.js'),
    },
  });
  miniWin.loadFile(path.join(__dirname, 'mini', 'mini.html'));
  miniWin.webContents.on('did-finish-load', pushToMini);
  handleShortcuts(miniWin);

  const rememberBounds = () => {
    settings.miniBounds = miniWin.getBounds();
    saveSettings();
  };
  miniWin.on('resize', rememberBounds);
  miniWin.on('move', rememberBounds);

  // Alt+F4 on the mini player goes back to the full window instead of quitting.
  miniWin.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      showMain();
    }
  });
}

function isGoogleUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' &&
      /(^|\.)(youtube\.com|google\.com|gstatic\.com|googleusercontent\.com)$/.test(hostname);
  } catch {
    return false;
  }
}

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function handleShortcuts(win) {
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMini();
    }
  });
}

// ---------- switching between full and mini ----------

let hoverTimer = null;
function startHoverPolling() {
  // Drag regions swallow mouse events on Windows, so CSS :hover can't tell the
  // mini player when the cursor is over it. Poll the cursor position instead.
  stopHoverPolling();
  let last = null;
  hoverTimer = setInterval(() => {
    if (!miniWin || miniWin.isDestroyed() || !miniWin.isVisible()) return;
    const p = screen.getCursorScreenPoint();
    const b = miniWin.getBounds();
    const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
    if (inside !== last) {
      last = inside;
      miniWin.webContents.send('mini:hover', inside);
    }
  }, 120);
}
function stopHoverPolling() {
  clearInterval(hoverTimer);
  hoverTimer = null;
}

function showMini() {
  if (!miniWin) return;
  pushToMini();
  miniWin.setAlwaysOnTop(settings.miniOnTop);
  miniWin.show();
  if (mainWin && mainWin.isVisible()) mainWin.hide();
  startHoverPolling();
}

function showMain() {
  if (miniWin && miniWin.isVisible()) miniWin.hide();
  stopHoverPolling();
  if (!mainWin) return;
  mainWin.show();
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.focus();
}

function toggleMini() {
  if (miniWin && miniWin.isVisible()) showMain();
  else showMini();
}

function setPinned(pinned) {
  settings.miniOnTop = pinned;
  saveSettings();
  if (miniWin) {
    miniWin.setAlwaysOnTop(pinned);
    miniWin.webContents.send('mini:pinned', pinned);
  }
  buildTrayMenu();
}

function pushToMini() {
  if (!miniWin || miniWin.isDestroyed()) return;
  miniWin.webContents.send('mini:state', state);
  miniWin.webContents.send('mini:pinned', settings.miniOnTop);
}

function sendCommand(cmd, arg) {
  if (mainWin && COMMANDS.has(cmd)) mainWin.webContents.send('ytm:cmd', cmd, arg);
}

// ---------- tray ----------

function buildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open YT Mini', click: showMain },
    { label: 'Mini player', click: showMini },
    { type: 'separator' },
    { label: 'Play / Pause', click: () => sendCommand('playPause') },
    { label: 'Next', click: () => sendCommand('next') },
    { label: 'Previous', click: () => sendCommand('prev') },
    { type: 'separator' },
    {
      label: 'Minimize to mini player',
      type: 'checkbox',
      checked: settings.minimizeToMini,
      click: (item) => { settings.minimizeToMini = item.checked; saveSettings(); },
    },
    {
      label: 'Keep mini player on top',
      type: 'checkbox',
      checked: settings.miniOnTop,
      click: (item) => setPinned(item.checked),
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
}

let trayTip = '';
function updateTrayTip() {
  const tip = state.hasTrack ? `${state.title} — ${state.artist}`.slice(0, 127) : 'YT Mini';
  if (tray && tip !== trayTip) {
    trayTip = tip;
    tray.setToolTip(tip);
  }
}

function createTray() {
  tray = new Tray(ICON);
  tray.setToolTip('YT Mini');
  tray.on('click', showMain);
  buildTrayMenu();
}

// ---------- IPC ----------

const fromMain = (e) => mainWin && e.sender === mainWin.webContents;
const fromMini = (e) => miniWin && e.sender === miniWin.webContents;

ipcMain.on('ytm:state', (e, s) => {
  if (!fromMain(e)) return;
  state = s;
  if (miniWin && miniWin.isVisible()) miniWin.webContents.send('mini:state', state);
  updateTrayTip();
});
ipcMain.on('ytm:show-mini', (e) => { if (fromMain(e)) showMini(); });
ipcMain.on('mini:cmd', (e, cmd, arg) => { if (fromMini(e)) sendCommand(cmd, arg); });
ipcMain.on('mini:expand', (e) => { if (fromMini(e)) showMain(); });
ipcMain.on('mini:toggle-pin', (e) => { if (fromMini(e)) setPinned(!settings.miniOnTop); });

// ---------- lifecycle ----------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showMain);
  app.whenReady().then(() => {
    loadSettings();
    createMain();
    createMini();
    createTray();
  });
  app.on('before-quit', () => {
    quitting = true;
    writeSettings();
  });
  app.on('window-all-closed', () => app.quit());
}
