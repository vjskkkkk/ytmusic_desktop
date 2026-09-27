// Converts youtubei.js parsed nodes into plain, serialisable objects for the renderer.
// Pure functions: no Electron or youtubei.js imports, so they can be unit-tested with plain data.

const ART_SIZE = 544;

function text(t) {
  if (t == null) return '';
  if (typeof t === 'string') return t;
  if (typeof t.text === 'string') return t.text;
  if (Array.isArray(t.runs)) return t.runs.map((r) => r.text || '').join('');
  return '';
}

const runsOf = (t) => (t && Array.isArray(t.runs) ? t.runs : []);

// Google image URLs carry their size (…=w60-h60-…, …=s120); ask for a bigger square.
function art(url, size = ART_SIZE) {
  if (!url) return '';
  if (url.startsWith('//')) url = `https:${url}`;
  if (/googleusercontent\.com|ggpht\.com/.test(url)) {
    if (/=w\d+-h\d+/.test(url)) return url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
    if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${size}`);
    if (!url.includes('=')) return `${url}=w${size}-h${size}`;
  }
  return url;
}

function thumbList(t) {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  if (Array.isArray(t.contents)) return t.contents;
  if (Array.isArray(t.thumbnails)) return t.thumbnails;
  if (t.thumbnail) return thumbList(t.thumbnail);
  return [];
}

function largest(t) {
  const list = thumbList(t);
  if (!list.length) return null;
  return [...list].sort((a, b) => (b.width || 0) - (a.width || 0))[0];
}

const bestThumb = (t) => art(largest(t)?.url);
// Banners are wide; keep their original aspect ratio.
const banner = (t) => largest(t)?.url || '';

function cleanWatch(p) {
  const o = {};
  for (const k of ['videoId', 'playlistId', 'params', 'index', 'playlistSetVideoId']) {
    if (p[k] != null && p[k] !== '') o[k] = p[k];
  }
  return o;
}

// Navigation endpoint → { type: 'browse', browseId, params, pageType } | { type: 'watch', endpoint }
function endpoint(ep) {
  if (!ep) return null;
  const p = ep.payload || {};
  if (p.browseId) {
    const pageType = p.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType || '';
    return { type: 'browse', browseId: p.browseId, params: p.params || undefined, pageType };
  }
  if (ep.name === 'watchPlaylistEndpoint' && p.playlistId) {
    return { type: 'watch', endpoint: { watchPlaylistEndpoint: cleanWatch(p) } };
  }
  if (p.videoId || (ep.name === 'watchEndpoint' && p.playlistId)) {
    return { type: 'watch', endpoint: { watchEndpoint: cleanWatch(p) } };
  }
  if (p.query) return { type: 'search', query: p.query };
  return null;
}

function kindOf(itemType, nav) {
  switch (itemType) {
    case 'song':
    case 'video':
    case 'album':
    case 'playlist':
    case 'artist':
      return itemType;
    case 'library_artist':
      return 'artist';
    case 'non_music_track':
      return 'video';
    default:
      break;
  }
  const pt = nav?.pageType || '';
  if (pt.includes('ALBUM')) return 'album';
  if (pt.includes('PLAYLIST')) return 'playlist';
  if (pt.includes('ARTIST') || pt.includes('USER_CHANNEL')) return 'artist';
  if (pt.includes('PODCAST') || pt.includes('AUDIOBOOK')) return 'playlist';
  if (nav?.type === 'watch') return 'song';
  if (nav?.browseId?.startsWith('MPRE')) return 'album';
  if (nav?.browseId?.startsWith('UC')) return 'artist';
  if (nav?.browseId?.startsWith('VL')) return 'playlist';
  return 'other';
}

// Artist and album links embedded in subtitle runs ("Song • Daft Punk • Discovery").
function linksFrom(runs) {
  const artists = [];
  let album = null;
  for (const r of runs) {
    const p = r.endpoint?.payload;
    const id = p?.browseId;
    if (!id) continue;
    const pt = p.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType || '';
    if (id.startsWith('MPRE') || pt.includes('ALBUM')) album = { name: r.text, id };
    else if (id.startsWith('UC') || pt.includes('ARTIST') || pt.includes('USER_CHANNEL')) artists.push({ name: r.text, id });
  }
  return { artists, album };
}

function mapArtists(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((a) => a && a.name).map((a) => ({ name: a.name, id: a.channel_id || a.id || null }));
}

function playFromOverlay(node) {
  const ep = node.thumbnail_overlay?.content?.endpoint || node.overlay?.content?.endpoint;
  const nav = endpoint(ep);
  return nav?.type === 'watch' ? nav.endpoint : null;
}

function parseDuration(s) {
  if (!s || !/^\d+(:\d+)+$/.test(s)) return 0;
  return s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
}

function twoRowItem(node) {
  const nav = endpoint(node.endpoint);
  const kind = kindOf(node.item_type, nav);
  const links = linksFrom(runsOf(node.subtitle));
  const artists = mapArtists(node.artists);
  const out = {
    kind,
    title: text(node.title),
    subtitle: text(node.subtitle),
    art: bestThumb(node.thumbnail),
    nav,
    artists: artists.length ? artists : links.artists,
    play: nav?.type === 'watch' ? nav.endpoint : playFromOverlay(node),
  };
  if (kind === 'song' || kind === 'video') out.videoId = node.id || nav?.endpoint?.watchEndpoint?.videoId || null;
  return out;
}

function listItem(node) {
  const cols = node.flex_columns || [];
  const nav = endpoint(node.endpoint);
  const kind = kindOf(node.item_type, nav);
  const detailRuns = cols.slice(1).flatMap((c) => runsOf(c.title));
  const links = linksFrom(detailRuns);
  let artists = mapArtists(node.artists);
  if (!artists.length && node.author?.name) artists = [{ name: node.author.name, id: node.author.channel_id || null }];
  if (!artists.length) artists = links.artists;

  const title = text(node.title) || text(cols[0]?.title) || node.name || '';
  const fixed = text(node.fixed_columns?.[0]?.title);
  const out = {
    kind,
    title,
    subtitle: cols.slice(1).map((c) => text(c.title)).filter(Boolean).join(' • ') || text(node.subtitle),
    art: bestThumb(node.thumbnail),
    nav,
    artists,
    album: node.album?.name ? { name: node.album.name, id: node.album.id || null } : links.album,
    duration: node.duration?.seconds || parseDuration(fixed),
  };
  if (kind === 'song' || kind === 'video') {
    out.videoId = node.id || null;
    out.play = playFromOverlay(node) || (out.videoId ? { watchEndpoint: { videoId: out.videoId } } : null);
  } else {
    out.play = playFromOverlay(node);
  }
  return out;
}

function colorToCss(n) {
  if (typeof n !== 'number') return null;
  const rgb = n & 0xffffff; // ARGB int from the API
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

function item(node) {
  if (!node || typeof node !== 'object') return null;
  switch (node.type) {
    case 'MusicTwoRowItem':
      return twoRowItem(node);
    case 'MusicResponsiveListItem':
      return listItem(node);
    case 'MusicNavigationButton':
      return {
        kind: 'mood',
        title: node.button_text || text(node.title),
        nav: endpoint(node.endpoint),
        color: colorToCss(node.color),
      };
    case 'PlaylistPanelVideo':
      return {
        kind: 'song',
        title: text(node.title),
        subtitle: node.author || '',
        art: bestThumb(node.thumbnail),
        videoId: node.video_id,
        artists: mapArtists(node.artists),
        duration: node.duration?.seconds || 0,
        play: endpoint(node.endpoint)?.endpoint || null,
      };
    default:
      return null;
  }
}

const items = (list) => (Array.isArray(list) ? list.map(item).filter(Boolean) : []);

function styleFor(contents) {
  const first = Array.isArray(contents) ? contents.find(Boolean) : null;
  if (!first) return 'cards';
  if (first.type === 'MusicResponsiveListItem') return 'songs';
  if (first.type === 'MusicNavigationButton') return 'chips';
  return 'cards';
}

function shelf(node) {
  switch (node.type) {
    case 'MusicCarouselShelf':
      return {
        title: text(node.header?.title),
        strapline: text(node.header?.strapline),
        more: endpoint(node.header?.more_content?.endpoint) || endpoint(node.header?.title?.endpoint),
        style: styleFor(node.contents),
        rows: node.num_items_per_column ? Number(node.num_items_per_column) : 1,
        items: items(node.contents),
      };
    case 'MusicShelf':
      return {
        title: text(node.title),
        more: endpoint(node.endpoint) || endpoint(node.bottom_endpoint),
        style: 'list',
        items: items(node.contents),
        continuation: node.continuation || null,
      };
    case 'MusicPlaylistShelf':
      return {
        title: '',
        style: 'list',
        items: items(node.contents),
        continuation: node.continuation || null,
      };
    case 'Grid':
      return {
        title: text(node.header?.title),
        style: styleFor(node.items) === 'chips' ? 'chips' : 'grid',
        items: items(node.items),
        continuation: node.continuation || null,
      };
    case 'MusicCardShelf': {
      const nav = endpoint(node.on_tap);
      return {
        title: text(node.header?.title) || 'Top result',
        style: 'top',
        top: {
          kind: kindOf(null, nav),
          title: text(node.title),
          subtitle: text(node.subtitle),
          art: bestThumb(node.thumbnail),
          nav,
          play: nav?.type === 'watch' ? nav.endpoint : null,
        },
        items: items(node.contents),
      };
    }
    case 'MusicDescriptionShelf':
      return { title: text(node.header), style: 'description', text: text(node.description), items: [] };
    default:
      return null;
  }
}

const SHELF_TYPES = new Set([
  'MusicCarouselShelf', 'MusicShelf', 'MusicPlaylistShelf', 'Grid', 'MusicCardShelf', 'MusicDescriptionShelf',
]);
const CHILD_KEYS = ['contents', 'sections', 'items', 'content', 'tabs', 'tab_contents', 'primary_contents', 'secondary_contents'];

const ITEM_TYPES = new Set(['MusicResponsiveListItem', 'MusicTwoRowItem']);

// Walks any parsed page in document order and collects its shelves. Items that sit outside
// any shelf (search now returns each result in its own ItemSection) are gathered into one
// list, titled by the empty shelf header that precedes them ("More results").
function sections(root) {
  const out = [];
  const seen = new Set();
  let pendingTitle = '';
  let loose = null;
  const walk = (v, depth) => {
    if (!v || typeof v !== 'object' || depth > 14 || seen.has(v)) return;
    seen.add(v);
    if (v.constructor?.name === 'SuperParsedResult') {
      if (v.is_null) return;
      walk(v.is_array ? v.array() : v.item(), depth + 1);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x) => walk(x, depth + 1));
      return;
    }
    if (SHELF_TYPES.has(v.type)) {
      const s = shelf(v);
      loose = null;
      if (s && (s.items.length || s.text || s.top)) out.push(s);
      else if (s?.title) pendingTitle = s.title;
      return;
    }
    if (ITEM_TYPES.has(v.type)) {
      const it = item(v);
      if (!it) return;
      if (!loose) {
        loose = { title: pendingTitle, style: 'list', items: [] };
        pendingTitle = '';
        out.push(loose);
      }
      loose.items.push(it);
      return;
    }
    for (const k of CHILD_KEYS) if (v[k]) walk(v[k], depth + 1);
  };
  walk(root, 0);
  return out;
}

// ---------- pages ----------

function headerOf(h) {
  // Own playlists wrap the header: MusicEditablePlaylistDetailHeader { header: MusicResponsiveHeader }
  return h?.header && !h.title ? h.header : h;
}

function album(a) {
  const h = headerOf(a.header) || {};
  const cover = bestThumb(h.thumbnail);
  const artists = linksFrom(runsOf(h.strapline_text_one)).artists;
  const tracks = items(a.contents).map((t, i) => ({ ...t, art: t.art || cover, index: i + 1 }));
  return {
    kind: 'album',
    title: text(h.title),
    subtitle: text(h.subtitle),
    artistsText: text(h.strapline_text_one),
    artists,
    meta: text(h.second_subtitle),
    description: text(h.description?.description) || text(h.description),
    art: cover,
    tracks,
    play: tracks.find((t) => t.play)?.play || null,
    sections: sections(a.sections),
  };
}

function playlist(p) {
  const h = headerOf(p.header) || {};
  const tracks = items(p.items || p.contents);
  return {
    kind: 'playlist',
    title: text(h.title),
    subtitle: text(h.subtitle),
    artistsText: text(h.strapline_text_one),
    meta: text(h.second_subtitle),
    description: text(h.description?.description) || text(h.description),
    art: bestThumb(h.thumbnail),
    tracks: tracks.map((t, i) => ({ ...t, index: i + 1 })),
    play: tracks.find((t) => t.play)?.play || null,
    hasMore: !!p.has_continuation,
  };
}

function artist(a) {
  const h = a.header || {};
  return {
    kind: 'artist',
    name: text(h.title),
    description: text(h.description),
    banner: banner(h.thumbnail) || banner(h.foreground_thumbnail),
    shuffle: endpoint(h.play_button?.endpoint)?.endpoint || null,
    radio: endpoint(h.start_radio_button?.endpoint)?.endpoint || null,
    subscribers: text(h.subscription_button?.subscriber_count_text) || '',
    sections: sections(a.sections),
  };
}

function suggestions(list) {
  const queries = [];
  const found = [];
  for (const section of list || []) {
    for (const node of section.contents || []) {
      if (node.type === 'SearchSuggestion') queries.push(text(node.suggestion));
      else {
        const it = item(node);
        if (it) found.push(it);
      }
    }
  }
  return { queries, items: found };
}

module.exports = {
  text, art, bestThumb, banner, endpoint, kindOf, linksFrom, parseDuration,
  item, items, shelf, sections, album, playlist, artist, suggestions,
};
