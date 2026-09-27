// Unit tests for the youtubei.js → plain data conversion. The inputs mimic the shapes
// youtubei.js produces (see scripts/capture-fixtures.cjs for real captures).
import { describe, it, expect } from 'vitest';
import map from '../src/main/ytm-map.js';

const text = (t, runs) => ({ text: t, runs: runs || [{ text: t }] });
const browseEp = (browseId, pageType) => ({
  name: 'browseEndpoint',
  payload: {
    browseId,
    ...(pageType ? { browseEndpointContextSupportedConfigs: { browseEndpointContextMusicConfig: { pageType } } } : {}),
  },
});
const watchEp = (videoId, playlistId) => ({
  name: 'watchEndpoint',
  payload: { videoId, playlistId, loggingContext: { vss: {} }, params: 'wAEB' },
});
const thumbs = (base, sizes = [60, 120]) => sizes.map((s) => ({ url: `${base}=w${s}-h${s}-l90-rj`, width: s, height: s }));

describe('art', () => {
  it('asks Google image servers for a 544px square', () => {
    expect(map.art('https://lh3.googleusercontent.com/abc=w60-h60-l90-rj')).toBe('https://lh3.googleusercontent.com/abc=w544-h544-l90-rj');
    expect(map.art('https://yt3.ggpht.com/abc=s120')).toBe('https://yt3.ggpht.com/abc=s544');
    expect(map.art('//lh3.googleusercontent.com/abc')).toBe('https://lh3.googleusercontent.com/abc=w544-h544');
  });
  it('leaves video thumbnails alone', () => {
    expect(map.art('https://i.ytimg.com/vi/x/hqdefault.jpg')).toBe('https://i.ytimg.com/vi/x/hqdefault.jpg');
  });
  it('picks the largest thumbnail from either shape', () => {
    expect(map.bestThumb(thumbs('https://lh3.googleusercontent.com/a'))).toContain('=w544-h544');
    expect(map.bestThumb({ contents: thumbs('https://lh3.googleusercontent.com/b') })).toContain('/b=w544');
  });
});

describe('endpoint', () => {
  it('maps browse endpoints with their page type', () => {
    expect(map.endpoint(browseEp('MPREb_1', 'MUSIC_PAGE_TYPE_ALBUM'))).toEqual({
      type: 'browse', browseId: 'MPREb_1', params: undefined, pageType: 'MUSIC_PAGE_TYPE_ALBUM',
    });
  });
  it('keeps only the fields the engine needs from watch endpoints', () => {
    expect(map.endpoint(watchEp('v1', 'RD1'))).toEqual({
      type: 'watch', endpoint: { watchEndpoint: { videoId: 'v1', playlistId: 'RD1', params: 'wAEB' } },
    });
  });
  it('keeps playlist-only watch endpoints as watchPlaylistEndpoint', () => {
    expect(map.endpoint({ name: 'watchPlaylistEndpoint', payload: { playlistId: 'OLAK' } }).endpoint)
      .toEqual({ watchPlaylistEndpoint: { playlistId: 'OLAK' } });
  });
  it('returns null for nothing', () => {
    expect(map.endpoint(null)).toBeNull();
  });
});

describe('items', () => {
  it('maps a two-row album card', () => {
    const it = map.item({
      type: 'MusicTwoRowItem',
      item_type: 'album',
      id: 'MPREb_2',
      title: text('Demon Days'),
      subtitle: text('Album • Gorillaz', [
        { text: 'Album' }, { text: ' • ' },
        { text: 'Gorillaz', endpoint: browseEp('UCgor', 'MUSIC_PAGE_TYPE_ARTIST') },
      ]),
      endpoint: browseEp('MPREb_2', 'MUSIC_PAGE_TYPE_ALBUM'),
      thumbnail: thumbs('https://lh3.googleusercontent.com/dd'),
      thumbnail_overlay: { content: { endpoint: { name: 'watchPlaylistEndpoint', payload: { playlistId: 'OLAK5' } } } },
    });
    expect(it.kind).toBe('album');
    expect(it.title).toBe('Demon Days');
    expect(it.artists).toEqual([{ name: 'Gorillaz', id: 'UCgor' }]);
    expect(it.nav.browseId).toBe('MPREb_2');
    expect(it.play).toEqual({ watchPlaylistEndpoint: { playlistId: 'OLAK5' } });
  });

  it('maps a song row, falling back to subtitle runs for artists and album', () => {
    const it = map.item({
      type: 'MusicResponsiveListItem',
      item_type: 'song',
      id: 'song1',
      title: 'Instant Crush',
      artists: [],
      duration: { text: '5:38', seconds: 338 },
      flex_columns: [
        { title: text('Instant Crush') },
        { title: text('Daft Punk • Random Access Memories', [
          { text: 'Daft Punk', endpoint: browseEp('UCdp') },
          { text: ' • ' },
          { text: 'Random Access Memories', endpoint: browseEp('MPREb_ram') },
        ]) },
      ],
      thumbnail: { contents: thumbs('https://yt3.googleusercontent.com/s') },
    });
    expect(it).toMatchObject({
      kind: 'song',
      videoId: 'song1',
      title: 'Instant Crush',
      artists: [{ name: 'Daft Punk', id: 'UCdp' }],
      album: { name: 'Random Access Memories', id: 'MPREb_ram' },
      duration: 338,
      play: { watchEndpoint: { videoId: 'song1' } },
    });
  });

  it('prefers the overlay play endpoint so a playlist track plays in its playlist', () => {
    const it = map.item({
      type: 'MusicResponsiveListItem',
      item_type: 'song',
      id: 's2',
      title: 'Track',
      overlay: { content: { endpoint: watchEp('s2', 'PL123') } },
      flex_columns: [],
    });
    expect(it.play.watchEndpoint).toMatchObject({ videoId: 's2', playlistId: 'PL123' });
  });

  it('reads the duration from the fixed column when there is no duration field', () => {
    const it = map.item({
      type: 'MusicResponsiveListItem', item_type: 'song', id: 's3', title: 'x', flex_columns: [],
      fixed_columns: [{ title: text('1:02:03') }],
    });
    expect(it.duration).toBe(3723);
  });

  it('maps mood buttons with their colour', () => {
    expect(map.item({ type: 'MusicNavigationButton', button_text: 'Chill', color: 0xff1a2b3c, endpoint: browseEp('FEmusic_moods', undefined) }))
      .toMatchObject({ kind: 'mood', title: 'Chill', color: '#1a2b3c' });
  });

  it('ignores unknown node types', () => {
    expect(map.item({ type: 'Something' })).toBeNull();
  });
});

