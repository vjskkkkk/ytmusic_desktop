<script>
  // Full-window view of the current song: the record, big type, and lyrics.
  import Record from './Record.svelte';
  import Icon from './Icon.svelte';
  import { player } from '../lib/player.svelte.js';
  import { ytm } from '../lib/bridge.js';

  let { onclose } = $props();
  const s = $derived(player.state);
  const lyrics = $derived(s.videoId ? ytm.api('lyrics', s.videoId) : null);
</script>

<div class="np" role="dialog" aria-label="Now playing">
  <div class="wash" style:background-image={s.art ? `url("${s.art}")` : null}></div>
  <button class="close" onclick={onclose} aria-label="Close now playing"><Icon name="down" size={26} /></button>

  <div class="stage">
    <div class="left">
      <Record art={s.art} playing={s.playing} size={340} />
      <h1 class="title">{s.title || 'Nothing playing'}</h1>
      <p class="artist">{s.artist}{s.album ? ` — ${s.album}` : ''}</p>
    </div>
    <div class="right">
      {#await lyrics then l}
        {#if l?.text}
          <div class="lyrics">{l.text}</div>
          {#if l.source}<p class="source">{l.source}</p>{/if}
        {:else if s.hasTrack}
          <p class="nolyrics">No lyrics for this one. Enjoy the music.</p>
        {/if}
      {/await}
    </div>
  </div>
</div>

<style>
  .np {
    position: absolute;
    inset: 0;
    z-index: 30;
    background: var(--bg);
    overflow: hidden;
    animation: rise 0.28s var(--ease);
  }
  @keyframes rise { from { transform: translateY(24px); opacity: 0; } }
  .wash {
    position: absolute;
    inset: -20%;
    background: center / cover;
    filter: blur(80px) saturate(1.3);
    opacity: 0.35;
  }
  .close {
    position: absolute;
    top: 12px;
    left: 16px;
    z-index: 2;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--glass);
  }
  .stage {
    position: relative;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 48px;
    padding: 64px 56px 32px;
  }
  .left { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
  .title {
    font-size: clamp(34px, 4.6vw, 64px);
    line-height: 1;
    font-weight: 800;
    font-stretch: 85%;
    letter-spacing: -0.02em;
    margin-top: 36px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .artist { font-size: 18px; color: var(--text-dim); margin: 12px 0 0; }
  .right { overflow-y: auto; min-height: 0; padding-right: 12px; mask-image: linear-gradient(transparent, #000 6%, #000 90%, transparent); }
  .lyrics { white-space: pre-line; font-family: var(--font-display); font-size: 26px; line-height: 1.45; font-weight: 600; padding: 40px 0; max-width: 32ch; }
  .source, .nolyrics { color: var(--text-dim); }
  .nolyrics { margin-top: 40vh; font-size: 18px; }
</style>
