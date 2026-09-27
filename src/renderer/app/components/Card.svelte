<script>
  import Art from './Art.svelte';
  import Icon from './Icon.svelte';
  import { openItem, openNav } from '../lib/nav.js';
  import { play, player } from '../lib/player.svelte.js';

  let { item, width = 176 } = $props();
  const round = $derived(item.kind === 'artist');
  const wide = $derived(item.kind === 'video' && /ytimg\.com/.test(item.art || ''));
  const isCurrent = $derived(!!item.videoId && item.videoId === player.state.videoId);

  function playNow(e) {
    e.stopPropagation();
    if (item.play) play(item.play);
    else openNav(item.nav);
  }
</script>

<div class="card" class:wide style:width={`${wide ? Math.round(width * 1.6) : width}px`}>
  <button class="sleeve" onclick={() => openItem(item)} aria-label={`Open ${item.title}`}>
    <Art src={item.art} {round} {wide} alt="" />
    {#if item.play}
      <span class="play" class:current={isCurrent} role="button" tabindex="-1" onclick={playNow} onkeydown={() => {}} aria-label={`Play ${item.title}`}>
        <Icon name={isCurrent && player.state.playing ? 'pause' : 'play'} size={24} />
      </span>
    {/if}
  </button>
  <button class="title ellipsis" onclick={() => openItem(item)} title={item.title}>{item.title}</button>
  {#if item.subtitle}
    <div class="sub dim" title={item.subtitle}>{item.subtitle}</div>
  {/if}
</div>

<style>
  .card { flex: none; display: flex; flex-direction: column; gap: 6px; scroll-snap-align: start; }
  .sleeve { position: relative; display: block; border-radius: var(--r-sleeve); }
  .play {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent);
    color: var(--accent-ink);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.15s var(--ease), transform 0.15s var(--ease);
  }
  .sleeve:hover .play, .sleeve:focus-visible .play, .play.current { opacity: 1; transform: none; }
  .title { text-align: left; font-weight: 600; font-size: 14px; }
  .title:hover { text-decoration: underline; text-underline-offset: 3px; }
  .sub {
    font-size: 12.5px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: -3px;
  }
</style>
