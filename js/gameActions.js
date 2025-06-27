// Игровые действия и логика
import { GRID_SIZE, CELL_SIZE, towerData, enemyData } from './constants.js';
import { state } from './state.js';
import { updateUI } from './ui.js';

// ===== Классы =====
export function Tower(x, y, type) {  
  return {  
    gridX: x, gridY: y, type,  
    cx: x * CELL_SIZE + CELL_SIZE / 2,  
    cy: y * CELL_SIZE + CELL_SIZE / 2,  
    cooldown: 0  
  };
}

export function Enemy(pth, conf, type) {
  let x = (Array.isArray(pth) && pth.length) ? pth[0][0] * CELL_SIZE + CELL_SIZE / 2 : 0;
  let y = (Array.isArray(pth) && pth.length) ? pth[0][1] * CELL_SIZE + CELL_SIZE / 2 : 0;
  return {
    path: pth,
    pathIdx: 0,
    conf,
    type,
    hp: conf.hp,
    x,
    y,
    initPos: 1,
    progress: 0,
    dotEffects: []
  };
}

export function Bullet(x, y, target, tower) {
  let conf = towerData[tower.type];
  let bullet = {
    x, y, target,
    damage: conf.damage,
    speed: conf.bulletSpeed,
    color: conf.color,
    towerType: tower.type,
    hit: false
  };
  if (conf.dot) bullet.dot = conf.dot;
  return bullet;
}

// ==== A* для врагов, общий путь от входа до базы =====
export function generateEnemyPath() {
  const start = [0, 0], goal = [GRID_SIZE - 1, GRID_SIZE - 1];
  const totalPath = findPath(start, goal);

  if (Array.isArray(totalPath) && totalPath.length > 1) {
    state.path = totalPath;
    if (state.devMode) debugLogEvent("enemy_path_updated", { length: state.path.length, path: state.path });
  } else {
    state.path = [];
    if (state.devMode) debugLogEvent("enemy_path_error", { path: totalPath, message: "Empty or invalid path" });
  }
}

// ===== Действия с башнями =====
export function placeTower(x, y, type) {
  let conf = towerData[type];
  if (state.money < conf.cost) {
    if (state.devMode) debugLogEvent('not_enough_money', { x, y, type, money: state.money });
    return;
  }

  state.towers.push(new Tower(x, y, type));
  state.grid[y][x].tower = state.towers[state.towers.length - 1];
  state.grid[y][x].blocked = true;
  state.money -= conf.cost;

  if (state.devMode) debugLogEvent('tower_built', {
    x, y, type,
    cost: conf.cost,
    money_left: state.money,
    total_towers: state.towers.length
  });

  generateEnemyPath();
  recalcPathsForAllEnemies();
  updateUI();
}

export function sellTower(x, y) {
  let cell = state.grid[y][x];
  if (!cell.tower) return false;
  let type = cell.tower.type;
  let refund = Math.round(0.5 * towerData[type].cost);
  state.money += refund;
  let ind = state.towers.indexOf(cell.tower);
  if (ind > -1) state.towers.splice(ind, 1);
  state.grid[y][x].tower = null;
  state.grid[y][x].blocked = false;
  updateUI();
  hideTowerInfo();
  generateEnemyPath();
  recalcPathsForAllEnemies();
  return true;
}

// ==== Пересчёт маршрутов всех врагов после постройки башни ====
function recalcPathsForAllEnemies() {
  for (let e of state.enemies) {
    let current = e.path && e.path[e.pathIdx] ? e.path[e.pathIdx] : [0, 0];
    let newPath = findPath(current, [GRID_SIZE - 1, GRID_SIZE - 1]);

    if (newPath && newPath.length > 1) {
      e.path = newPath;
      e.pathIdx = 0;
      if (state.devMode) debugLogEvent("enemy_path_recalc", { from: current, to: [GRID_SIZE - 1, GRID_SIZE - 1], length: newPath.length });
    } else {
      if (state.devMode) debugLogEvent("enemy_path_recalc_fail", { from: current, to: [GRID_SIZE - 1, GRID_SIZE - 1] });
      e.path = [];
      e.pathIdx = 0;
    }
  }
}


/**
 * @param {number} wave
 * @returns {number} общий множитель
 */
function scalingAll(wave) {
  const bonus = Math.floor((wave - 1) / 10) * 0.20;
  return 1 + bonus;
}


/**
 * @param {number} wave - номер волны
 * @returns {number} множитель здоровья врагов
 */
function scalingHP(wave) {
  const bonus = Math.floor((wave - 1) / 5) * 150;
  return 1 + bonus;
}

/**
 * @param {number} wave
 * @returns {number} множитель скорости
 */
function scalingSpeed(wave) {
  const bonus3 = Math.floor((wave - 1) / 3) * 0.01;
  const bonus10 = Math.floor((wave - 1) / 10) * 0.05;
  return 1 + bonus3 + bonus10;
}

/**
 * @param {number} wave
 * @returns {number} множитель награды
 */
