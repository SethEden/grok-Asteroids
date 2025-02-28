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

  // Add velocity and size category
  const speed = 0.5 + Math.random() * 0.5;
  const direction = Math.random() * 2 * Math.PI;
  asteroid.velocity = new Vector3(Math.cos(direction) * speed, Math.sin(direction) * speed, 0);
  asteroid.sizeCategory = size > 7.5 ? 'large' : size > 4 ? 'medium' : 'small'; // Large: >7.5, Medium: 4–7.5, Small: <4

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