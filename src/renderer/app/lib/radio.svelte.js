// Internet radio playback. Streams play in an <audio> element in this window; YouTube Music
// plays in the hidden engine window. Only one of them plays at a time.
import { ytm } from './bridge.js';
import { player, cmd } from './player.svelte.js';

const VOLUME_KEY = 'ytmini.radioVolume';

function savedVolume() {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 100 ? v : 80;
  } catch {
    return 80;
  }
}

export const radio = $state({
  active: false, // a station is loaded (playing or paused)
  playing: false,
  loading: false,
  error: '',
  station: null,
  genre: '', // genre name the list came from, shown as the subtitle
  list: [],
  volume: savedVolume(),
});

const audio = new Audio();
audio.preload = 'none';
audio.volume = radio.volume / 100;

audio.addEventListener('playing', () => {
  radio.playing = true;
  radio.loading = false;
  radio.error = '';
});
audio.addEventListener('pause', () => { radio.playing = false; });
audio.addEventListener('waiting', () => { if (radio.active) radio.loading = true; });
audio.addEventListener('error', () => {
  if (!radio.active || !audio.getAttribute('src')) return;
  radio.loading = false;
  radio.playing = false;
  radio.error = 'This station is unavailable right now. Try another.';
});

function subtitle() {
  const s = radio.station;
  if (!s) return '';
  return ['Live radio', s.country, radio.genre].filter(Boolean).join(' · ');
}

// Keep the mini player and tray in step.
function report() {
  ytm.setRadioState(radio.active
    ? { active: true, title: radio.station.name, subtitle: subtitle(), art: radio.station.favicon, playing: radio.playing || radio.loading }
    : { active: false });
}

export const radioSubtitle = subtitle;

export function playStation(station, list = radio.list, genre = radio.genre) {
  if (!station?.stream) return;
  if (player.state.playing) cmd('playPause'); // pause YouTube Music
  radio.station = station;
  radio.list = list;
  radio.genre = genre;
  radio.active = true;
  radio.loading = true;
  radio.error = '';
  audio.src = station.stream;
  audio.play().catch(() => {
    // the 'error' event reports stream failures; this only catches aborted loads
  });
  ytm.radioApi('click', station.id).catch(() => {});
  report();
}

export function toggleRadio() {
  if (!radio.active) return;
  if (radio.playing || radio.loading) {
    audio.pause();
    // A paused live stream would resume minutes behind; drop the buffer so play is live again.
    audio.removeAttribute('src');
    audio.load();
    radio.loading = false;
    radio.playing = false;
    report();
  } else {
    playStation(radio.station);
  }
}

export function stopRadio() {
  if (!radio.active) return;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  Object.assign(radio, { active: false, playing: false, loading: false, error: '', station: null });
  report();
}

function step(delta) {
  if (!radio.active || !radio.list.length) return;
  const i = radio.list.findIndex((s) => s.id === radio.station?.id);
  const next = radio.list[(i + delta + radio.list.length) % radio.list.length];
  playStation(next);
}
export const nextStation = () => step(1);
export const prevStation = () => step(-1);

export function setRadioVolume(v) {
  radio.volume = Math.min(100, Math.max(0, Math.round(v)));
  audio.volume = radio.volume / 100;
  try {
    localStorage.setItem(VOLUME_KEY, String(radio.volume || 80));
  } catch {
    // not important
  }
}

// Commands from the mini player and tray.
ytm.onRadioCmd?.((name) => {
  if (name === 'playPause') toggleRadio();
  else if (name === 'next') nextStation();
  else if (name === 'prev') prevStation();
});

$effect.root(() => {
  // YouTube Music started playing (from here, the mini player or media keys): stop the radio.
  // Only on the paused → playing edge: right after a station starts, the engine still reports
  // playing for up to half a second before our pause lands.
  let wasPlaying = player.state.playing;
  $effect(() => {
    const playing = !!player.state.playing;
    if (playing && !wasPlaying && radio.active) stopRadio();
    wasPlaying = playing;
  });
  // Tell main whenever play state changes.
  $effect(() => {
    radio.playing;
    radio.loading;
    if (radio.active) report();
  });
});
