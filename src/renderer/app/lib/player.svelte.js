import { ytm } from './bridge.js';

export const player = $state({
  state: { hasTrack: false },
  queue: [],
  receivedAt: 0,
});

function setState(s) {
  player.state = s || { hasTrack: false };
  player.receivedAt = performance.now();
}

ytm.getPlayer().then((p) => {
  if (!p) return;
  setState(p.state);
  player.queue = p.queue || [];
});
ytm.onState(setState);
ytm.onQueue((q) => { player.queue = q || []; });

export const cmd = (name, arg) => ytm.cmd(name, arg);

export function play(endpoint) {
  if (endpoint) ytm.cmd('play', endpoint);
}

// The engine reports every 500 ms; interpolate between reports so progress moves smoothly.
export function currentTime(now = performance.now()) {
  const s = player.state;
  if (!s.hasTrack) return 0;
  const t = s.playing ? s.time + (now - player.receivedAt) / 1000 : s.time;
  return s.duration ? Math.min(t, s.duration) : t;
}
