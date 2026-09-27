// The app window (our UI), the two mini players, and the tray.
const { app, BrowserWindow, Tray, Menu, screen } = require('electron');
const path = require('path');
const { settings, saveSettings, onScreen } = require('./settings');
const engine = require('./engine');

const ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png');
const PRELOAD = (name) => path.join(__dirname, '..', 'preload', `${name}.js`);

const w = { app: null, mini: null, classic: null, tray: null };

function loadPage(win, page) {
  if (process.argv.includes('--dev')) return win.loadURL(`http://localhost:5173/${page}/index.html`);
  return win.loadFile(path.join(__dirname, '..', '..', 'dist-renderer', page, 'index.html'));
}

// ---------- app window ----------

function createApp() {
  const bounds = onScreen(settings.appBounds) ? settings.appBounds : { width: 1360, height: 860 };
  w.app = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 560,
    show: false,
    title: 'YT Mini',
    icon: ICON,
    backgroundColor: '#0b0b10',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff', height: 40 },
    webPreferences: { preload: PRELOAD('app') },
  });
  if (settings.appMaximized) w.app.maximize();
  w.app.once('ready-to-show', () => w.app.show());
  loadPage(w.app, 'app');

  w.app.webContents.setWindowOpenHandler(({ url }) => {
    engine.openExternal(url);
    return { action: 'deny' };
  });
  w.app.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:') && !url.startsWith('http://localhost:5173')) e.preventDefault();
  });
  handleShortcuts(w.app);

  const rememberBounds = () => {
    if (w.app.isMinimized()) return;
    settings.appMaximized = w.app.isMaximized();
    if (!settings.appMaximized) settings.appBounds = w.app.getBounds();
    saveSettings();
  };
  w.app.on('resize', rememberBounds);
  w.app.on('move', rememberBounds);
  w.app.on('minimize', () => {
    if (settings.minimizeToMini && engine.state.hasTrack) showMini();
  });
  w.app.on('closed', () => {
    w.app = null;
    app.quit();
  });
}

function setTitleBarColors(color, symbolColor) {
  if (!w.app) return;
  try {
    w.app.setTitleBarOverlay({ color, symbolColor, height: 40 });
  } catch {
    // unsupported colour string; keep the current one
  }
}

// ---------- modern mini player ----------

function defaultMiniBounds() {
  const a = screen.getPrimaryDisplay().workArea;
  const size = 280;
  return { width: size, height: size, x: a.x + a.width - size - 24, y: a.y + a.height - size - 24 };
}

function createMini() {
  const bounds = onScreen(settings.miniBounds) ? settings.miniBounds : defaultMiniBounds();
  w.mini = new BrowserWindow({
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
    webPreferences: { preload: PRELOAD('mini') },
  });
  loadPage(w.mini, 'mini-modern');
  w.mini.webContents.on('did-finish-load', () => pushTo(w.mini));
  handleShortcuts(w.mini);

  const rememberBounds = () => {
    settings.miniBounds = w.mini.getBounds();
    saveSettings();
  };
  w.mini.on('resize', rememberBounds);
  w.mini.on('move', rememberBounds);
  // Alt+F4 on a mini player goes back to the app instead of quitting.
  w.mini.on('close', (e) => {
    if (!engine.quitting) {
      e.preventDefault();
      showApp();
    }
  });
}

// ---------- classic (Webamp) mini player ----------

function defaultClassicPos() {
  const a = screen.getPrimaryDisplay().workArea;
  return { x: a.x + a.width - 275 - 24, y: a.y + a.height - 420 - 24 };
}

function createClassic() {
  const pos = onScreen(settings.classicPos) ? settings.classicPos : defaultClassicPos();
  w.classic = new BrowserWindow({
    x: pos.x,
    y: pos.y,
    width: 275,
    height: 116,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: settings.miniOnTop,
    title: 'YT Mini',
    icon: ICON,
    webPreferences: { preload: PRELOAD('mini') },
  });
  loadPage(w.classic, 'mini-classic');
  w.classic.webContents.on('did-finish-load', () => {
    applyClassicScale();
    pushTo(w.classic);
  });
  handleShortcuts(w.classic);

  w.classic.on('move', () => {
    const [x, y] = w.classic.getPosition();
    settings.classicPos = { x, y };
    saveSettings();
  });
  w.classic.on('close', (e) => {
    if (!engine.quitting) {
      e.preventDefault();
      showApp();
    }
  });
}

// Winamp skins are pixel art, so the classic player scales in whole steps with page zoom.
// Zoom (rather than a CSS transform) keeps Webamp's slider and drag maths correct.
function applyClassicScale() {
  if (w.classic && !w.classic.isDestroyed()) w.classic.webContents.setZoomFactor(settings.classicScale || 1);
}

