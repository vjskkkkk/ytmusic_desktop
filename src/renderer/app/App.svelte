<script>
  import Sidebar from './components/Sidebar.svelte';
  import TitleBar from './components/TitleBar.svelte';
  import Deck from './components/Deck.svelte';
  import SidePanel from './components/SidePanel.svelte';
  import NowPlaying from './components/NowPlaying.svelte';
  import Home from './pages/Home.svelte';
  import Explore from './pages/Explore.svelte';
  import Browse from './pages/Browse.svelte';
  import Library from './pages/Library.svelte';
  import Search from './pages/Search.svelte';
  import Collection from './pages/Collection.svelte';
  import Artist from './pages/Artist.svelte';
  import Settings from './pages/Settings.svelte';
  import { route } from './lib/router.svelte.js';
  import { cmd } from './lib/player.svelte.js';
  import { ytm } from './lib/bridge.js';
  import { initTheme } from './lib/theme.svelte.js';

  let signedIn = $state(true);
  let panelOpen = $state(false);
  let panelTab = $state('queue');
  let nowPlaying = $state(false);
  let titleBar = $state();
  let main = $state();

  initTheme();
  ytm.isSignedIn().then((v) => (signedIn = v));
  ytm.onAuth((v) => {
    signedIn = v;
    if (v) location.reload(); // fresh data for the new account
  });

  // New page: back to the top.
  $effect(() => {
    route.key;
    main?.scrollTo({ top: 0 });
    nowPlaying = false;
  });

  function onKey(e) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      titleBar?.focusSearch();
    } else if (typing) {
      return;
    } else if (e.code === 'Space') {
      e.preventDefault();
      cmd('playPause');
    } else if (e.ctrlKey && e.key === 'ArrowRight') {
      cmd('next');
    } else if (e.ctrlKey && e.key === 'ArrowLeft') {
      cmd('prev');
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      cmd('like');
    } else if (e.key === 'Escape' && nowPlaying) {
      nowPlaying = false;
    } else if (e.altKey && e.key === 'ArrowLeft') {
      history.back();
    } else if (e.altKey && e.key === 'ArrowRight') {
      history.forward();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="shell" class:panel={panelOpen}>
  <Sidebar {signedIn} />
  <TitleBar bind:this={titleBar} />

  <main bind:this={main}>
    {#if !signedIn}
      <div class="signin-note">
        <span>You're not signed in, so your library and personal mixes aren't shown.</span>
        <button onclick={() => ytm.signIn()}>Sign in with Google</button>
      </div>
    {/if}
    {#key route.key}
      {#if route.name === 'home'}
        <Home onNowPlaying={() => (nowPlaying = true)} />
      {:else if route.name === 'explore'}
        <Explore />
      {:else if route.name === 'library'}
        <Library tab={route.params[0] || 'playlists'} {signedIn} />
      {:else if route.name === 'search'}
        <Search query={route.params[0] || ''} filter={route.params[1] || ''} />
      {:else if route.name === 'album'}
        <Collection kind="album" id={route.params[0]} />
      {:else if route.name === 'playlist'}
        <Collection kind="playlist" id={route.params[0]} />
      {:else if route.name === 'artist'}
        <Artist id={route.params[0]} />
      {:else if route.name === 'browse'}
        <Browse id={route.params[0]} params={route.params[1]} />
      {:else if route.name === 'settings'}
        <Settings {signedIn} />
      {/if}
    {/key}
  </main>

  {#if panelOpen}
    <SidePanel bind:tab={panelTab} onclose={() => (panelOpen = false)} />
  {/if}

  <Deck bind:panelOpen onNowPlaying={() => (nowPlaying = true)} />

  {#if nowPlaying}
    <NowPlaying onclose={() => (nowPlaying = false)} />
  {/if}
</div>

<style>
  .shell {
    position: relative;
    height: 100%;
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr) 0;
    grid-template-rows: var(--titlebar-h) minmax(0, 1fr) var(--deck-h);
    grid-template-areas:
      'side top top'
      'side main panel'
      'deck deck deck';
  }
  .shell.panel { grid-template-columns: var(--sidebar-w) minmax(0, 1fr) var(--panel-w); }
  main { grid-area: main; overflow-y: auto; overflow-x: hidden; min-width: 0; scroll-behavior: smooth; }
  .signin-note {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 8px 40px 0;
    padding: 10px 14px;
    border-radius: var(--r-panel);
    background: var(--bg-elev);
    color: var(--text-dim);
    font-size: 13.5px;
  }
  .signin-note button { margin-left: auto; padding: 6px 14px; border-radius: var(--r-pill); background: var(--accent); color: var(--accent-ink); font-weight: 650; }
</style>
