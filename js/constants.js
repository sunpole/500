//js/constants.js

// ===== Константы и параметры =====
export const GRID_SIZE = 15;
export const CELL_SIZE = 40;
export const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;

export const enemyData = [
  { name: "Яблоко",  hp: 80,    speed: 250, color: '#ff3e3e', reward: 7, damage: 1 },  
  { name: "Банан",   hp: 120,   speed: 120, color: '#fcbf2f', reward: 6, damage: 1 },  
  { name: "Авокадо", hp: 850,   speed: 100, color: '#8fc74e', reward: 15, damage: 2 },  
  { name: "Арбуз",   hp: 4000,  speed: 200, color: '#4edc9e', reward: 120, damage: 4 },
  { name: "Дыня",    hp: 2000,  speed: 300, color: '#ffca98', reward: 180, damage: 4 },  
  { name: "Груша",   hp: 8000,  speed: 200, color: '#a7d09b', reward: 65, damage: 4 },
  { name: "Капуста", hp: 5000,  speed: 50,  color: '#a3d0a6', reward: 100, damage: 3 },
  { name: "Свекла",  hp: 6000,  speed: 60,  color: '#c84b3f', reward: 110, damage: 5 },
  { name: "Баклажан", hp: 70000, speed: 70,  color: '#5c3e7f', reward: 130, damage: 6 },
  { name: "Помидор", hp: 75000,  speed: 80,  color: '#ff4d4d', reward: 140, damage: 6 },
  { name: "Тыква",   hp: 100000, speed: 30,  color: '#ff9838', reward: 200, damage: 8 }
];

export const towerData = [
  // 🌸 ДЕШЁВЫЕ БАШНИ (для старта)
  {
    name: "🐭 Мышка",
    cost: 15,
    range: 3.0,
    damage: 8,
    cooldown: 0.5,
    color: '#dcdcdc',
    bulletSpeed: 480
  },
  {
    name: "🦎 Геккон",
    cost: 27,
    range: 2.5,
    damage: 1,
    cooldown: 0.2,
    color: '#a0f5c4',
    bulletSpeed: 500,
    dot: {
      type: "poison",
      dps: 30,
      stackDuration: 10,
      maxStacks: 50,
      multiDps: true,
      multiStacks: true
    }
  },
  {
    name: "🦜 Попугайчик",
    cost: 28,
    range: 4.0,
    damage: 9,
    cooldown: 0.15,
    color: '#ffe3ac',
    bulletSpeed: 800
  },
  {
    name: "🦉 Совёнок",
    cost: 32,
    range: 3,
    damage: 2,
    cooldown: 0.10,
    color: '#ccf1ff',
    bulletSpeed: 1,
    laser: true
  },

  // 🌀 СРЕДНИЙ СЕГМЕНТ (универсальные)
  {
    name: "🦊 Лиса",
    cost: 60,
    range: 3.5,
    damage: 75,
    cooldown: 0.9,
    color: '#ffa64d',
    bulletSpeed: 1000
  },
  {
    name: "🦔 Ёж",
    cost: 65,
    range: 4,
    damage: 1,
    cooldown: 0.20,
    color: '#8ee5a2',
    bulletSpeed: 700,
    dot: {
      type: "poison",
      dps: 80,
      stackDuration: 4,
      maxStacks: 10,
      multiDps: true,
      multiStacks: true
    }
  },
  {
    name: "🦅 Орёл",
    cost: 70,
    range: 5.0,
    damage: 3,
    cooldown: 0.05,
    color: '#b7b7ff',
    bulletSpeed: 5,
    laser: true
  },
  {
    name: "🦘 Кенгуру",
    cost: 75,
    range: 3.0,
    damage: 50,
    cooldown: 0.08,
    color: '#ffcfde',
    bulletSpeed: 1600
  },

  // 🔥 УЛЬТРА ДОРОГИЕ (лейт-гейм)
  {
    name: "🦖 Рекс",
    cost: 240,
    range: 6.0,
    damage: 350,
    cooldown: 1.3,
    color: '#ff2f2f',
    bulletSpeed: 1600
  },
  {
    name: "🐆 Гепард",
    cost: 260,
    range: 2.5,
    damage: 95,
    cooldown: 0.02,
    color: '#ffc700',
    bulletSpeed: 2800
  },
  {
    name: "🐉 Дракон",
    cost: 280,
    range: 5,
    damage: 20,
    cooldown: 0.01,
    color: '#7b2fff',
    bulletSpeed: 12,
    laser: true
  },
  {
    name: "🦂 Скорпион",
    cost: 800,
    range: 4.0,
    damage: 80,
    cooldown: 0.15,
    color: '#00f5ff',
    bulletSpeed: 1400,
    dot: {
      type: "poison",
      dps: 800,
      stackDuration: 6,
      maxStacks: 250,
      multiDps: true,
      multiStacks: true
    }
  }
];

