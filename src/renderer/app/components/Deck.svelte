<script>
  // The player bar along the bottom of the window.
  import Art from './Art.svelte';
  import Icon from './Icon.svelte';
  import { player, cmd, currentTime } from '../lib/player.svelte.js';
  import { ytm } from '../lib/bridge.js';
  import { time } from '../lib/format.js';

  let { panelOpen = $bindable(), onNowPlaying } = $props();
  const s = $derived(player.state);

  // Smooth progress between engine reports.
  let now = $state(0);
  let dragging = $state(null);
  $effect(() => {
    let raf;
    const loop = () => {
      now = currentTime();
      raf = requestAnimationFrame(loop);
    };
    if (s.playing) loop();
    else now = currentTime();
    return () => cancelAnimationFrame(raf);
  });

  const shown = $derived(dragging ?? now);
  const pct = $derived(s.duration ? (shown / s.duration) * 100 : 0);

  function seek(e) {
    const v = Number(e.currentTarget.value);
    dragging = null;
    if (s.duration) cmd('seek', v / s.duration);
  }

  let volTimer;
  let localVol = $state(null);
  function setVolume(e) {
    localVol = Number(e.currentTarget.value);
    clearTimeout(volTimer);
    volTimer = setTimeout(() => {
      cmd('volume', localVol);
      setTimeout(() => (localVol = null), 800);
    }, 60);
  }
  const vol = $derived(localVol ?? (s.muted ? 0 : s.volume ?? 100));
</script>

<footer class="deck" style:--pct={`${pct}%`}>
  <div class="now">
    {#if s.hasTrack}
      <button class="sleeve" onclick={onNowPlaying} aria-label="Open now playing">
        <Art src={s.art} size={56} lazy={false} alt="" />
      </button>
      <div class="meta">
        <button class="title ellipsis" onclick={onNowPlaying}>{s.title}</button>
        <div class="artist ellipsis dim">{s.artist}{s.album ? ` — ${s.album}` : ''}</div>
      </div>
      <button class="icon like" class:on={s.like === 'LIKE'} onclick={() => cmd('like')} aria-label={s.like === 'LIKE' ? 'Remove like' : 'Like'} aria-pressed={s.like === 'LIKE'}>
        <Icon name={s.like === 'LIKE' ? 'liked' : 'like'} size={20} />
      </button>
    {:else}
      <div class="idle dim">Pick something to play</div>
    {/if}
  </div>

  <div class="center">
    <div class="controls">
      <button class="icon" class:on={s.shuffle} onclick={() => cmd('shuffle')} aria-label="Shuffle" aria-pressed={!!s.shuffle}><Icon name="shuffle" size={20} /></button>
      <button class="icon" onclick={() => cmd('prev')} aria-label="Previous"><Icon name="prev" size={26} /></button>
      <button class="playbtn" onclick={() => cmd('playPause')} aria-label={s.playing ? 'Pause' : 'Play'} disabled={!s.hasTrack}>
        <Icon name={s.playing ? 'pause' : 'play'} size={28} />
      </button>
      <button class="icon" onclick={() => cmd('next')} aria-label="Next"><Icon name="next" size={26} /></button>
      <button class="icon" class:on={s.repeat && s.repeat !== 'NONE'} onclick={() => cmd('repeat')} aria-label={`Repeat: ${(s.repeat || 'NONE').toLowerCase()}`}>
        <Icon name={s.repeat === 'ONE' ? 'repeatOne' : 'repeat'} size={20} />
      </button>
    </div>
    <div class="progress">
      <span class="t">{time(shown)}</span>
      <input
        type="range"
        min="0"
        max={s.duration || 1}
        step="0.1"
        value={shown}
        disabled={!s.duration}
        oninput={(e) => (dragging = Number(e.currentTarget.value))}
        onchange={seek}
        aria-label="Seek"
      />
      <span class="t">{time(s.duration)}</span>
    </div>
  </div>

  <div class="right">
    <button class="icon" onclick={() => cmd('volume', vol > 0 ? 0 : 60)} aria-label={vol > 0 ? 'Mute' : 'Unmute'}>
      <Icon name={vol > 0 ? 'volume' : 'mute'} size={20} />
    </button>
    <input class="vol" type="range" min="0" max="100" value={vol} oninput={setVolume} aria-label="Volume" style:--v={`${vol}%`} />
    <button class="icon" class:on={panelOpen} onclick={() => (panelOpen = !panelOpen)} aria-label="Up next and lyrics" aria-pressed={panelOpen}>
      <Icon name="queue" size={20} />
    </button>
    <button class="icon" onclick={() => ytm.showMini()} aria-label="Mini player (Ctrl+Shift+M)" title="Mini player (Ctrl+Shift+M)">
      <Icon name="mini" size={20} />
    </button>
  </div>
</footer>

<style>
  .deck {
    grid-area: deck;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 1.3fr) minmax(0, 1fr);
    align-items: center;
    gap: 20px;
    padding: 0 18px;
    background: var(--bg-elev);
    border-top: 1px solid var(--line);
    position: relative;
  }
  .now { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .sleeve { border-radius: var(--r-sleeve); }
  .meta { min-width: 0; display: flex; flex-direction: column; }
  .title { font-weight: 650; text-align: left; max-width: 100%; }
  .title:hover { text-decoration: underline; text-underline-offset: 3px; }
  .artist { font-size: 12.5px; }
  .idle { font-size: 13px; }
  .icon {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-dim);
    flex: none;
  }
  .icon:hover { color: var(--text); background: var(--bg-elev-2); }
  .icon.on { color: var(--accent); }
  .center { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .controls { display: flex; align-items: center; gap: 10px; }
  .playbtn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--text);
    color: var(--bg);
  }
  .playbtn:hover:not(:disabled) { transform: scale(1.05); }
  .playbtn:disabled { opacity: 0.4; cursor: default; }
  .progress { display: flex; align-items: center; gap: 10px; width: 100%; }
  .t { font-size: 11.5px; color: var(--text-faint); font-variant-numeric: tabular-nums; min-width: 38px; text-align: center; }
  .right { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }

  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 16px;
    background: transparent;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 4px;
    background: linear-gradient(to right, var(--accent) var(--pct), var(--bg-hover) var(--pct));
  }
  input.vol { flex: 0 0 96px; }
  input.vol::-webkit-slider-runnable-track {
    background: linear-gradient(to right, var(--text-dim) var(--v), var(--bg-hover) var(--v));
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    margin-top: -4px;
    border-radius: 50%;
    background: var(--text);
    opacity: 0;
    transition: opacity 0.12s;
  }
  input[type='range']:hover::-webkit-slider-thumb,
  input[type='range']:focus-visible::-webkit-slider-thumb { opacity: 1; }
  input[type='range']:disabled { cursor: default; }
</style>
