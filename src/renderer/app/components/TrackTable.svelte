<script>
  // Dense, sortable track list for albums, playlists, library and search results.
  // Double-click (or Enter) plays a track in the context of its list.
  import Art from './Art.svelte';
  import Icon from './Icon.svelte';
  import { play, player } from '../lib/player.svelte.js';
  import { openArtist, openAlbum } from '../lib/nav.js';
  import { time, artistNames } from '../lib/format.js';

  let { tracks, showArt = true, showAlbum = true, numbered = true } = $props();

  let sortKey = $state(null);
  let sortDir = $state(1);

  const sorted = $derived.by(() => {
    if (!sortKey) return tracks;
    const val = {
      title: (t) => t.title.toLowerCase(),
      artist: (t) => artistNames(t).toLowerCase(),
      album: (t) => (t.album?.name || '').toLowerCase(),
      duration: (t) => t.duration || 0,
    }[sortKey];
    return [...tracks].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sortDir);
  });

  function sortBy(key) {
    if (sortKey === key) {
      if (sortDir === 1) sortDir = -1;
      else { sortKey = null; sortDir = 1; }
    } else {
      sortKey = key;
      sortDir = 1;
    }
  }
  const arrow = (key) => (sortKey === key ? (sortDir === 1 ? ' ↑' : ' ↓') : '');
</script>

<div class="table" role="table" class:no-album={!showAlbum}>
  <div class="row head" role="row">
    <span class="num" role="columnheader">{numbered ? '#' : ''}</span>
    <button class="col" role="columnheader" onclick={() => sortBy('title')}>Title{arrow('title')}</button>
    {#if showAlbum}<button class="col" role="columnheader" onclick={() => sortBy('album')}>Album{arrow('album')}</button>{/if}
    <button class="col time" role="columnheader" onclick={() => sortBy('duration')}>Time{arrow('duration')}</button>
  </div>
  {#each sorted as t, i (`${t.videoId}-${t.index ?? i}`)}
    {@const current = t.videoId && t.videoId === player.state.videoId}
    <div
      class="row"
      class:current
      role="row"
      tabindex="0"
      ondblclick={() => play(t.play)}
      onkeydown={(e) => e.key === 'Enter' && play(t.play)}
    >
      <span class="num">
        <span class="n">{#if current && player.state.playing}<span class="bars" aria-label="Playing"><i></i><i></i><i></i></span>{:else}{t.index ?? i + 1}{/if}</span>
        <button class="p" onclick={() => play(t.play)} aria-label={`Play ${t.title}`}><Icon name="play" size={18} /></button>
      </span>
      <span class="title-cell">
        {#if showArt}<Art src={t.art} size={40} alt="" />{/if}
        <span class="text">
          <span class="title ellipsis">{t.title}</span>
          <span class="by ellipsis dim">
            {#if t.artists?.length}
              {#each t.artists as a, j}{#if j > 0}{', '}{/if}{#if a.id}<button class="inline link" onclick={(e) => { e.stopPropagation(); openArtist(a); }}>{a.name}</button>{:else}{a.name}{/if}{/each}
            {:else}{t.subtitle}{/if}
          </span>
        </span>
      </span>
      {#if showAlbum}
        <span class="album ellipsis dim">
          {#if t.album}{#if t.album.id}<button class="inline link" onclick={(e) => { e.stopPropagation(); openAlbum(t.album); }}>{t.album.name}</button>{:else}{t.album.name}{/if}{/if}
        </span>
      {/if}
      <span class="time dim">{t.duration ? time(t.duration) : ''}</span>
    </div>
  {/each}
</div>

<style>
  .table { display: flex; flex-direction: column; }
  .row {
    display: grid;
    grid-template-columns: 44px minmax(0, 2.2fr) minmax(0, 1.4fr) 64px;
    align-items: center;
    gap: 14px;
    padding: 6px 10px;
    border-radius: 6px;
    min-height: 52px;
  }
  .no-album .row { grid-template-columns: 44px minmax(0, 1fr) 64px; }
  .row.head {
    min-height: 34px;
    color: var(--text-faint);
    font-size: 12.5px;
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    margin-bottom: 6px;
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 1;
  }
  .col { text-align: left; color: inherit; }
  .col:hover { color: var(--text); }
  .row:not(.head):hover { background: var(--bg-elev); }
  .row:not(.head):focus-visible { outline-offset: -2px; }
  .row.current .title { color: var(--accent); }
  .num { text-align: center; color: var(--text-dim); font-variant-numeric: tabular-nums; position: relative; }
  .num .p { display: none; margin: 0 auto; color: var(--text); }
  .row:not(.head):hover .num .n { display: none; }
  .row:not(.head):hover .num .p { display: block; }
  .title-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .text { display: flex; flex-direction: column; min-width: 0; }
  .title { font-weight: 550; }
  .by { font-size: 12.5px; }
  .time { text-align: right; font-variant-numeric: tabular-nums; font-size: 13px; }
  .bars { display: inline-flex; gap: 2px; align-items: flex-end; height: 14px; }
  .bars i { width: 3px; background: var(--accent); animation: eq 0.9s infinite ease-in-out; }
  .bars i:nth-child(2) { animation-delay: -0.3s; }
  .bars i:nth-child(3) { animation-delay: -0.6s; }
  @keyframes eq { 0%, 100% { height: 4px; } 50% { height: 14px; } }
</style>
