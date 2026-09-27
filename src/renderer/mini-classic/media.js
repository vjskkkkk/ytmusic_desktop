// Webamp's audio backend, replaced by a remote control for the hidden YouTube Music engine.
// Webamp constructs this class itself (via __customMediaClass); main.js wires it up through `link`.
//
// Two rules keep Webamp and the engine from echoing commands back and forth:
//  - While `link.syncing` is set, main.js is updating Webamp to match the engine, so calls
//    coming back from Webamp are ignored.
//  - loadFromUrl only asks the engine to play when the requested track isn't already current.
// "ended" is never emitted: the engine moves through the queue itself.

const FREQS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
const eq = { on: true, preamp: 50, bands: Object.fromEntries(FREQS.map((f) => [f, 50])) };
let eqTouched = false;
let eqTimer = null;

// Only send EQ settings once the user has moved something, so the engine keeps YouTube
// Music's normal audio path until the equalizer is actually used.
function sendEq() {
  if (!link.ready || link.syncing) return;
  const flat = eq.preamp === 50 && FREQS.every((f) => eq.bands[f] === 50);
  if (flat && !eqTouched) return;
  eqTouched = true;
  clearTimeout(eqTimer);
  eqTimer = setTimeout(() => link.bridge.cmd('eq', { on: eq.on, preamp: eq.preamp, bands: { ...eq.bands } }), 60);
}

// Latest waveform from the engine (1024 unsigned bytes, 128 = silence).
const frame = new Uint8Array(1024).fill(128);
export function setVizFrame(data) {
  if (data) frame.set(data.length > 1024 ? data.slice(0, 1024) : data);
  else frame.fill(128);
}

// Webamp's visualizer only reads time-domain data and runs its own FFT.
const analyserStandIn = {
  fftSize: 1024,
  frequencyBinCount: 512,
  smoothingTimeConstant: 0,
  getByteTimeDomainData(out) {
    out.set(frame.subarray(0, Math.min(out.length, frame.length)));
  },
  getByteFrequencyData(out) {
    out.fill(0);
  },
  connect() {},
  disconnect() {},
};

export const link = {
  bridge: null,
  state: { hasTrack: false },
  receivedAt: 0,
  queue: [],
  media: null,
  syncing: false,
  ready: false,
};

export function engineTime() {
  const s = link.state;
  if (!s.hasTrack) return 0;
  const t = s.playing ? s.time + (performance.now() - link.receivedAt) / 1000 : s.time;
  return s.duration ? Math.min(t, s.duration) : t;
}

export class YtmMedia {
  constructor() {
    this.handlers = {};
    link.media = this;
  }

  on(event, callback) {
    (this.handlers[event] ||= []).push(callback);
  }

  emit(event) {
    for (const cb of this.handlers[event] || []) cb();
  }

  timeElapsed() {
    return engineTime();
  }

  duration() {
    return link.state.duration || 0;
  }

  async play() {
    if (link.syncing) return;
    if (!link.state.playing) link.bridge.cmd('playPause');
    this.emit('playing');
  }

  pause() {
    if (link.syncing) return;
    if (link.state.playing) link.bridge.cmd('playPause');
  }

  stop() {
    if (link.syncing) return;
    if (link.state.playing) link.bridge.cmd('playPause');
    link.bridge.cmd('seek', 0);
  }

  seekToPercentComplete(percent) {
    if (link.syncing) return;
    link.bridge.cmd('seek', percent / 100);
  }

  setVolume(volume) {
    // Webamp sets its default volume on start-up; ignore that until we've synced from the engine.
    if (link.syncing || !link.ready) return;
    link.bridge.cmd('volume', volume);
  }

  setBalance() {} // not supported by the engine

  setPreamp(value) {
    eq.preamp = value;
    sendEq();
  }

  setEqBand(band, value) {
    eq.bands[band] = value;
    sendEq();
  }

  disableEq() {
    eq.on = false;
    sendEq();
  }

  enableEq() {
    eq.on = true;
    sendEq();
  }

  async loadFromUrl(url, autoPlay) {
    const m = /^ytm:([^#]*)#(\d+)$/.exec(url);
    if (m && !link.syncing) {
      const index = Number(m[2]);
      const current = link.queue.find((q) => q.selected);
      if (!current || current.index !== index) link.bridge.cmd('playQueueIndex', index);
    }
    this.emit('fileLoaded');
    if (autoPlay || link.state.playing) this.emit('playing');
  }

  // The audio plays in the engine window; its waveform arrives over IPC (setVizFrame).
  getAnalyser() {
    return analyserStandIn;
  }

  dispose() {}
}