export const waveData = [
  { enemies: [ {e:0, n:12, d:0.2} ] },
  { enemies: [ {e:0, n:9, d:0.5}, {e:1, n:4, d:0.066} ] },
  { enemies: [ {e:0, n:11, d:0.06}, {e:1, n:5, d:0.04} ] },
  { enemies: [ {e:0, n:13, d:0.53}, {e:1, n:6, d:0.62} ] },
  // Волна 5
  { enemies: [ {e:0, n:15, d:0.4}, {e:1, n:10, d:0.45}, {e:2, n:1, d:2.0} ] },

  { enemies: [ {e:0, n:16, d:0.39}, {e:1, n:11, d:0.44}, {e:2, n:2, d:1.9} ] },
  { enemies: [ {e:0, n:17, d:0.38}, {e:1, n:12, d:0.43}, {e:2, n:3, d:1.8} ] },
  { enemies: [ {e:0, n:18, d:0.37}, {e:1, n:13, d:0.42}, {e:2, n:4, d:1.7} ] },
  { enemies: [ {e:0, n:19, d:0.36}, {e:1, n:14, d:0.41}, {e:2, n:5, d:1.6} ] },
  // Волна 10
  { enemies: [ {e:1, n:18, d:0.35}, {e:2, n:10, d:1.3}, {e:3, n:1, d:3.0} ] },

  { enemies: [ {e:1, n:19, d:0.35}, {e:2, n:10, d:1.28} ] },
  { enemies: [ {e:1, n:20, d:0.34}, {e:2, n:11, d:1.26} ] },
  { enemies: [ {e:1, n:21, d:0.34}, {e:2, n:11, d:1.24} ] },
  { enemies: [ {e:1, n:22, d:0.33}, {e:2, n:12, d:1.22} ] },
  // Волна 15
  { enemies: [ {e:1, n:23, d:0.33}, {e:2, n:12, d:1.2}, {e:3, n:1, d:3.0} ] },

  { enemies: [ {e:1, n:24, d:0.32}, {e:2, n:13, d:1.18} ] },
  { enemies: [ {e:1, n:25, d:0.32}, {e:2, n:13, d:1.16} ] },
  { enemies: [ {e:1, n:26, d:0.31}, {e:2, n:14, d:1.14} ] },
  { enemies: [ {e:1, n:27, d:0.31}, {e:2, n:14, d:1.12} ] },
  // Волна 20
  { enemies: [ {e:1, n:22, d:0.26}, {e:2, n:20, d:0.7}, {e:4, n:4, d:1.2}, {e:3, n:2, d:3.0} ] },

  { enemies: [ {e:1, n:22, d:0.26}, {e:2, n:20, d:0.69}, {e:4, n:4, d:1.2} ] },
  { enemies: [ {e:1, n:23, d:0.26}, {e:2, n:21, d:0.67}, {e:4, n:4, d:1.2} ] },
  { enemies: [ {e:1, n:23, d:0.25}, {e:2, n:21, d:0.66}, {e:4, n:4, d:1.2} ] },
  { enemies: [ {e:1, n:24, d:0.25}, {e:2, n:22, d:0.64}, {e:4, n:4, d:1.2} ] },
  // Волна 25
  { enemies: [ {e:1, n:24, d:0.25}, {e:2, n:22, d:0.62}, {e:4, n:5, d:1.2}, {e:3, n:2, d:3.0} ] },

  { enemies: [ {e:1, n:25, d:0.25}, {e:2, n:23, d:0.61}, {e:4, n:5, d:1.2} ] },
  { enemies: [ {e:1, n:25, d:0.25}, {e:2, n:23, d:0.59}, {e:4, n:5, d:1.2} ] },
  { enemies: [ {e:1, n:26, d:0.24}, {e:2, n:24, d:0.58}, {e:4, n:5, d:1.2} ] },
  { enemies: [ {e:1, n:26, d:0.24}, {e:2, n:24, d:0.56}, {e:4, n:5, d:1.2} ] },
  // Волна 30
  { enemies: [ {e:1, n:25, d:0.2}, {e:2, n:25, d:0.6}, {e:4, n:7, d:0.8}, {e:5, n:6, d:1.5} ] },

  { enemies: [ {e:1, n:25, d:0.2}, {e:2, n:25, d:0.6}, {e:4, n:7, d:0.8}, {e:5, n:6, d:1.5} ] },
  { enemies: [ {e:1, n:25, d:0.2}, {e:2, n:26, d:0.6}, {e:4, n:8, d:0.8}, {e:5, n:6, d:1.5} ] },
  { enemies: [ {e:1, n:26, d:0.2}, {e:2, n:26, d:0.6}, {e:4, n:8, d:0.8}, {e:5, n:6, d:1.5} ] },
  { enemies: [ {e:1, n:26, d:0.2}, {e:2, n:27, d:0.6}, {e:4, n:8, d:0.8}, {e:5, n:6, d:1.5} ] },
  // Волна 35
  { enemies: [ {e:1, n:26, d:0.2}, {e:2, n:27, d:0.6}, {e:4, n:8, d:0.8}, {e:5, n:7, d:1.5} ] },

  { enemies: [ {e:1, n:27, d:0.2}, {e:2, n:28, d:0.6}, {e:4, n:9, d:0.8}, {e:5, n:7, d:1.5} ] },
  { enemies: [ {e:1, n:27, d:0.2}, {e:2, n:28, d:0.6}, {e:4, n:9, d:0.8}, {e:5, n:7, d:1.5} ] },
  { enemies: [ {e:1, n:27, d:0.2}, {e:2, n:29, d:0.6}, {e:4, n:9, d:0.8}, {e:5, n:7, d:1.5} ] },
  { enemies: [ {e:1, n:28, d:0.2}, {e:2, n:29, d:0.6}, {e:4, n:9, d:0.8}, {e:5, n:7, d:1.5} ] },
  // Волна 40
  { enemies: [ {e:3, n:2, d:3.5}, {e:4, n:14, d:1.0}, {e:5, n:13, d:0.9} ] },

  { enemies: [ {e:3, n:30, d:3.2}, {e:4, n:14, d:1.0}, {e:5, n:130, d:0.9} ] },
  { enemies: [ {e:3, n:40, d:2.9}, {e:4, n:14, d:1.0}, {e:5, n:130, d:0.9} ] },
  { enemies: [ {e:3, n:50, d:2.6}, {e:4, n:14, d:1.0}, {e:5, n:103, d:0.9} ] },
  { enemies: [ {e:3, n:60, d:2.3}, {e:4, n:15, d:1.0}, {e:5, n:104, d:0.9} ] },
  // Волна 45
  { enemies: [ {e:3, n:70, d:0.01}, {e:4, n:815, d:1.0}, {e:5, n:104, d:0.9} ] }
];
