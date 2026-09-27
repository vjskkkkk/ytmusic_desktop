import { go } from './router.svelte.js';
import { play } from './player.svelte.js';

// Where a YouTube Music link should take us inside the app.
export function openNav(nav) {
  if (!nav) return;
  if (nav.type === 'watch') {
    play(nav.endpoint);
    return;
  }
  if (nav.type === 'search') {
    go('search', nav.query);
    return;
  }
  const id = nav.browseId || '';
  const pt = nav.pageType || '';
  if (id === 'FEmusic_home') go('home');
  else if (id === 'FEmusic_explore') go('explore');
  else if (id === 'FEmusic_liked_videos' || id === 'VLLM') go('playlist', 'VLLM');
  else if (id.startsWith('MPRE') || pt.includes('ALBUM')) go('album', id);
  else if (id.startsWith('VL') || pt.includes('PLAYLIST') || pt.includes('PODCAST')) go('playlist', id);
  else if (id.startsWith('UC') || pt.includes('ARTIST') || pt.includes('USER_CHANNEL')) go('artist', id);
  else go('browse', id, nav.params);
}

// Clicking an item: songs and videos play, everything else opens its page.
export function openItem(item) {
  if (!item) return;
  if ((item.kind === 'song' || item.kind === 'video') && item.play) play(item.play);
  else openNav(item.nav);
}

export function openArtist(artist) {
  if (artist?.id) go('artist', artist.id);
}

export function openAlbum(album) {
  if (album?.id) go('album', album.id);
}
