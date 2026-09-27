// Runs inside music.youtube.com. Reports what's playing to the main process and
// carries out playback commands coming from the mini player / tray.
const { ipcRenderer } = require('electron');

const $ = (sel) => document.querySelector(sel);

// YTM thumbnails carry their size in the URL (…=w60-h60-…); ask for a bigger one.
const bigArt = (url) => (url ? url.replace(/=w\d+-h\d+/, '=w544-h544') : '');

function readState() {
  const video = $('video');
  const md = navigator.mediaSession && navigator.mediaSession.metadata;
  const bar = $('ytmusic-player-bar');

  const title = (md && md.title) || bar?.querySelector('.title')?.textContent.trim() || '';
  const artist = (md && md.artist) ||
    bar?.querySelector('.byline')?.textContent.split('•')[0].trim() || '';

  let art = '';
  if (md && md.artwork && md.artwork.length) {
    art = [...md.artwork].sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0))[0].src;
  } else {
    art = bar?.querySelector('img.image')?.src || '';
  }

  return {
    hasTrack: !!title,
    title,
    artist,
    album: (md && md.album) || '',
    art: bigArt(art),
    playing: !!video && !video.paused && !video.ended,
    time: video ? video.currentTime : 0,
    duration: video && Number.isFinite(video.duration) ? video.duration : 0,
  };
}

let lastSent = '';
function report() {
  const s = readState();
  const key = JSON.stringify(s);
  if (key !== lastSent) {
    lastSent = key;
    ipcRenderer.send('ytm:state', s);
  }
}
setInterval(report, 500);

function click(sel) {
  const el = $(sel);
  if (!el) return false;
  el.click();
  return true;
}

ipcRenderer.on('ytm:cmd', (_e, cmd, arg) => {
  const video = $('video');
  switch (cmd) {
    case 'playPause':
      if (!click('ytmusic-player-bar #play-pause-button') && video) {
        if (video.paused) video.play(); else video.pause();
      }
      break;
    case 'next':
      click('ytmusic-player-bar .next-button');
      break;
    case 'prev':
      click('ytmusic-player-bar .previous-button');
      break;
    case 'seek':
      if (video && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(Math.max(Number(arg) || 0, 0), 1) * video.duration;
      }
      break;
  }
  setTimeout(report, 150);
});

// ---------- "open mini player" button in the YTM player bar ----------

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
  const host = $('ytmusic-player-bar .right-controls-buttons');
  if (host) host.prepend(makeMiniButton());
}, 1500);
