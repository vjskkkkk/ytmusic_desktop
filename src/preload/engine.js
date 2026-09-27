// Runs inside the hidden music.youtube.com engine window. Reports player state and the
// queue to the main process and carries out playback commands.
//
// The player's JS API (#movie_player), Polymer element properties and queue item data only
// exist in the page's main world, so reads and commands run there via webFrame.executeJavaScript.
// Functions passed to inPage() are serialised with toString(): they must be self-contained.
const { ipcRenderer, webFrame } = require('electron');

const inPage = (fn, ...args) =>
  webFrame.executeJavaScript(`(${fn.toString()})(...${JSON.stringify(args)})`);

// YTM thumbnails carry their size in the URL (…=w60-h60-…); ask for a bigger one.
const bigArt = (url) => (url ? url.replace(/=w\d+-h\d+/, '=w544-h544') : '');

function readState() {
  if (!location.hostname.startsWith('music.')) return { hasTrack: false };
  const mp = document.querySelector('#movie_player');
  const video = document.querySelector('video');
  const bar = document.querySelector('ytmusic-player-bar');
  const md = navigator.mediaSession && navigator.mediaSession.metadata;
  let vd = null;
  try { vd = mp && mp.getVideoData(); } catch (e) { /* player not ready */ }

  const title = (md && md.title) || (vd && vd.title) || '';
  let art = '';
  if (md && md.artwork && md.artwork.length) {
    art = [...md.artwork].sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0))[0].src;
  } else {
    const img = bar && bar.querySelector('img.image');
    art = img ? img.src : '';
  }
  // The player bar shows a data: placeholder until the real artwork loads.
  if (!/^https:/.test(art)) art = '';
  let volume = 100;
  let muted = false;
  try { volume = mp.getVolume(); muted = mp.isMuted(); } catch (e) { /* player not ready */ }
  const like = bar && bar.querySelector('ytmusic-like-button-renderer');

  // The engine is hidden, so nobody can answer "Are you still there?". Answer it.
  const stillThere = document.querySelector('ytmusic-you-there-renderer');
  if (stillThere && stillThere.offsetParent) {
    const btn = stillThere.querySelector('button, yt-button-renderer');
    if (btn) btn.click();
  }

  return {
    hasTrack: !!title,
    videoId: (vd && vd.video_id) || '',
    playlistId: (vd && vd.list) || '',
    title,
    artist: (md && md.artist) || (vd && vd.author) || '',
    album: (md && md.album) || '',
    art,
    playing: !!video && !video.paused && !video.ended,
    time: video ? video.currentTime : 0,
    duration: video && Number.isFinite(video.duration) ? video.duration : 0,
    volume,
    muted,
    like: (like && like.getAttribute('like-status')) || 'INDIFFERENT',
    shuffle: !!(bar && bar.shuffleEnabled),
    repeat: (bar && bar.repeatMode) || 'NONE',
  };
}

function readQueue() {
  if (!location.hostname.startsWith('music.')) return [];
  const runs = (t) => (t && t.runs ? t.runs.map((r) => r.text).join('') : '');
  // Songs with a music-video counterpart render both; only the visible one is in the queue.
  const els = [...document.querySelectorAll('ytmusic-player-queue ytmusic-player-queue-item')]
    .filter((el) => !el.closest('[hidden]') && el.data);
  return els.map((el, i) => {
    const d = el.data;
    const th = d.thumbnail && d.thumbnail.thumbnails;
    return {
      index: i,
      videoId: d.videoId || '',
      title: runs(d.title),
      artist: runs(d.shortBylineText),
      duration: runs(d.lengthText),
      art: th && th.length ? th[th.length - 1].url : '',
      selected: !!d.selected,
    };
  });
}

function runCommand(cmd, arg) {
  const mp = document.querySelector('#movie_player');
  const bar = document.querySelector('ytmusic-player-bar');
  const click = (sel) => {
    const el = bar && bar.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  };
  const navigate = (endpoint) => document.querySelector('ytmusic-app').dispatchEvent(
    new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint } }));

  switch (cmd) {
    case 'playPause': {
      const v = document.querySelector('video');
      if (mp && v) { if (v.paused) mp.playVideo(); else mp.pauseVideo(); } else click('#play-pause-button');
      break;
    }
    case 'next':
      if (!click('.next-button') && mp) mp.nextVideo();
      break;
    case 'prev':
      if (!click('.previous-button') && mp) mp.previousVideo();
      break;
    case 'seek':
      if (mp && mp.getDuration() > 0) mp.seekTo(Math.min(Math.max(Number(arg) || 0, 0), 1) * mp.getDuration(), true);
      break;
    case 'volume': {
      const v = Math.round(Math.min(Math.max(Number(arg) || 0, 0), 100));
      if (mp) { mp.setVolume(v); if (v > 0 && mp.isMuted()) mp.unMute(); }
      break;
    }
    case 'like': {
      const like = bar && bar.querySelector('ytmusic-like-button-renderer');
      const btn = like && (like.querySelector('#button-shape-like button') || like.querySelector('button'));
      if (btn) btn.click();
      break;
    }
    case 'shuffle':
      click('.shuffle');
      break;
    case 'repeat':
      click('.repeat');
      break;
    case 'play':
      // arg is { watchEndpoint: {...} } or { watchPlaylistEndpoint: {...} }
      if (arg && (arg.watchEndpoint || arg.watchPlaylistEndpoint)) navigate(arg);
      break;
    case 'playQueueIndex': {
      const els = [...document.querySelectorAll('ytmusic-player-queue ytmusic-player-queue-item')]
        .filter((el) => !el.closest('[hidden]') && el.data);
      const d = els[arg] && els[arg].data;
      if (d && d.navigationEndpoint) navigate(d.navigationEndpoint);
      break;
    }
  }
}

