import * as BABYLON from 'babylonjs';
import { createEntities } from './entities.js';
import { updateMovement } from './systems/movement.js';
import { updateRendering } from './systems/rendering.js';
import { setupInput, updateInput } from './systems/input.js';
import { setEntities, getEntities } from './state.js';

console.log('Engine: init for engine.js (direct log)');
window.electronAPI.ipcRenderer.send('log', 'Engine: init for engine.js');

export const engine = async (canvas, displays) => {
  console.log('Engine: Initializing in control window (direct log)');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Initializing in control window');

  if (!canvas) {
    console.error('Engine: Canvas element is null or undefined');
    window.electronAPI.ipcRenderer.send('log', 'Engine: Canvas element is null or undefined');
    return;
  }

  if (!displays || displays.length === 0) {
    console.warn('Engine: Displays array is null or empty, adding dummy display');
    window.electronAPI.ipcRenderer.send('log', 'Engine: Displays array is null or empty, adding dummy display');
    displays = [{
      id: 'dummy',
      bounds: { x: 0, y: 0, width: canvas.width, height: canvas.height }
    }];
  }

  console.log('Engine: Creating Babylon engine');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Creating Babylon engine');
  const babylonEngine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(babylonEngine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

  console.log('Engine: Babylon engine and scene created');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Babylon engine and scene created');

  console.log('Engine: Creating entities');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Creating entities');
  const entities = createEntities({ BABYLON, scene });
  setEntities(entities);

  if (!entities || entities.length === 0) {
    console.error('Engine: Entities array is null or empty');
    window.electronAPI.ipcRenderer.send('log', 'Engine: Entities array is null or empty');
    return;
  }

  console.log('Engine: Setting up input system');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Setting up input system');
  const inputSystem = setupInput(getEntities(), { canvas, displays, currentDisplayId: displays[0].id });
  inputSystem.initialize(scene);

  console.log('Engine: Setting up systems');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Setting up systems');
  const systems = [
    updateMovement,
    updateRendering({ BABYLON, scene, camera: null, canvas }),
    updateInput,
  ];

  // Dummy camera for control window
  console.log('Engine: Creating dummy camera');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Creating dummy camera');
  const dummyCamera = new BABYLON.FreeCamera('dummy', new BABYLON.Vector3(0, 0, -500), scene);
  dummyCamera.setTarget(new BABYLON.Vector3(0, 0, -300));
  dummyCamera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
  scene.activeCameras.push(dummyCamera);

  // Signal that the engine is ready
  window.electronAPI.ipcRenderer.send('engine-ready');

  // Add the updateDisplays function
  const updateDisplays = (realDisplays) => {
    console.log('Engine: Updating displays with real data:', realDisplays.length);
    window.electronAPI.ipcRenderer.send('log', `Engine: Updating with ${realDisplays.length} displays`);
    // Clear dummy camera
    scene.activeCameras = [];
    // Configure real displays
    realDisplays.forEach((display) => {
      const camera = new BABYLON.FreeCamera(`camera_${display.id}`, new BABYLON.Vector3(0, 0, -500), scene);
      camera.setTarget(new BABYLON.Vector3(0, 0, -300));
      camera.viewport = new BABYLON.Viewport(0, 0, 1, 1); // Adjust viewport as needed
      scene.activeCameras.push(camera);
      // Add your multi-monitor logic here if needed
    });
  };

  console.log('Engine: Starting render loop');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Starting render loop');
  let lastTime = performance.now();
  const run = () => {
    const loop = () => {
      const currentTime = performance.now();
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
  
      const currentEntities = getEntities();
      if (!currentEntities || currentEntities.length === 0) {
        console.warn('Engine: No entities to render, skipping frame');
        requestAnimationFrame(loop); // Keep looping
        return;
      }
  
      systems[0](currentEntities, delta, { worldWidth: canvas.width, worldHeight: canvas.height, wrap: true });
      systems[1](currentEntities);
      systems[2](currentEntities);
      window.electronAPI.ipcRenderer.send('render-frame', currentEntities.map(e => ({
        id: e.id,
        position: { x: e.position.x, y: e.position.y },
        rotation: e.renderable?.renderObject.rotation.z || 0,
      })));
  
      babylonEngine.runRenderLoop(() => {
        scene.render();
        window.electronAPI.ipcRenderer.send('log', `Engine: Frame rendered, entities=${currentEntities.length}`);
      });
    };
    loop();
  
    return () => {
      babylonEngine.stopRenderLoop();
      scene.dispose();
      babylonEngine.dispose();
      window.electronAPI.ipcRenderer.send('log', 'Engine: Stopped');
    };
  };

  console.log('Engine: Starting render loop');
  window.electronAPI.ipcRenderer.send('log', 'Engine: Starting render loop');
  const stopEngine = run();

  window.onbeforeunload = () => {
    stopEngine();
  };

  return { stopEngine, scene, babylonEngine, updateDisplays };
};