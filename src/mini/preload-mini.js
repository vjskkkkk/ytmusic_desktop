const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mini', {
  onState: (fn) => ipcRenderer.on('mini:state', (_e, s) => fn(s)),
  onPinned: (fn) => ipcRenderer.on('mini:pinned', (_e, p) => fn(p)),
  onHover: (fn) => ipcRenderer.on('mini:hover', (_e, h) => fn(h)),
  cmd: (name, arg) => ipcRenderer.send('mini:cmd', name, arg),
  expand: () => ipcRenderer.send('mini:expand'),
  togglePin: () => ipcRenderer.send('mini:toggle-pin'),
});
