// Classic mini player: Webamp (a Winamp 2 reimplementation) driving the YouTube Music engine,
// with an album art panel docked underneath in the skin's colours.
import Webamp from 'webamp';
import { link, YtmMedia, setVizFrame } from './media.js';
import { readPledit } from '../app/lib/skin-colors.js';
import { mix } from '../app/lib/color.js';
import { stubBridge } from './stub.js';

const bridge = window.mini || stubBridge();
link.bridge = bridge;

const host = document.getElementById('host');
const panel = document.getElementById('art-panel');
const artImg = document.getElementById('art');
const caption = document.getElementById('caption');

let showArt = true;
let webamp = null;

const parseDuration = (s) => (s && /^\d+(:\d+)+$/.test(s) ? s.split(':').reduce((a, p) => a * 60 + Number(p), 0) : undefined);

// ---------- skin ----------

let skinUrl = null;
async function loadSkinBytes() {
  const skin = await bridge.currentSkin();
  if (skinUrl) URL.revokeObjectURL(skinUrl);
  skinUrl = skin ? URL.createObjectURL(new Blob([skin.bytes], { type: 'application/zip' })) : null;
  applyPanelColors(await readPledit(skin?.bytes));
  return skinUrl;
}

function applyPanelColors(p) {
  const root = document.documentElement.style;
  root.setProperty('--skin-bg', p.normalBg);
  root.setProperty('--skin-text', p.normal);
  root.setProperty('--skin-light', mix(p.normalBg, '#ffffff', 0.3));
  root.setProperty('--skin-dark', mix(p.normalBg, '#000000', 0.6));
  root.setProperty('--skin-font', `'${p.font.replace(/["';{}]/g, '')}'`);
}

// ---------- layout: stack the open Winamp windows, art panel below, size the OS window ----------

const WINDOWS = [
  ['main', '#main-window'],
  ['equalizer', '#equalizer-window'],
  ['playlist', '#playlist-window'],
];
let lastPositions = '';
let lastSize = '';

function layout() {
  if (!webamp) return;
  const positions = {};
  let y = 0;
  let width = 275;
  let mainShaded = false;
  for (const [id, sel] of WINDOWS) {
    const el = host.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (id === 'main') mainShaded = r.height < 30;
    positions[id] = { x: 0, y };
    y += Math.round(r.height);
    width = Math.max(width, Math.round(r.width));
  }
  const key = JSON.stringify(positions);
  if (key !== lastPositions) {
    lastPositions = key;
    webamp.store.dispatch({ type: 'UPDATE_WINDOW_POSITIONS', positions, absolute: true });
  }

  const artVisible = showArt && !mainShaded && link.state.hasTrack;
  panel.hidden = !artVisible;
  if (artVisible) {
    panel.style.top = `${y}px`;
    y += panel.offsetHeight;
  }
  const size = `${width}x${y}`;
  if (y > 0 && size !== lastSize) {
    lastSize = size;
    bridge.resize(width, y);
  }
}

let layoutQueued = false;
function queueLayout() {
  if (layoutQueued) return;
  layoutQueued = true;
  requestAnimationFrame(() => {
    layoutQueued = false;
    layout();
  });
}

// ---------- engine → Webamp ----------

let lastQueueKey = '';
function syncQueue(queue) {
  link.queue = queue || [];
  const key = link.queue.map((q) => q.videoId).join(',');
  if (key !== lastQueueKey && webamp) {
    lastQueueKey = key;
    link.syncing = true;
    try {
      webamp.store.dispatch({ type: 'REMOVE_ALL_TRACKS' });
      webamp.appendTracks(link.queue.map((q) => ({
        url: `ytm:${q.videoId}#${q.index}`,
        duration: parseDuration(q.duration),
        metaData: { artist: q.artist, title: q.title, albumArtUrl: q.art },
      })));
    } finally {
      link.syncing = false;
    }
  }
  selectCurrent();
}

function selectCurrent() {
  if (!webamp) return;
  const want = link.queue.findIndex((q) => q.selected);
  if (want < 0) return;
  const tracks = webamp.getPlaylistTracks();
  const currentId = webamp.store.getState().playlist.currentTrack;
  if (tracks.findIndex((t) => t.id === currentId) === want) return;
  link.syncing = true;
  try {
    webamp.setCurrentTrack(want);
  } finally {
    link.syncing = false;
  }
  link.media?.emit('fileLoaded');
}

