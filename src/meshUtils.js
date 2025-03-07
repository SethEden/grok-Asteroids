import { MeshBuilder } from '../node_modules/@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '../node_modules/@babylonjs/core/Materials/standardMaterial.js';
import { Vector3 } from '../node_modules/@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '../node_modules/@babylonjs/core/Maths/math.color.js';

export const createUnlitTriangle = (name, size, position, rotation, color, scene) => {
  const points = [
    new Vector3(0, size, 0),   // Top vertex
    new Vector3(-size / 2, -size / 2, 0), // Bottom-left
    new Vector3(size / 2, -size / 2, 0),   // Bottom-right
    new Vector3(0, size, 0)          // Back to top to close the triangle
  ];
  const triangle = MeshBuilder.CreateLines(name, { points, updatable: true }, scene);
  triangle.position = position;
  triangle.rotation = rotation;
  console.log('Triangle mesh created:', { name, position, rotation: { x: triangle.rotation.x, y: triangle.rotation.y, z: triangle.rotation.z } });

  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = color; // Unlit, wireframe color
  triangle.material = material;
  console.log('Material applied:', material);

  return triangle;
};

export const createBullet = (name, position, rotation, color, scene) => {
  const length = 2; // Short pulse laser length
  const points = [
    new Vector3(0, 0, 0),      // Start at ship nose
    new Vector3(0, length, 0)  // End forward
  ];
  const bullet = MeshBuilder.CreateLines(name, { points, updatable: true }, scene);
  bullet.position = position;
  bullet.rotation = rotation;
  console.log('Bullet created:', { name, position, rotation: { x: bullet.rotation.x, y: bullet.rotation.y, z: bullet.rotation.z } });

  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = color;
  bullet.material = material;

  return bullet;
};

export const createAsteroid = (name, size, position, scene) => {
  const points = [];
  const sides = 6;
  const radiusVariance = 0.3;
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * 2 * Math.PI;
    const radius = size * (1 + (Math.random() - 0.5) * radiusVariance);
    points.push(new Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0));
  }
  points.push(points[0]);

  const asteroid = MeshBuilder.CreateLines(name, { points, updatable: true }, scene);
  asteroid.position = position;
  asteroid.rotation = new Vector3(0, 0, Math.random() * Math.PI * 2);
  console.log('Asteroid created:', { name, position, rotation: { x: asteroid.rotation.x, y: asteroid.rotation.y, z: asteroid.rotation.z } });

  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = new Color3(0.8, 0.8, 0.8);
  asteroid.material = material;

  const speed = 0.5 + Math.random() * 0.5;
  const direction = Math.random() * 2 * Math.PI;
  asteroid.velocity = new Vector3(Math.cos(direction) * speed, Math.sin(direction) * speed, 0);

  asteroid.sizeCategory = size > 12 ? 'extraLarge' : size > 9 ? 'large' : size > 6 ? 'medium' : size > 3 ? 'small' : 'tiny';
  asteroid.size = size;

  // Assign mass based on size category (simple tiered scale)
  asteroid.mass = asteroid.sizeCategory === 'extraLarge' ? 5 :
                  asteroid.sizeCategory === 'large' ? 4 :
                  asteroid.sizeCategory === 'medium' ? 3 :
                  asteroid.sizeCategory === 'small' ? 2 : 1;

  return asteroid;
};

export const createLifeIcon = (name, size, position, scene) => {
  const points = [
    new Vector3(0, size, 0),
    new Vector3(-size / 2, -size / 2, 0),
    new Vector3(size / 2, -size / 2, 0),
    new Vector3(0, size, 0)
  ];
  const icon = MeshBuilder.CreateLines(name, { points, updatable: true }, scene);
  icon.position = position;
  icon.rotation = new Vector3(0, 0, 0);
  console.log('Life icon created:', { name, position });

  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = new Color3(1, 1, 1);
  icon.material = material;

  return icon;
};

