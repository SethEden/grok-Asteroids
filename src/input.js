import { Vector3 } from '../node_modules/@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '../node_modules/@babylonjs/core/Maths/math.color.js';
import { createBullet } from './meshUtils.js';

export const setupInput = (canvas, gameObjects) => {
  console.log('setupInput: gameObjects received:', { 
    shipStateExists: !!gameObjects.shipState, 
    playerShipExists: !!gameObjects.shipState?.playerShip 
  });

  const cameraHeight = 500;
  const cameraFov = 0.2;
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;
  const worldHeight = cameraHeight * Math.tan(cameraFov / 2) * 2;
  const worldWidth = worldHeight * (canvasWidth / canvasHeight);

  // Key state
  const keys = { e: false, s: false, d: false, f: false, w: false, space: false };
  let slowStopActive = false;

  // Rotate ship to face mouse
  const updateShipRotation = (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldX = (0.5 - mouseX / canvasWidth) * worldWidth;
    const worldY = (0.5 - mouseY / canvasHeight) * worldHeight;

    const ship = gameObjects.shipState.playerShip;
    console.log('updateShipRotation: ship:', { shipExists: !!ship });
    const angle = Math.atan2(worldY - ship.position.y, worldX - ship.position.x);
    ship.rotation.z = angle - Math.PI / 2;
    console.log('Ship rotated to:', { angle, rotationZ: ship.rotation.z });
  };

  // Apply thrust and bullet firing
  const applyThrust = () => {
    const ship = gameObjects.shipState.playerShip;
    console.log('applyThrust: ship:', { shipExists: !!ship });
    const state = gameObjects.shipState;
    const angle = ship.rotation.z + Math.PI / 2;

    // Thrust directions
    const forward = new Vector3(Math.cos(angle), Math.sin(angle), 0);
    const right = new Vector3(-Math.sin(angle), Math.cos(angle), 0);

    if (keys.e) state.velocity = state.velocity.add(forward.scale(state.acceleration));
    if (keys.d) state.velocity = state.velocity.add(forward.scale(-state.acceleration));
    if (keys.f) state.velocity = state.velocity.add(right.scale(state.acceleration));
    if (keys.s) state.velocity = state.velocity.add(right.scale(-state.acceleration));

    // Slow stop
    if (slowStopActive) {
      const deceleration = 0.01;
      const velocityMagnitude = state.velocity.length();
      if (velocityMagnitude > 0) {
        const slowFactor = Math.max(0, velocityMagnitude - deceleration) / velocityMagnitude;
        state.velocity = state.velocity.scale(slowFactor);
        console.log('Slow stop active, velocity:', state.velocity);
      }
      if (velocityMagnitude < 0.01) {
        state.velocity = new Vector3(0, 0, 0);
        slowStopActive = false;
        console.log('Ship fully stopped');
      }
    }

    // Fire bullet
    if (keys.space) {
      const bullet = createBullet(`bullet_${Date.now()}`, ship.position.clone(), ship.rotation.clone(), new Color3(1, 1, 1), gameObjects.scene);
      bullet.velocity = forward.scale(state.bulletSpeed).add(state.velocity);
      bullet.lifetime = 60;
      state.bullets.push(bullet);
      keys.space = false;
      console.log('Bullet fired:', { position: bullet.position, velocity: bullet.velocity });
    }
  };
  gameObjects.scene.onBeforeRenderObservable.add(applyThrust);

  // Key event listeners
  document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
      case 'e': keys.e = true; break;
      case 's': keys.s = true; break;
      case 'd': keys.d = true; break;
      case 'f': keys.f = true; break;
      case 'w':
        if (!keys.w) {
          slowStopActive = !slowStopActive;
          console.log('Slow stop toggled:', slowStopActive ? 'ON' : 'OFF');
        }
        keys.w = true;
        break;
      case ' ': keys.space = true; break;
    }
  });

  document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
      case 'e': keys.e = false; break;
      case 's': keys.s = false; break;
      case 'd': keys.d = false; break;
      case 'f': keys.f = false; break;
      case 'w': keys.w = false; break;
      case ' ': keys.space = false; break;
    }
  });

  canvas.addEventListener('mousemove', updateShipRotation);
  console.log('Mouse rotation and key thrust handlers added');

  // Start ship at center
  gameObjects.shipState.playerShip.position = new Vector3(0, 0, 0);
  console.log('Ship initialized at center:', gameObjects.shipState.playerShip.position);
};