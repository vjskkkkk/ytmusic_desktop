<script>
  import Shelf from '../components/Shelf.svelte';
  import Status from '../components/Status.svelte';
  import Icon from '../components/Icon.svelte';
  import { ytm } from '../lib/bridge.js';
  import { openNav } from '../lib/nav.js';

  let data = $state(null);
  let error = $state(null);
  async function load() {
    error = null;
    try {
      data = await ytm.api('explore');
    } catch (e) {
      error = e;
    }
  }
  load();

  const ICONS = { 'New releases': 'note', Charts: 'queue', 'Moods & genres': 'explore', Podcasts: 'radio' };
</script>

<div class="page">
  <h1 class="title">Explore</h1>
  {#if data}
    <div class="doors">
      {#each data.buttons as b, i (i)}
        <button class="door" onclick={() => openNav(b.nav)}>
          <Icon name={ICONS[b.title] || 'explore'} size={26} />
          <span>{b.title}</span>
        </button>
      {/each}
    </div>
    {#each data.sections as shelf, i (i)}
      <Shelf {shelf} />
    {/each}
  {:else}
    <Status {error} onretry={load} />
  {/if}
</div>

<style>
  .page { padding: 16px 40px 40px; }
  .title { font-size: 44px; font-weight: 800; font-stretch: 85%; letter-spacing: -0.02em; margin-bottom: 22px; }
  .doors { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .door {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px 22px;
    border-radius: var(--r-panel);
    background: var(--bg-elev);
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    text-align: left;
  }
  .door :global(svg) { color: var(--accent); }
  .door:hover { background: var(--bg-elev-2); }
</style>
