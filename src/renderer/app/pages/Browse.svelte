<script>
  // Any other YouTube Music page: moods, charts, new releases, "more" links.
  import Shelf from '../components/Shelf.svelte';
  import Status from '../components/Status.svelte';
  import { ytm } from '../lib/bridge.js';

  let { id, params = undefined } = $props();
  let reload = $state(0);
  const page = $derived((reload, ytm.api('browse', id, params)));
</script>

<div class="page">
  {#await page}
    <Status />
  {:then data}
    {#if data.title}<h1 class="title">{data.title}</h1>{/if}
    {#each data.sections as shelf, i (i)}
      <Shelf {shelf} />
    {:else}
      <p class="dim">This page is empty.</p>
    {/each}
  {:catch error}
    <Status {error} onretry={() => reload++} />
  {/await}
</div>

<style>
  .page { padding: 16px 40px 40px; }
  .title { font-size: 44px; font-weight: 800; font-stretch: 85%; letter-spacing: -0.02em; margin-bottom: 28px; }
</style>
