// src/components/renderable.js
import { ipcRenderer } from 'electron';

export const createRenderable = ({ BABYLON, scene, type, size, points, color }) => {
  let renderObject;

  switch (type) {
    case 'sprite':
      // Sprite case removed since we don’t use spriteManager anymore
      throw new Error('Sprite type no longer supported');
    case 'circle':
      renderObject = BABYLON.MeshBuilder.CreateDisc('circle', { radius: size / 2, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
      renderObject.position.z = 0;
      logVertices(renderObject, 'circle');
      break;
    case 'square':
      renderObject = BABYLON.MeshBuilder.CreatePlane('square', { size, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
      renderObject.position.z = 0;
      logVertices(renderObject, 'square');
      break;
    case 'lines':
      renderObject = BABYLON.MeshBuilder.CreateLines('lines', { points }, scene);
      renderObject.position.z = 0;
      logVertices(renderObject, 'lines');
      break;
    case 'custom':
      renderObject = points; // Assuming points is a pre-built mesh for 'custom'
      renderObject.position.z = 0;
      logVertices(renderObject, 'custom');
      break;
    default:
      throw new Error(`Unknown renderable type: ${type}`);
  }

  const material = new BABYLON.StandardMaterial('mat', scene);
  // Use provided color or default to white for Asteroids vibe
  const finalColor = color || new BABYLON.Color3(1, 1, 1); // White
  material.diffuseColor = finalColor;
  material.emissiveColor = finalColor;
  renderObject.material = material;

  if (renderObject.isVisible !== undefined) {
    ipcRenderer.send('log', `Renderable ${type} visibility: ${renderObject.isVisible}`);
  } else {
    ipcRenderer.send('log', `Renderable ${type} no visibility property`);
  }

  ipcRenderer.send('log', `Created renderable: ${type}, mesh: ${renderObject.name}`);
  return { renderObject };
};

// Helper to log vertices
const logVertices = (mesh, type) => {
  if (mesh && mesh.geometry) {
    const vertices = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (vertices) {
      const vertexCount = vertices.length / 3; // x, y, z per vertex
      let vertexLog = `Vertices for ${type} (${mesh.name}):`;
      for (let i = 0; i < vertexCount; i++) {
        const x = vertices[i * 3];
        const y = vertices[i * 3 + 1];
        const z = vertices[i * 3 + 2];
        vertexLog += ` (${x}, ${y}, ${z})`;
      }
      ipcRenderer.send('log', vertexLog);
    } else {
      ipcRenderer.send('log', `No vertices for ${type} (${mesh.name})`);
    }
  } else {
    ipcRenderer.send('log', `No geometry for ${type}`);
  }
};