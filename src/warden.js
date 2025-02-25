// src/warden.js
import * as BABYLON from 'babylonjs';
import { createEntities } from './entities.js';
import { updateMovement } from './systems/movement.js';
import { setupInput } from './systems/input.js';

export const initializeWarden = (canvas, displays) => {
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

  const entities = createEntities({ BABYLON, scene });
  const inputSystem = setupInput(entities, { displays });

  const sortedDisplays = [...displays].sort((a, b) => a.bounds.x - b.bounds.x);
  const worldWidth = sortedDisplays.reduce((sum, d) => sum + d.bounds.width, 0);
  const worldHeight = sortedDisplays[0].bounds.height;

  let lastTime = performance.now();
  const loop = () => {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    updateMovement(entities, delta, { worldWidth, worldHeight, wrap: true });
    window.electronAPI.ipcRenderer.send('render-frame', entities.map(e => ({
      id: e.id,
      position: { x: e.position.x, y: e.position.y },
      rotation: e.renderable?.renderObject.rotation.z || 0,
    })));
    engine.runRenderLoop(() => scene.render());
  };
  loop();

  window.electronAPI.ipcRenderer.on('add-canvas', async (event, { displayId, bounds, canvasId }) => {
    const targetCanvas = await window.electronAPI.ipcRenderer.invoke('get-canvas', { canvasId });
    const view = engine.registerView(targetCanvas);
    const camera = new BABYLON.FreeCamera(`camera_${displayId}`, new BABYLON.Vector3(0, 0, -500), scene);
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    camera.fov = 1.74;
    const minX = Math.min(...sortedDisplays.map(d => d.bounds.x));
    camera.position.x = (bounds.x - minX) + bounds.width / 2 - worldWidth / 2;
    camera.setTarget(new BABYLON.Vector3(camera.position.x, 0, -300));
    camera.lockedTarget = camera.target;
    camera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
    view.camera = camera;
    scene.activeCameras.push(camera);
    window.electronAPI.ipcRenderer.send('canvas-added', { displayId });
    console.log('View added:', engine.views);
  });

  window.electronAPI.ipcRenderer.on('mousemove', (event, { x, y, displayId }) => {
    inputSystem.updateTargetPosition(x, y, displayId);
  });

  return {
    stop: () => {
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
    entities,
    scene,
  };
};