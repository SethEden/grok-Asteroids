// src/systems/movement.js
export const updateMovement = (entities, delta, config = {}) => {
  const { worldWidth = 7680, worldHeight = 1080, wrap = true } = config;
  let syncNeeded = false;
  const now = Date.now();
  let lastSync = 0;

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (entity.position && entity.velocity && typeof entity.velocity.vx === 'number' && typeof entity.velocity.vy === 'number') {
      entity.position.x += entity.velocity.vx * delta;
      entity.position.y += entity.velocity.vy * delta;

      if (wrap) {
        const oldX = entity.position.x;
        const oldY = entity.position.y;
        entity.position.x = ((entity.position.x + worldWidth / 2) % worldWidth) - worldWidth / 2;
        entity.position.y = ((entity.position.y + worldHeight / 2) % worldHeight) - worldHeight / 2;
        if (oldX !== entity.position.x || oldY !== entity.position.y) {
          window.electronAPI.ipcRenderer.send('log', `Wrapped: id=${entity.id}, from (${oldX.toFixed(2)}, ${oldY.toFixed(2)}) to (${entity.position.x.toFixed(2)}, ${entity.position.y.toFixed(2)})`);
          syncNeeded = true;
        }
      }

      if (entity.lifetime) {
        entity.lifetime -= delta;
        if (entity.lifetime <= 0) {
          if (entity.renderable && entity.renderable.renderObject) {
            entity.renderable.renderObject.dispose();
          }
          entities.splice(i, 1);
          window.electronAPI.ipcRenderer.send('log', `Bullet expired: id=${entity.id}, entities=${entities.length}`);
          i--;
          continue;
        }
      }

      if (entity.velocity.vx !== 0 || entity.velocity.vy !== 0) {
        window.electronAPI.ipcRenderer.send('log', `Moved: id=${entity.id}, x=${entity.position.x.toFixed(2)}, y=${entity.position.y.toFixed(2)}, vx=${entity.velocity.vx.toFixed(2)}, vy=${entity.velocity.vy.toFixed(2)}`);
        syncNeeded = true;
      }

      if (syncNeeded && now - lastSync > 100) {
        window.electronAPI.ipcRenderer.send('update-entity-position', { id: entity.id, x: entity.position.x, y: entity.position.y });
        lastSync = now;
      }
    }
  }
};