function scalingReward(wave) {
  const bonus = Math.floor((wave - 1) / 5) * 2.00;
  return 1 + bonus;
}

/**
 * @param {number} wave
 * @returns {number} множитель урона
 */
function scalingDamage(wave) {
  const bonus = Math.floor((wave - 1) / 10);
  return 1 + bonus;
}


// ===== Действия с врагами =====
export function spawnEnemy(eidx, waveIndex) {
  try {
    if (!Array.isArray(state.path) || state.path.length < 2) {
      if (state.devMode) console.warn("[spawnEnemy] Отменено — нет пути");
      return;
    }

    const econf = enemyData[eidx];
    if (!econf) {
      console.error(`[spawnEnemy] Неизвестный враг: ${eidx}`);
      return;
    }

    const w = waveIndex + 1;
    const allMult = scalingAll(w);

    const hpMult = scalingHP(w) * allMult;
    const speedMult = scalingSpeed(w) * allMult;
    const rewardMult = scalingReward(w) * allMult;
    const damageMult = scalingDamage(w) * allMult;

    const scaledConf = {
      ...econf,
      hp: Math.round(econf.hp * hpMult),
      speed: Math.round(econf.speed * speedMult),
      reward: Math.round(econf.reward * rewardMult),
      damage: Math.floor(econf.damage * damageMult)
    };

    const enemy = new Enemy([...state.path], scaledConf, eidx);
    enemy.dotEffects = [];
    state.enemies.push(enemy);

    if (state.devMode) debugLogEvent("enemy_spawned", { eidx, wave: w, conf: scaledConf });
  } catch (err) {
    console.error("[spawnEnemy] Ошибка:", err);
  }
}

// ===== Вспомогательные функции =====
export function getDeltaTime() {  
  const now = Date.now();  
  const dt = (now - state.lastUpdateTime) / 1000;
  state.lastUpdateTime = now;
  return dt;  
}

export function distance(x1, y1, x2, y2) { 
  return Math.hypot(x1-x2, y1-y2); 
}

export function applyDotEffect(enemy, dot) {
  if (!dot) return;

  let eff = enemy.dotEffects.find(e => e.type === dot.type);
  if (!eff) {
    eff = {
      type: dot.type,
      dps: dot.dps,
      stacks: 1,
      maxStacks: dot.maxStacks || 1,
      stackDuration: dot.stackDuration,
      multiDps: dot.multiDps,
      multiStacks: dot.multiStacks,
      expires: [dot.stackDuration]
    };
    enemy.dotEffects.push(eff);
  } else {
    if (dot.multiStacks && eff.stacks < eff.maxStacks) {
      eff.stacks++;
      eff.expires.push(dot.stackDuration);
    } else {
      eff.expires = eff.expires.map(() => dot.stackDuration);
    }
    if (dot.multiDps) {
      eff.dps += dot.dps;
    }
  }
}

// ==== Поиск пути A* между двумя точками с логами =====
export function findPath(start, goal) {
  function toKey([x, y]) { return `${x},${y}`; }
  function heuristic(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
  let openSet = [start];
  let gScore = {};
  let fScore = {};
  let cameFrom = {};
  gScore[toKey(start)] = 0;
  fScore[toKey(start)] = heuristic(start, goal);

  let closedSet = {};

  while (openSet.length) {
    // Найти узел с минимальным fScore в openSet
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; ++i)
      if ((fScore[toKey(openSet[i])]||Infinity) < (fScore[toKey(openSet[bestIdx])]||Infinity)) bestIdx = i;
    let current = openSet[bestIdx];
    openSet.splice(bestIdx, 1);
    let ckey = toKey(current);

    if (current[0] === goal[0] && current[1] === goal[1]) {
      let totalPath = [current];
      while (cameFrom[toKey(totalPath[0])])
        totalPath.unshift(cameFrom[toKey(totalPath[0])]);
      if (state.devMode) debugLogEvent("path_found", { from: start, to: goal, length: totalPath.length });
      return totalPath;
    }

    closedSet[ckey] = true;
    let [x, y] = current;
    let neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(([nx, ny]) =>
        nx >= 0 && nx < GRID_SIZE &&
        ny >= 0 && ny < GRID_SIZE &&
        !state.grid[ny][nx].blocked
      );

    for (let neighbor of neighbors) {
      let nkey = toKey(neighbor);
      if (closedSet[nkey]) continue;
      let tentative_gScore = gScore[ckey] + 1;
      if (!(nkey in gScore) || tentative_gScore < gScore[nkey]) {
        cameFrom[nkey] = current;
        gScore[nkey] = tentative_gScore;
        fScore[nkey] = gScore[nkey] + heuristic(neighbor, goal);
        if (!openSet.some(([ox, oy]) => ox === neighbor[0] && oy === neighbor[1])) {
          openSet.push(neighbor);
        }
      }
    }
  }
  if (state.devMode) debugLogEvent("path_fail", { from: start, to: goal });
  return [];
}

