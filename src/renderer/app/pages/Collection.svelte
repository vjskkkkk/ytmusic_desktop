<script>
  // Album and playlist pages.
  import Art from '../components/Art.svelte';
  import Icon from '../components/Icon.svelte';
  import TrackTable from '../components/TrackTable.svelte';
  import Shelf from '../components/Shelf.svelte';
  import Status from '../components/Status.svelte';
  import { ytm } from '../lib/bridge.js';
  import { play, cmd, player } from '../lib/player.svelte.js';
  import { openArtist } from '../lib/nav.js';

  let { kind, id } = $props();
  let data = $state(null);
  let error = $state(null);
  let loadingMore = $state(false);

  async function load() {
    data = null;
    error = null;
    try {
      data = await ytm.api(kind, id);
    } catch (e) {
      error = e;
    }
  }
  $effect(() => {
    kind;
    id;
    load();
  });

  async function more() {
    loadingMore = true;
    try {
      const r = await ytm.api('playlistMore', id);
      const start = data.tracks.length;
      data.tracks.push(...r.tracks.map((t, i) => ({ ...t, index: start + i + 1 })));
      data.hasMore = r.hasMore;
    } catch {
      data.hasMore = false;
    }
    loadingMore = false;
  }

  function shuffle() {
    const playable = data.tracks.filter((t) => t.play);
    if (!playable.length) return;
    play(playable[Math.floor(Math.random() * playable.length)].play);
    if (!player.state.shuffle) setTimeout(() => cmd('shuffle'), 1500);
  }
</script>

<div class="page">
  {#if data}
    <header class="head">
      <Art src={data.art} size={232} lazy={false} alt="" />
      <div class="info">
        {#if data.subtitle}<p class="type dim">{data.subtitle}</p>{/if}
        <h1>{data.title}</h1>
        {#if data.artists?.length}
          <p class="who">
            {#each data.artists as a, i}{#if i > 0}{', '}{/if}<button class="link" onclick={() => openArtist(a)}>{a.name}</button>{/each}
          </p>
        {:else if data.artistsText}
          <p class="who">{data.artistsText}</p>
        {/if}
        {#if data.meta}<p class="meta dim">{data.meta}</p>{/if}
        <div class="actions">
          <button class="primary lg-primary" onclick={() => play(data.play)} disabled={!data.play}><Icon name="play" size={22} />Play</button>
          <button class="ghost lg-ctl" onclick={shuffle} disabled={!data.tracks.length}><Icon name="shuffle" size={20} />Shuffle</button>
        </div>
      </div>
    </header>

    {#if data.description}<p class="desc dim">{data.description}</p>{/if}

    <TrackTable tracks={data.tracks} showArt={kind !== 'album'} showAlbum={kind !== 'album'} />

    {#if data.hasMore}
      <button class="more lg-ctl" onclick={more} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Show more songs'}</button>
    {/if}

    {#each data.sections || [] as shelf, i (i)}
      <div class="after"><Shelf {shelf} /></div>
    {/each}
  {:else}
    <Status {error} onretry={load} />
  {/if}
</div>

<style>
  .page { padding: 16px 40px 40px; }
  .head { display: flex; align-items: flex-end; gap: 28px; margin-bottom: 26px; }
  .head :global(.art) { box-shadow: var(--shadow-lift); }
  .info { min-width: 0; }
  .type { font-size: 13px; font-weight: 600; margin: 0 0 6px; }
  h1 {
    font-size: clamp(32px, 4vw, 56px);
    line-height: 1;
    font-weight: 800;
    font-stretch: 82%;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .who { margin: 12px 0 0; font-weight: 600; }
  .who .link { font-weight: 600; }
  .meta { margin: 4px 0 0; font-size: 13px; }
  .actions { display: flex; gap: 10px; margin-top: 18px; }
  .primary, .ghost, .more {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 18px 0 14px;
    border-radius: var(--r-pill);
    font-weight: 650;
  }
  .primary:disabled, .ghost:disabled { opacity: 0.4; cursor: default; }
  .desc { max-width: 72ch; margin: 0 0 24px; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .more { margin: 18px 0 0 10px; padding: 0 18px; }
  .after { margin-top: 44px; }
</style>
