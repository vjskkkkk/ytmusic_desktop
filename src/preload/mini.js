// Bridge for both mini players (modern and classic).
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const on = (channel) => (fn) => {
  const handler = (_e, payload) => fn(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('mini', {
  onState: on('player:state'),
  onQueue: on('player:queue'),
  onViz: on('player:viz'),
  onPinned: on('mini:pinned'),
  onHover: on('mini:hover'),
  onSettings: on('settings:changed'),
  onSkin: on('skins:changed'),
  cmd: (name, arg) => ipcRenderer.send('player:cmd', name, arg),
  getPlayer: () => ipcRenderer.invoke('player:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  image: (url) => ipcRenderer.invoke('ytm:image', url),
  expand: () => ipcRenderer.send('mini:expand'),
  togglePin: () => ipcRenderer.send('mini:toggle-pin'),

  // classic (Webamp) window
  currentSkin: () => ipcRenderer.invoke('skins:current'),
  importSkinFile: (file) => ipcRenderer.invoke('skins:import-path', webUtils.getPathForFile(file)),
  resize: (width, height) => ipcRenderer.send('classic:resize', width, height),
  minimize: () => ipcRenderer.send('classic:minimize'),
  menu: () => ipcRenderer.send('classic:menu'),
});
