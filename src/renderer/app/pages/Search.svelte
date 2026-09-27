<script>
  import Shelf from '../components/Shelf.svelte';
  import Status from '../components/Status.svelte';
  import { ytm } from '../lib/bridge.js';
  import { go } from '../lib/router.svelte.js';

  let { query = '', filter = '' } = $props();
  const FILTERS = [
    { id: '', label: 'All' },
    { id: 'song', label: 'Songs' },
    { id: 'video', label: 'Videos' },
    { id: 'album', label: 'Albums' },
    { id: 'artist', label: 'Artists' },
    { id: 'playlist', label: 'Playlists' },
  ];
  let reload = $state(0);
  const page = $derived(query ? (reload, ytm.api('search', query, filter || undefined)) : null);
</script>

<div class="page">
  <h1 class="title">{query ? `Results for “${query}”` : 'Search'}</h1>
  {#if query}
    <div class="filters" role="toolbar" aria-label="Filter results">
      {#each FILTERS as f (f.id)}
        <button class:active={filter === f.id} aria-pressed={filter === f.id} onclick={() => go('search', query, f.id)}>{f.label}</button>
      {/each}
    </div>
    {#await page}
      <Status label="Searching" />
    {:then data}
      {#if data.didYouMean}
        <p class="dym dim">Did you mean <button class="link" onclick={() => go('search', data.didYouMean, filter)}>{data.didYouMean}</button>?</p>
      {/if}
      {#each data.sections as shelf, i (`${query}-${filter}-${i}`)}
        <Shelf {shelf} />
      {:else}
        <p class="dim">No results. Try a different spelling or fewer words.</p>
      {/each}
    {:catch error}
      <Status {error} onretry={() => reload++} />
    {/await}
  {:else}
    <p class="dim">Type in the search box at the top, or press Ctrl K.</p>
  {/if}
</div>

<style>
  .page { padding: 16px 40px 40px; }
  .title { font-size: 36px; font-weight: 800; font-stretch: 85%; letter-spacing: -0.02em; margin-bottom: 18px; overflow-wrap: anywhere; }
  .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 28px; }
  .filters button { padding: 7px 14px; border-radius: var(--r-pill); background: var(--bg-elev-2); font-weight: 600; font-size: 13px; }
  .filters button:hover { background: var(--bg-hover); }
  .filters button.active { background: var(--text); color: var(--bg); }
  .dym { margin: -10px 0 24px; }
  .dym .link { color: var(--accent); font-weight: 600; }
</style>
