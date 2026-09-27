<script>
  // Renders one shelf in the layout that suits its content.
  import Scroller from './Scroller.svelte';
  import Card from './Card.svelte';
  import SongGrid from './SongGrid.svelte';
  import TrackTable from './TrackTable.svelte';
  import ItemList from './ItemList.svelte';
  import Moods from './Moods.svelte';
  import Art from './Art.svelte';
  import Icon from './Icon.svelte';
  import { openNav } from '../lib/nav.js';
  import { play } from '../lib/player.svelte.js';

  let { shelf, cardWidth = 176 } = $props();
  // YouTube sends some straplines in capitals; show them in title case.
  const strap = $derived(shelf.strapline && !/[a-z]/.test(shelf.strapline) ? shelf.strapline.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : shelf.strapline);
  const allSongs = $derived(shelf.items.length > 0 && shelf.items.every((i) => i.kind === 'song' || i.kind === 'video'));
</script>

{#snippet heading()}
  <div class="heading">
    {#if strap}<div class="strap dim">{strap}</div>{/if}
    <h2>
      {#if shelf.more}
        <button class="more-link" onclick={() => openNav(shelf.more)}>{shelf.title}<Icon name="right" size={20} /></button>
      {:else}{shelf.title}{/if}
    </h2>
  </div>
{/snippet}

<section class="shelf">
  {#if shelf.style === 'cards'}
    <Scroller header={shelf.title ? heading : null}>
      {#each shelf.items as item, i (`${item.nav?.browseId || item.videoId || item.title}-${i}`)}
        <Card {item} width={cardWidth} />
      {/each}
    </Scroller>
  {:else if shelf.style === 'songs'}
    {#if shelf.title}{@render heading()}{/if}
    <SongGrid items={shelf.items} rows={shelf.rows || 4} />
  {:else if shelf.style === 'chips'}
    {#if shelf.title}{@render heading()}{/if}
    <Moods items={shelf.items} />
  {:else if shelf.style === 'grid'}
    {#if shelf.title}{@render heading()}{/if}
    <div class="wrap" style:--card={`${cardWidth}px`}>
      {#each shelf.items as item, i (`${item.nav?.browseId || item.videoId || item.title}-${i}`)}
        <Card {item} width={cardWidth} />
      {/each}
    </div>
  {:else if shelf.style === 'top'}
    {@render heading()}
    <div class="top">
      <button class="top-card" onclick={() => openNav(shelf.top.nav)}>
        <Art src={shelf.top.art} size={120} round={shelf.top.kind === 'artist'} alt="" />
        <span class="top-text">
          <span class="top-title">{shelf.top.title}</span>
          <span class="dim">{shelf.top.subtitle}</span>
        </span>
        {#if shelf.top.play}
          <span class="top-play" role="button" tabindex="-1" onclick={(e) => { e.stopPropagation(); play(shelf.top.play); }} onkeydown={() => {}} aria-label="Play">
            <Icon name="play" size={26} />
          </span>
        {/if}
      </button>
      {#if shelf.items.length}
        <div class="top-tracks"><TrackTable tracks={shelf.items.slice(0, 4)} showAlbum={false} numbered={false} /></div>
      {/if}
    </div>
  {:else if shelf.style === 'description'}
    {#if shelf.title}{@render heading()}{/if}
    <p class="desc dim">{shelf.text}</p>
  {:else}
    {#if shelf.title}{@render heading()}{/if}
    {#if allSongs}
      <TrackTable tracks={shelf.items} />
    {:else}
      <ItemList items={shelf.items} />
    {/if}
  {/if}
</section>

<style>
  .shelf { margin-bottom: 40px; }
  .heading { margin-bottom: 14px; flex: 1; min-width: 0; }
  .heading h2 { font-size: 22px; }
  .strap { font-size: 13px; margin-bottom: 2px; }
  .more-link { display: inline-flex; align-items: center; gap: 2px; font: inherit; }
  .more-link:hover { text-decoration: underline; text-underline-offset: 4px; }
  .wrap { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--card), 1fr)); gap: 24px 18px; }
  .wrap :global(.card) { width: auto !important; }
  .top { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 24px; align-items: start; }
  .top-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
    border-radius: var(--r-panel);
    background: var(--bg-elev);
    text-align: left;
  }
  .top-card:hover { background: var(--bg-elev-2); }
  .top-text { display: flex; flex-direction: column; gap: 4px; }
  .top-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; line-height: 1.1; }
  .top-play {
    position: absolute;
    right: 20px;
    bottom: 20px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent);
    color: var(--accent-ink);
  }
  .desc { max-width: 72ch; white-space: pre-line; }
  @media (max-width: 1100px) { .top { grid-template-columns: 1fr; } }
</style>
