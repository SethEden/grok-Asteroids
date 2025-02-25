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
        new BABYLON.Vector3(-5, 0, 0),
        new BABYLON.Vector3(5, 0, 0),
      ],
      color: new BABYLON.Color3(1, 1, 1),
    }),
    id: 'target',
  };

  const playerShip = {
    position: createPosition(0, 0),
    velocity: createVelocity(0, 0),
    renderable: createRenderable({
      BABYLON,
      scene,
      type: 'lines',
      points: [
        new BABYLON.Vector3(0, 10, 0),
        new BABYLON.Vector3(-5, -5, 0),
        new BABYLON.Vector3(5, -5, 0),
        new BABYLON.Vector3(0, 10, 0),
      ],
      color: new BABYLON.Color3(1, 1, 1),
    }),
    id: 'player',
  };

  return [target, playerShip];
};

export const createBullet = ({ BABYLON, scene, shipPosition, shipRotation }) => {
  const bulletSpeed = 500;
  const angle = shipRotation + Math.PI / 2;
  const vx = Math.cos(angle) * bulletSpeed;
  const vy = Math.sin(angle) * bulletSpeed;

  return {
    position: createPosition(shipPosition.x, shipPosition.y),
    velocity: createVelocity(vx, vy),
    renderable: createRenderable({
      BABYLON,
      scene,
      type: 'lines',
      points: [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 5, 0),
      ],
      color: new BABYLON.Color3(1, 1, 1),
    }),
    lifetime: 2,
  };
};