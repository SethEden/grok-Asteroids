// src/main.js
import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
// import * as engineModule from './engine.js'; // Direct import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const windows = [];
let controlWindow;

const createControlWindow = async () => {
  controlWindow = new BrowserWindow({
    width: 300,
    height: 50,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const mainUrl = new URL(`file://${path.join(__dirname, '../public/main.html')}`).href;
  console.log('Main: Loading control window URL:', mainUrl);
  await controlWindow.loadURL(mainUrl);
  console.log('Main: mainUrl file loaded!');

  controlWindow.webContents.on('did-finish-load', async () => {
    const { screen } = await import('electron');
    const displays = screen.getAllDisplays();
    console.log('Main: Control window loaded, webContents.id:', controlWindow.webContents.id);
    console.log('Main: Detected displays:', displays.map(d => `ID: ${d.id}, Bounds: ${d.bounds.x},${d.bounds.y},${d.bounds.width},${d.bounds.height}`));
    controlWindow.webContents.executeJavaScript('console.log("Main: Control window renderer loaded successfully")');
    console.log('Main: Control window renderer loaded successfully');
    
    // Increase the delay to ensure the canvas is ready
    console.log('calling setTimeout async to initialize the engine');
    setTimeout(async () => {
      console.log('Main: Initializing engine with displays');
      try {
        const displays = await window.electronAPI.screen.getAllDisplays(); // Assuming Electron API usage
        const canvasId = 'renderCanvas';
        const displayData = displays.map(d => ({ id: d.id, bounds: { ...d.bounds } }));
        console.log('Main: Sending initialize-engine with displays:', JSON.stringify(displayData, null, 2));
        controlWindow.webContents.send('initialize-engine', { canvasId, displays: displayData });
        console.log('Main: Sent initialize-engine to control window');
      } catch (error) {
        console.error('Main: Error initializing engine:', error);
      }
      controlWindow.webContents.send('control-info', { isControl: true });
      console.log('Main: Sent control-info to control window');
    }, 2000); // Increased delay to 2000ms
    
    controlWindow.webContents.openDevTools();
  });

  // Fallback mechanism to check if the page has loaded after a certain timeout
  setTimeout(async () => {
    if (!controlWindow.webContents.isLoading()) {
      console.log('Main: Fallback - Control window loaded (timeout)');
      controlWindow.webContents.executeJavaScript('console.log("Main: Control window renderer loaded successfully (fallback)")');
      
      // Increase the delay to ensure the canvas is ready
      console.log('calling setTimeout async to initialize the engine (fallback)');
      setTimeout(async () => {
        console.log('Main: Initializing engine directly (fallback)');
        try {
          const canvasId = 'renderCanvas';
          const displays = []; // Pass the displays information if needed
          controlWindow.webContents.send('initialize-engine', { canvasId, displays });
          console.log('Main: Sent initialize-engine to control window (fallback)');
        } catch (error) {
          console.error('Main: Error initializing engine (fallback):', error);
        }
        controlWindow.webContents.send('control-info', { isControl: true });
        console.log('Main: Sent control-info to control window (fallback)');
      }, 2000); // Increased delay to 2000ms
      
      controlWindow.webContents.openDevTools();
    }
  }, 5000); // Fallback timeout of 5000ms

  controlWindow.on('closed', () => {
    controlWindow = null;
    windows.forEach(({ window }) => window.close());
    app.quit();
  });

  return controlWindow;
};

const createGameWindows = async () => {
  try {
    const { screen } = await import('electron');
    const displays = screen.getAllDisplays();
    const sortedDisplays = [...displays].sort((a, b) => a.bounds.x - b.bounds.x);

    displays.forEach((display, index) => {
      console.log(`Display ${index}: ID ${display.id}, Bounds ${display.bounds.x}, ${display.bounds.y}`);
      const window = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      window.loadURL(
        new URL(`file://${path.join(__dirname, '../public/index.html')}`).href
      );

      windows.push({ window, displayId: display.id, bounds: display.bounds });

      window.on('closed', () => {
        windows.splice(windows.findIndex(w => w.displayId === display.id), 1);
        if (controlWindow) controlWindow.close();
      });

      window.webContents.on('did-finish-load', () => {
        console.log(`Main: Game window ${index} loaded`);
        const minX = Math.min(...sortedDisplays.map(d => d.bounds.x));
        const worldXOffset = display.bounds.x - minX;
        window.webContents.send('display-info', {
          displays: sortedDisplays.map(d => ({ id: d.id, bounds: d.bounds })),
          currentDisplayId: display.id,
          worldXOffset,
          screenWidth: display.bounds.width,
          screenHeight: display.bounds.height,
          worldWidth: sortedDisplays.reduce((sum, d) => sum + d.bounds.width, 0),
          worldHeight: sortedDisplays[0].bounds.height,
        });
        window.webContents.openDevTools();
      });
    });

    ipcMain.on('canvas-ready', (event, { displayId }) => {
      if (controlWindow && !controlWindow.isDestroyed()) {
        console.log(`Main: Sending add-canvas for display ${displayId}`);
        controlWindow.webContents.send('add-canvas', { displayId });
      } else {
        console.log('Main: Control window not available for add-canvas');
      }
    });

    ipcMain.on('broadcast-keydown', (event, key) => {
      windows.forEach(({ window }) => {
        if (!window.isDestroyed()) window.webContents.send('broadcast-keydown', key);
      });
      if (controlWindow && !controlWindow.isDestroyed()) controlWindow.webContents.send('broadcast-keydown', key);
    });

    ipcMain.on('broadcast-keyup', (event, key) => {
      windows.forEach(({ window }) => {
        if (!window.isDestroyed()) window.webContents.send('broadcast-keyup', key);
      });
      if (controlWindow && !controlWindow.isDestroyed()) controlWindow.webContents.send('broadcast-keyup', key);
    });

    ipcMain.on('mousemove', (event, { x, y, displayId }) => {
      if (controlWindow && !controlWindow.isDestroyed()) controlWindow.webContents.send('mousemove', { x, y, displayId });
    });

    ipcMain.on('log', (event, message) => {
      console.log(`Renderer Log: ${message}`);
    });

    ipcMain.on('render-frame', (event, entities) => {
      console.log(`Main: Broadcasting render-frame, entities: ${entities.length}`);
      windows.forEach(({ window }) => {
        if (!window.isDestroyed()) window.webContents.send('render-frame', entities);
      });
    });

    ipcMain.on('canvas-added', (event, { displayId }) => {
      const win = windows.find(w => w.displayId === displayId);
      if (win) {
        console.log(`Main: Sending canvas-added for display ${displayId}`);
        win.window.webContents.send('canvas-added');
      }
    });
  } catch (err) {
    console.error('Failed to create game windows:', err);
    throw err;
  }
};

app.whenReady().then(async () => {
  await createControlWindow();
  createGameWindows().catch(err => {
    console.error('App startup failed:', err);
    process.exit(1);
  });
});

ipcMain.on('engine-ready', () => {
  console.log('Main: Engine is ready, sending real displays');
  const displays = screen.getAllDisplays();
  const displayData = displays.map(d => ({ id: d.id, bounds: d.bounds }));
    console.log('Main: Sending update-displays with', displayData.length, 'displays');
    controlWindow.webContents.send('update-displays', { displays: displayData });
});

app.on('activate', async () => {
  if (!controlWindow) {
    await createControlWindow();
    createGameWindows().catch(err => {
      console.error('App reactivation failed:', err);
    });
  }
});