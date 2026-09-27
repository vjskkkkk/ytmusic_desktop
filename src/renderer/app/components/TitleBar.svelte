<script>
  // Draggable top strip with back/forward and search. Windows draws its own
  // minimise/maximise/close buttons over the right-hand end (titleBarOverlay).
  import Icon from './Icon.svelte';
  import Art from './Art.svelte';
  import { back, forward, go, route } from '../lib/router.svelte.js';
  import { ytm } from '../lib/bridge.js';
  import { openItem } from '../lib/nav.js';

  let query = $state(route.name === 'search' ? route.params[0] || '' : '');
  let open = $state(false);
  let active = $state(-1);
  let suggestions = $state({ queries: [], items: [] });
  let input = $state();
  let timer;

  export function focusSearch() {
    input?.focus();
    input?.select();
  }

  function onInput() {
    clearTimeout(timer);
    active = -1;
    const q = query.trim();
    if (!q) {
      suggestions = { queries: [], items: [] };
      return;
    }
    timer = setTimeout(async () => {
      try {
        const s = await ytm.api('suggest', q);
        if (query.trim() === q) suggestions = s || { queries: [], items: [] };
      } catch {
        // suggestions are optional
      }
    }, 180);
  }

  const flat = $derived([
    ...suggestions.queries.map((q) => ({ type: 'query', q })),
    ...suggestions.items.slice(0, 5).map((item) => ({ type: 'item', item })),
  ]);

  function choose(entry) {
    open = false;
    if (!entry) {
      if (query.trim()) go('search', query.trim());
    } else if (entry.type === 'query') {
      query = entry.q;
      go('search', entry.q);
    } else {
      openItem(entry.item);
    }
    input?.blur();
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(flat.length - 1, active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(-1, active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active >= 0 ? flat[active] : null); }
    else if (e.key === 'Escape') { open = false; input?.blur(); }
  }
</script>

<header class="titlebar">
  <div class="navbtns">
    <button onclick={back} aria-label="Back"><Icon name="left" /></button>
    <button onclick={forward} aria-label="Forward"><Icon name="right" /></button>
  </div>

  <div class="search" class:open={open && flat.length}>
    <Icon name="search" size={18} />
    <input
      bind:this={input}
      bind:value={query}
      oninput={onInput}
      onkeydown={onKey}
      onfocus={() => (open = true)}
      onblur={() => setTimeout(() => (open = false), 150)}
      placeholder="Search songs, albums, artists"
      aria-label="Search"
      spellcheck="false"
    />
    <kbd>Ctrl K</kbd>
    {#if open && flat.length}
      <div class="dropdown" role="listbox">
        {#each flat as entry, i (i)}
          <button class="opt" class:active={i === active} role="option" aria-selected={i === active} onmousedown={() => choose(entry)}>
            {#if entry.type === 'query'}
              <Icon name="search" size={18} /><span class="ellipsis">{entry.q}</span>
            {:else}
              <Art src={entry.item.art} size={32} round={entry.item.kind === 'artist'} alt="" />
              <span class="opt-text">
                <span class="ellipsis">{entry.item.title}</span>
                <span class="ellipsis dim">{entry.item.subtitle}</span>
              </span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</header>

<style>
  .titlebar {
    grid-area: top;
    height: var(--titlebar-h);
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 150px 0 16px; /* leave room for the window buttons */
    -webkit-app-region: drag;
    position: relative;
    z-index: 20;
  }
  .navbtns { display: flex; gap: 4px; -webkit-app-region: no-drag; }
  .navbtns button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-dim);
  }
  .navbtns button:hover { background: var(--bg-elev-2); color: var(--text); }
  .search {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(520px, 100%);
    height: 30px;
    padding: 0 10px;
    border-radius: var(--r-pill);
    background: var(--bg-elev-2);
    color: var(--text-dim);
    -webkit-app-region: no-drag;
  }
  .search:focus-within { background: var(--bg-hover); color: var(--text); }
  .search.open { border-radius: 15px 15px 0 0; }
  input {
    flex: 1;
    min-width: 0;
    background: none;
    border: 0;
    outline: none;
    color: var(--text);
    font: inherit;
    font-size: 13.5px;
  }
  input::placeholder { color: var(--text-faint); }
  kbd { font: 11px var(--font-ui); color: var(--text-faint); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-hover);
    border-radius: 0 0 12px 12px;
    padding: 6px;
    box-shadow: var(--shadow-lift);
    display: flex;
    flex-direction: column;
  }
  .opt { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 6px; text-align: left; color: var(--text); min-width: 0; }
  .opt.active, .opt:hover { background: var(--bg-elev-2); }
  .opt-text { display: flex; flex-direction: column; min-width: 0; font-size: 13px; }
</style>
