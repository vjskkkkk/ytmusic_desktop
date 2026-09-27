<script>
  // The current song as a record sleeve with the disc half pulled out. The disc turns
  // while music plays and stops where it is when paused.
  import Art from './Art.svelte';

  let { art = '', playing = false, size = 300 } = $props();
</script>

<div class="record" style:--size={`${size}px`}>
  <div class="disc" class:spinning={playing}>
    <div class="label" style:background-image={art ? `url("${art}")` : null}></div>
  </div>
  <div class="sleeve"><Art src={art} lazy={false} alt="" /></div>
</div>

<style>
  .record {
    position: relative;
    width: calc(var(--size) * 1.52);
    height: var(--size);
    flex: none;
  }
  .sleeve {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--size);
    height: var(--size);
    box-shadow: var(--shadow-lift);
    border-radius: var(--r-sleeve);
    z-index: 1;
  }
  .disc {
    position: absolute;
    top: 3%;
    left: calc(var(--size) * 0.56);
    width: calc(var(--size) * 0.94);
    aspect-ratio: 1;
    border-radius: 50%;
    background:
      radial-gradient(circle, transparent 0 31%, rgba(255, 255, 255, 0.06) 31.5% 32%, transparent 32.5%),
      repeating-radial-gradient(circle, #121016 0 1.2px, #1c1a22 1.2px 2.4px);
    box-shadow: inset 0 0 0 2px #0b0a0e, 0 10px 30px rgba(0, 0, 0, 0.4);
    display: grid;
    place-items: center;
    animation: spin 1.8s linear infinite;
    animation-play-state: paused;
  }
  .disc::after {
    /* light catching the grooves */
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(from 30deg, transparent 0 20%, rgba(255, 255, 255, 0.07) 25%, transparent 32% 70%, rgba(255, 255, 255, 0.05) 75%, transparent 82%);
  }
  .disc.spinning { animation-play-state: running; }
  .label {
    width: 34%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--accent) center / cover;
    box-shadow: 0 0 0 3px #0b0a0e;
    position: relative;
  }
  .label::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 9%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--bg);
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
