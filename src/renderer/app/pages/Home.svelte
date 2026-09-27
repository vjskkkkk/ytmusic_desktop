<script>
  import Record from '../components/Record.svelte';
  import Shelf from '../components/Shelf.svelte';
  import Status from '../components/Status.svelte';
  import Icon from '../components/Icon.svelte';
  import { player, cmd } from '../lib/player.svelte.js';
  import { ytm } from '../lib/bridge.js';
  import { greeting } from '../lib/format.js';

  let { onNowPlaying } = $props();
  const s = $derived(player.state);

  let data = $state(null);
  let error = $state(null);
  let more = $state(false);
  let chip = $state(null);
  let loadingMore = false;

  async function load() {
    error = null;
    data = null;
    try {
      data = await ytm.api('home');
      more = data.more;
    } catch (e) {
      error = e;
    }
  }
  load();

  async function filter(c) {
    chip = chip === c ? null : c;
    data = null;
    try {
      data = chip ? await ytm.api('homeFilter', chip) : await ytm.api('home');
      more = data.more;
    } catch (e) {
      error = e;
    }
  }

  async function loadMore() {
    if (!more || loadingMore || !data) return;
    loadingMore = true;
    try {
      const r = await ytm.api('homeMore');
      data.sections.push(...r.sections);
      more = r.more;
    } catch {
      more = false;
    }
    loadingMore = false;
  }

  // Load more shelves when the bottom of the page comes into view.
  function sentinel(node) {
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: '600px' });
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }
</script>

<div class="page">
  <section class="hero" class:playing={s.hasTrack}>
    {#if s.hasTrack}
      <div class="wash" style:background-image={s.art ? `url("${s.art}")` : null}></div>
      <div class="hero-text">
        <p class="state dim">{s.playing ? 'Now playing' : 'Paused'}</p>
        <h1 class="big">{s.title}</h1>
        <p class="by">{s.artist}</p>
        <div class="actions">
          <button class="primary" onclick={() => cmd('playPause')}>
            <Icon name={s.playing ? 'pause' : 'play'} size={22} />{s.playing ? 'Pause' : 'Resume'}
          </button>
          <button class="ghost" onclick={onNowPlaying}>Lyrics and full view</button>
        </div>
      </div>
      <button class="record-btn" onclick={onNowPlaying} aria-label="Open now playing">
        <Record art={s.art} playing={s.playing} size={210} />
      </button>
    {:else}
      <div class="hero-text">
        <h1 class="big">{greeting()}</h1>
        <p class="by dim">Pick up where you left off, or find something new below.</p>
      </div>
    {/if}
  </section>

  {#if data?.chips?.length}
    <div class="chips" role="toolbar" aria-label="Filter home">
      {#each data.chips as c (c)}
        <button class="chip" class:active={chip === c} aria-pressed={chip === c} onclick={() => filter(c)}>{c}</button>
      {/each}
    </div>
  {/if}

  {#if data}
    {#each data.sections as shelf, i (i)}
      <Shelf {shelf} />
    {:else}
      <p class="dim">Nothing here yet. Play a few songs and YouTube Music will fill this in.</p>
    {/each}
    {#if more}<div use:sentinel class="more"><Status label="Loading more" /></div>{/if}
  {:else}
    <Status {error} onretry={load} />
  {/if}
</div>

<style>
  .page { padding: 8px 40px 40px; }
  .hero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
    min-height: 200px;
    margin: 0 -40px 28px;
    padding: 28px 40px 36px;
    overflow: hidden;
  }
  .wash {
    position: absolute;
    inset: -40% -10%;
    background: center / cover;
    filter: blur(70px) saturate(1.4);
    opacity: 0.28;
    pointer-events: none;
  }
  .hero::after {
    content: '';
    position: absolute;
    inset: auto 0 0 0;
    height: 60%;
    background: linear-gradient(transparent, var(--bg));
    pointer-events: none;
  }
  .hero-text { position: relative; z-index: 1; min-width: 0; max-width: 62ch; }
  .state { font-size: 13px; font-weight: 600; margin: 0 0 6px; }
  .big {
    font-size: clamp(40px, 5vw, 70px);
    line-height: 1.04;
    font-weight: 800;
    font-stretch: 80%;
    letter-spacing: -0.025em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding-bottom: 0.12em;
  }
  .by { font-size: 18px; margin: 10px 0 0; }
  .actions { display: flex; gap: 10px; margin-top: 22px; }
  .primary, .ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 18px;
    border-radius: var(--r-pill);
    font-weight: 650;
  }
  .primary { background: var(--accent); color: var(--accent-ink); padding-left: 12px; }
  .primary:hover { filter: brightness(1.08); }
  .ghost { background: var(--bg-elev-2); }
  .ghost:hover { background: var(--bg-hover); }
  .record-btn { position: relative; z-index: 1; border-radius: var(--r-sleeve); }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 30px; }
  .chip { padding: 7px 14px; border-radius: var(--r-pill); background: var(--bg-elev-2); font-size: 13px; font-weight: 550; }
  .chip:hover { background: var(--bg-hover); }
  .chip.active { background: var(--text); color: var(--bg); }
  .more { min-height: 40px; }
  @media (max-width: 1150px) { .record-btn { display: none; } }
</style>
