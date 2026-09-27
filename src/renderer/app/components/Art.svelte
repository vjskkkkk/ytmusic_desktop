<script>
  // Album art on a sleeve-shaped tile. Falls back to a quiet placeholder when the image is missing.
  import Icon from './Icon.svelte';

  let { src = '', alt = '', size = null, round = false, wide = false, lazy = true } = $props();
  let failed = $state(false);
  let attempt = $state(0);
  $effect(() => {
    src;
    failed = false;
    attempt = 0;
  });

  // Google image servers occasionally refuse a request when many load at once; retry once.
  function onError() {
    if (attempt === 0) setTimeout(() => (attempt = 1), 1200);
    else failed = true;
  }
  const url = $derived(attempt ? `${src}${src.includes("?") ? "&" : "?"}r=1` : src);
</script>

<div class="art" class:round class:wide style:width={size ? `${size}px` : null}>
  {#if src && !failed}
    {#key url}<img src={url} {alt} loading={lazy ? 'lazy' : 'eager'} decoding="async" draggable="false" onerror={onError} />{/key}
  {:else}
    <div class="empty"><Icon name="note" size={28} /></div>
  {/if}
</div>

<style>
  .art {
    position: relative;
    aspect-ratio: 1;
    width: 100%;
    border-radius: var(--r-sleeve);
    overflow: hidden;
    background: var(--bg-elev-2);
    flex: none;
  }
  .art.wide { aspect-ratio: 16 / 9; }
  .art.round { border-radius: 50%; }
  img { width: 100%; height: 100%; object-fit: cover; }
  .empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-faint);
  }
</style>
