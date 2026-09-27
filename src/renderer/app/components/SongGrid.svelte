<script>
  // Quick picks style: songs flow down columns of `rows`, and the columns scroll sideways.
  import Art from './Art.svelte';
  import Icon from './Icon.svelte';
  import { play, player } from '../lib/player.svelte.js';
  import { openArtist } from '../lib/nav.js';
  import { artistNames } from '../lib/format.js';

  let { items, rows = 4 } = $props();
</script>

<div class="grid" style:grid-template-rows={`repeat(${Math.min(rows, items.length) || 1}, auto)`}>
  {#each items as item (item.videoId || item.title)}
    {@const current = item.videoId && item.videoId === player.state.videoId}
    <div class="song" class:current>
      <button class="thumb" onclick={() => play(item.play)} aria-label={`Play ${item.title}`}>
        <Art src={item.art} size={48} alt="" />
        <span class="overlay"><Icon name={current && player.state.playing ? 'pause' : 'play'} size={22} /></span>
      </button>
      <div class="text">
        <button class="title ellipsis" onclick={() => play(item.play)}>{item.title}</button>
        <div class="by ellipsis dim">
          {#if item.artists?.length}
            {#each item.artists as a, i}{#if i > 0}{', '}{/if}{#if a.id}<button class="inline link" onclick={(e) => { e.stopPropagation(); openArtist(a); }}>{a.name}</button>{:else}{a.name}{/if}{/each}
          {:else}
            {artistNames(item)}
          {/if}
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(300px, 30%);
    gap: 4px 20px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 6px;
    scrollbar-width: none;
  }
  .grid::-webkit-scrollbar { display: none; }
  .song {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px;
    border-radius: 8px;
    scroll-snap-align: start;
    min-width: 0;
  }
  .song:hover { background: var(--bg-elev); }
  .song.current .title { color: var(--accent); }
  .thumb { position: relative; flex: none; }
  .overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    opacity: 0;
    border-radius: var(--r-sleeve);
  }
  .song:hover .overlay, .song.current .overlay { opacity: 1; }
  .text { min-width: 0; flex: 1; }
  .title { display: block; max-width: 100%; text-align: left; font-weight: 600; }
  .by { font-size: 12.5px; }
</style>
