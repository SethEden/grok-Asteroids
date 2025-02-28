import { Vector3 } from '../node_modules/@babylonjs/core/Maths/math.vector.js';
import { FreeCamera } from '../node_modules/@babylonjs/core/Cameras/freeCamera.js';
import { Color3 } from '../node_modules/@babylonjs/core/Maths/math.color.js';
import { createUnlitTriangle, createAsteroid } from './meshUtils.js';

export const setupGame = (scene, canvas) => {
  // Camera setup
  const cameraHeight = 500;
  const cameraPosition = new Vector3(0, 0, cameraHeight);
  const cameraTarget = new Vector3(0, 0, 0);
  const camera = new FreeCamera('camera', cameraPosition, scene);
  camera.setTarget(cameraTarget);
  camera.fov = 0.2;
  camera.minZ = 0.1;
  camera.maxZ = 2000;
  console.log('Camera set up:', { position: cameraPosition, target: cameraTarget, fov: camera.fov, minZ: camera.minZ, maxZ: camera.maxZ });

  // Game objects
  const playerShip = createUnlitTriangle('playerShip', 1, new Vector3(0, 0, 0), new Vector3(0, 0, -(Math.PI / 2)), new Color3(1, 1, 1), scene);
  console.log('Player ship created:', playerShip);

  // Physics state
  const shipState = {
    velocity: new Vector3(0, 0, 0),
    acceleration: 0.02,
    bullets: [],
    bulletSpeed: 5,
    asteroids: [],
    lives: 3,
    isAlive: true
  };

  // Calculate world dimensions (helper functions)
  const worldWidth = () => cameraHeight * Math.tan(camera.fov / 2) * 2 * (canvas.clientWidth / canvas.clientHeight);
  const worldHeight = () => cameraHeight * Math.tan(camera.fov / 2) * 2;

  // Spawn initial asteroids
  const asteroidCount = 5;
  for (let i = 0; i < asteroidCount; i++) {
    const size = 5 + Math.random() * 5; // 5–10 units
    const x = (Math.random() - 0.5) * worldWidth();
    const y = (Math.random() - 0.5) * worldHeight();
    const asteroid = createAsteroid(`asteroid_${i}`, size, new Vector3(x, y, 0), scene);
    shipState.asteroids.push(asteroid);
  }

  // Physics update loop
  const updatePhysics = () => {
    const ship = playerShip;
    const cameraFov = camera.fov;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const worldHeightVal = worldHeight();
    const worldWidthVal = worldWidth();
    const halfWidth = worldWidthVal / 2;
    const halfHeight = worldHeightVal / 2;

    // Ship movement and wrapping (only if alive)
    if (shipState.isAlive) {
      // Ship movement and wrapping
      ship.position = ship.position.add(shipState.velocity);
      let shipX = ship.position.x;
      let shipY = ship.position.y;

      if (shipX > halfWidth) shipX -= worldWidthVal;
      else if (shipX < -halfWidth) shipX += worldWidthVal;

      if (shipY > halfHeight) shipY -= worldHeightVal;
      else if (shipY < -halfHeight) shipY += worldHeightVal;

      ship.position = new Vector3(shipX, shipY, 0);
    }

    // Bullet and asteroid updates
    const bulletsToRemove = new Set(); // Use Set to avoid duplicates
    const asteroidsToRemove = new Set();
    const newAsteroids = [];

    // Bullet movement and wrapping
    shipState.bullets.forEach((bullet, index) => {
      // Store previous position before moving
      const prevPosition = bullet.position.clone();
      bullet.position = bullet.position.add(bullet.velocity);
      bullet.lifetime -= 1;

      // Wrap bullets
      let bulletX = bullet.position.x;
      let bulletY = bullet.position.y;

      if (bulletX > halfWidth) bulletX -= worldWidthVal;
      else if (bulletX < -halfWidth) bulletX += worldWidthVal;

      if (bulletY > halfHeight) bulletY -= worldHeightVal;
      else if (bulletY < -halfHeight) bulletY += worldHeightVal;

      bullet.position = new Vector3(bulletX, bulletY, 0);

      // Check collisions with asteroids (swept collision)
      shipState.asteroids.forEach((asteroid, asteroidIndex) => {
        const hitRadius = asteroid.sizeCategory === 'large' ? 7.5 : asteroid.sizeCategory === 'medium' ? 4 : 2;

        // Line-circle intersection check
        const toBullet = bullet.position.subtract(prevPosition);
        const toAsteroid = asteroid.position.subtract(prevPosition);
        const closestPointDist = toAsteroid.dot(toBullet) / toBullet.lengthSquared();
        const closestPoint = closestPointDist >= 0 && closestPointDist <= 1 ? 
          prevPosition.add(toBullet.scale(closestPointDist)) : 
          Vector3.Distance(bullet.position, asteroid.position) < Vector3.Distance(prevPosition, asteroid.position) ? bullet.position : prevPosition;
        const distance = Vector3.Distance(closestPoint, asteroid.position);

        if (distance < hitRadius) {
          bulletsToRemove.add(index);
          console.log('Bullet hit asteroid (swept), marked for despawn');

          if (asteroid.sizeCategory === 'small') {
            asteroidsToRemove.add(asteroidIndex);
            console.log('Small asteroid marked for destruction');
          } else {
            const newSize = asteroid.sizeCategory === 'large' ? 4 : 2;
            const newCategory = newSize > 4 ? 'medium' : 'small';
            const asteroid1 = createAsteroid(`asteroid_${Date.now()}_${asteroidIndex}_1`, newSize, asteroid.position.clone(), scene);
            const asteroid2 = createAsteroid(`asteroid_${Date.now()}_${asteroidIndex}_2`, newSize, asteroid.position.clone(), scene);
            asteroid1.velocity = asteroid.velocity.clone().add(new Vector3(0.2, 0.2, 0));
            asteroid2.velocity = asteroid.velocity.clone().add(new Vector3(-0.2, -0.2, 0));
            asteroid1.sizeCategory = newCategory;
            asteroid2.sizeCategory = newCategory;
            newAsteroids.push(asteroid1, asteroid2);
            asteroidsToRemove.add(asteroidIndex);
            console.log('Asteroid split into:', { size: newSize, category: newCategory });
          }
        }
      });

      if (bullet.lifetime <= 0) {
        bulletsToRemove.add(index);
        console.log('Bullet lifetime expired, marked for despawn');
      }
    });

    // Check ship-asteroid collisions
    if (shipState.isAlive) {
      shipState.asteroids.forEach((asteroid, asteroidIndex) => {
        const distance = Vector3.Distance(ship.position, asteroid.position);
        const hitRadius = asteroid.sizeCategory === 'large' ? 7.5 : asteroid.sizeCategory === 'medium' ? 4 : 2;
        if (distance < hitRadius + 1) { // Ship radius ~1
          shipState.isAlive = false;
          shipState.lives -= 1;
          scene.removeMesh(ship);
          console.log('Ship hit by asteroid! Lives remaining:', shipState.lives);
        }
      });
    }

    // Remove bullets and asteroids after iteration
    Array.from(bulletsToRemove).sort((a, b) => b - a).forEach(index => {
      const bullet = shipState.bullets[index];
      if (bullet) { // Check if bullet exists
        scene.removeMesh(bullet);
        bullet.dispose();
        shipState.bullets.splice(index, 1);
      }
    });

    Array.from(asteroidsToRemove).sort((a, b) => b - a).forEach(index => {
      const asteroid = shipState.asteroids[index];
      if (asteroid) { // Check if asteroid exists
        scene.removeMesh(asteroid);
        asteroid.dispose();
        shipState.asteroids.splice(index, 1);
      }
    });

    // Add new asteroids
    shipState.asteroids.push(...newAsteroids);

    // Asteroid movement and wrapping
    shipState.asteroids.forEach((asteroid) => {
      asteroid.position = asteroid.position.add(asteroid.velocity);

      let asteroidX = asteroid.position.x;
      let asteroidY = asteroid.position.y;

      if (asteroidX > halfWidth) asteroidX -= worldWidthVal;
      else if (asteroidX < -halfWidth) asteroidX += worldWidthVal;

      if (asteroidY > halfHeight) asteroidY -= worldHeightVal;
      else if (asteroidY < -halfHeight) asteroidY += worldHeightVal;

      asteroid.position = new Vector3(asteroidX, asteroidY, 0);
    });
  };
  scene.onBeforeRenderObservable.add(updatePhysics);

  return { playerShip, shipState };
};