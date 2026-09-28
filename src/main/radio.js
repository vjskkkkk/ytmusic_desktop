// World radio from the community Radio Browser directory (https://api.radio-browser.info).
// Fetched here in the main process so the app page's CSP stays tight.
const { net, app } = require('electron');
const dns = require('dns').promises;
const { GENRES, mapStations } = require('./radio-map');

const FALLBACK_SERVERS = ['de1.api.radio-browser.info', 'fi1.api.radio-browser.info', 'nl1.api.radio-browser.info'];
const TIMEOUT_MS = 10000;

let servers = null;
async function serverList() {
  if (servers) return servers;
  let found = [];
  try {
    found = (await dns.resolveSrv('_api._tcp.radio-browser.info')).map((r) => r.name);
  } catch {
    // DNS SRV blocked on some networks; the fixed list still works
  }
  const list = [...new Set([...found, ...FALLBACK_SERVERS])];
  // The API asks clients to spread load across servers.
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  servers = list;
  return servers;
}

async function get(pathAndQuery) {
  const list = await serverList();
  let lastErr;
  for (const host of list) {
    try {
      const res = await net.fetch(`https://${host}${pathAndQuery}`, {
        headers: { 'User-Agent': `YTMini/${app.getVersion()}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Radio directory returned ${res.status}`);
      // Move the working server to the front for next time.
      servers = [host, ...list.filter((h) => h !== host)];
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(lastErr?.message ? `Radio directory unavailable (${lastErr.message})` : 'Radio directory unavailable');
}

const qs = (o) => new URLSearchParams(o).toString();
const BASE = { hidebroken: 'true', order: 'clickcount', reverse: 'true', limit: '120' };

const api = {
  async genres() {
    return GENRES;
  },

  async stations(tag) {
    if (typeof tag !== 'string' || !tag || tag.length > 60) return [];
    return mapStations(await get(`/json/stations/search?${qs({ ...BASE, tag: tag.toLowerCase(), tagExact: 'true' })}`)).slice(0, 80);
  },

  async search(query) {
    if (typeof query !== 'string' || !query.trim() || query.length > 100) return [];
    return mapStations(await get(`/json/stations/search?${qs({ ...BASE, name: query.trim() })}`)).slice(0, 80);
  },

  // Tell the directory a station was played; this is how its popularity ranking works.
  async click(id) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return false;
    try {
      await get(`/json/url/${id}`);
    } catch {
      // not important
    }
    return true;
  },
};

function call(method, args) {
  if (!Object.hasOwn(api, method)) throw new Error(`Unknown radio method: ${method}`);
  return api[method](...args);
}

module.exports = { call };
