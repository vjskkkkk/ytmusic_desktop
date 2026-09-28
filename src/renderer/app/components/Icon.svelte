<script>
  // Thin, rounded line icons that sit lightly on glass. Shapes adapted from Lucide
  // (https://lucide.dev, ISC licence). Transport glyphs (play, pause, skip) and "liked" are
  // solid, with rounded joins, so the primary controls read first.
  const LINE = {
    home: '<path d="M15 21v-7a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v7"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    explore: '<circle cx="12" cy="12" r="9.5"/><path d="m15.5 8.5-2.1 5-4.9 2 2.1-5z"/>',
    library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.9-3.9"/>',
    shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.46-7.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    repeatOne: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>',
    like: '<path d="M7 10v11"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    volume: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.41 7.59A1.4 1.4 0 0 1 5.42 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.42a1.4 1.4 0 0 1 1 .41l3.38 3.38a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.36 18.36a9 9 0 0 0 0-12.73"/>',
    mute: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.41 7.59A1.4 1.4 0 0 1 5.42 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.42a1.4 1.4 0 0 1 1 .41l3.38 3.38a.7.7 0 0 0 1.2-.5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
    queue: '<path d="M21 15V6"/><circle cx="18.5" cy="15.5" r="2.5"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/>',
    mini: '<path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/>',
    settings: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    web: '<circle cx="12" cy="12" r="9.5"/><path d="M12 2.5a14.5 14.5 0 0 0 0 19 14.5 14.5 0 0 0 0-19"/><path d="M2.5 12h19"/>',
    radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
  };

  const SOLID = {
    play: '<path d="M7.5 5.2v13.6a1 1 0 0 0 1.52.85l10.8-6.8a1 1 0 0 0 0-1.7L9.02 4.35A1 1 0 0 0 7.5 5.2z"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.3"/><rect x="14" y="4.5" width="4" height="15" rx="1.3"/>',
    next: '<path d="M4.5 6.3v11.4a.8.8 0 0 0 1.24.67l8.3-5.7a.8.8 0 0 0 0-1.33l-8.3-5.7a.8.8 0 0 0-1.24.66z"/><rect x="16.5" y="5.5" width="2.8" height="13" rx="1.2"/>',
    prev: '<path d="M19.5 6.3v11.4a.8.8 0 0 1-1.24.67l-8.3-5.7a.8.8 0 0 1 0-1.33l8.3-5.7a.8.8 0 0 1 1.24.66z"/><rect x="4.7" y="5.5" width="2.8" height="13" rx="1.2"/>',
    liked: '<path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  };

  let { name, size = 22, label = undefined, stroke = 1.75 } = $props();
  const solid = $derived(name in SOLID);
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class:solid
  style:--sw={stroke}
  aria-hidden={label ? undefined : 'true'}
  aria-label={label}
  role={label ? 'img' : undefined}
>{@html SOLID[name] ?? LINE[name] ?? ''}</svg>

<style>
  svg {
    flex: none;
    display: block;
    fill: none;
    stroke: currentColor;
    stroke-width: var(--sw);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  svg.solid { fill: currentColor; stroke-width: 0; }
</style>
