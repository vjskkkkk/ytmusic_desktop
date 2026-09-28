const $ = (id) => document.getElementById(id);

const ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
};

let state = { hasTrack: false };
let hover = false;

function render() {
  const player = $('player');
  player.classList.toggle('empty', !state.hasTrack);
  player.classList.toggle('live', !!state.live); // internet radio: no progress to show
  // Controls stay out of the way while music plays; they appear on hover or when paused.
  player.classList.toggle('show', hover || !state.playing || !state.hasTrack);

  $('title').textContent = state.hasTrack ? state.title : 'Nothing playing';
  $('artist').textContent = state.hasTrack ? state.artist : 'Pick something in the full player';
  document.title = state.hasTrack ? `${state.title} — ${state.artist}` : 'YT Mini';

  const img = $('art');
  if (state.art) {
    if (img.getAttribute('src') !== state.art) img.src = state.art;
    img.hidden = false;
  } else {
    img.hidden = true;
  }

  $('playIcon').setAttribute('d', state.playing ? ICONS.pause : ICONS.play);
  $('play').title = state.playing ? 'Pause' : 'Play';

  const pct = state.duration ? Math.min(100, (state.time / state.duration) * 100) : 0;
  $('fill').style.width = `${pct}%`;
}

window.mini.onState((s) => { state = s; render(); });
window.mini.onHover((h) => { hover = h; render(); });
window.mini.onPinned((p) => { $('pin').classList.toggle('active', p); });

$('art').addEventListener('error', () => { $('art').hidden = true; });

$('play').addEventListener('click', () => {
  window.mini.cmd('playPause');
  state = { ...state, playing: !state.playing };
  render();
});
$('prev').addEventListener('click', () => window.mini.cmd('prev'));
$('next').addEventListener('click', () => window.mini.cmd('next'));
$('expand').addEventListener('click', () => window.mini.expand());
$('pin').addEventListener('click', () => window.mini.togglePin());

$('progress').addEventListener('click', (e) => {
  if (state.live) return;
  const r = e.currentTarget.getBoundingClientRect();
  const frac = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
  window.mini.cmd('seek', frac);
  if (state.duration) {
    state = { ...state, time: frac * state.duration };
    render();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); $('play').click(); }
  else if (e.code === 'ArrowRight') window.mini.cmd('next');
  else if (e.code === 'ArrowLeft') window.mini.cmd('prev');
});

render();
