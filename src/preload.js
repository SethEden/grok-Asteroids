// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Polyfill global before renderer bundle loads
globalThis.global = globalThis;

contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data), // Keep for engine.js
  },
});