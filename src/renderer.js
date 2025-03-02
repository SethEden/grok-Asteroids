import { initializeEngine } from './engine.js';
import { setupGame } from './game.js';
import { setupInput } from './input.js';

console.log('Hello from renderer.js!');

const canvas = document.getElementById('renderCanvas');
if (!canvas) {
  console.error('Canvas not found!');
  throw new Error('Cannot proceed without canvas');
}

const { engine, scene } = initializeEngine(canvas);
const { shipState, togglePause } = setupGame(scene, canvas);
console.log('renderer.js: shipState received:', { 
  shipStateExists: !!shipState, 
  playerShipExists: !!shipState?.shipState?.playerShip 
});
setupInput(canvas, { shipState, scene, togglePause });