// End-to-end smoke test of the real app on the signed-in session, with audio muted.
// Plays a track through the hidden engine, checks that the UI and mini players receive it,
// and saves screenshots. Close YT Mini before running:
//
//   npm run build && npx electron scripts/smoke.cjs [outDir]
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.setPath('userData', path.join(app.getPath('appData'), 'ytmini'));

const OUT = process.argv[2] || path.join(__dirname, '..', 'test', 'smoke-out');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

require('../src/main/index.js');
const engine = require('../src/main/engine.js');
const win = require('../src/main/windows.js');
const { settings, writeSettings } = require('../src/main/settings.js');

async function shot(bw, name) {
  for (let i = 0; i < 3; i++) {
    try {
      const img = await bw.webContents.capturePage();
      fs.writeFileSync(path.join(OUT, `${name}.png`), img.toPNG());
      return;
    } catch {
      await wait(500);
    }
  }
  console.log(`(could not capture ${name})`);
}

app.whenReady().then(async () => {
  await wait(500);
  engine.win.webContents.setAudioMuted(true);
  const originalStyle = settings.miniStyle;

  await wait(9000);
  const deckText = () => win.w.app.webContents.executeJavaScript(`document.querySelector('.deck')?.innerText || ''`);
  const homeShelves = await win.w.app.webContents.executeJavaScript(`document.querySelectorAll('.shelf').length`);
  check('home page shows shelves', homeShelves > 0, `${homeShelves} shelves`);

  engine.send('play', { watchEndpoint: { videoId: 'dQw4w9WgXcQ' } });
  await wait(8000);
  check('engine plays the requested track', engine.state.videoId === 'dQw4w9WgXcQ' && engine.state.playing,
    `${engine.state.title} / playing=${engine.state.playing}`);
  const deck = await deckText();
  check('app deck shows the track', deck.includes('Never Gonna Give You Up'));
  check('queue reported', engine.queue.length > 0, `${engine.queue.length} items`);
  await shot(win.w.app, 'app-home');

  engine.send('volume', 35);
  await wait(1500);
  check('volume command applies', engine.state.volume === 35, `volume=${engine.state.volume}`);

  engine.send('seek', 0.5);
  await wait(1500);
  check('seek command applies', Math.abs(engine.state.time - engine.state.duration / 2) < 5, `t=${Math.round(engine.state.time)}`);

  const q = engine.queue.findIndex((x) => !x.selected);
  if (q >= 0) {
    const target = engine.queue[q].videoId;
    engine.send('playQueueIndex', q);
    await wait(6000);
    check('play from queue', engine.state.videoId === target, `${engine.state.title}`);
  }

  engine.send('playPause');
  await wait(1500);
  check('pause', engine.state.playing === false);
  engine.send('playPause');
  await wait(1500);

  win.w.app.webContents.executeJavaScript(`location.hash = '#/search/daft%20punk'`);
  await wait(5000);
  const searchShelves = await win.w.app.webContents.executeJavaScript(`document.querySelectorAll('.shelf').length`);
  check('search results render', searchShelves > 0, `${searchShelves} shelves`);
  await shot(win.w.app, 'app-search');

  settings.miniStyle = 'modern';
  win.showMini();
  await wait(2500);
  const miniTitle = await win.w.mini.webContents.executeJavaScript(`document.getElementById('title').textContent`);
  check('modern mini player shows the track', miniTitle === engine.state.title, miniTitle);
  await shot(win.w.mini, 'mini-modern');

  settings.miniStyle = 'classic';
  let frames = 0;
  let loudFrames = 0;
  engine.on('viz', (f) => {
    frames++;
    if (f.some((v) => Math.abs(v - 128) > 4)) loudFrames++;
  });
  const t0 = engine.state.time;
  win.showMini();
  await wait(5000);
  const classic = JSON.parse(await win.w.classic.webContents.executeJavaScript(`JSON.stringify({
    webamp: !!document.querySelector('#webamp'),
    caption: document.getElementById('caption').textContent,
    size: [innerWidth, innerHeight],
  })`));
  check('classic mini player renders Webamp', classic.webamp, JSON.stringify(classic));
  check('classic art caption shows the track', classic.caption.includes(engine.state.title), classic.caption);
  check('audio keeps playing through the Web Audio graph', engine.state.playing && engine.state.time > t0 + 2,
    `t ${Math.round(t0)} -> ${Math.round(engine.state.time)}`);
  check('visualizer frames arrive with a waveform', frames > 30 && loudFrames > 5, `${frames} frames, ${loudFrames} non-silent`);
  await shot(win.w.classic, 'mini-classic');

  // Buttons must not sit inside a window-drag region, or Windows swallows the clicks.
  const regions = await win.w.classic.webContents.executeJavaScript(`JSON.stringify(
    ['play', 'pause', 'stop', 'next', 'previous', 'volume', 'position', 'shuffle', 'repeat', 'equalizer-button', 'playlist-button']
      .filter((id) => getComputedStyle(document.getElementById(id)).getPropertyValue('-webkit-app-region') === 'drag'))`);
  check('classic controls are clickable (not drag regions)', regions === '[]', regions);

  // Click Webamp's own buttons and watch the engine respond.
  const press = (id) => win.w.classic.webContents.executeJavaScript(`(() => {
    const el = document.getElementById('${id}');
    for (const type of ['mousedown', 'mouseup', 'click']) el.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }));
  })()`);
  await press('pause');
  await wait(1500);
  check('classic pause button pauses', engine.state.playing === false);
  await press('play');
  await wait(1500);
  check('classic play button resumes', engine.state.playing === true);
  const before = engine.state.videoId;
  await press('next');
  await wait(5000);
  check('classic next button skips', engine.state.videoId && engine.state.videoId !== before, engine.state.title);

  engine.send('eq', { on: true, preamp: 60, bands: { 60: 100, 170: 50, 310: 50, 600: 50, 1000: 50, 3000: 50, 6000: 50, 12000: 50, 14000: 50, 16000: 0 } });
  await wait(800);
  const gains = await engine.win.webContents.executeJavaScript(
    `JSON.stringify(window.__ytminiAudio ? window.__ytminiAudio.bands.map((b) => Math.round(b.gain.value)) : null)`);
  check('equalizer settings reach the filters', gains === JSON.stringify([12, 0, 0, 0, 0, 0, 0, 0, 0, -12]), gains);
  engine.send('eq', { on: false, preamp: 50, bands: {} });
  win.showApp();

  const originalTheme = settings.theme;
  const accent = () => win.w.app.webContents.executeJavaScript(`getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()`);
  await win.w.app.webContents.executeJavaScript(`window.ytm.setSetting('theme', 'adaptive')`);
  await wait(3000);
  const adaptiveAccent = await accent();
  check('adaptive theme takes colours from the album art', /^#[0-9a-f]{6}$/i.test(adaptiveAccent) && adaptiveAccent.toLowerCase() !== '#d9ae52', adaptiveAccent);
  await shot(win.w.app, 'app-adaptive');
  await win.w.app.webContents.executeJavaScript(`window.ytm.setSetting('theme', ${JSON.stringify(originalTheme)})`);
  await wait(500);

  settings.miniStyle = originalStyle;
  writeSettings();

  // Quitting must work while music is playing (YTM's beforeunload used to block it).
  if (!engine.state.playing) engine.send('playPause');
  await wait(2000);
  const summary = (quitOk) => {
    check('app quits while a song is playing', quitOk);
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed. Screenshots in ${OUT}`);
    return failed;
  };
  const stuck = setTimeout(() => app.exit(summary(false) ? 1 : 1), 8000);
  app.once('will-quit', () => {
    clearTimeout(stuck);
    process.exitCode = summary(true) ? 1 : 0;
  });
  app.quit();
});
