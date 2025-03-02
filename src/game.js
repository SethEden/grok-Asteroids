import { Vector3 } from '../node_modules/@babylonjs/core/Maths/math.vector.js';
import { FreeCamera } from '../node_modules/@babylonjs/core/Cameras/freeCamera.js';
import { Color3 } from '../node_modules/@babylonjs/core/Maths/math.color.js';
import { createUnlitTriangle, createAsteroid, createLifeIcon, createLetterMesh, createShipFragments } from './meshUtils.js';

export const setupGame = (scene, canvas) => {
  console.log('setupGame: Starting');
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

  // Physics state
  const shipState = {
    playerShip: createUnlitTriangle('playerShip', 1, new Vector3(0, 0, 0), new Vector3(0, 0, -(Math.PI / 2)), new Color3(1, 1, 1), scene),
    velocity: new Vector3(0, 0, 0),
    acceleration: 0.02,
    bullets: [],
    bulletSpeed: 5,
    asteroids: [],
    lives: 3,
    isAlive: true,
    lifeIcons: [],
    gameOverMeshes: [],
    deathFragments: []
  };
  console.log('setupGame: shipState created:', { 
    playerShipExists: !!shipState.playerShip, 
    position: shipState.playerShip.position, 
    rotation: shipState.playerShip.rotation 
  });

  // Calculate world dimensions
  const worldWidth = () => cameraHeight * Math.tan(camera.fov / 2) * 2 * (canvas.clientWidth / canvas.clientHeight);
  const worldHeight = () => cameraHeight * Math.tan(camera.fov / 2) * 2;

  // Spawn initial asteroids
  const asteroidCount = 5;
  for (let i = 0; i < asteroidCount; i++) {
    const size = 5 + Math.random() * 5;
    const x = (Math.random() - 0.5) * worldWidth();
    const y = (Math.random() - 0.5) * worldHeight();
    const asteroid = createAsteroid(`asteroid_${i}`, size, new Vector3(x, y, 0), scene);
    shipState.asteroids.push(asteroid);
  }

  // Setup lives display in world space
  const updateLivesDisplay = () => {
    shipState.lifeIcons.forEach(icon => {
      scene.removeMesh(icon);
      icon.dispose();
    });
    shipState.lifeIcons = [];

    const halfWidth = worldWidth() / 2;
    const halfHeight = worldHeight() / 2;
    for (let i = 0; i < shipState.lives; i++) {
      const iconX = halfWidth - 5 - i * 3;
      const iconY = halfHeight - 5;
      const icon = createLifeIcon(`life_${i}`, 1, new Vector3(iconX, iconY, 0), scene);
      shipState.lifeIcons.push(icon);
    }
    console.log('Lives display updated:', shipState.lives);
  };
  updateLivesDisplay();

  // Handle ship death animation and respawn
  const animateShipDeath = (shipPosition) => {
    const fragments = createShipFragments(shipPosition, scene);
    shipState.deathFragments.push(...fragments);
    console.log('Ship death animation started');
  };

  const respawnShip = () => {
    if (shipState.lives > 0) {
      shipState.playerShip = createUnlitTriangle('playerShip', 1, new Vector3(0, 0, 0), new Vector3(0, 0, -(Math.PI / 2)), new Color3(1, 1, 1), scene);
      shipState.velocity = new Vector3(0, 0, 0);
      shipState.isAlive = true;
      console.log('Ship respawned:', { position: shipState.playerShip.position });
    }
  };

  const updateGameOverDisplay = () => {
    if (shipState.lives <= 0 && shipState.gameOverMeshes.length === 0) {
      const text = "GAME OVER";
      const letterWidth = 5;
      const spacing = 2;
      const totalWidth = (letterWidth * text.length) + (spacing * (text.length - 1));
      const baseX = totalWidth / 2; // Start at positive X (left), move to negative (right)
      const baseY = 0;

      let currentX = baseX;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const mesh = createLetterMesh(char === ' ' ? ' ' : char.toUpperCase(), `gameOverLetter_${i}`, currentX, baseY, scene);
        if (mesh) shipState.gameOverMeshes.push(mesh);
        currentX -= (letterWidth + spacing); // Move left (decrease X)
      }
      console.log('Game over displayed');
    }
  };

  // Physics update loop
  const updatePhysics = () => {
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const worldHeightVal = worldHeight();
    const worldWidthVal = worldWidth();
    const halfWidth = worldWidthVal / 2;
    const halfHeight = worldHeightVal / 2;

    if (shipState.isAlive) {
      shipState.playerShip.position = shipState.playerShip.position.add(shipState.velocity);
      let shipX = shipState.playerShip.position.x;
      let shipY = shipState.playerShip.position.y;

      if (shipX > halfWidth) shipX -= worldWidthVal;
      else if (shipX < -halfWidth) shipX += worldWidthVal;

      if (shipY > halfHeight) shipY -= worldHeightVal;
      else if (shipY < -halfHeight) shipY += worldHeightVal;

      shipState.playerShip.position = new Vector3(shipX, shipY, 0);
    }

    const bulletsToRemove = new Set();
    const asteroidsToRemove = new Set();
    const newAsteroids = [];

    shipState.bullets.forEach((bullet, index) => {
      const prevPosition = bullet.position.clone();
      bullet.position = bullet.position.add(bullet.velocity);
      bullet.lifetime -= 1;

      let bulletX = bullet.position.x;
      let bulletY = bullet.position.y;

      if (bulletX > halfWidth) bulletX -= worldWidthVal;
      else if (bulletX < -halfWidth) bulletX += worldWidthVal;

      if (bulletY > halfHeight) bulletY -= worldHeightVal;
      else if (bulletY < -halfHeight) bulletY += worldHeightVal;

      bullet.position = new Vector3(bulletX, bulletY, 0);

      shipState.asteroids.forEach((asteroid, asteroidIndex) => {
        const hitRadius = asteroid.sizeCategory === 'large' ? 7.5 : asteroid.sizeCategory === 'medium' ? 4 : 2;
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

    if (shipState.isAlive) {
      shipState.asteroids.forEach((asteroid, asteroidIndex) => {
        const distance = Vector3.Distance(shipState.playerShip.position, asteroid.position);
        const hitRadius = asteroid.sizeCategory === 'large' ? 7.5 : asteroid.sizeCategory === 'medium' ? 4 : 2;
        if (distance < hitRadius + 1) {
          shipState.isAlive = false;
          shipState.lives -= 1;
          animateShipDeath(shipState.playerShip.position.clone());
          scene.removeMesh(shipState.playerShip);
          updateLivesDisplay();
          updateGameOverDisplay();
          console.log('Ship hit by asteroid! Lives remaining:', shipState.lives);
          setTimeout(respawnShip, 3000);
        }
      });
    }

    Array.from(bulletsToRemove).sort((a, b) => b - a).forEach(index => {
      const bullet = shipState.bullets[index];
      if (bullet) {
        scene.removeMesh(bullet);
        bullet.dispose();
        shipState.bullets.splice(index, 1);
      }
    });

    Array.from(asteroidsToRemove).sort((a, b) => b - a).forEach(index => {
      const asteroid = shipState.asteroids[index];
      if (asteroid) {
        scene.removeMesh(asteroid);
        asteroid.dispose();
        shipState.asteroids.splice(index, 1);
      }
    });

    shipState.asteroids.push(...newAsteroids);

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

    shipState.deathFragments.forEach((fragment, index) => {
      fragment.position = fragment.position.add(fragment.velocity);
      fragment.rotation.z += fragment.rotationVelocity;
      fragment.lifetime -= 1;
      if (fragment.lifetime <= 0) {
        scene.removeMesh(fragment);
        fragment.dispose();
        shipState.deathFragments.splice(index, 1);
      }
    });
  };
  scene.onBeforeRenderObservable.add(updatePhysics);

  console.log('setupGame: Returning shipState:', { 
    playerShipExists: !!shipState.playerShip, 
    lives: shipState.lives 
  });
  return { shipState };
};