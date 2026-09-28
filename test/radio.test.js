import { describe, it, expect } from 'vitest';
import { mapStations, mapStation, GENRES } from '../src/main/radio-map.js';
import { greeting } from '../src/renderer/app/lib/format.js';

const station = (over = {}) => ({
  stationuuid: '96062a7b-0601-11e8-ae97-52543be04c81',
  name: '  Jazz FM  ',
  url: 'http://example.com/pls',
  url_resolved: 'https://stream.example.com/jazz.mp3',
  favicon: 'https://example.com/logo.png',
  homepage: 'https://example.com',
  country: 'United Kingdom',
  countrycode: 'GB',
  tags: 'jazz, smooth jazz,soul,,blues,funk',
  codec: 'MP3',
  bitrate: 128,
  hls: 0,
  lastcheckok: 1,
  ...over,
});

describe('radio station mapping', () => {
  it('maps the fields the UI needs', () => {
    expect(mapStation(station())).toEqual({
      id: '96062a7b-0601-11e8-ae97-52543be04c81',
      name: 'Jazz FM',
      stream: 'https://stream.example.com/jazz.mp3',
      favicon: 'https://example.com/logo.png',
      homepage: 'https://example.com',
      country: 'United Kingdom',
      countrycode: 'GB',
      tags: ['jazz', 'smooth jazz', 'soul', 'blues'],
      codec: 'MP3',
      bitrate: 128,
    });
  });

  it('drops insecure favicons (the page only loads https images)', () => {
    expect(mapStation(station({ favicon: 'http://example.com/logo.png' })).favicon).toBe('');
  });

  it('keeps only streams Chromium can play', () => {
    const list = mapStations([
      station({ stationuuid: 'a', url_resolved: 'https://a/1' }),
      station({ stationuuid: 'b', url_resolved: 'https://b/1', hls: 1 }),
      station({ stationuuid: 'c', url_resolved: 'https://c/1', codec: 'UNKNOWN' }),
      station({ stationuuid: 'd', url_resolved: 'https://d/1', codec: 'AAC+' }),
      station({ stationuuid: 'e', url_resolved: 'rtmp://e/1' }),
      station({ stationuuid: 'f', url_resolved: 'https://f/1', lastcheckok: 0 }),
    ]);
    expect(list.map((s) => s.id)).toEqual(['a', 'd']);
  });

  it('removes duplicate streams, keeping the first (most played)', () => {
    const list = mapStations([
      station({ stationuuid: 'a', name: 'One' }),
      station({ stationuuid: 'b', name: 'One (mirror)' }),
      station({ stationuuid: 'c', name: 'Two', url_resolved: 'https://other/2' }),
    ]);
    expect(list.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('copes with bad input', () => {
    expect(mapStations(null)).toEqual([]);
    expect(mapStations([null, {}])).toEqual([]);
  });

  it('has unique genre tags', () => {
    expect(new Set(GENRES.map((g) => g.tag)).size).toBe(GENRES.length);
  });
});

describe('greeting', () => {
  const at = (h) => new Date(2026, 8, 29, h);
  it('uses the first name when there is one', () => {
    expect(greeting(at(20), 'Vikram')).toBe('Good evening, Vikram');
    expect(greeting(at(9), '  Vikram ')).toBe('Good morning, Vikram');
  });
  it('falls back to the plain greeting', () => {
    expect(greeting(at(14))).toBe('Good afternoon');
    expect(greeting(at(3), '')).toBe('Up late');
  });
});
