<script>
  import Shelf from '../components/Shelf.svelte';
  import Status from '../components/Status.svelte';
  import { ytm } from '../lib/bridge.js';
  import { go } from '../lib/router.svelte.js';

  let { tab = 'playlists', signedIn } = $props();
  const TABS = [
    { id: 'playlists', label: 'Playlists' },
    { id: 'songs', label: 'Songs' },
    { id: 'albums', label: 'Albums' },
    { id: 'artists', label: 'Artists' },
  ];
  let reload = $state(0);
  const page = $derived(signedIn ? (reload, ytm.api('library', tab)) : null);
</script>

<div class="page">
  <h1 class="title">Library</h1>
  <div class="tabs" role="tablist">
    {#each TABS as t (t.id)}
      <button role="tab" aria-selected={tab === t.id} class="lg-ctl" class:lg-selected={tab === t.id} class:active={tab === t.id} onclick={() => go('library', t.id)}>{t.label}</button>
    {/each}
  </div>

  {#if !signedIn}
    <div class="signin">
      <p>Sign in to see your playlists, liked songs, albums and artists.</p>
      <button onclick={() => ytm.signIn()}>Sign in with Google</button>
    </div>
  {:else}
    {#await page}
      <Status />
    {:then data}
      {#each data.sections as shelf, i (`${tab}-${i}`)}
        <Shelf {shelf} />
      {:else}
        <p class="dim">Nothing saved here yet.</p>
      {/each}
    {:catch error}
      <Status {error} onretry={() => reload++} />
    {/await}
  {/if}
</div>

<style>
  .page { padding: 16px 40px 40px; }
  .title { font-size: 44px; font-weight: 800; font-stretch: 85%; letter-spacing: -0.02em; margin-bottom: 18px; }
  .tabs { display: flex; gap: 6px; margin-bottom: 28px; }
  .tabs button { padding: 7px 16px; border-radius: var(--r-pill); font-weight: 600; font-size: 13.5px; }
  .signin { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; padding: 24px 0; color: var(--text-dim); }
  .signin button { padding: 10px 20px; border-radius: var(--r-pill); background: var(--accent); color: var(--accent-ink); font-weight: 650; }
</style>
