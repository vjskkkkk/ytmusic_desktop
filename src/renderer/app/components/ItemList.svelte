<script>
  // Compact rows for albums, artists and playlists (search results, library).
  import Art from './Art.svelte';
  import { openItem } from '../lib/nav.js';

  let { items } = $props();
</script>

<div class="list">
  {#each items as item, i (`${item.nav?.browseId || item.videoId || item.title}-${i}`)}
    <button class="row" onclick={() => openItem(item)}>
      <Art src={item.art} size={52} round={item.kind === 'artist'} alt="" />
      <span class="text">
        <span class="title ellipsis">{item.title}</span>
        <span class="sub ellipsis dim">{item.subtitle}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  .list { display: flex; flex-direction: column; }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 6px 10px;
    border-radius: 6px;
    text-align: left;
  }
  .row:hover { background: var(--bg-elev); }
  .text { display: flex; flex-direction: column; min-width: 0; }
  .title { font-weight: 600; }
  .sub { font-size: 12.5px; }
</style>
