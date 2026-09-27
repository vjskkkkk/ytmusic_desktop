<script>
  // Loading and error states for pages.
  let { error = null, onretry = null, label = 'Loading' } = $props();
</script>

{#if error}
  <div class="status">
    <p><strong>This page didn't load.</strong> {error.message || 'YouTube Music did not respond.'}</p>
    {#if onretry}<button onclick={onretry}>Try again</button>{/if}
  </div>
{:else}
  <div class="status loading" aria-live="polite">
    <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>{label}
  </div>
{/if}

<style>
  .status { padding: 48px 0; color: var(--text-dim); display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
  .loading { flex-direction: row; align-items: center; gap: 10px; }
  button { padding: 8px 16px; border-radius: var(--r-pill); background: var(--bg-elev-2); color: var(--text); font-weight: 600; }
  button:hover { background: var(--bg-hover); }
  .dots { display: inline-flex; gap: 4px; }
  .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 1s infinite ease-in-out; }
  .dots i:nth-child(2) { animation-delay: 0.15s; }
  .dots i:nth-child(3) { animation-delay: 0.3s; }
  @keyframes pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
</style>
