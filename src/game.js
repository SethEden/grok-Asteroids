import { Vector3 } from '../node_modules/@babylonjs/core/Maths/math.vector.js';
import { FreeCamera } from '../node_modules/@babylonjs/core/Cameras/freeCamera.js';
import { Color3 } from '../node_modules/@babylonjs/core/Maths/math.color.js';
import { createUnlitTriangle, createAsteroid, createLifeIcon, createLetterMesh, createShipFragments, createShield } from './meshUtils.js';

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
    isPaused: false, // Add pause state
    lifeIcons: [],
    gameOverMeshes: [],
    pausedMeshes: [], // Store "PAUSED" meshes
    deathFragments: [],
    shield: createShield('shield', new Vector3(0, 0, 0), scene), // Shield mesh
    shieldActive: true, // Start with shield on
    shieldTimer: 180, // 3 seconds at 60 FPS
    shieldFlashTimer: 0, // For flashing effect
    score: 0, // Initialize score
    scoreMeshes: [], // Store score display meshes
    level: 1, // Start at Level 1
    levelMeshes: [], // Store level display meshes
    insertCoinMeshes: [], // New array for "INSERT COIN" meshes
    insertCoinFlashTimer: 0 // New timer for flashing "INSERT COIN"
  };
  console.log('setupGame: shipState created:', { 
    playerShipExists: !!shipState.playerShip, 
    position: shipState.playerShip.position, 
    rotation: shipState.playerShip.rotation,
    shieldExists: !!shipState.shield
  });

  // Calculate world dimensions
  const worldWidth = () => cameraHeight * Math.tan(camera.fov / 2) * 2 * (canvas.clientWidth / canvas.clientHeight);
  const worldHeight = () => cameraHeight * Math.tan(camera.fov / 2) * 2;

  // Spawn initial asteroids
  const spawnAsteroids = (level) => {
    const asteroidCount = 1 + level; // Base 2 at Level 1 (1 + 1), +1 per level
    for (let i = 0; i < asteroidCount; i++) {
      const size = 3 + Math.random() * 12;
      const x = (Math.random() - 0.5) * worldWidth();
      const y = (Math.random() - 0.5) * worldHeight();
      const asteroid = createAsteroid(`asteroid_${Date.now()}_${i}`, size, new Vector3(x, y, 0), scene);
      shipState.asteroids.push(asteroid);
    }
    console.log(`Spawned ${asteroidCount} asteroids for Level ${level}`);
  };
  spawnAsteroids(shipState.level); // Initial spawn for Level 1

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

  const updateScoreDisplay = () => {
    // Remove old score meshes
    shipState.scoreMeshes.forEach(mesh => {
      scene.removeMesh(mesh);
      mesh.dispose();
    });
    shipState.scoreMeshes = [];

    // Build "SCORE: [score]" string
    const text = `SCORE: ${shipState.score}`;
    const letterWidth = 5;
    const spacing = 2;
    const totalWidth = (letterWidth * text.length) + (spacing * (text.length - 1));
    const baseX = totalWidth / 2; // Center horizontally
    const baseY = worldHeight() / 2 - 10; // Top center, 10 units below top edge

    let currentX = baseX;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const mesh = createLetterMesh(char === ' ' ? ' ' : char.toUpperCase(), `scoreLetter_${i}`, currentX, baseY, scene);
      if (mesh) shipState.scoreMeshes.push(mesh);
      currentX -= letterWidth + spacing; // Move right (increase X)
    }
    console.log('Score display updated:', shipState.score);
  };
  updateScoreDisplay(); // Initial display

  const updateLevelDisplay = () => {
    shipState.levelMeshes.forEach(mesh => {
      scene.removeMesh(mesh);
      mesh.dispose();
    });
    shipState.levelMeshes = [];

    const text = `LEVEL: ${shipState.level}`;
    const letterWidth = 5;
    const spacing = 2;
    const totalWidth = (letterWidth * text.length) + (spacing * (text.length - 1));
    const baseX = totalWidth / 2; // Rightmost for inverted X-axis
    const baseY = worldHeight() / 2 - 20; // Below SCORE, 10 units lower

    let currentX = baseX;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const mesh = createLetterMesh(char === ' ' ? ' ' : char.toUpperCase(), `levelLetter_${i}`, currentX, baseY, scene);
      if (mesh) shipState.levelMeshes.push(mesh);
      currentX -= letterWidth + spacing; // Move left
    }
    console.log('Level display updated:', shipState.level);
  };
  updateLevelDisplay(); // Initial display for Level 1

  // Handle pause/resume
  const togglePause = () => {
    shipState.isPaused = !shipState.isPaused;
    if (shipState.isPaused) {
      updatePausedDisplay(); // Show "PAUSED"
    } else {
      clearPausedDisplay(); // Hide "PAUSED"
    }
    console.log('Game paused:', shipState.isPaused);
  };

  // Display "PAUSED" text
  const updatePausedDisplay = () => {
    if (shipState.pausedMeshes.length === 0) {
      const text = "PAUSED";
      const letterWidth = 5;
      const spacing = 2;
      const totalWidth = (letterWidth * text.length) + (spacing * (text.length - 1));
      const baseX = totalWidth / 2; // Start at positive X (left), move to negative (right)
      const baseY = -10; // Slightly above center for visibility

      let currentX = baseX;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const mesh = createLetterMesh(char === ' ' ? ' ' : char.toUpperCase(), `pausedLetter_${i}`, currentX, baseY, scene);
        if (mesh) shipState.pausedMeshes.push(mesh);
        currentX -= (letterWidth + spacing); // Move left (decrease X)
      }
      console.log('Paused display shown');
    }
  };

  // Clear "PAUSED" text
  const clearPausedDisplay = () => {
    shipState.pausedMeshes.forEach(mesh => {
      scene.removeMesh(mesh);
      mesh.dispose();
    });
    shipState.pausedMeshes = [];
    console.log('Paused display cleared');
  };

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
      shipState.shieldActive = true; // Activate shield on respawn
      shipState.shieldTimer = 180; // Reset shield duration (3 sec @ 60 FPS)
      shipState.shieldFlashTimer = 0;
      shipState.shield.isVisible = true; // Show shield
      console.log('Ship respawned with shield:', { position: shipState.playerShip.position });
    }
  };

  const updateGameOverDisplay = () => {
    if (shipState.lives <= 0 && shipState.gameOverMeshes.length === 0) {
      // "GAME OVER" text
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
      
      // "INSERT COIN" text
      const insertCoinText = "INSERT COIN";
      const insertCoinWidth = (letterWidth * insertCoinText.length) + (spacing * (insertCoinText.length - 1));
      const insertCoinBaseX = insertCoinWidth / 2;
      const insertCoinBaseY = -worldHeight() / 2 + 10; // Bottom center, 10 units above bottom edge

      currentX = insertCoinBaseX;
      for (let i = 0; i < insertCoinText.length; i++) {
        const char = insertCoinText[i];
        const mesh = createLetterMesh(char === ' ' ? ' ' : char.toUpperCase(), `insertCoinLetter_${i}`, currentX, insertCoinBaseY, scene);
        if (mesh) shipState.insertCoinMeshes.push(mesh);
        currentX -= (letterWidth + spacing);
      }

      console.log('Game over displayed with INSERT COIN');
    }
  };

  // Physics update loop
  const updatePhysics = () => {
    if (shipState.isPaused) return; // Skip physics if paused

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const worldHeightVal = worldHeight();
    const worldWidthVal = worldWidth();
    const halfWidth = worldWidthVal / 2;
    const halfHeight = worldHeightVal / 2;

    // Update ship and shield position
    if (shipState.isAlive) {
      shipState.playerShip.position = shipState.playerShip.position.add(shipState.velocity);
      let shipX = shipState.playerShip.position.x;
      let shipY = shipState.playerShip.position.y;
      if (shipX > halfWidth) shipX -= worldWidthVal;
      else if (shipX < -halfWidth) shipX += worldWidthVal;
      if (shipY > halfHeight) shipY -= worldHeightVal;
      else if (shipY < -halfHeight) shipY += worldHeightVal;
      shipState.playerShip.position = new Vector3(shipX, shipY, 0);
      shipState.shield.position = shipState.playerShip.position.clone(); // Shield follows ship

      // Shield logic
      if (shipState.shieldActive) {
        shipState.shieldTimer -= 1;
        const flashStart = 180; // Start flashing immediately (3 seconds @ 60 FPS)
        const flashInterval = 10; // Fixed interval: 0.167s cycle (6 Hz)
        if (shipState.shieldTimer <= flashStart) {
          shipState.shieldFlashTimer += 1;
          const dutyCycle = Math.max(0.1, shipState.shieldTimer / flashStart); // 100% to 10% duty cycle
          const onFrames = Math.floor(flashInterval * dutyCycle); // "On" duration shrinks
          shipState.shield.isVisible = (shipState.shieldFlashTimer % flashInterval) < onFrames;
        }
        if (shipState.shieldTimer <= 0) {
          shipState.shieldActive = false;
          shipState.shield.isVisible = false;
          console.log('Shield deactivated');
        }
      }
    }

    const bulletsToRemove = new Set();
    const asteroidsToRemove = new Set();
    const newAsteroids = [];

    // Bullet-asteroid collisions
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
        const hitRadius = asteroid.sizeCategory === 'extraLarge' ? 12 :
                         asteroid.sizeCategory === 'large' ? 9 :
                         asteroid.sizeCategory === 'medium' ? 6 :
                         asteroid.sizeCategory === 'small' ? 3.5 : 2;
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

          if (asteroid.sizeCategory === 'tiny') {
            shipState.score += 20; // Tiny: 20 points
            asteroidsToRemove.add(asteroidIndex);
            console.log('Tiny asteroid marked for destruction');
          } else {
            // Award points for splitting larger asteroids
            const points = asteroid.sizeCategory === 'extraLarge' ? 1 :
                           asteroid.sizeCategory === 'large' ? 2 :
                           asteroid.sizeCategory === 'medium' ? 5 : 10; // Small: 10
            shipState.score += points;
            console.log(`${asteroid.sizeCategory} asteroid split, score:`, shipState.score);

            // Define next size down based on current category
            const newSize = asteroid.sizeCategory === 'extraLarge' ? 10 :
                           asteroid.sizeCategory === 'large' ? 7.5 :
                           asteroid.sizeCategory === 'medium' ? 4.5 : 2;
            const newCategory = newSize > 12 ? 'large' : newSize > 9 ? 'medium' : newSize > 6 ? 'small' : 'tiny';
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
          updateScoreDisplay(); // Update display after scoring
        }
      });

      if (bullet.lifetime <= 0) {
        bulletsToRemove.add(index);
        console.log('Bullet lifetime expired, marked for despawn');
      }
    });

    // Ship-asteroid collisions (skip if shield is active)
    if (shipState.isAlive && !shipState.shieldActive) {
      shipState.asteroids.forEach((asteroid, asteroidIndex) => {
        const distance = Vector3.Distance(shipState.playerShip.position, asteroid.position);
        const hitRadius = asteroid.sizeCategory === 'extraLarge' ? 12 :
                          asteroid.sizeCategory === 'large' ? 9 :
                          asteroid.sizeCategory === 'medium' ? 6 :
                          asteroid.sizeCategory === 'small' ? 3 : 1.5;
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

    // Move all asteroids once and store previous positions
    const asteroidPositions = shipState.asteroids.map(asteroid => ({
      asteroid,
      prevPosition: asteroid.position.clone()
    }));
    asteroidPositions.forEach(({ asteroid }) => {
      asteroid.position = asteroid.position.add(asteroid.velocity);
      let x = asteroid.position.x;
      let y = asteroid.position.y;
      if (x > halfWidth) x -= worldWidthVal;
      else if (x < -halfWidth) x += worldWidthVal;
      if (y > halfHeight) y -= worldHeightVal;
      else if (y < -halfHeight) y += worldHeightVal;
      asteroid.position = new Vector3(x, y, 0);
    });

    // Asteroid-asteroid collisions with swept detection
    const processedPairs = new Set();
    const maxSpeed = 1.8; // Cap post-collision speed (adjustable)
    asteroidPositions.forEach(({ asteroid: asteroid1, prevPosition: prevPosition1 }, index1) => {
      asteroidPositions.forEach(({ asteroid: asteroid2, prevPosition: prevPosition2 }, index2) => {
        if (index1 >= index2) return; // Skip self and reverse pairs
        const pairKey = `${index1}-${index2}`;
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);

        const radius1 = asteroid1.sizeCategory === 'extraLarge' ? 12 :
                        asteroid1.sizeCategory === 'large' ? 9 :
                        asteroid1.sizeCategory === 'medium' ? 6 :
                        asteroid1.sizeCategory === 'small' ? 3 : 1.5;
        const radius2 = asteroid2.sizeCategory === 'extraLarge' ? 12 :
                        asteroid2.sizeCategory === 'large' ? 9 :
                        asteroid2.sizeCategory === 'medium' ? 6 :
                        asteroid2.sizeCategory === 'small' ? 3 : 1.5;

        // Swept collision detection
        const toAsteroid1 = asteroid1.position.subtract(prevPosition1);
        const toAsteroid2 = asteroid2.position.subtract(prevPosition2);
        const relativeMotion = toAsteroid1.subtract(toAsteroid2);
        const startDistance = Vector3.Distance(prevPosition1, prevPosition2);

        if (startDistance < radius1 + radius2) {
          // Already overlapping at frame start
          const normal = asteroid2.position.subtract(asteroid1.position).normalize();
          const relativeVelocity = asteroid1.velocity.subtract(asteroid2.velocity);
          const velocityAlongNormal = Vector3.Dot(relativeVelocity, normal);

          if (velocityAlongNormal > 0) return;

          const restitution = 0.3; // Reduced for more energy loss
          const impulseScalar = -(1 + restitution) * velocityAlongNormal / (1 / asteroid1.mass + 1 / asteroid2.mass);
          const impulse = normal.scale(impulseScalar);

          asteroid1.velocity = asteroid1.velocity.subtract(impulse.scale(1 / asteroid1.mass));
          asteroid2.velocity = asteroid2.velocity.add(impulse.scale(1 / asteroid2.mass));

          // Cap velocities
          const speed1 = asteroid1.velocity.length();
          const speed2 = asteroid2.velocity.length();
          if (speed1 > maxSpeed) asteroid1.velocity = asteroid1.velocity.normalize().scale(maxSpeed);
          if (speed2 > maxSpeed) asteroid2.velocity = asteroid2.velocity.normalize().scale(maxSpeed);

          const overlap = (radius1 + radius2 - startDistance) * 0.5;
          asteroid1.position = asteroid1.position.subtract(normal.scale(overlap));
          asteroid2.position = asteroid2.position.add(normal.scale(overlap));

          console.log(`Asteroid collision (overlap): ${asteroid1.sizeCategory} vs ${asteroid2.sizeCategory}`, {
            v1: asteroid1.velocity,
            v2: asteroid2.velocity,
            impulse: impulse.length()
          });
        } else {
          // Check collision during movement
          const toAsteroid2Start = prevPosition2.subtract(prevPosition1);
          const relativeMotionLengthSq = relativeMotion.lengthSquared();
          if (relativeMotionLengthSq === 0) return;

          const t = -Vector3.Dot(toAsteroid2Start, relativeMotion) / relativeMotionLengthSq;
          const closestPointDist = Math.max(0, Math.min(1, t));
          const closestPoint1 = prevPosition1.add(toAsteroid1.scale(closestPointDist));
          const closestPoint2 = prevPosition2.add(toAsteroid2.scale(closestPointDist));
          const distance = Vector3.Distance(closestPoint1, closestPoint2);

          if (distance < radius1 + radius2) {
            asteroid1.position = closestPoint1;
            asteroid2.position = closestPoint2;

            const normal = closestPoint2.subtract(closestPoint1).normalize();
            const relativeVelocity = asteroid1.velocity.subtract(asteroid2.velocity);
            const velocityAlongNormal = Vector3.Dot(relativeVelocity, normal);

            if (velocityAlongNormal > 0) return;

            const restitution = 0.5; // Reduced for more energy loss
            const impulseScalar = -(1 + restitution) * velocityAlongNormal / (1 / asteroid1.mass + 1 / asteroid2.mass);
            const impulse = normal.scale(impulseScalar);

            asteroid1.velocity = asteroid1.velocity.subtract(impulse.scale(1 / asteroid1.mass));
            asteroid2.velocity = asteroid2.velocity.add(impulse.scale(1 / asteroid2.mass));

            // Cap velocities
            const speed1 = asteroid1.velocity.length();
            const speed2 = asteroid2.velocity.length();
            if (speed1 > maxSpeed) asteroid1.velocity = asteroid1.velocity.normalize().scale(maxSpeed);
            if (speed2 > maxSpeed) asteroid2.velocity = asteroid2.velocity.normalize().scale(maxSpeed);

            const overlap = (radius1 + radius2 - distance) * 0.5;
            asteroid1.position = asteroid1.position.subtract(normal.scale(overlap));
            asteroid2.position = asteroid2.position.add(normal.scale(overlap));

            console.log(`Asteroid swept collision: ${asteroid1.sizeCategory} vs ${asteroid2.sizeCategory}`, {
              v1: asteroid1.velocity,
              v2: asteroid2.velocity,
              t: closestPointDist,
              impulse: impulse.length()
            });
          }
        }
      });
    });

    // Level progression
    if (shipState.asteroids.length === 0 && shipState.isAlive && !shipState.isPaused) {
      shipState.level += 1;
      spawnAsteroids(shipState.level);
      updateLevelDisplay();
      updateScoreDisplay(); // Refresh score position in case world size changed
      console.log('Level advanced to:', shipState.level);
    }

    // Flash "INSERT COIN" when game is over
    if (shipState.lives <= 0) {
      shipState.insertCoinFlashTimer += 1;
      const flashInterval = 120; // 2 seconds at 60 FPS (4-second cycle: 2 on, 2 off)
      const isVisible = (shipState.insertCoinFlashTimer % flashInterval) < (flashInterval / 2);
      shipState.insertCoinMeshes.forEach(mesh => {
        mesh.isVisible = isVisible;
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
  return { shipState, togglePause };
};