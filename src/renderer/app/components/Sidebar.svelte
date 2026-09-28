<script>
  import Icon from './Icon.svelte';
  import Art from './Art.svelte';
  import { route, go } from '../lib/router.svelte.js';
  import { ytm } from '../lib/bridge.js';
  import { openItem } from '../lib/nav.js';
  import { player } from '../lib/player.svelte.js';

  let { signedIn } = $props();
  let playlists = $state([]);

  $effect(() => {
    if (!signedIn) {
      playlists = [];
      return;
    }
    ytm.api('library', 'playlists')
      .then((lib) => {
        playlists = (lib?.sections || []).flatMap((s) => s.items).filter((i) => i.kind === 'playlist' && i.nav);
      })
      .catch(() => { playlists = []; });
  });

  const NAV = [
    { name: 'home', label: 'Home', icon: 'home' },
    { name: 'explore', label: 'Explore', icon: 'explore' },
    { name: 'radio', label: 'Radio', icon: 'radio' },
    { name: 'library', label: 'Library', icon: 'library' },
  ];

  const isOpen = (p) => route.name === 'playlist' && route.params[0] === p.nav.browseId;
  // Playlist browse ids are "VL" + the playlist id the player reports.
  const isPlaying = (p) => !!player.state.playlistId && p.nav.browseId === `VL${player.state.playlistId}`;

  // "Playlist • Vikram Khanna • 248 tracks" → "248 tracks"; otherwise whatever is left.
  function detail(subtitle = '') {
    const parts = subtitle.split(' • ').filter((x) => x && x !== 'Playlist');
    return parts.find((x) => /\b(tracks?|songs?|episodes?)\b/i.test(x)) || parts.join(' • ');
  }
</script>

<aside class="sidebar lg-static">
  <div class="brand">
    <span class="mark" aria-hidden="true"></span>
    <span class="word">YT Mini</span>
  </div>

  <nav>
    {#each NAV as n (n.name)}
      <button class="nav" class:active={route.name === n.name} class:lg-selected={route.name === n.name} aria-current={route.name === n.name ? 'page' : undefined} onclick={() => go(n.name)}>
        <Icon name={n.icon} />{n.label}
      </button>
    {/each}
  </nav>

  <div class="lists">
    {#if playlists.length}
      <div class="lists-head">
        <h3>Your playlists</h3>
        <span class="count">{playlists.length}</span>
      </div>
      <div class="scroll">
        {#each playlists as p (p.nav.browseId)}
          <button class="pl" class:open={isOpen(p)} onclick={() => openItem(p)} title={p.title} aria-current={isOpen(p) ? 'page' : undefined}>
            <Art src={p.art} size={36} alt="" />
            <span class="pl-text">
              <span class="pl-name ellipsis">{p.title}</span>
              {#if detail(p.subtitle)}<span class="pl-sub ellipsis">{detail(p.subtitle)}</span>{/if}
            </span>
            {#if isPlaying(p)}
              <span class="bars" class:paused={!player.state.playing} aria-label="Playing from this playlist"><i></i><i></i><i></i></span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <button class="nav settings" class:active={route.name === 'settings'} class:lg-selected={route.name === 'settings'} aria-current={route.name === 'settings' ? 'page' : undefined} onclick={() => go('settings')}>
    <Icon name="settings" />Themes and settings
  </button>
</aside>

<style>
  .sidebar {
    grid-area: side;
    display: flex;
    flex-direction: column;
    /* sits on the page, not over scrolling content: static glass, no backdrop sampling */
    border-radius: 0;
    box-shadow: inset -1px 0 0 var(--lg-edge);
    min-height: 0;
    padding: 0 10px 12px;
  }
  .brand {
    height: var(--titlebar-h);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 8px;
    margin-bottom: 10px;
    -webkit-app-region: drag;
  }
  .mark {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background:
      radial-gradient(circle, var(--accent) 0 3px, transparent 3.5px),
      repeating-radial-gradient(circle, var(--text) 0 1px, transparent 1px 3px);
    opacity: 0.9;
  }
  .word { font-family: var(--font-display); font-weight: 750; font-size: 16px; font-stretch: 90%; letter-spacing: -0.01em; }
  nav { display: flex; flex-direction: column; gap: 2px; }
  .nav {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 9px 10px;
    border-radius: var(--lg-r-control);
    color: var(--text-dim);
    font-weight: 550;
    text-align: left;
  }
  .nav:not(.active):hover { color: var(--text); background: color-mix(in oklab, var(--text) 8%, transparent); }
  .nav.active { color: var(--text); }
  .nav.active :global(svg) { color: var(--accent); }

  .lists {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }
  .lists-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 10px 8px; }
  h3 { font-family: var(--font-ui); font-size: 12.5px; font-weight: 600; color: var(--text-dim); }
  .count { font-size: 11.5px; color: var(--text-faint); font-variant-numeric: tabular-nums; }
  .scroll {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin: 0 -4px;
    padding: 0 4px 18px;
    /* fade the last rows so it's clear the list scrolls */
    mask-image: linear-gradient(#000 calc(100% - 28px), transparent);
  }
  /* slim scrollbar that only appears while the pointer is over the list */
  .scroll::-webkit-scrollbar { width: 8px; }
  .scroll::-webkit-scrollbar-thumb { background: transparent; }
  .scroll:hover::-webkit-scrollbar-thumb { background: var(--bg-hover); background-clip: padding-box; }
  .pl {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px 5px 6px;
    border-radius: 10px;
    text-align: left;
    min-width: 0;
  }
  .pl:not(.open):hover { background: color-mix(in oklab, var(--text) 8%, transparent); }
  .pl.open { background: var(--lg-selected); box-shadow: inset 0 1px 0 var(--lg-light), inset 0 0 0 1px var(--lg-selected-edge); }
  .pl :global(.art) { border-radius: var(--r-sleeve); }
  .pl-text { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 1.25; }
  .pl-name { font-size: 13.5px; font-weight: 550; color: var(--text); }
  .pl.open .pl-name { color: var(--accent); }
  .pl-sub { font-size: 11.5px; color: var(--text-faint); }

  .bars { display: inline-flex; gap: 2px; align-items: flex-end; height: 12px; flex: none; }
  .bars i { width: 2.5px; background: var(--accent); animation: eq 0.9s infinite ease-in-out; }
  .bars i:nth-child(2) { animation-delay: -0.3s; }
  .bars i:nth-child(3) { animation-delay: -0.6s; }
  .bars.paused i { animation-play-state: paused; }
  @keyframes eq { 0%, 100% { height: 3px; } 50% { height: 12px; } }

  .settings { margin-top: 6px; }
</style>
