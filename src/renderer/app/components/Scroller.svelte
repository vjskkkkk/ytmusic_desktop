<script>
  // A horizontal row that scrolls by a page with the arrow buttons in the shelf header.
  import Icon from './Icon.svelte';

  let { children, title = '', header = null } = $props();
  let el = $state();
  let atStart = $state(true);
  let atEnd = $state(false);

  function update() {
    if (!el) return;
    atStart = el.scrollLeft < 4;
    atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
  }
  const page = (dir) => el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });

  $effect(() => {
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  });
</script>

<div class="head">
  {#if header}{@render header()}{:else}<h2>{title}</h2>{/if}
  {#if !(atStart && atEnd)}
    <div class="arrows">
      <button class="lg-ctl" onclick={() => page(-1)} disabled={atStart} aria-label="Scroll left"><Icon name="left" /></button>
      <button class="lg-ctl" onclick={() => page(1)} disabled={atEnd} aria-label="Scroll right"><Icon name="right" /></button>
    </div>
  {/if}
</div>
<div class="row" bind:this={el} onscroll={update}>
  {@render children()}
</div>

<style>
  .head { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 14px; }
  .head :global(h2) { font-size: 22px; flex: 1; min-width: 0; }
  .arrows { display: flex; gap: 6px; }
  .arrows button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text);
  }
  .arrows button:disabled { opacity: 0.35; cursor: default; }
  .row {
    display: flex;
    gap: 18px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding-left: 0;
    padding-bottom: 6px;
    scrollbar-width: none;
  }
  .row::-webkit-scrollbar { display: none; }
</style>
