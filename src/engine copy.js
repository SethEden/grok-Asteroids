// src/engine.js
import * as BABYLON from 'babylonjs';
import { createEntities } from './entities.js';
import { updateMovement } from './systems/movement.js';
import { updateRendering } from './systems/rendering.js';
import { setupInput, updateInput } from './systems/input.js';
import { setEntities, sharedEntities } from './state.js';

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

  console.log('Engine: Creating Babylon engine');
  const babylonEngine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(babylonEngine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

  console.log('Engine: Sorting displays');
  const sortedDisplays = [...displays].sort((a, b) => a.bounds.x - b.bounds.x);
  const minX = Math.min(...sortedDisplays.map(d => d.bounds.x));
  const worldWidth = sortedDisplays.reduce((sum, d) => sum + d.bounds.width, 0);
  const worldHeight = sortedDisplays[0].bounds.height;

  console.log('Engine: Creating entities');
  const entities = createEntities({ BABYLON, scene });
  setEntities(entities);
  const inputSystem = setupInput(entities, { canvas, displays: sortedDisplays, currentDisplayId: 0 });
  inputSystem.initialize(scene);

  console.log('Engine: Setting up systems');
  const systems = [
    updateMovement,
    updateRendering({ BABYLON, scene, camera: null, canvas }),
    updateInput,
  ];

  // Dummy camera for control window
  console.log('Engine: Creating dummy camera');
  const dummyCamera = new BABYLON.FreeCamera('dummy', new BABYLON.Vector3(0, 0, -500), scene);
  dummyCamera.setTarget(new BABYLON.Vector3(0, 0, -300));
  dummyCamera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
  scene.activeCameras.push(dummyCamera);

  let lastTime = performance.now();
  const run = () => {
    const loop = () => {
      const currentTime = performance.now();
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      systems[0](entities, delta, { worldWidth, worldHeight, wrap: true });
      systems[1](entities);
      systems[2](entities);
      window.electronAPI.ipcRenderer.send('render-frame', entities.map(e => ({
        id: e.id,
        position: { x: e.position.x, y: e.position.y },
        rotation: e.renderable?.renderObject.rotation.z || 0,
      })));
      babylonEngine.runRenderLoop(() => {
        scene.render();
        window.electronAPI.ipcRenderer.send('log', `Engine: Frame rendered, entities=${entities.length}, views=${babylonEngine.views.length}, meshes=${scene.meshes.length}`);
      });
    };
    console.log('Engine: Starting render loop (direct log)');
    window.electronAPI.ipcRenderer.send('log', 'Engine: Starting render loop');
    loop();

    return () => {
      babylonEngine.stopRenderLoop();
      scene.dispose();
      babylonEngine.dispose();
      window.electronAPI.ipcRenderer.send('log', 'Engine: Stopped');
    };
  };

  window.electronAPI.ipcRenderer.on('add-canvas', (event, { displayId, bounds }) => {
    console.log(`Engine: Received add-canvas for display ${displayId} (direct log)`);
    window.electronAPI.ipcRenderer.send('log', `Engine: Received add-canvas for display ${displayId}`);
    const screenWidth = bounds.width;
    const screenHeight = bounds.height;

    const camera = new BABYLON.FreeCamera(`camera_${displayId}`, new BABYLON.Vector3(0, 0, -500), scene);
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    camera.attachControl(canvas, true); // Temporary: control canvas
    camera.angularSensibility = 0;
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];
    camera.fov = 1.74;
    camera.position.x = (bounds.x - minX) + screenWidth / 2 - worldWidth / 2;
    camera.position.y = 0;

    const aspectRatio = screenWidth / screenHeight;
    const verticalFov = camera.fov;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspectRatio);
    const d = screenWidth / (2 * Math.tan(horizontalFov / 2));
    camera.position.z = -d;

    const target = new BABYLON.Vector3(camera.position.x, camera.position.y, camera.position.z + 200);
    camera.setTarget(target);
    camera.lockedTarget = target;
    camera.viewport = new BABYLON.Viewport(0, 0, 1, 1);

    const view = babylonEngine.registerView(canvas, camera); // Temporary: control canvas
    scene.activeCameras.push(camera);

    window.electronAPI.ipcRenderer.send('log', `Engine: Camera Position: ${displayId}: pos: ${camera.position.x}, ${camera.position.y}, ${camera.position.z}, fov: ${camera.fov}`);
    window.electronAPI.ipcRenderer.send('log', `Engine: Camera Target: ${displayId}: pos: ${target.x}, ${target.y}, ${target.z}`);
    window.electronAPI.ipcRenderer.send('log', `Engine: View added: ${displayId}, views: ${babylonEngine.views.length}, activeCameras: ${scene.activeCameras.length}`);
    window.electronAPI.ipcRenderer.send('canvas-added', { displayId });
  });

  window.electronAPI.ipcRenderer.on('mousemove', (event, { x, y, displayId }) => {
    window.electronAPI.ipcRenderer.send('log', `Engine: Mousemove for display ${displayId}: x=${x}, y=${y}`);
    inputSystem.updateTargetPosition(x, y, displayId);
  });

  const stopEngine = run();

  window.onbeforeunload = () => {
    stopEngine();
  };

  return stopEngine;
};