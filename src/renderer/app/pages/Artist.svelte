<script>
  import Icon from '../components/Icon.svelte';
  import Shelf from '../components/Shelf.svelte';
  import Status from '../components/Status.svelte';
  import { ytm } from '../lib/bridge.js';
  import { play } from '../lib/player.svelte.js';

  let { id } = $props();
  let reload = $state(0);
  const page = $derived((reload, ytm.api('artist', id)));
  let expanded = $state(false);
</script>

{#await page}
  <div class="pad"><Status /></div>
{:then a}
  <header class="banner" class:plain={!a.banner}>
    {#if a.banner}<img src={a.banner} alt="" />{/if}
    <div class="shade"></div>
    <div class="info">
      <h1>{a.name}</h1>
      {#if a.subscribers}<p class="subs">{a.subscribers}</p>{/if}
      <div class="actions">
        {#if a.shuffle}<button class="primary" onclick={() => play(a.shuffle)}><Icon name="shuffle" size={20} />Shuffle</button>{/if}
        {#if a.radio}<button class="ghost" onclick={() => play(a.radio)}><Icon name="radio" size={20} />Radio</button>{/if}
      </div>
    </div>
  </header>

  <div class="pad">
    {#if a.description}
      <p class="bio dim" class:expanded>{a.description}</p>
      <button class="toggle" onclick={() => (expanded = !expanded)}>{expanded ? 'Show less' : 'Read more'}</button>
    {/if}
    {#each a.sections as shelf, i (i)}
      <Shelf {shelf} />
    {/each}
  </div>
{:catch error}
  <div class="pad"><Status {error} onretry={() => reload++} /></div>
{/await}

<style>
  .pad { padding: 16px 40px 40px; }
  .banner {
    position: relative;
    height: clamp(260px, 38vh, 420px);
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }
  .banner.plain { height: 220px; }
  .banner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 25%; }
  .shade { position: absolute; inset: 0; background: linear-gradient(transparent 30%, var(--bg)); }
  .info { position: relative; padding: 0 40px 10px; }
  h1 {
    font-size: clamp(48px, 7vw, 104px);
    line-height: 0.9;
    font-weight: 800;
    font-stretch: 75%;
    letter-spacing: -0.03em;
  }
  .subs { color: var(--text-dim); margin: 8px 0 0; }
  .actions { display: flex; gap: 10px; margin-top: 16px; }
  .primary, .ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 18px 0 14px;
    border-radius: var(--r-pill);
    font-weight: 650;
  }
  .primary { background: var(--accent); color: var(--accent-ink); }
  .ghost { background: var(--glass); }
  .bio { max-width: 72ch; margin: 8px 0 4px; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .bio.expanded { display: block; }
  .toggle { color: var(--text); font-weight: 600; font-size: 13px; margin-bottom: 36px; }
</style>
