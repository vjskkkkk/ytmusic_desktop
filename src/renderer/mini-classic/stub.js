// Stand-in for window.mini when the classic player runs outside Electron (Vite dev server),
// fed by the captured fixtures. Dev only.
const files = import.meta.env.DEV ? import.meta.glob('../../../test/fixtures/live/player.json') : {};

export function stubBridge() {
  const off = () => () => {};
  const params = new URLSearchParams(location.search);
  return {
    cmd: (...a) => console.log('cmd', ...a),
    getPlayer: async () => {
      const f = Object.values(files)[0];
      return f ? (await f()).default : { state: { hasTrack: false }, queue: [] };
    },
    getSettings: async () => ({ classicArt: params.get('art') !== '0', classicScale: 1 }),
    currentSkin: async () => null,
    onState: off,
    onQueue: off,
    onSettings: off,
    onSkin: off,
    onPinned: off,
    onHover: off,
    expand: () => {},
    minimize: () => {},
    menu: () => {},
    resize: (w, h) => { document.title = `${w}x${h}`; },
    importSkinFile: async () => null,
    setSetting: async () => true,
    image: async () => null,
    togglePin: () => {},
  };
}
