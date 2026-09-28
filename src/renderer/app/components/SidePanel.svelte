<script>
  import Art from './Art.svelte';
  import Icon from './Icon.svelte';
  import ItemList from './ItemList.svelte';
  import TrackTable from './TrackTable.svelte';
  import { player, cmd } from '../lib/player.svelte.js';
  import { ytm } from '../lib/bridge.js';

  let { tab = $bindable('queue'), onclose } = $props();

  const videoId = $derived(player.state.videoId);
  const lyrics = $derived(tab === 'lyrics' && videoId ? ytm.api('lyrics', videoId) : null);
  const related = $derived(tab === 'related' && videoId ? ytm.api('related', videoId) : null);

  let listEl = $state();
  // Keep the current song in view as the queue advances.
  $effect(() => {
    const idx = player.queue.findIndex((q) => q.selected);
    if (tab === 'queue' && idx >= 0 && listEl) {
      listEl.children[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  const TABS = [
    { id: 'queue', label: 'Up next' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'related', label: 'Related' },
  ];
</script>

<aside class="panel lg-static">
  <div class="tabs" role="tablist">
    {#each TABS as t (t.id)}
      <button role="tab" aria-selected={tab === t.id} class:lg-selected={tab === t.id} class:active={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
    {/each}
    <button class="close" onclick={onclose} aria-label="Close panel"><Icon name="close" size={18} /></button>
  </div>

  <div class="body">
    {#if tab === 'queue'}
      {#if player.queue.length}
        <div class="queue" bind:this={listEl}>
          {#each player.queue as q (q.index)}
            <button class="q" class:selected={q.selected} onclick={() => cmd('playQueueIndex', q.index)}>
              <Art src={q.art} size={40} alt="" />
              <span class="qt">
                <span class="ellipsis">{q.title}</span>
                <span class="ellipsis dim">{q.artist}</span>
              </span>
              <span class="dur faint">{q.duration}</span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="empty dim">Play a song and the queue shows up here.</p>
      {/if}
    {:else if tab === 'lyrics'}
      {#if !videoId}
        <p class="empty dim">Play a song to see its lyrics.</p>
      {:else}
        {#await lyrics}
          <p class="empty dim">Loading lyrics…</p>
        {:then l}
          {#if l?.text}
            <div class="lyrics">{l.text}</div>
            {#if l.source}<p class="source faint">{l.source}</p>{/if}
          {:else}
            <p class="empty dim">YouTube Music has no lyrics for this song.</p>
          {/if}
        {:catch}
          <p class="empty dim">Lyrics couldn't be loaded. Check your connection.</p>
        {/await}
      {/if}
    {:else if tab === 'related'}
      {#if !videoId}
        <p class="empty dim">Play a song to see related music.</p>
      {:else}
        {#await related}
          <p class="empty dim">Loading…</p>
        {:then r}
          {#each r?.sections || [] as s, i (i)}
            {#if s.items.length}
              <h3>{s.title}</h3>
              {#if s.items.every((x) => x.kind === 'song' || x.kind === 'video')}
                <TrackTable tracks={s.items.slice(0, 10)} showAlbum={false} numbered={false} />
              {:else}
                <ItemList items={s.items.slice(0, 8)} />
              {/if}
            {/if}
          {:else}
            <p class="empty dim">Nothing related to show.</p>
          {/each}
        {:catch}
          <p class="empty dim">Related music couldn't be loaded.</p>
        {/await}
      {/if}
    {/if}
  </div>
</aside>

<style>
  .panel {
    grid-area: panel;
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-shadow: inset 1px 0 0 var(--lg-edge);
  }
  .tabs { display: flex; align-items: center; gap: 4px; padding: 10px 10px 6px; }
  .tabs button[role='tab'] { padding: 6px 12px; border-radius: var(--r-pill); color: var(--text-dim); font-weight: 600; font-size: 13px; }
  .tabs button.active { color: var(--text); }
  .close { margin-left: auto; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: var(--text-dim); }
  .close:hover { background: color-mix(in oklab, var(--text) 10%, transparent); color: var(--text); }
  .body { flex: 1; overflow-y: auto; padding: 6px 8px 16px; }
  .body :global(.row) { grid-template-columns: 30px minmax(0, 1fr) 48px; }
  .queue { display: flex; flex-direction: column; }
  .q { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: 6px; text-align: left; min-width: 0; }
  .q:hover { background: color-mix(in oklab, var(--text) 8%, transparent); }
  .q.selected { background: var(--lg-selected); box-shadow: inset 0 0 0 1px var(--lg-selected-edge); }
  .q.selected .qt span:first-child { color: var(--accent); }
  .qt { display: flex; flex-direction: column; min-width: 0; flex: 1; font-size: 13px; }
  .dur { font-size: 12px; font-variant-numeric: tabular-nums; }
  .lyrics { white-space: pre-line; font-size: 17px; line-height: 1.7; padding: 8px 10px; font-weight: 500; }
  .source { font-size: 12px; padding: 0 10px; }
  .empty { padding: 20px 10px; font-size: 13.5px; }
  h3 { font-size: 15px; padding: 14px 10px 6px; }
</style>
