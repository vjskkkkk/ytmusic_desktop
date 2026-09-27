// Captures real API responses (already mapped to plain data) from the app's signed-in session
// into test/fixtures/live/, for rendering the UI with ?fixtures in the Vite dev server.
// These files contain personal library data and are git-ignored.
//
//   npx electron scripts/capture-fixtures.cjs      (close YT Mini first)
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.setPath('userData', path.join(app.getPath('appData'), 'ytmini'));
const OUT = path.join(__dirname, '..', 'test', 'fixtures', 'live');

app.whenReady().then(async () => {
  const ytmusic = require('../src/main/ytmusic');
  fs.mkdirSync(OUT, { recursive: true });
  const save = (name, data) => {
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data, null, 1));
    console.log('saved', name);
  };
  const run = async (name, method, ...args) => {
    try {
      const data = await ytmusic.call(method, args);
      save(name, data);
      return data;
    } catch (e) {
      console.log('FAIL', name, e.message);
      return null;
    }
  };

  const home = await run('home', 'home');
  await run('explore', 'explore');
  await run('library', 'library', 'playlists');
  const search = await run('search', 'search', 'daft punk');
  await run('suggest', 'suggest', 'daft p');
  await run('browse', 'browse', 'FEmusic_moods_and_genres');

  const items = (home?.sections || []).flatMap((s) => s.items);
  const albumId = items.find((i) => i.kind === 'album')?.nav?.browseId;
  if (albumId) await run('album', 'album', albumId);
  const playlistId = items.find((i) => i.kind === 'playlist')?.nav?.browseId;
  if (playlistId) await run('playlist', 'playlist', playlistId);

  const top = search?.sections.find((s) => s.style === 'top')?.top;
  const artistId = (top?.kind === 'artist' && top.nav?.browseId) ||
    search?.sections.flatMap((s) => s.items).flatMap((i) => i.artists || []).find((a) => a.id)?.id;
  await run('artist', 'artist', artistId);

  const song = items.find((i) => i.kind === 'song' && i.videoId);
  if (song) {
    await run('lyrics', 'lyrics', song.videoId);
    await run('related', 'related', song.videoId);
    save('player', {
      state: {
        hasTrack: true, videoId: song.videoId, title: song.title, artist: song.artists?.map((a) => a.name).join(', ') || song.subtitle,
        album: song.album?.name || '', art: song.art, playing: true, time: 64, duration: song.duration || 215,
        volume: 70, muted: false, like: 'LIKE', shuffle: false, repeat: 'NONE',
      },
      queue: items.filter((i) => i.kind === 'song').slice(0, 12).map((i, n) => ({
        index: n, videoId: i.videoId, title: i.title, artist: i.artists?.map((a) => a.name).join(', ') || '', duration: '', art: i.art, selected: n === 0,
      })),
    });
  }
  app.quit();
});