let lastVideo = '';
function syncState(s) {
  const prev = link.state;
  link.state = s || { hasTrack: false };
  link.receivedAt = performance.now();
  if (!webamp) return;

  link.syncing = true;
  try {
    const status = webamp.getMediaStatus();
    if (s.playing && status !== 'PLAYING') webamp.play();
    else if (!s.playing && status === 'PLAYING') webamp.pause();
    if (!link.ready || Math.abs((prev.volume ?? -1) - s.volume) > 1) webamp.setVolume(s.muted ? 0 : s.volume);
  } finally {
    link.syncing = false;
  }
  link.ready = true;
  if (s.playing) link.media?.emit('playing');
  else setVizFrame(null);

  if (s.videoId !== lastVideo) {
    lastVideo = s.videoId;
    link.media?.emit('fileLoaded');
  }
  renderArt(s);
}

function renderArt(s) {
  if (artImg.getAttribute('src') !== (s.art || '')) artImg.src = s.art || '';
  const text = s.hasTrack ? `${s.artist} - ${s.title}` : '';
  if (caption.dataset.text !== text) {
    caption.dataset.text = text;
    caption.textContent = text;
    caption.classList.remove('scroll');
    requestAnimationFrame(() => {
      const overflow = caption.scrollWidth > caption.parentElement.clientWidth - 6;
      caption.classList.toggle('scroll', overflow);
      caption.style.setProperty('--marquee-time', `${Math.max(8, text.length / 4)}s`);
    });
  }
  queueLayout();
}

// ---------- start ----------

async function start() {
  const settings = await bridge.getSettings();
  showArt = settings?.classicArt !== false;
  const initialSkin = await loadSkinBytes();

  webamp = new Webamp({
    initialSkin: initialSkin ? { url: initialSkin } : undefined,
    initialTracks: [],
    windowLayout: {
      main: { position: { top: 0, left: 0 } },
      equalizer: { position: { top: 116, left: 0 }, closed: true },
      playlist: { position: { top: 232, left: 0 }, closed: true },
    },
    enableHotkeys: false,
    enableMediaSession: false,
    zIndex: 1,
    __customMediaClass: YtmMedia,
  });

  // Winamp's close button returns to the full app; minimise minimises this window.
  webamp.onWillClose((cancel) => {
    cancel();
    bridge.expand();
  });
  webamp.onMinimize(() => bridge.minimize());

  await webamp.renderInto(host);

  new MutationObserver(queueLayout).observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
  new ResizeObserver(queueLayout).observe(panel);

  const p = await bridge.getPlayer();
  if (p) {
    syncQueue(p.queue);
    syncState(p.state);
  }
  bridge.onQueue(syncQueue);
  bridge.onState(syncState);
  bridge.onViz?.(setVizFrame);
  bridge.onSettings((s) => {
    showArt = s.classicArt !== false;
    queueLayout();
  });
  bridge.onSkin(async (file) => {
    if (!file) {
      location.reload(); // back to Webamp's built-in base skin
      return;
    }
    const url = await loadSkinBytes();
    if (url) webamp.setSkinFromUrl(url);
  });

  // Keep Webamp's clock moving between engine reports.
  setInterval(() => link.media?.emit('timeupdate'), 250);
  queueLayout();
}

// Right-click anywhere: our menu (skins, size, album art) instead of Webamp's.
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  bridge.menu();
}, true);

// Eject opens the full app rather than a file picker.
document.addEventListener('click', (e) => {
  if (e.target.closest?.('#eject')) {
    e.preventDefault();
    e.stopPropagation();
    bridge.expand();
  }
}, true);

panel.addEventListener('dblclick', () => bridge.expand());

// Drop a .wsz skin onto the player to install and use it.
document.addEventListener('dragover', (e) => e.preventDefault(), true);
document.addEventListener('drop', (e) => {
  const file = [...(e.dataTransfer?.files || [])].find((f) => /\.(wsz|zip)$/i.test(f.name));
  e.preventDefault();
  e.stopPropagation();
  if (file) bridge.importSkinFile(file);
}, true);

start();