describe('sections', () => {
  const song = (id) => ({ type: 'MusicResponsiveListItem', item_type: 'song', id, title: id, flex_columns: [] });
  const card = (id) => ({ type: 'MusicTwoRowItem', item_type: 'playlist', id, title: text(id), endpoint: browseEp(`VL${id}`) });

  it('collects shelves in document order and picks a layout for each', () => {
    const page = {
      contents: [
        { type: 'MusicCarouselShelf', header: { title: text('Quick picks') }, num_items_per_column: '4', contents: [song('a'), song('b')] },
        { type: 'MusicCarouselShelf', header: { title: text('Mixed for you') }, contents: [card('p1')] },
        { type: 'Grid', items: [card('p2'), card('p3')] },
      ],
    };
    const out = map.sections(page);
    expect(out.map((s) => [s.title, s.style, s.items.length])).toEqual([
      ['Quick picks', 'songs', 2],
      ['Mixed for you', 'cards', 1],
      ['', 'grid', 2],
    ]);
    expect(out[0].rows).toBe(4);
  });

  it('gathers loose search results under the preceding empty heading', () => {
    const search = {
      contents: [
        { type: 'MusicShelf', title: text('Songs'), contents: [song('s1')] },
        { type: 'ItemSection', contents: [{ type: 'MusicShelf', title: text('More results'), contents: [] }] },
        { type: 'ItemSection', contents: [song('r1')] },
        { type: 'ItemSection', contents: [card('r2')] },
      ],
    };
    const out = map.sections(search);
    expect(out.map((s) => [s.title, s.items.length])).toEqual([['Songs', 1], ['More results', 2]]);
  });

  it('skips empty shelves and survives cycles', () => {
    const a = { type: 'ItemSection', contents: [] };
    a.contents.push(a);
    expect(map.sections({ contents: [a, { type: 'MusicShelf', title: text('Empty'), contents: [] }] })).toEqual([]);
  });
});

describe('pages', () => {
  it('maps an album with numbered tracks that fall back to the cover art', () => {
    const album = map.album({
      header: {
        title: text('Discovery'),
        subtitle: text('Album • 2001'),
        strapline_text_one: text('Daft Punk', [{ text: 'Daft Punk', endpoint: browseEp('UCdp') }]),
        second_subtitle: text('14 songs • 1 hour'),
        thumbnail: { contents: thumbs('https://yt3.googleusercontent.com/cover') },
      },
      contents: [
        { type: 'MusicResponsiveListItem', item_type: 'song', id: 't1', title: 'One More Time', overlay: { content: { endpoint: watchEp('t1', 'OLAK') } }, flex_columns: [] },
      ],
    });
    expect(album).toMatchObject({ title: 'Discovery', subtitle: 'Album • 2001', meta: '14 songs • 1 hour', artists: [{ name: 'Daft Punk', id: 'UCdp' }] });
    expect(album.tracks[0]).toMatchObject({ index: 1, art: album.art });
    expect(album.play.watchEndpoint.playlistId).toBe('OLAK');
  });

  it('unwraps the header of editable (own) playlists', () => {
    const p = map.playlist({ header: { header: { title: text('Road trip') } }, items: [], has_continuation: true });
    expect(p).toMatchObject({ title: 'Road trip', tracks: [], hasMore: true });
  });

  it('splits search suggestions into queries and items', () => {
    const s = map.suggestions([{ contents: [
      { type: 'SearchSuggestion', suggestion: text('daft punk') },
      { type: 'MusicTwoRowItem', item_type: 'artist', title: text('Daft Punk'), endpoint: browseEp('UCdp', 'MUSIC_PAGE_TYPE_ARTIST') },
    ] }]);
    expect(s.queries).toEqual(['daft punk']);
    expect(s.items[0]).toMatchObject({ kind: 'artist', title: 'Daft Punk' });
  });
});
