// src/systems/input.js
import { ipcRenderer } from 'electron';

export const setupInput = (entities, { canvas, displays, currentDisplayId }) => {
  const updateTargetPosition = (x, y) => {
    const target = entities[0];
    const playerShip = entities[1];
    if (target && target.position && playerShip && playerShip.position) {
      const worldWidth = displays.reduce((sum, d) => sum + d.bounds.width, 0);
      const worldHeight = displays[0].bounds.height;
      const screenWidth = canvas.width;
      const screenHeight = canvas.height;
      const minX = Math.min(...displays.map(d => d.bounds.x));
      const currentDisplay = displays.find(d => d.id === currentDisplayId);

      const totalWidth = worldWidth;
      const displayStartX = (currentDisplay.bounds.x - minX) - totalWidth / 2;

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

  const mainThrustSpeed = 200;
  const sideThrustSpeed = mainThrustSpeed / 2;
  const keysPressed = new Set();
  let lastTargetSync = 0;
  let lastPlayerSync = 0;
  const syncInterval = 100; // Increase to 10 updates/sec

  const updateVelocity = () => {
    const playerShip = entities[1];
    if (!playerShip || !playerShip.velocity) return false; // Early exit if no ship

    let vx = 0;
    let vy = 0;
    const angle = playerShip.renderable.renderObject.rotation.z + Math.PI / 2;

    if (keysPressed.has('arrowup') || keysPressed.has('w')) {
      vx += Math.cos(angle) * mainThrustSpeed;
      vy += Math.sin(angle) * mainThrustSpeed;
    }
    if (keysPressed.has('arrowdown') || keysPressed.has('s')) {
      vx -= Math.cos(angle) * sideThrustSpeed;
      vy -= Math.sin(angle) * sideThrustSpeed;
    }
    if (keysPressed.has('arrowleft') || keysPressed.has('a')) {
      vx -= Math.cos(angle + Math.PI / 2) * sideThrustSpeed;
      vy -= Math.sin(angle + Math.PI / 2) * sideThrustSpeed;
    }
    if (keysPressed.has('arrowright') || keysPressed.has('d')) {
      vx += Math.cos(angle + Math.PI / 2) * sideThrustSpeed;
      vy += Math.sin(angle + Math.PI / 2) * sideThrustSpeed;
    }

    const velocityChanged = playerShip.velocity.vx !== vx || playerShip.velocity.vy !== vy;
    playerShip.velocity.vx = vx;
    playerShip.velocity.vy = vy;

    const now = Date.now();
    if (velocityChanged && (vx !== 0 || vy !== 0) && now - lastPlayerSync > syncInterval) {
      ipcRenderer.send('update-player-position', { x: playerShip.position.x, y: playerShip.position.y });
      lastPlayerSync = now;
    }

    return velocityChanged; // Indicate if work was done
  };

  const throttleTargetSync = () => {
    const target = entities[0];
    if (target && target.position) {
      const now = Date.now();
      if (now - lastTargetSync > syncInterval) {
        ipcRenderer.send('sync-target-position', { x: target.position.x, y: target.position.y });
        lastTargetSync = now;
      }
    }
  };

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    updateTargetPosition(mouseX, mouseY);
    throttleTargetSync();
  });

  canvas.addEventListener('click', () => {
    const playerShip = entities[1];
    if (playerShip && playerShip.position) {
      ipcRenderer.send('log', `Clicked at ${playerShip.position.x}, ${playerShip.position.y}`);
    }
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!keysPressed.has(key)) {
      keysPressed.add(key);
      ipcRenderer.send('keydown', key);
    }
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    keysPressed.delete(key);
    ipcRenderer.send('keyup', key);
  });

  ipcRenderer.on('broadcast-keydown', (event, key) => {
    keysPressed.add(key);
    ipcRenderer.send('log', `Key down: ${key}`);
  });

  ipcRenderer.on('broadcast-keyup', (event, key) => {
    keysPressed.delete(key);
    ipcRenderer.send('log', `Key up: ${key}`);
  });

  ipcRenderer.on('sync-player-position', (event, pos) => {
    const playerShip = entities[1];
    if (playerShip && playerShip.position) {
      playerShip.position.x = pos.x;
      playerShip.position.y = pos.y;
      const target = entities[0];
      if (target && target.position) {
        const dx = target.position.x - playerShip.position.x;
        const dy = target.position.y - playerShip.position.y;
        const angle = Math.atan2(dy, dx);
        playerShip.renderable.renderObject.rotation.z = angle - Math.PI / 2;
      }
    }
  });

  ipcRenderer.on('sync-target-position', (event, pos) => {
    const target = entities[0];
    const playerShip = entities[1];
    if (target && target.position) {
      target.position.x = pos.x;
      target.position.y = pos.y;
    }
    if (playerShip && playerShip.position) {
      const dx = pos.x - playerShip.position.x;
      const dy = pos.y - playerShip.position.y;
      const angle = Math.atan2(dy, dx);
      playerShip.renderable.renderObject.rotation.z = angle - Math.PI / 2;
    }
  });

  // Optimized update loop
  const updateLoop = () => {
    const didWork = updateVelocity();
    if (didWork) {
      // Only log if velocity changed
      ipcRenderer.send('log', `Velocity applied: vx=${entities[1].velocity.vx}, vy=${entities[1].velocity.vy}`);
    }
    requestAnimationFrame(updateLoop);
  };
  updateLoop();
};

export const updateInput = () => {};