// src/systems/input.js
import { createBullet } from '../entities.js';

export const setupInput = (entities, { displays }) => {
  entities[0].id = 'target';
  entities[1].id = 'player';

  const updateTargetPosition = (x, y, displayId) => {
    const target = entities[0];
    const playerShip = entities[1];
    if (target && target.position && playerShip && playerShip.position) {
      const worldWidth = displays.reduce((sum, d) => sum + d.bounds.width, 0);
      const worldHeight = displays[0].bounds.height;
      const currentDisplay = displays.find(d => d.id === displayId);
      const screenWidth = currentDisplay.bounds.width;
      const screenHeight = currentDisplay.bounds.height;
      const minX = Math.min(...displays.map(d => d.bounds.x));
      const displayStartX = (currentDisplay.bounds.x - minX) - worldWidth / 2;

      const worldX = displayStartX + x;
      const worldY = (screenHeight / 2) - y;

      target.position.x = worldX;
      target.position.y = worldY;

      const dx = target.position.x - playerShip.position.x;
      const dy = target.position.y - playerShip.position.y;
      const angle = Math.atan2(dy, dx);
      playerShip.renderable.renderObject.rotation.z = angle - Math.PI / 2;
    }
  };

  const mainThrustAccel = 200;
  const sideThrustAccel = mainThrustAccel / 2;
  const keysPressed = new Set();
  let lastFireTime = 0;
  const fireRate = 200;
  let bulletCounter = 0;

  const applyThrust = (delta) => {
    const playerShip = entities[1];
    if (!playerShip || !playerShip.velocity) return false;

    let ax = 0;
    let ay = 0;
    const angle = playerShip.renderable.renderObject.rotation.z + Math.PI / 2;

    if (keysPressed.has('arrowup') || keysPressed.has('w')) {
      ax += Math.cos(angle) * mainThrustAccel;
      ay += Math.sin(angle) * mainThrustAccel;
    }
    if (keysPressed.has('arrowdown') || keysPressed.has('s')) {
      ax -= Math.cos(angle) * sideThrustAccel;
      ay -= Math.sin(angle) * sideThrustAccel;
    }
    if (keysPressed.has('arrowleft') || keysPressed.has('a')) {
      ax -= Math.cos(angle + Math.PI / 2) * sideThrustAccel;
      ay -= Math.sin(angle + Math.PI / 2) * sideThrustAccel;
    }
    if (keysPressed.has('arrowright') || keysPressed.has('d')) {
      ax += Math.cos(angle + Math.PI / 2) * sideThrustAccel;
      ay += Math.sin(angle + Math.PI / 2) * sideThrustAccel;
    }

    playerShip.velocity.vx += ax * delta;
    playerShip.velocity.vy += ay * delta;

    return ax !== 0 || ay !== 0;
  };

  const fireBullet = () => {
    const playerShip = entities[1];
    const now = Date.now();
    if (keysPressed.has(' ') && now - lastFireTime > fireRate) {
      const bullet = createBullet({
        BABYLON,
        scene,
        shipPosition: { x: playerShip.position.x, y: playerShip.position.y },
        shipRotation: playerShip.renderable.renderObject.rotation.z,
      });
      bullet.id = `bullet_${bulletCounter++}`;
      entities.push(bullet);
      lastFireTime = now;
      window.electronAPI.ipcRenderer.send('log', `Bullet fired: id=${bullet.id}, x=${bullet.position.x}, y=${bullet.position.y}, entities=${entities.length}`);
    }
  };

  const initialize = () => {
    let lastTime = performance.now();
    const updateLoop = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const didThrust = applyThrust(delta);
      fireBullet();
      if (didThrust) {
        window.electronAPI.ipcRenderer.send('log', `Thrust: vx=${entities[1].velocity.vx}, vy=${entities[1].velocity.vy}`);
      }

      requestAnimationFrame(updateLoop);
    };
    requestAnimationFrame(updateLoop);
  };

  window.electronAPI.ipcRenderer.on('mousemove', (event, { x, y, displayId }) => {
    updateTargetPosition(x, y, displayId);
  });

  window.electronAPI.ipcRenderer.on('broadcast-keydown', (event, key) => {
    if (key) {
      keysPressed.add(key);
      window.electronAPI.ipcRenderer.send('log', `Broadcast key down: "${key}"`);
    }
  });

  window.electronAPI.ipcRenderer.on('broadcast-keyup', (event, key) => {
    if (key) {
      keysPressed.delete(key);
      window.electronAPI.ipcRenderer.send('log', `Broadcast key up: "${key}"`);
    }
  });

  return { initialize, updateTargetPosition };
};

export const updateInput = () => {};