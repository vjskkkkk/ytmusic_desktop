<script>
  // World internet radio from the Radio Browser directory, by genre or by name.
  import { untrack } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import Status from '../components/Status.svelte';
  import { ytm } from '../lib/bridge.js';
  import { go } from '../lib/router.svelte.js';
  import { radio, playStation, toggleRadio } from '../lib/radio.svelte.js';

  // #/radio → genre grid; #/radio/jazz → stations; #/radio/search/<query> → search results.
  let { genre = '', query = '' } = $props();

  let genres = $state([]);
  let stations = $state(null);
  let error = $state(null);
  // The page is re-created for every route (App keys it), so the initial value is all we need.
  let searchText = $state(untrack(() => (genre === 'search' ? query : '')));

  const isSearch = $derived(genre === 'search');
  const current = $derived(genres.find((g) => g.tag === genre));
  const heading = $derived(isSearch ? `Stations matching “${query}”` : current?.name || genre);

  ytm.radioApi('genres').then((g) => (genres = g || [])).catch(() => {});

  async function load() {
    if (!genre) return;
    error = null;
    stations = null;
    try {
      stations = isSearch ? await ytm.radioApi('search', query) : await ytm.radioApi('stations', genre);
    } catch (e) {
      error = e;
    }
  }
  load();

  function onSearch(e) {
    e.preventDefault();
    const q = searchText.trim();
    if (q) go('radio', 'search', q);
  }

  function choose(s) {
    if (radio.station?.id === s.id && radio.active) toggleRadio();
    else playStation(s, stations, isSearch ? '' : heading);
  }

  const detail = (s) => [s.country, s.codec && `${s.codec}${s.bitrate ? ` ${s.bitrate}k` : ''}`].filter(Boolean).join(' · ');
  const isCurrent = (s) => radio.active && radio.station?.id === s.id;

  let broken = $state({});
</script>

