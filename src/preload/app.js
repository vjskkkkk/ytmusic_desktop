// Bridge for the main app UI. Only these calls are available to the page.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (fn) => {
  const handler = (_e, payload) => fn(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('ytm', {
  // data
  api: (method, ...args) => ipcRenderer.invoke('ytm:api', method, args),
  image: (url) => ipcRenderer.invoke('ytm:image', url),

  // player
  cmd: (name, arg) => ipcRenderer.send('player:cmd', name, arg),
  getPlayer: () => ipcRenderer.invoke('player:get'),
  onState: on('player:state'),
  onQueue: on('player:queue'),

  // account
  isSignedIn: () => ipcRenderer.invoke('auth:status'),
  signIn: () => ipcRenderer.send('auth:signin'),
  onAuth: on('auth:changed'),
  showClassicView: () => ipcRenderer.send('engine:show'),

  // windows
  showMini: () => ipcRenderer.send('mini:show'),
  setTitleBar: (color, symbolColor) => ipcRenderer.send('app:titlebar', color, symbolColor),
  openExternal: (url) => ipcRenderer.send('app:open-external', url),

  // settings, themes, skins
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  onSettings: on('settings:changed'),
  userThemes: () => ipcRenderer.invoke('themes:list'),
  openThemesFolder: () => ipcRenderer.send('themes:open-folder'),
  skins: () => ipcRenderer.invoke('skins:list'),
  importSkin: () => ipcRenderer.invoke('skins:import'),
  deleteSkin: (file) => ipcRenderer.invoke('skins:delete', file),
  selectSkin: (file) => ipcRenderer.send('skins:select', file),
  currentSkin: () => ipcRenderer.invoke('skins:current'),
});
