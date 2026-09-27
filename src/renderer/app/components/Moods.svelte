<script>
  // Moods & genres tiles: a label with the genre's own colour as a spine along the left edge.
  import { openNav } from '../lib/nav.js';

  let { items, compact = false } = $props();
</script>

<div class="moods" class:compact>
  {#each items as item, i (`${item.title}-${i}`)}
    <button class="mood" style:--spine={item.color || 'var(--accent)'} onclick={() => openNav(item.nav)}>
      {item.title}
    </button>
  {/each}
</div>

<style>
  .moods { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .moods.compact { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 8px; scrollbar-width: none; }
  .moods.compact::-webkit-scrollbar { display: none; }
  .mood {
    position: relative;
    text-align: left;
    padding: 14px 16px 14px 22px;
    border-radius: 6px;
    background: var(--bg-elev);
    font-weight: 600;
    overflow: hidden;
  }
  .mood::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    background: var(--spine);
  }
  .mood:hover { background: var(--bg-elev-2); }
  .compact .mood { flex: none; padding: 8px 14px 8px 18px; border-radius: var(--r-pill); font-size: 13px; }
  .compact .mood::before { width: 5px; }
</style>
