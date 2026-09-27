// Stand-in for window.ytm when the UI runs outside Electron (?fixtures in the URL, dev only).
// Serves saved API responses from test/fixtures/live/<method>.json, captured by
// scripts/capture-fixtures.cjs. Those files hold personal library data and are git-ignored.
const files = import.meta.env.DEV ? import.meta.glob('../../../../test/fixtures/live/*.json') : {};

async function load(name) {
  const f = files[`../../../../test/fixtures/live/${name}.json`];
  return f ? (await f()).default : null;
}

const EMPTY = {
  home: { chips: [], sections: [], more: false },
  explore: { buttons: [], sections: [] },
  browse: { title: '', sections: [] },
  library: { title: '', sections: [] },
  search: { sections: [] },
  suggest: { queries: [], items: [] },
  lyrics: null,
  related: { sections: [] },
};

export function fixtureBridge() {
  const params = new URLSearchParams(location.search);
  const off = () => () => {};
  return {
    api: async (method) => (await load(method)) ?? EMPTY[method] ?? null,
    image: async () => null,
    cmd: () => {},
    getPlayer: async () => (await load('player')) ?? { state: { hasTrack: false }, queue: [] },
    onState: off,
    onQueue: off,
    isSignedIn: async () => params.get('signedout') === null,
    signIn: () => {},
    onAuth: off,
    showClassicView: () => {},
    showMini: () => {},
    setTitleBar: () => {},
    openExternal: () => {},
    getSettings: async () => ({
      theme: params.get('theme') || 'midnight',
      miniStyle: 'modern',
      classicScale: 1,
      classicArt: true,
      minimizeToMini: true,
      miniOnTop: true,
      skin: null,
    }),
    setSetting: async () => true,
    onSettings: off,
    userThemes: async () => [],
    openThemesFolder: () => {},
    skins: async () => [],
    importSkin: async () => null,
    deleteSkin: async () => true,
    selectSkin: () => {},
    currentSkin: async () => null,
  };
}
