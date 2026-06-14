// js/constants.js

// ===== Constants and configuration =====
export const GRID_SIZE = 15;
export const CELL_SIZE = 40;
export const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;

export let enemyData = [];
export let towerData = [];
export let waveData = [];

let dataLoadPromise = null;

async function loadDataFile(fileName) {
  const url = `${import.meta.env.BASE_URL}data/${fileName}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function loadGameData() {
  if (dataLoadPromise) return dataLoadPromise;

  dataLoadPromise = Promise.all([
    loadDataFile('enemies.json'),
    loadDataFile('towers.json'),
    loadDataFile('waves.json')
  ]).then(([enemies, towers, waves]) => {
    enemyData = enemies;
    towerData = towers;
    waveData = waves;

    return { enemyData, towerData, waveData };
  });

  return dataLoadPromise;
}
