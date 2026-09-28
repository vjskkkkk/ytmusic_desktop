<script>
  // Ambient light behind the whole window, taken from the current artwork (or the station logo) and
  // the theme accent. Glass needs something with structure behind it; over a flat colour a frosted
  // pane looks the same as a solid one.
  import { player } from '../lib/player.svelte.js';
  import { radio } from '../lib/radio.svelte.js';

  const art = $derived(radio.active ? radio.station?.favicon || '' : player.state.hasTrack ? player.state.art || '' : '');
</script>

<div class="backdrop" aria-hidden="true">
  <i class="glow a"></i>
  <i class="glow b"></i>
  {#if art}<div class="art" style:background-image={`url("${art}")`}></div>{/if}
</div>

<style>
  .backdrop { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: -1; }
  .glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.22; }
  .glow.a { width: 46vw; height: 46vw; left: -12vw; bottom: -22vw; background: var(--accent); }
  .glow.b { width: 38vw; height: 38vw; right: -10vw; top: -18vw; background: color-mix(in oklab, var(--accent) 45%, var(--text-faint)); opacity: 0.14; }
  .art {
    position: absolute;
    inset: -20%;
    background: center / cover;
    filter: blur(110px) saturate(1.3);
    opacity: 0.16;
    transition: background-image 0.8s var(--ease);
  }
  :global(:root[data-theme='daylight']) .glow { opacity: 0.16; }
  :global(:root[data-theme='daylight']) .art { opacity: 0.12; }
</style>
