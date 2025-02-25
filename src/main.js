// src/main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const windows = [];
let mainWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 50,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(
    new URL(`file://${path.join(__dirname, '../public/main.html')}`).href
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeGameWindows();
    app.quit();
  });

  // Focus main window to capture keys
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.focus();
  });
};

const createGameWindows = async () => {
  const { screen } = await import('electron');
  const displays = screen.getAllDisplays();

  displays.forEach((display, index) => {
    console.log(`Display ${index}: ID ${display.id}, Bounds ${display.bounds.x}, ${display.bounds.y}`);
    const window = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    window.loadURL(
      new URL(`file://${path.join(__dirname, '../public/index.html')}`).href
    );

    windows.push({ window, displayId: index, bounds: display.bounds });

    window.on('closed', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
    });

    window.webContents.on('did-finish-load', () => {
      window.webContents.send('display-info', {
        displays: windows.map(w => ({ id: w.displayId, bounds: w.bounds })),
        currentDisplayId: index,
      });
    });
  });

  return windows;
};

const closeGameWindows = () => {
  while (windows.length > 0) {
    const { window } = windows.pop();
    if (!window.isDestroyed()) window.close();
  }
};

app.whenReady().then(() => {
  createMainWindow();
  createGameWindows().catch(err => {
    throw new Error(`Failed to create game windows: ${err}`);
  });

  ipcMain.on('update-player-position', (event, pos) => {
    windows.forEach(({ window }) => {
      if (!window.isDestroyed()) {
        window.webContents.send('sync-player-position', pos);
      }
    });
  });

  ipcMain.on('sync-target-position', (event, pos) => {
    windows.forEach(({ window }) => {
      if (!window.isDestroyed()) {
        window.webContents.send('sync-target-position', pos);
      }
    });
  });

  ipcMain.on('keydown', (event, key) => {
    windows.forEach(({ window }) => {
      if (!window.isDestroyed()) {
        window.webContents.send('broadcast-keydown', key);
      }
    });
  });

  ipcMain.on('keyup', (event, key) => {
    windows.forEach(({ window }) => {
      if (!window.isDestroyed()) {
        window.webContents.send('broadcast-keyup', key);
      }
    });
  });

  ipcMain.on('log', (event, message) => {
    console.log(message);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
});

app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow();
    createGameWindows().catch(err => {
      throw new Error(`Failed to recreate windows: ${err}`);
    });
  }
});