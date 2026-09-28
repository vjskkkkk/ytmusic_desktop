export function time(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export const artistNames = (item) =>
  item?.artists?.length ? item.artists.map((a) => a.name).join(', ') : item?.subtitle || '';

export function greeting(date = new Date(), name = '') {
  const h = date.getHours();
  const base = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const first = (name || '').trim();
  return first ? `${base}, ${first}` : base;
}
