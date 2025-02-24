import { ipcRenderer } from 'electron';

export const setupInput = (entities, { canvas, displays, currentDisplayId }) => {
  const updatePosition = (x, y) => {
    const player = entities[0];
    if (player && player.position) {
      const worldWidth = displays.reduce((sum, d) => sum + d.bounds.width, 0);
      const worldHeight = displays[0].bounds.height; // Assuming uniform height
      const screenWidth = canvas.width;
      const screenHeight = canvas.height;
      const minX = Math.min(...displays.map(d => d.bounds.x));
      const currentDisplay = displays.find(d => d.id === currentDisplayId);
      const worldXOffset = currentDisplay.bounds.x - minX;

      // Map mouse coordinates to world coordinates
      const worldX = worldXOffset + (x / screenWidth) * screenWidth;
      const worldY = worldHeight - (y / screenHeight) * worldHeight; // Y increases upwards

      player.position.x = worldX;
      player.position.y = worldY;
      ipcRenderer.send('update-player-position', { x: worldX, y: worldY });
    }
  };

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    updatePosition(mouseX, mouseY);
  });

  canvas.addEventListener('click', () => {
    const player = entities[0];
    if (player && player.position) {
      ipcRenderer.send('log', `Clicked at ${player.position.x}, ${player.position.y}`);
    }
  });
};

export const updateInput = () => {};