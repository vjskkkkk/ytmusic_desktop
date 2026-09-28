// Turns Radio Browser (https://api.radio-browser.info) responses into plain data for the UI.

// Genres shown as tiles. `tag` is the Radio Browser tag; `hue` colours the tile.
const GENRES = [
  { tag: 'pop', name: 'Pop', hue: 330 },
  { tag: 'rock', name: 'Rock', hue: 8 },
  { tag: 'jazz', name: 'Jazz', hue: 40 },
  { tag: 'classical', name: 'Classical', hue: 50 },
  { tag: 'electronic', name: 'Electronic', hue: 190 },
  { tag: 'hiphop', name: 'Hip hop', hue: 275 },
  { tag: 'lofi', name: 'Lo-fi', hue: 250 },
  { tag: 'ambient', name: 'Ambient', hue: 170 },
  { tag: 'bollywood', name: 'Bollywood', hue: 20 },
  { tag: 'indie', name: 'Indie', hue: 140 },
  { tag: 'metal', name: 'Metal', hue: 0 },
  { tag: 'country', name: 'Country', hue: 30 },
  { tag: 'reggae', name: 'Reggae', hue: 110 },
  { tag: 'latin', name: 'Latin', hue: 350 },
  { tag: 'blues', name: 'Blues', hue: 220 },
  { tag: 'soul', name: 'Soul', hue: 300 },
  { tag: 'funk', name: 'Funk', hue: 60 },
  { tag: 'house', name: 'House', hue: 200 },
  { tag: 'techno', name: 'Techno', hue: 230 },
  { tag: 'chillout', name: 'Chillout', hue: 160 },
  { tag: '80s', name: '80s', hue: 315 },
  { tag: '90s', name: '90s', hue: 265 },
  { tag: 'news', name: 'News', hue: 210 },
  { tag: 'talk', name: 'Talk', hue: 90 },
];

// Chromium plays these natively; HLS playlists and exotic codecs need extra libraries.
const PLAYABLE = /^(mp3|aac|aac\+|he-aac|ogg|opus|vorbis)$/i;

function mapStation(s) {
  const stream = s.url_resolved || s.url || '';
  return {
    id: s.stationuuid,
    name: (s.name || '').trim() || 'Unnamed station',
    stream,
    favicon: /^https:\/\//i.test(s.favicon || '') ? s.favicon : '',
    homepage: s.homepage || '',
    country: s.country || '',
    countrycode: s.countrycode || '',
    tags: (s.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4),
    codec: s.codec || '',
    bitrate: Number(s.bitrate) || 0,
  };
}

function playable(s) {
  return !!s && !s.hls && PLAYABLE.test(s.codec || '') && /^https?:\/\//i.test(s.url_resolved || s.url || '') &&
    s.lastcheckok !== 0;
}

// Same stream listed twice (mirrors, re-submissions): keep the first, which has more clicks.
function mapStations(list) {
  const seen = new Set();
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (!playable(s)) continue;
    const m = mapStation(s);
    const key = `${m.name.toLowerCase()}|${m.stream}`;
    if (seen.has(key) || seen.has(m.stream)) continue;
    seen.add(key);
    seen.add(m.stream);
    out.push(m);
  }
  return out;
}

module.exports = { GENRES, mapStation, mapStations, playable };
