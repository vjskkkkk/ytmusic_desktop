// Tiny hash router: #/name/param1/param2
export const route = $state({ name: 'home', params: [], key: '' });

function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter((p) => p !== '');
  route.name = parts[0] || 'home';
  route.params = parts.slice(1).map((p) => decodeURIComponent(p));
  route.key = location.hash;
}

window.addEventListener('hashchange', parse);
parse();

export function go(...parts) {
  const hash = `#/${parts.filter((p) => p !== undefined && p !== null && p !== '').map((p) => encodeURIComponent(p)).join('/')}`;
  if (location.hash !== hash) location.hash = hash;
}

export const back = () => history.back();
export const forward = () => history.forward();