export const createLetterMesh = (letter, name, baseX, baseY, scene) => {
  const letterSize = 5; // Height of each letter
  const letterDefs = {
    // Uppercase A-Z (X reversed: 5 - x for positioning, but coordinates are already mirrored)
    'A': [[5, 0], [2.5, 5], [0, 0], [1, 1.5], [4, 1.5], [5, 0]],
    'B': [[5, 0], [5, 5], [1, 5], [0, 4], [1, 2.5], [0, 1], [1, 0], [5, 0]],
    'C': [[0, 0], [5, 0], [5, 5], [0, 5]],
    'D': [[5, 0], [5, 5], [1, 5], [0, 4], [0, 1], [1, 0], [5, 0]],
    'E': [[0, 0], [5, 0], [5, 5], [0, 5], [5, 5], [5, 2.5], [1, 2.5]],
    'F': [[5, 0], [5, 5], [0, 5], [5, 2.5], [1, 2.5]],
    'G': [[2.5, 2.5], [0, 2.5], [0, 0], [5, 0], [5, 5], [0, 5]],
    'H': [[5, 0], [5, 5], [0, 5], [0, 0], [5, 2.5], [0, 2.5]],
    'I': [[5, 0], [0, 0], [2.5, 0], [2.5, 5], [0, 5], [5, 5]],
    'J': [[0, 0], [0, 5], [5, 5], [4, 4], [4, 0]],
    'K': [[5, 0], [5, 5], [0, 5], [5, 2.5], [0, 0]],
    'L': [[5, 5], [5, 0], [0, 0]],
    'M': [[5, 0], [5, 5], [2.5, 2.5], [0, 5], [0, 0]],
    'N': [[5, 0], [5, 5], [0, 0], [0, 5]],
    'O': [[5, 0], [5, 5], [0, 5], [0, 0], [5, 0]],
    'P': [[5, 0], [5, 5], [0, 5], [0, 2.5], [5, 2.5]],
    'Q': [[5, 0], [5, 5], [0, 5], [0, 0], [5, 0], [2.5, 2.5], [0, 0]],
    'R': [[5, 0], [5, 5], [0, 5], [0, 2.5], [5, 2.5], [2.5, 2.5], [0, 0]],
    'S': [[5, 0], [0, 0], [0, 2.5], [5, 2.5], [5, 5], [0, 5]],
    'T': [[5, 5], [0, 5], [2.5, 5], [2.5, 0]],
    'U': [[5, 5], [5, 0], [0, 0], [0, 5]],
    'V': [[5, 5], [2.5, 0], [0, 5]],
    'W': [[5, 5], [4, 0], [2.5, 2.5], [1, 0], [0, 5]],
    'X': [[5, 0], [0, 5], [5, 5], [0, 0]],
    'Y': [[5, 5], [2.5, 2.5], [0, 5], [2.5, 0]],
    'Z': [[5, 5], [0, 5], [5, 0], [0, 0]],
    // Lowercase a-z (simplified, shorter versions, X reversed)
    'a': [[4, 0], [4, 2.5], [2, 2.5], [1, 1.5], [2, 0], [4, 1]],
    'b': [[5, 0], [5, 3], [3, 3], [2, 2], [3, 0], [5, 0]],
    'c': [[2, 0], [4, 0], [5, 1], [4, 2], [2, 2]],
    'd': [[2, 0], [2, 3], [4, 3], [5, 2], [4, 0], [2, 0]],
    'e': [[2, 0], [5, 0], [5, 1.5], [3, 1.5], [5, 3], [2, 3]],
    'f': [[4, 0], [4, 2], [5, 2], [3, 3], [4, 3]],
    'g': [[2, 0], [4, 0], [5, 1], [4, 2], [2, 2], [2, -1], [3, -1]],
    'h': [[5, 0], [5, 3], [3, 1.5], [2, 3]],
    'i': [[4, 0], [4, 2], [5, 2], [3, 2], [4, 3]],
    'j': [[3, 0], [3, 2], [4, 2], [4, -1]],
    'k': [[5, 0], [5, 3], [4, 1.5], [2, 3], [4, 1], [2, 0]],
    'l': [[4, 0], [4, 3], [5, 2]],
    'm': [[5, 0], [5, 2], [4, 1], [3, 2], [3, 0], [2, 2]],
    'n': [[5, 0], [5, 2], [3, 0], [3, 2]],
    'o': [[5, 0], [5, 2], [3, 2], [3, 0], [5, 0]],
    'p': [[5, 0], [5, 2], [3, 2], [3, 1], [5, 1]],
    'q': [[5, 0], [5, 2], [3, 2], [3, 0], [4, 1], [2, -1]],
    'r': [[5, 0], [5, 2], [3, 2], [4, 1]],
    's': [[3, 0], [5, 0], [5, 1], [3, 1], [3, 2], [5, 2]],
    't': [[5, 1], [3, 1], [4, 0], [4, 3]],
    'u': [[5, 2], [5, 0], [3, 0], [3, 2]],
    'v': [[5, 2], [4, 0], [3, 2]],
    'w': [[5, 2], [4.5, 0], [4, 1], [3.5, 0], [3, 2]],
    'x': [[5, 0], [3, 2], [5, 2], [3, 0]],
    'y': [[5, 2], [4, 1], [3, 2], [4, 0], [4, -1]],
    'z': [[5, 2], [3, 2], [5, 0], [3, 0]],
    // Numbers 0-9 (X reversed)
    '0': [[5, 0], [5, 5], [0, 5], [0, 0], [5, 0], [0, 5]],
    '1': [[2.5, 0], [2.5, 5], [5, 4]],
    '2': [[5, 5], [0, 5], [5, 0], [0, 0], [0, 2.5]],
    '3': [[5, 5], [0, 5], [0, 0], [5, 0], [5, 2.5], [0, 2.5]],
    '4': [[5, 5], [5, 2], [0, 2], [0, 5], [0, 0]],
    '5': [[0, 5], [5, 5], [5, 2.5], [0, 2.5], [0, 0], [5, 0]],
    '6': [[0, 5], [5, 5], [5, 0], [0, 0], [0, 2.5], [5, 2.5]],
    '7': [[5, 5], [0, 5], [3, 0]],
    '8': [[5, 0], [5, 5], [0, 5], [0, 0], [5, 0], [5, 2.5], [0, 2.5]],
    '9': [[0, 0], [0, 5], [5, 5], [5, 2.5], [0, 2.5]]
  };

  const points = (letterDefs[letter] || []).map(([x, y]) => new Vector3(baseX + x, baseY + y, 0));
  if (points.length === 0) return null;

  const mesh = MeshBuilder.CreateLines(name, { points }, scene);
  mesh.color = new Color3(1, 1, 1);
  console.log(`Letter mesh created: ${letter}`, { name, baseX, baseY });
  return mesh;
};