// ---------- equalizer and visualizer (classic player) ----------
// The first time either is used, the page's <video> is routed through Web Audio:
// source → preamp → 10 Winamp EQ bands → analyser → speakers. Until then YTM's audio path
// is left alone.

function audio(cmd, arg) {
  const video = document.querySelector('video');
  if (!video) return null;
  let g = window.__ytminiAudio;
  if (!g || g.video !== video) {
    const ctx = (g && g.ctx) || new AudioContext();
    const src = ctx.createMediaElementSource(video);
    const pre = ctx.createGain();
    const freqs = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    const bands = freqs.map((f, i) => {
      const b = ctx.createBiquadFilter();
      b.type = i === 0 ? 'lowshelf' : i === freqs.length - 1 ? 'highshelf' : 'peaking';
      b.frequency.value = f;
      b.Q.value = 1.4;
      b.gain.value = 0;
      return b;
    });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    let node = src;
    node.connect(pre);
    node = pre;
    for (const b of bands) {
      node.connect(b);
      node = b;
    }
    node.connect(analyser);
    analyser.connect(ctx.destination);
    g = window.__ytminiAudio = { ctx, video, pre, bands, analyser, freqs };
  }
  if (g.ctx.state === 'suspended') g.ctx.resume();

  if (cmd === 'eq') {
    // Winamp slider values are 0–100 with 50 = flat; map to ±12 dB.
    const db = (v) => {
      const n = Number.isFinite(Number(v)) ? Number(v) : 50;
      return ((Math.min(Math.max(n, 0), 100) - 50) / 50) * 12;
    };
    const on = !!arg.on;
    g.pre.gain.value = on ? 10 ** (db(arg.preamp) / 20) : 1;
    g.bands.forEach((b, i) => { b.gain.value = on ? db(arg.bands[g.freqs[i]]) : 0; });
    return true;
  }
  if (cmd === 'frame') {
    const data = new Uint8Array(1024);
    g.analyser.getByteTimeDomainData(data);
    return Array.from(data);
  }
  return null;
}

let vizTimer = null;
function setViz(on) {
  clearInterval(vizTimer);
  vizTimer = null;
  if (!on) return;
  vizTimer = setInterval(async () => {
    if (!lastState.includes('"playing":true')) return;
    try {
      const frame = await inPage(audio, 'frame');
      if (frame) ipcRenderer.send('ytm:viz', frame);
    } catch {
      // page navigating
    }
  }, 33);
}

// ---------- reporting ----------

let lastState = '';
let lastQueue = '';
let tick = 0;

async function report(withQueue) {
  try {
    const s = await inPage(readState);
    s.art = bigArt(s.art);
    const key = JSON.stringify(s);
    if (key !== lastState) {
      lastState = key;
      ipcRenderer.send('ytm:state', s);
    }
    if (withQueue) {
      const q = (await inPage(readQueue)).map((it) => ({ ...it, art: bigArt(it.art) }));
      const qkey = JSON.stringify(q);
      if (qkey !== lastQueue) {
        lastQueue = qkey;
        ipcRenderer.send('ytm:queue', q);
      }
    }
  } catch {
    // page mid-navigation; try again next tick
  }
}
setInterval(() => report(tick++ % 4 === 0), 500);

const COMMANDS = new Set(['playPause', 'next', 'prev', 'seek', 'volume', 'like', 'shuffle', 'repeat', 'play', 'playQueueIndex']);
ipcRenderer.on('ytm:cmd', async (_e, cmd, arg) => {
  if (cmd === 'viz') {
    setViz(!!arg);
    return;
  }
  if (cmd === 'eq') {
    if (arg && typeof arg === 'object' && arg.bands) inPage(audio, 'eq', arg).catch(() => {});
    return;
  }
  if (!COMMANDS.has(cmd)) return;
  try {
    await inPage(runCommand, cmd, arg ?? null);
  } catch {
    // ignore: the page may be navigating
  }
  setTimeout(() => report(true), 150);
});

// ---------- "open mini player" button, for when the engine is shown as the classic view ----------

const SVG_NS = 'http://www.w3.org/2000/svg';
const MINI_ICON = 'M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z';

// Built with DOM calls rather than innerHTML: YTM enforces Trusted Types.
function makeMiniButton() {
  const btn = document.createElement('button');
  btn.id = 'ytmini-open-mini';
  btn.title = 'Mini player (Ctrl+Shift+M)';
  Object.assign(btn.style, {
    background: 'none',
    border: '0',
    padding: '8px',
    margin: '0 4px',
    cursor: 'pointer',
    color: '#fff',
    opacity: '0.7',
    display: 'inline-flex',
    alignItems: 'center',
  });
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.7'; });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    ipcRenderer.send('ytm:show-mini');
  });

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', MINI_ICON);
  svg.appendChild(path);
  btn.appendChild(svg);
  return btn;
}

// The player bar is rendered late and re-rendered on navigation, so keep checking.
setInterval(() => {
  if (document.getElementById('ytmini-open-mini')) return;
  const host = document.querySelector('ytmusic-player-bar .right-controls-buttons');
  if (host) host.prepend(makeMiniButton());
}, 1500);
