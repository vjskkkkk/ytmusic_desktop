// YouTube Music data for the custom UI, fetched with youtubei.js using the engine's
// signed-in cookies. Everything returned is plain data (see ytm-map.js).
const { session, net } = require('electron');
const map = require('./ytm-map');

const TTL = 5 * 60 * 1000;
const cache = new Map();
let clientPromise = null;
let clientKey = null;
// Parsed youtubei.js objects we keep around to fetch their continuations.
let homeFeed = null;
const playlists = new Map();

const LIBRARY_TABS = {
  playlists: 'FEmusic_liked_playlists',
  songs: 'FEmusic_liked_videos',
  albums: 'FEmusic_liked_albums',
  artists: 'FEmusic_library_corpus_track_artists',
};

async function client() {
  const cookies = await session.defaultSession.cookies.get({ url: 'https://music.youtube.com' });
  const key = cookies.find((c) => c.name === 'SAPISID')?.value || 'signed-out';
  if (!clientPromise || key !== clientKey) {
    clientKey = key;
    reset();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    clientPromise = import('youtubei.js').then(({ Innertube }) =>
      Innertube.create({ cookie: key === 'signed-out' ? undefined : cookie, retrieve_player: false }));
    clientPromise.catch(() => { clientPromise = null; });
  }
  return clientPromise;
}

function reset() {
  cache.clear();
  homeFeed = null;
  playlists.clear();
}

const headerTitle = (h) => map.text(h?.title) || map.text(h?.header?.title);

const api = {
  async home() {
    const yt = await client();
    homeFeed = await yt.music.getHomeFeed();
    return { chips: homeFeed.filters || [], sections: map.sections(homeFeed.sections), more: homeFeed.has_continuation };
  },

  async homeMore() {
    if (!homeFeed?.has_continuation) return { sections: [], more: false };
    homeFeed = await homeFeed.getContinuation();
    return { sections: map.sections(homeFeed.sections), more: homeFeed.has_continuation };
  },

  async homeFilter(chip) {
    const yt = await client();
    const feed = homeFeed || await yt.music.getHomeFeed();
    homeFeed = await feed.applyFilter(chip);
    return { chips: homeFeed.filters || [], sections: map.sections(homeFeed.sections), more: homeFeed.has_continuation };
  },

  async explore() {
    const yt = await client();
    const ex = await yt.music.getExplore();
    return { buttons: map.items(ex.top_buttons), sections: map.sections(ex.sections) };
  },

  async browse(browseId, params) {
    const yt = await client();
    const r = await yt.actions.execute('/browse', { browseId, params, client: 'YTMUSIC', parse: true });
    return { title: headerTitle(r.header), sections: map.sections(r.contents) };
  },

  async browseMore(token) {
    const yt = await client();
    const r = await yt.actions.execute('/browse', { continuation: token, client: 'YTMUSIC', parse: true });
    const cc = r.continuation_contents;
    return { items: map.items(cc?.contents || cc?.items), continuation: cc?.continuation || null };
  },

  async library(tab) {
    const browseId = LIBRARY_TABS[tab];
    if (!browseId) throw new Error(`Unknown library tab: ${tab}`);
    return api.browse(browseId);
  },

  async search(query, filter) {
    const yt = await client();
    const s = await yt.music.search(query, filter ? { type: filter } : {});
    return {
      query,
      filter: filter || null,
      didYouMean: map.text(s.did_you_mean?.corrected_query),
      sections: map.sections(s.contents),
    };
  },

  async suggest(query) {
    const yt = await client();
    return map.suggestions(await yt.music.getSearchSuggestions(query));
  },

  async album(id) {
    const yt = await client();
    return { id, ...map.album(await yt.music.getAlbum(id)) };
  },

  async playlist(id) {
    const yt = await client();
    const p = await yt.music.getPlaylist(id);
    playlists.set(id, p);
    return { id, ...map.playlist(p) };
  },

  async playlistMore(id) {
    const p = playlists.get(id);
    if (!p?.has_continuation) return { tracks: [], hasMore: false };
    const next = await p.getContinuation();
    playlists.set(id, next);
    return { tracks: map.items(next.items || next.contents), hasMore: !!next.has_continuation };
  },

  async artist(id) {
    const yt = await client();
    return { id, ...map.artist(await yt.music.getArtist(id)) };
  },

  async lyrics(videoId) {
    const yt = await client();
    try {
      const shelf = await yt.music.getLyrics(videoId);
      return shelf ? { text: map.text(shelf.description), source: map.text(shelf.footer) } : null;
    } catch {
      return null; // not every track has lyrics
    }
  },

  async related(videoId) {
    const yt = await client();
    try {
      return { sections: map.sections(await yt.music.getRelated(videoId)) };
    } catch {
      return { sections: [] };
    }
  },
};

// Results that depend on stored continuation state are never cached.
const UNCACHED = new Set(['homeMore', 'homeFilter', 'browseMore', 'playlistMore']);

async function call(method, args = []) {
  if (!Object.prototype.hasOwnProperty.call(api, method)) throw new Error(`Unknown method: ${method}`);
  const key = `${method}:${JSON.stringify(args)}`;
  if (!UNCACHED.has(method)) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < TTL) return hit.v;
  }
  const v = await api[method](...args);
  if (!UNCACHED.has(method)) cache.set(key, { t: Date.now(), v });
  return v;
}

function invalidate(prefix) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

// Image bytes for the adaptive theme; the renderer can't read cross-origin pixels itself.
// Only YouTube/Google image hosts are fetched; anything else (e.g. a data: placeholder) gets null.
async function image(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !/(googleusercontent\.com|ytimg\.com|ggpht\.com|gstatic\.com)$/.test(u.hostname)) {
    return null;
  }
  const res = await net.fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

module.exports = { call, reset, invalidate, image };