<div class="page">
  <header class="head">
    <div>
      {#if genre}
        <button class="back link dim" onclick={() => go('radio')}><Icon name="left" size={18} />All genres</button>
      {/if}
      <h1 class="title">{genre ? heading : 'World radio'}</h1>
      {#if !genre}<p class="dim sub">Live stations from around the world, from the community Radio Browser directory.</p>{/if}
    </div>
    <form class="find" onsubmit={onSearch} role="search">
      <Icon name="search" size={18} />
      <input bind:value={searchText} placeholder="Find a station" aria-label="Find a station" spellcheck="false" />
    </form>
  </header>

  {#if !genre}
    {#if genres.length}
      <div class="genres">
        {#each genres as g (g.tag)}
          <button class="genre" style:--h={g.hue} onclick={() => go('radio', g.tag)}>
            <span>{g.name}</span>
            {#if radio.active && radio.genre === g.name}<span class="bars" class:paused={!radio.playing} aria-label="Playing"><i></i><i></i><i></i></span>{/if}
          </button>
        {/each}
      </div>
    {:else}
      <Status label="Loading genres" />
    {/if}
  {:else if stations}
    {#if stations.length}
      <p class="count faint">{stations.length} stations, most listened first</p>
      <div class="list">
        {#each stations as s (s.id)}
          <button class="station" class:current={isCurrent(s)} onclick={() => choose(s)} title={s.name}>
            <span class="logo">
              {#if s.favicon && !broken[s.id]}
                <img src={s.favicon} alt="" loading="lazy" onerror={() => (broken[s.id] = true)} />
              {:else}
                <span class="initial">{s.name.slice(0, 1).toUpperCase()}</span>
              {/if}
              <span class="hover-icon" aria-hidden="true">
                <Icon name={isCurrent(s) && (radio.playing || radio.loading) ? 'pause' : 'play'} size={22} />
              </span>
            </span>
            <span class="text">
              <span class="name ellipsis">{s.name}</span>
              <span class="detail ellipsis dim">{detail(s)}</span>
            </span>
            {#if s.tags.length}<span class="tags ellipsis faint">{s.tags.slice(0, 3).join(', ')}</span>{/if}
            {#if isCurrent(s)}
              {#if radio.error}
                <span class="err">Unavailable</span>
              {:else}
                <span class="bars" class:paused={!radio.playing} aria-label={radio.playing ? 'Playing' : 'Paused'}><i></i><i></i><i></i></span>
              {/if}
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <p class="dim">No playable stations found. Try another genre or search.</p>
    {/if}
  {:else}
    <Status {error} onretry={load} label="Finding stations" />
  {/if}
</div>

<style>
  .page { padding: 16px 40px 40px; }
  .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; }
  .title { font-size: 44px; font-weight: 800; font-stretch: 85%; letter-spacing: -0.02em; }
  .sub { margin: 6px 0 0; max-width: 60ch; }
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  .find {
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(320px, 100%);
    height: 38px;
    padding: 0 14px;
    border-radius: var(--r-pill);
    background: var(--lg-ctl);
    box-shadow: var(--lg-rim);
    color: var(--text-dim);
  }
  .find:focus-within { box-shadow: inset 0 1px 0 var(--lg-light), inset 0 0 0 1px color-mix(in oklab, var(--accent) 55%, transparent); color: var(--text); }
  .find input { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: var(--text); font: inherit; }
  .find input::placeholder { color: var(--text-faint); }

  /* Genre tiles are content, so they stay solid: colour, not glass. */
  .genres { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
  .genre {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 96px;
    padding: 14px 16px;
    border-radius: 16px;
    text-align: left;
    color: #fff;
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 750;
    letter-spacing: -0.01em;
    background:
      radial-gradient(120% 90% at 100% 0%, hsl(calc(var(--h) + 40) 80% 62% / 0.9), transparent 60%),
      linear-gradient(135deg, hsl(var(--h) 62% 34%), hsl(calc(var(--h) + 20) 58% 22%));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
    transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }
  .genre:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 10px 24px hsl(var(--h) 60% 20% / 0.45); }
  .genre:active { transform: scale(0.98); }
  .genre .bars i { background: #fff; }

  .count { font-size: 12.5px; margin: -14px 0 12px; }
  .list { display: flex; flex-direction: column; gap: 2px; }
  .station {
    display: grid;
    grid-template-columns: 48px minmax(0, 1.4fr) minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 8px 12px 8px 8px;
    border-radius: 12px;
    text-align: left;
  }
  .station:hover { background: color-mix(in oklab, var(--text) 7%, transparent); }
  .station.current { background: var(--lg-selected); box-shadow: inset 0 1px 0 var(--lg-light), inset 0 0 0 1px var(--lg-selected-edge); }
  .logo {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 10px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: color-mix(in oklab, var(--text) 10%, transparent);
  }
  .logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
  .initial { font: 750 20px var(--font-display); color: var(--text-dim); }
  .hover-icon {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .station:hover .hover-icon, .station:focus-visible .hover-icon, .station.current .hover-icon { opacity: 1; }
  .text { display: flex; flex-direction: column; min-width: 0; }
  .name { font-weight: 600; }
  .station.current .name { color: var(--accent); }
  .detail { font-size: 12.5px; }
  .tags { font-size: 12.5px; }
  .err { font-size: 12px; font-weight: 600; color: var(--text-dim); }

  .bars { display: inline-flex; gap: 2px; align-items: flex-end; height: 14px; flex: none; }
  .bars i { width: 3px; background: var(--accent); animation: eq 0.9s infinite ease-in-out; }
  .bars i:nth-child(2) { animation-delay: -0.3s; }
  .bars i:nth-child(3) { animation-delay: -0.6s; }
  .bars.paused i { animation-play-state: paused; }
  @keyframes eq { 0%, 100% { height: 3px; } 50% { height: 14px; } }

  @media (max-width: 1100px) {
    .station { grid-template-columns: 48px minmax(0, 1fr) auto; }
    .tags { display: none; }
  }
</style>
