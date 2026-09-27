<script>
  import Icon from '../components/Icon.svelte';
  import { ytm } from '../lib/bridge.js';
  import { theme, BUILT_IN, setTheme, reloadUserThemes } from '../lib/theme.svelte.js';

  let { signedIn } = $props();
  let settings = $state(null);
  let skins = $state([]);

  async function refresh() {
    settings = await ytm.getSettings();
    skins = (await ytm.skins()) || [];
  }
  refresh();
  $effect(() => ytm.onSettings((s) => { settings = s; ytm.skins().then((l) => (skins = l || [])); }));

  const set = (key, value) => ytm.setSetting(key, value);
  async function importSkin() {
    await ytm.importSkin();
    skins = (await ytm.skins()) || [];
  }
  async function removeSkin(file) {
    await ytm.deleteSkin(file);
    skins = (await ytm.skins()) || [];
  }
</script>

<div class="page">
  <h1 class="title">Themes and settings</h1>

  <section>
    <h2>App theme</h2>
    <div class="themes">
      {#each [...BUILT_IN, ...theme.user.map((u) => ({ id: u.id, name: u.name, note: 'Your theme', swatch: null }))] as t (t.id)}
        <button class="theme" class:active={theme.id === t.id} aria-pressed={theme.id === t.id} onclick={() => setTheme(t.id)}>
          <span class="swatch" data-id={t.id}>
            {#if t.swatch}
              {#each t.swatch as c}<i style:background={c}></i>{/each}
            {/if}
          </span>
          <span class="tname">{t.name}</span>
          <span class="tnote dim">{t.note}</span>
        </button>
      {/each}
    </div>
    <p class="hint dim">
      Make your own: save a .css file that sets the colour variables (for example <code>--bg</code>, <code>--text</code>, <code>--accent</code>)
      in the themes folder, then reload.
    </p>
    <div class="row-btns">
      <button class="btn" onclick={() => ytm.openThemesFolder()}>Open themes folder</button>
      <button class="btn" onclick={reloadUserThemes}>Reload themes</button>
    </div>
  </section>

  {#if settings}
    <section>
      <h2>Mini player</h2>
      <div class="seg" role="radiogroup" aria-label="Mini player style">
        <button role="radio" aria-checked={settings.miniStyle === 'modern'} class:active={settings.miniStyle === 'modern'} onclick={() => set('miniStyle', 'modern')}>
          <strong>Modern</strong><span class="dim">Album art that resizes down to a thin strip</span>
        </button>
        <button role="radio" aria-checked={settings.miniStyle === 'classic'} class:active={settings.miniStyle === 'classic'} onclick={() => set('miniStyle', 'classic')}>
          <strong>Classic</strong><span class="dim">Winamp 2, with real skins and album art</span>
        </button>
      </div>
      <label class="check"><input type="checkbox" checked={settings.minimizeToMini} onchange={(e) => set('minimizeToMini', e.currentTarget.checked)} />Minimising the app opens the mini player</label>
      <label class="check"><input type="checkbox" checked={settings.miniOnTop} onchange={(e) => set('miniOnTop', e.currentTarget.checked)} />Keep the mini player on top of other windows</label>
      <button class="btn" onclick={() => ytm.showMini()}><Icon name="mini" size={18} />Open mini player</button>
    </section>

    <section>
      <h2>Classic player</h2>
      <div class="line">
        <span>Size</span>
        <div class="seg small" role="radiogroup" aria-label="Classic player size">
          {#each [1, 2, 3] as n}
            <button role="radio" aria-checked={settings.classicScale === n} class:active={settings.classicScale === n} onclick={() => set('classicScale', n)}>{n}×</button>
          {/each}
        </div>
      </div>
      <label class="check"><input type="checkbox" checked={settings.classicArt} onchange={(e) => set('classicArt', e.currentTarget.checked)} />Show album art under the player</label>

      <h3>Winamp skins</h3>
      <div class="skins">
        <div class="skin" class:active={!settings.skin}>
          <button class="pick" onclick={() => ytm.selectSkin(null)}>Base skin</button>
        </div>
        {#each skins as s (s.file)}
          <div class="skin" class:active={settings.skin === s.file}>
            <button class="pick ellipsis" onclick={() => ytm.selectSkin(s.file)} title={s.name}>{s.name}</button>
            <button class="del" onclick={() => removeSkin(s.file)} aria-label={`Delete ${s.name}`}><Icon name="close" size={16} /></button>
          </div>
        {/each}
      </div>
      <div class="row-btns">
        <button class="btn" onclick={importSkin}>Load skin (.wsz)</button>
        <button class="btn" onclick={() => ytm.openExternal('https://skins.webamp.org/')}>Browse skins online</button>
      </div>
      <p class="hint dim">Download any skin from the Winamp Skin Museum, then load the .wsz file here or drop it onto the classic player.</p>
    </section>
  {/if}

  <section>
    <h2>Account</h2>
    <p class="dim">{signedIn ? 'Signed in to YouTube Music.' : 'Not signed in. Your library and personal mixes need a Google account.'}</p>
    <div class="row-btns">
      {#if !signedIn}<button class="btn accent" onclick={() => ytm.signIn()}>Sign in with Google</button>{/if}
      <button class="btn" onclick={() => ytm.showClassicView()}><Icon name="web" size={18} />Open classic YouTube Music view</button>
    </div>
  </section>
</div>

<style>
  .page { padding: 16px 40px 60px; max-width: 980px; }
  .title { font-size: 44px; font-weight: 800; font-stretch: 85%; letter-spacing: -0.02em; margin-bottom: 30px; }
  section { padding: 24px 0; border-top: 1px solid var(--line); display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
  h2 { font-size: 20px; }
  h3 { font-size: 15px; margin-top: 10px; }
  .themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; width: 100%; }
  .theme {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px;
    border-radius: var(--r-panel);
    background: var(--bg-elev);
    border: 2px solid transparent;
    text-align: left;
  }
  .theme:hover { background: var(--bg-elev-2); }
  .theme.active { border-color: var(--accent); }
  .swatch { display: flex; width: 100%; height: 44px; border-radius: 6px; overflow: hidden; margin-bottom: 6px; background: var(--bg-elev-2); }
  .swatch i { flex: 1; }
  .swatch[data-id='adaptive'] { background: linear-gradient(110deg, #3a1d5c, #7a2f3b 45%, #c98a2b); }
  .swatch[data-id='classic'] { background: repeating-linear-gradient(0deg, #000 0 6px, #0a0a0a 6px 7px); box-shadow: inset 0 0 0 1px #00ff0055; }
  .swatch[data-id='classic']::after { content: 'Winamp'; color: #00ff00; font: 700 11px/44px 'Arial', sans-serif; padding-left: 10px; }
  .tname { font-weight: 650; }
  .tnote { font-size: 12.5px; }
  .hint { font-size: 13px; max-width: 70ch; margin: 0; }
  code { font-size: 12px; background: var(--bg-elev-2); padding: 1px 5px; border-radius: 4px; white-space: nowrap; }
  .row-btns { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px; border-radius: var(--r-pill); background: var(--bg-elev-2); font-weight: 600; font-size: 13.5px; }
  .btn:hover { background: var(--bg-hover); }
  .btn.accent { background: var(--accent); color: var(--accent-ink); }
  .seg { display: flex; gap: 8px; }
  .seg button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px 16px; border-radius: var(--r-panel); background: var(--bg-elev); border: 2px solid transparent; text-align: left; max-width: 280px; }
  .seg button.active { border-color: var(--accent); }
  .seg button span { font-size: 12.5px; }
  .seg.small button { padding: 6px 14px; border-radius: var(--r-pill); }
  .line { display: flex; align-items: center; gap: 16px; }
  .check { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .check input { accent-color: var(--accent); width: 16px; height: 16px; }
  .skins { display: flex; flex-wrap: wrap; gap: 8px; }
  .skin { display: flex; align-items: center; border-radius: var(--r-pill); background: var(--bg-elev); border: 2px solid transparent; max-width: 260px; }
  .skin.active { border-color: var(--accent); }
  .pick { padding: 7px 14px; font-size: 13px; font-weight: 600; min-width: 0; }
  .del { width: 26px; height: 26px; margin-right: 4px; border-radius: 50%; display: grid; place-items: center; color: var(--text-dim); }
  .del:hover { background: var(--bg-hover); color: var(--text); }
</style>
