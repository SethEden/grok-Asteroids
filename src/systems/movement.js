// src/systems/movement.js
import { ipcRenderer } from 'electron';

export const updateMovement = (entities, delta, config = {}) => {
  const { worldWidth = 5760, worldHeight = 1080, wrap = false } = config;
  entities.forEach(entity => {
    if (entity.position && entity.velocity && typeof entity.velocity.vx === 'number' && typeof entity.velocity.vy === 'number') {
      entity.position.x += entity.velocity.vx * delta;
      entity.position.y += entity.velocity.vy * delta;

      if (wrap) {
        entity.position.x = (entity.position.x + worldWidth / 2) % worldWidth - worldWidth / 2;
        entity.position.y = (entity.position.y + worldHeight / 2) % worldHeight - worldHeight / 2;
      } else {
        entity.position.x = Math.max(-worldWidth / 2, Math.min(worldWidth / 2, entity.position.x));
        entity.position.y = Math.max(-worldHeight / 2, Math.min(worldHeight / 2, entity.position.y));
      }

      if (entity.velocity.vx !== 0 || entity.velocity.vy !== 0) {
        ipcRenderer.send('log', `Entity moved to x=${entity.position.x}, y=${entity.position.y}`);
      }
    }
  });
};