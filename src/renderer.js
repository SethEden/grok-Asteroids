import { createApp } from 'vue';
import App from './App.vue';
import { engine } from './engine.js';

try {
  console.log('Renderer: Before app mount (direct log)');
  const app = createApp(App);
  app.mount('#app');

  const canvas = document.getElementById('renderCanvas');
  if (!canvas) throw new Error('Canvas not found!');

  console.log('Renderer: Starting up (direct log)');
  window.electronAPI.ipcRenderer.send('log', 'Renderer: Starting up');

  let engineInstance;

  window.electronAPI.ipcRenderer.on('initialize-engine', async (event, { canvasId, displays }) => {
    console.log('Renderer: Received initialize-engine with displays:', displays.length);
    window.electronAPI.ipcRenderer.send('log', `Renderer: Received initialize-engine with ${displays.length} displays`);
    try {
      engineInstance = await engine(canvas, displays);
      console.log('Renderer: After calling engine');
      window.electronAPI.ipcRenderer.send('log', 'Renderer: Engine initialized');
    } catch (err) {
      console.error('Engine init failed:', err);
      window.electronAPI.ipcRenderer.send('log', `Renderer: Engine init failed: ${err.message}`);
    }
  });

  window.electronAPI.ipcRenderer.on('control-info', (event, { isControl }) => {
    console.log('Renderer: Received control-info (direct log)');
    window.electronAPI.ipcRenderer.send('log', 'Renderer: Control window ready');
  });

  window.electronAPI.ipcRenderer.on('display-info', (event, { displays, currentDisplayId, worldXOffset, screenWidth, screenHeight, worldWidth, worldHeight }) => {
    window.displayId = currentDisplayId;
    console.log(`Renderer: Received display-info for ${currentDisplayId}, displays: ${displays ? displays.length : 'undefined'}`);
    window.electronAPI.ipcRenderer.send('log', `Renderer: Received display-info for ${currentDisplayId}, displays: ${displays.length}`);
    if (!displays || !Array.isArray(displays)) {
      console.error('Renderer: Displays invalid in display-info:', displays);
      return;
    }
    const display = displays.find(d => d.id === currentDisplayId);
    const bounds = display && display.bounds ? display.bounds : { x: 0, y: 0, width: screenWidth, height: screenHeight };
    window.electronAPI.ipcRenderer.send('log', `Renderer: Sending canvas-ready for display ${currentDisplayId}`);
    window.electronAPI.ipcRenderer.send('canvas-ready', { displayId: currentDisplayId, bounds });

    window.electronAPI.ipcRenderer.on('canvas-added', () => {
      window.electronAPI.ipcRenderer.send('log', `Renderer: Canvas added for display ${currentDisplayId}`);
    });

    window.electronAPI.ipcRenderer.on('render-frame', (event, entityData) => {
      window.electronAPI.ipcRenderer.send('log', `Renderer: Render frame received for display ${currentDisplayId}, entities: ${entityData.length}`);
    });
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (window.displayId) {
      window.electronAPI.ipcRenderer.send('mousemove', { x, y, displayId: window.displayId });
    }
  });

  canvas.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key) window.electronAPI.ipcRenderer.send('broadcast-keydown', key);
  });

  canvas.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key) window.electronAPI.ipcRenderer.send('broadcast-keyup', key);
  });
} catch (err) {
  console.error('Renderer: Initialization error:', err);
  window.electronAPI.ipcRenderer.send('log', `Renderer: Initialization error: ${err.message}`);
}