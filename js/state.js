// Централизованное хранилище состояния игры
export const state = {
  // Основные игровые переменные
  money: 100,
  health: 10,
  wave: 0,
  gameOver: false,
  victory: false,
  defeatCause: "",

  // Состояние интерфейса
  selectedTowerType: null,
  isPlacingTower: false,
  placingTowerCell: null,
  buildZoneHints: [],
  mouseGridX: null,
  mouseGridY: null,

  // Отладка
  devMode: false,
  devLog: [],

  // Таймеры и волны
  lastUpdateTime: Date.now(),
  activeSpawners: [],
  waveTimeoutActive: false,
  nextWaveDelay: 3,
  wavePauseLeft: 0,

  // Игровые объекты
  grid: [],
  path: [],
  towers: [],
  enemies: [],
  bullets: []
};

// Геттеры для удобного доступа
export function getMoney() { return state.money; }
export function setMoney(value) { state.money = value; }
export function getHealth() { return state.health; }
export function setHealth(value) { state.health = value; }
export function getWave() { return state.wave; }
export function setWave(value) { state.wave = value; }
export function getGameOver() { return state.gameOver; }
export function setGameOver(value) { state.gameOver = value; }
export function getVictory() { return state.victory; }
export function setVictory(value) { state.victory = value; }
export function getDefeatCause() { return state.defeatCause; }
export function setDefeatCause(value) { state.defeatCause = value; }

// Другие геттеры/сеттеры по аналогии...