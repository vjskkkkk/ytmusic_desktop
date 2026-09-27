// The hidden music.youtube.com window that does the actual playback. It is shown only for
// Google sign-in or when the user opens the classic YouTube Music view.
const { BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const EventEmitter = require('events');
const { settings, saveSettings, onScreen } = require('./settings');

const YTM_URL = 'https://music.youtube.com/';
const SIGN_IN_URL = 'https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&continue=' +
  encodeURIComponent('https://www.youtube.com/signin?action_handle_signin=true&next=https%3A%2F%2Fmusic.youtube.com%2F');

// Keep Electron's own user agent. Google's sign-in rejects a spoofed browser UA whose
// other signals don't match ("This browser or app may not be secure"); Pear Desktop
// (a widely used YTM Electron app) also leaves the UA untouched by default.

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

class Engine extends EventEmitter {
  constructor() {
    super();
    this.win = null;
    this.state = { hasTrack: false };
    this.queue = [];
    this.signingIn = false;
    this.quitting = false;
  }

  create() {
    const bounds = onScreen(settings.engineBounds) ? settings.engineBounds : { width: 1200, height: 800 };
    this.win = new BrowserWindow({
      ...bounds,
      minWidth: 720,
      minHeight: 480,
      show: false,
      title: 'YouTube Music (classic view)',
      icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
      backgroundColor: '#030303',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'engine.js'),
        // keep playing and reporting state while hidden
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required',
      },
    });
    this.win.loadURL(YTM_URL);

    const wc = this.win.webContents;
    // YTM asks "leave this page?" (beforeunload) while music plays. Electron silently honours
    // that, which cancels closing this window and with it quitting the app. Nobody can answer
    // the prompt in a hidden window, so always allow the unload.
    wc.on('will-prevent-unload', (e) => e.preventDefault());
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
    // Back on YouTube Music after signing in: hide again and tell everyone.
    wc.on('did-navigate', (_e, url) => {
      if (this.signingIn && url.startsWith(YTM_URL)) {
        this.signingIn = false;
        this.win.hide();
        this.emit('auth');
      }
    });

    const rememberBounds = () => {
      if (!this.win.isMinimized() && !this.win.isMaximized()) {
        settings.engineBounds = this.win.getBounds();
        saveSettings();
      }
    };
    this.win.on('resize', rememberBounds);
    this.win.on('move', rememberBounds);
    this.win.on('close', (e) => {
      if (!this.quitting) {
        e.preventDefault();
        this.signingIn = false;
        this.win.hide();
      }
    });

    ipcMain.on('ytm:state', (e, s) => {
      if (e.sender !== wc) return;
      this.state = s;
      this.emit('state', s);
    });
    ipcMain.on('ytm:viz', (e, frame) => {
      if (e.sender === wc && Array.isArray(frame)) this.emit('viz', frame);
    });
    ipcMain.on('ytm:queue', (e, q) => {
      if (e.sender !== wc) return;
      this.queue = q;
      this.emit('queue', q);
    });

    let authTimer = null;
    session.defaultSession.cookies.on('changed', (_e, cookie) => {
      if (cookie.name !== 'SAPISID') return;
      clearTimeout(authTimer);
      authTimer = setTimeout(() => this.emit('auth'), 1000);
    });
  }

  send(cmd, arg) {
    if (this.win && !this.win.isDestroyed()) this.win.webContents.send('ytm:cmd', cmd, arg);
  }

  async isSignedIn() {
    const cookies = await session.defaultSession.cookies.get({ name: 'SAPISID' });
    return cookies.some((c) => c.domain.includes('youtube.com'));
  }

  signIn() {
    this.signingIn = true;
    this.win.loadURL(SIGN_IN_URL);
    this.win.show();
    this.win.focus();
  }

  showClassic() {
    if (!this.win.webContents.getURL().startsWith(YTM_URL)) this.win.loadURL(YTM_URL);
    this.win.show();
    if (this.win.isMinimized()) this.win.restore();
    this.win.focus();
  }
}

module.exports = new Engine();
module.exports.isGoogleUrl = isGoogleUrl;
module.exports.openExternal = openExternal;