export const createShipFragments = (position, scene) => {
  const fragments = [];
  const segmentCount = 10; // Minimum number of segments
  // Configurable cap-limits
  const minVelocity = 0.001; // Minimum speed (units/frame)
  const maxVelocity = .8; // Maximum speed (units/frame)
  const minRotationSpeed = 0.02; // Minimum rotation (rad/frame)
  const maxRotationSpeed = 0.4; // Maximum rotation (rad/frame)
  const baseLength = 1.0; // Base length of segments, can vary slightly

  for (let i = 0; i < segmentCount; i++) {
    // Randomize segment length (0.5x to 1.5x baseLength)
    const length = baseLength * (0.5 + Math.random());

    // Random start and end points for variety
    const angleOffset = Math.random() * 2 * Math.PI;
    const startX = Math.cos(angleOffset) * (Math.random() * 0.5); // Small offset from center
    const startY = Math.sin(angleOffset) * (Math.random() * 0.5);
    const endX = startX + Math.cos(angleOffset) * length;
    const endY = startY + Math.sin(angleOffset) * length;

    const points = [
      new Vector3(startX, startY, 0),
      new Vector3(endX, endY, 0)
    ];

    const fragment = MeshBuilder.CreateLines(`fragment${i}`, { points }, scene);
    fragment.position = position.clone();
    fragment.color = new Color3(1, 1, 1);

    // Random velocity: direction (360°) and magnitude (minVelocity to maxVelocity)
    const direction = Math.random() * 2 * Math.PI;
    const speed = minVelocity + Math.random() * (maxVelocity - minVelocity);
    fragment.velocity = new Vector3(
      Math.cos(direction) * speed,
      Math.sin(direction) * speed,
      0
    );

    // Random rotation speed (minRotationSpeed to maxRotationSpeed), positive or negative
    fragment.rotationVelocity = minRotationSpeed + Math.random() * (maxRotationSpeed - minRotationSpeed);
    fragment.rotationVelocity *= Math.random() < 0.5 ? 1 : -1; // Random direction (clockwise or counterclockwise)

    fragment.lifetime = 60; // Same as before, can be adjusted if needed

    fragments.push(fragment);
    console.log(`Fragment ${i} created:`, {
      position: fragment.position,
      velocity: fragment.velocity,
      rotationVelocity: fragment.rotationVelocity,
      length
    });
  }

  console.log('Ship fragments created at:', position, `Count: ${fragments.length}`);
  return fragments;
};

export const createShield = (name, position, scene) => {
  const points = [];
  const segments = 32;
  const radius = 2; // Shield radius around ship
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push(new Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0));
  }
  const shield = MeshBuilder.CreateLines(name, { points }, scene);
  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = new Color3(1, 1, 1); // White shield
  shield.material = material;
  shield.position = position;
  shield.isVisible = false; // Hidden until activated
  console.log('Shield created:', { name, position });
  return shield;
};