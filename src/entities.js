// src/entities.js
import { createPosition } from './components/position.js';
import { createVelocity } from './components/velocity.js';
import { createRenderable } from './components/renderable.js';

export const createEntities = ({ BABYLON, scene }) => {
  const target = {
    position: createPosition(0, 0),
    renderable: createRenderable({
      BABYLON,
      scene,
      type: 'lines',
      points: [
        new BABYLON.Vector3(-5, 0, 0), // Small horizontal line as target
        new BABYLON.Vector3(5, 0, 0),
      ],
      color: new BABYLON.Color3(1, 1, 1), // White
    }),
  };

  const playerShip = {
    position: createPosition(0, 0),
    velocity: createVelocity(0, 0),
    renderable: createRenderable({
      BABYLON,
      scene,
      type: 'lines',
      points: [
        new BABYLON.Vector3(0, 10, 0), // Nose
        new BABYLON.Vector3(-5, -5, 0), // Left base
        new BABYLON.Vector3(5, -5, 0), // Right base
        new BABYLON.Vector3(0, 10, 0), // Close loop
      ],
      color: new BABYLON.Color3(1, 1, 1), // White
    }),
  };

  return [target, playerShip];
};