// width/height are the page's CSS size; the window needs them at the current zoom.
function resizeClassic(width, height) {
  if (!w.classic) return;
  const scale = settings.classicScale || 1;
  const wd = Math.round(Math.min(Math.max(width, 50), 1200) * scale);
  const ht = Math.round(Math.min(Math.max(height, 14), 1200) * scale);
  const [cw, ch] = w.classic.getContentSize();
  if (cw !== wd || ch !== ht) {
    // resizable:false windows still accept programmatic resizes once unlocked
    w.classic.setResizable(true);
    w.classic.setContentSize(wd, ht);
    w.classic.setResizable(false);
  }
}

// ---------- switching ----------

const activeMini = () => (settings.miniStyle === 'classic' ? w.classic : w.mini);
const allMinis = () => [w.mini, w.classic].filter(Boolean);

let hoverTimer = null;
function startHoverPolling() {
  // Drag regions swallow mouse events on Windows, so CSS :hover can't tell the
  // modern mini player when the cursor is over it. Poll the cursor position instead.
  stopHoverPolling();
  let last = null;
  hoverTimer = setInterval(() => {
    if (!w.mini || w.mini.isDestroyed() || !w.mini.isVisible()) return;
    const p = screen.getCursorScreenPoint();
    const b = w.mini.getBounds();
    const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
    if (inside !== last) {
      last = inside;
      w.mini.webContents.send('mini:hover', inside);
    }
  }, 120);
}
function stopHoverPolling() {
  clearInterval(hoverTimer);
  hoverTimer = null;
}

function showMini() {
  const mini = activeMini();
  if (!mini) return;
  for (const other of allMinis()) if (other !== mini && other.isVisible()) other.hide();
  pushTo(mini);
  mini.setAlwaysOnTop(settings.miniOnTop);
  mini.show();
  if (w.app && w.app.isVisible()) w.app.hide();
  if (mini === w.mini) startHoverPolling();
  engine.send('viz', mini === w.classic);
}

function showApp() {
  for (const m of allMinis()) if (m.isVisible()) m.hide();
  stopHoverPolling();
  engine.send('viz', false);
  if (!w.app) return;
  w.app.show();
  if (w.app.isMinimized()) w.app.restore();
  w.app.focus();
}

function toggleMini() {
  if (allMinis().some((m) => m.isVisible())) showApp();
  else showMini();
}

function setPinned(pinned) {
  settings.miniOnTop = pinned;
  saveSettings();
  for (const m of allMinis()) {
    m.setAlwaysOnTop(pinned);
    m.webContents.send('mini:pinned', pinned);
  }
  buildTrayMenu();
}

function setMiniStyle(style) {
  if (style !== 'modern' && style !== 'classic') return;
  const wasShowing = allMinis().some((m) => m.isVisible());
  settings.miniStyle = style;
  saveSettings();
  if (wasShowing) showMini();
  buildTrayMenu();
}

// ---------- broadcasting ----------

function pushTo(win) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('player:state', engine.state);
  win.webContents.send('player:queue', engine.queue);
  win.webContents.send('mini:pinned', settings.miniOnTop);
}

function broadcast(channel, payload) {
  for (const win of [w.app, w.mini, w.classic]) {
    if (win && !win.isDestroyed() && (win === w.app || win.isVisible())) win.webContents.send(channel, payload);
  }
}

function sendToAll(channel, payload) {
  for (const win of [w.app, w.mini, w.classic]) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

function handleShortcuts(win) {
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMini();
    }
  });
}

// ---------- tray ----------

function buildTrayMenu() {
  if (!w.tray) return;
  w.tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open YT Mini', click: showApp },
    { label: 'Mini player', click: showMini },
    { type: 'separator' },
    { label: 'Play / Pause', click: () => engine.send('playPause') },
    { label: 'Next', click: () => engine.send('next') },
    { label: 'Previous', click: () => engine.send('prev') },
    { type: 'separator' },
    {
      label: 'Mini player style',
      submenu: [
        { label: 'Modern', type: 'radio', checked: settings.miniStyle === 'modern', click: () => setMiniStyle('modern') },
        { label: 'Classic (Winamp)', type: 'radio', checked: settings.miniStyle === 'classic', click: () => setMiniStyle('classic') },
      ],
    },
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
    { label: 'Classic YouTube Music view', click: () => engine.showClassic() },
    { label: 'Quit', click: () => app.quit() },
  ]));
}

let trayTip = '';
function updateTrayTip(state) {
  const tip = state.hasTrack ? `${state.title} — ${state.artist}`.slice(0, 127) : 'YT Mini';
  if (w.tray && tip !== trayTip) {
    trayTip = tip;
    w.tray.setToolTip(tip);
  }
}

function createTray() {
  w.tray = new Tray(ICON);
  w.tray.setToolTip('YT Mini');
  w.tray.on('click', showApp);
  buildTrayMenu();
}

module.exports = {
  w, createApp, createMini, createClassic, createTray, resizeClassic, applyClassicScale, setTitleBarColors,
  showMini, showApp, toggleMini, setPinned, setMiniStyle, buildTrayMenu, updateTrayTip,
  broadcast, sendToAll,
};
