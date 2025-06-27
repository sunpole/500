// Основной игровой модуль
import { GRID_SIZE, CELL_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, towerData, waveData } from './constants.js';
import { Bullet, placeTower, sellTower, spawnEnemy, getDeltaTime, distance, applyDotEffect, generateEnemyPath } from './gameActions.js';
import { updateUI, showTowerInfo, hideTowerInfo, createUIButtons } from './ui.js';
import { state } from './state.js';

// Глобальные переменные, не относящиеся к состоянию
export let canvas, ctx;

// ===== 2. Инициализация =====
function init() {
  // 1. Сбросим ВСЕ переменные!
  state.towers = []; state.enemies = []; state.bullets = [];
  state.money = 100; state.health = 10; state.wave = 0;      // wave = 0 чтобы подготовиться к запуску первой волны
  state.selectedTowerType = null;
  state.isPlacingTower = false; state.placingTowerCell = null;
  state.mouseGridX = state.mouseGridY = null;
  state.buildZoneHints = [];
  state.gameOver = false; state.victory = false; state.defeatCause = "";
  state.activeSpawners = [];                      // сбрасываем активные спавнеры
  state.waveTimeoutActive = true;                 // Сразу ставим паузу перед первой волной
  state.wavePauseLeft = state.nextWaveDelay;
  if (typeof state.devLog === "undefined") state.devLog = [];

  canvas = document.getElementById('game');
  if (!canvas) {
    alert('Canvas не найден!');
    return;
  }
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  ctx = canvas.getContext('2d');

  createEmptyGrid();
  if (!Array.isArray(state.grid) || state.grid.length !== GRID_SIZE) {
    alert('Ошибка при создании сетки!');
    return;
  }
  generateEnemyPath();
  if (!Array.isArray(state.path) || state.path.length < 2) {
    alert('Путь для врагов не найден! Проверьте сетку!');
    showGameOverScreen();
    return;
  }
  updateUI();
  try {
    document.getElementById('dev-panel').style.display = state.devMode ? "" : "none";
    document.getElementById('wave-timer').style.display = 'none';
  } catch(e) {}

  if (!canvas._tdEvents) {
    canvas.addEventListener('mousedown', handleMouseClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', ()=>{state.mouseGridX=null;state.mouseGridY=null;state.buildZoneHints=[];});
    document.addEventListener('keydown', handleKeyDown);
    canvas._tdEvents = true;
  }

  createUIButtons();

  // Не запускаем волну сразу — пауза перед первой волной
  state.waveTimeoutActive = true;
  state.wavePauseLeft = state.nextWaveDelay; // Обычно это 3 секунды
  updateWaveTimerUI(Math.ceil(state.nextWaveDelay));
  document.getElementById('wave-timer').style.display = "";
  requestAnimationFrame(gameLoop);

  if (state.devMode) {
    setTimeout(()=>{
      console.log('[TD] State after init:', {
        towers: state.towers, enemies: state.enemies, bullets: state.bullets,
        grid: state.grid ? 'OK' : 'fail', path: state.path ? state.path.length : 0,
        wave: state.wave, money: state.money, health: state.health
      });
    }, 100);
  }
}  

// ===== 3. Сетка и маршрут =====

function createEmptyGrid() {
  state.grid = [];
  for (let y = 0; y < GRID_SIZE; ++y) {
    let row = [];
    for (let x = 0; x < GRID_SIZE; ++x)
      row.push({ tower: null, base: x === GRID_SIZE - 1 && y === GRID_SIZE - 1, blocked: false });
    state.grid.push(row);
  }
}


// ===== 4. Игровой цикл =====
function gameLoop() {
  if (state.gameOver) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ===== 5. Обновление =====
function update() {
  let dt = getDeltaTime();
  console.log('update dt:', dt);

  updateTimers(dt);
  if (!state.waveTimeoutActive) {
    updateSpawners(dt);
    updateEnemies(dt);
    state.bullets = state.bullets.filter(b => b.target && b.target.hp > 0);
    updateTowersShooting(dt);
    updateTowers(dt);
    updateBullets(dt);
    handleCollisions();
    checkWaveEnd();
  }
  checkGameOver();
  checkVictoryCondition();
}


function updateTimers(dt) {
  if (state.waveTimeoutActive && state.wavePauseLeft > 0) {
    state.wavePauseLeft -= dt;
    updateWaveTimerUI(Math.max(0, Math.ceil(state.wavePauseLeft)));
    if (state.wavePauseLeft <= 0) {
      state.waveTimeoutActive = false;
      document.getElementById('wave-timer').style.display = "none";
      if (state.wave < waveData.length) {      // Проверяем, есть ли еще волны
        launchWave(state.wave);                // Запускаем новую волну через спавнер
        state.wave++;
        updateUI();
      }
    }
  }
}

function createSpawnerForWave(waveIndex) {
  if (!waveData[waveIndex]) return null;
  let spawnList = JSON.parse(JSON.stringify(waveData[waveIndex].enemies));
  return {
    spawnList,
    spawnIdx: 0,
    nextEnemySpawnAt: 0,
    left: spawnList.reduce((sum, e) => sum + e.n, 0),
    finished: false,
    waveIndex
  };
}

function updateSpawners(dt) {
  for (const s of state.activeSpawners) {
    if (s.finished) continue;
    let sl = s.spawnList;
    let idx = s.spawnIdx;
    if (idx >= sl.length) { s.finished = true; continue; }
    let entry = sl[idx];
    if (!entry) { s.finished = true; continue; }

    s.nextEnemySpawnAt -= dt;
    if (entry.n > 0 && s.nextEnemySpawnAt <= 0) {
      spawnEnemy(entry.e, s.waveIndex);
      entry.n--;
      s.left--;
      s.nextEnemySpawnAt = entry.d;
    }
    if (entry.n <= 0) s.spawnIdx++;
    if (s.left <= 0 && s.spawnIdx >= sl.length) s.finished = true;
  }
  // Можно почистить завершённые очереди так:
  // state.activeSpawners = state.activeSpawners.filter(s => !s.finished);
}

function launchWave(waveIndex) {
  const spawner = createSpawnerForWave(waveIndex);
  if (spawner) state.activeSpawners.push(spawner);
}


// === Масштабирующие функции для волновой сложности ===



// Используется импортированная функция spawnEnemy из gameActions.js

/**
 * Проверяет завершение волны
 */
function checkWaveEnd() {
  // Проверяем, что все спавнеры завершены, нет врагов, игра не окончена и нет активного таймаута волны
  const allSpawnersDone = state.activeSpawners.every(s => s.finished);
  if (
    allSpawnersDone &&
    state.enemies.length === 0 &&
    state.wave < waveData.length &&
    !state.gameOver &&
    !state.waveTimeoutActive
  ) {
    state.waveTimeoutActive = true;
    state.wavePauseLeft = state.nextWaveDelay;
    updateWaveTimerUI(state.nextWaveDelay);

    const timerEl = document.getElementById('wave-timer');
    if (timerEl) {
      timerEl.style.display = "block";  // Лучше явно указывать block для видимости
    }
  }
}

/**
 * Обновление UI таймера волны
 * @param {number} secLeft - сколько секунд до следующей волны
 */
function updateWaveTimerUI(secLeft) {
  const el = document.getElementById('wave-timer');
  if (el) {
    el.textContent = `Следующая волна: ${secLeft} сек.`;
  }
}


/**
 * Обновляет всех врагов (движение, эффекты, смерть)
 * @param {number} dt - дельта времени в секундах
 */
function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; --i) {
    const e = state.enemies[i];

    // === DOT (яд, ожог) ===
    for (let j = e.dotEffects.length - 1; j >= 0; --j) {
      const eff = e.dotEffects[j];
      e.hp -= eff.dps * eff.stacks * dt;

      eff.expires = eff.expires.map(t => t - dt).filter(t => t > 0);
      eff.stacks = eff.expires.length;

      if (eff.stacks <= 0) e.dotEffects.splice(j, 1);
    }

    // === Смерть ===
    if (e.hp <= 0 || isNaN(e.hp)) {
      state.money += e.conf.reward || 0;
      state.enemies.splice(i, 1);
      if (typeof updateUI === "function") updateUI();
      continue;
    }

    // === Проверка пути ===
    if (!Array.isArray(e.path) || e.path.length < 2 || e.pathIdx >= e.path.length - 1) {
      const cx = Math.floor(e.x / CELL_SIZE);
      const cy = Math.floor(e.y / CELL_SIZE);
      const newPath = findPath([cx, cy], [GRID_SIZE - 1, GRID_SIZE - 1]);

      if (Array.isArray(newPath) && newPath.length > 1) {
        e.path = newPath;
        e.pathIdx = 0;
        e.progress = 0;
        if (state.devMode) debugLogEvent("enemy_repath_success", { from: [cx, cy], newLen: newPath.length });
      } else {
        if (state.devMode) debugLogEvent("enemy_stuck", { at: [cx, cy], reason: "no path" });
        continue;
      }
    }
    
    // === Движение ===
    const speedPerSec = e.conf.speed / 100;
    e.progress += dt * speedPerSec;

    while (e.progress >= 1 && e.pathIdx < e.path.length - 1) {
      e.progress -= 1;
      e.pathIdx++;
    }

    // === Достижение базы ===
    if (e.pathIdx >= e.path.length - 1) {
      state.health -= e.conf.damage;
      if (state.devMode) debugLogEvent('enemy_base', {
        eidx: e.type,
        damage: e.conf.damage,
        wave: state.wave,
        health: state.health
      });
      state.enemies.splice(i, 1);
      if (typeof updateUI === "function") updateUI();
      continue;
    }

    // === Интерполяция ===
    const [cx, cy] = e.path[e.pathIdx];
    const [nx, ny] = e.path[e.pathIdx + 1] || [cx, cy];
    const tx = cx + (nx - cx) * e.progress;
    const ty = cy + (ny - cy) * e.progress;

    e.x = tx * CELL_SIZE + CELL_SIZE / 2;
    e.y = ty * CELL_SIZE + CELL_SIZE / 2;
  }
}


/**
 * Обновление башен (анимация лазера)
 * @param {number} dt
 */
function updateTowers(dt) {
  for (const t of state.towers) {
    if (t.laserVisual) {
      t.laserVisual.show -= dt;
      if (t.laserVisual.show <= 0) {
        t.laserVisual = null;
      }
    }
  }
}

/**
 * Основная логика стрельбы пушек
 * @param {number} dt
 */
function updateTowersShooting(dt) {
  for (let t of state.towers) {
    t.cooldown -= dt;
    if (t.cooldown <= 0) {
      const conf = towerData[t.type];
      // Поиск всех врагов в радиусе
      let inRange = state.enemies.filter(
        e => distance(t.cx, t.cy, e.x, e.y) <= conf.range * CELL_SIZE
      );
      if (inRange.length) {
        // Сортируем: дальше по пути, меньше hp
        let target = inRange.sort(
          (a, b) => b.pathIdx - a.pathIdx || a.hp - b.hp
        )[0];

        if (conf.laser) { // теперь проверка по флагу laser, а не по имени
          target.hp -= conf.damage;
          t.cooldown = conf.cooldown;

          // Актуализировать визуализацию лазера
          t.laserVisual = {
            x1: t.cx,
            y1: t.cy,
            x2: target.x,
            y2: target.y,
            color: conf.color || '#0ff',
            show: 0.10 // сек видимости
          };

          // Проверяем смерть противника и даём награду
          if (target.hp <= 0) {
            state.money += target.conf.reward || 0;
            let idx = state.enemies.indexOf(target);
            if (idx > -1) state.enemies.splice(idx, 1);
            if (typeof updateUI === "function") updateUI();
          }
        }
        else {
          state.bullets.push(new Bullet(t.cx, t.cy, target, t));
          t.cooldown = conf.cooldown;
        }
      }
    }
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; --i) {
    let b = state.bullets[i];

    // Если цель уже умерла — удаляем пулю
    if (!b.target || b.target.hp <= 0) {
      if (state.devMode) debugLogEvent("bullet_removed_dead_target", { id: i });
      state.bullets.splice(i, 1);
      continue;
    }

    // === Работа в КЛЕТКАХ ===
    let dx = (b.target.x - b.x) / CELL_SIZE;
    let dy = (b.target.y - b.y) / CELL_SIZE;
    let dist = Math.hypot(dx, dy);

    let step = dt * (b.speed / 100); // как у врагов — в клетках/сек

    if (dist < step + 0.2) { // запас ~0.2 клетки
      b.hit = true;
      b.target.hp -= b.damage;

      // ===== Накладываем DOT если есть =====
      if (b.dot) {
        applyDotEffect(b.target, b.dot);
      }

      debugLogEvent('hit', {
        tower: b.towerType,
        eidx: b.target.type,
        dmg: b.damage,
        left: b.target.hp
      });

      if (b.target.hp <= 0) {
        state.money += b.target.conf.reward;

        debugLogEvent('enemy_die', {
          eid: b.target.type,
          wv: state.wave,
          money: state.money
        });

        let idx = state.enemies.indexOf(b.target);
        if (idx > -1) state.enemies.splice(idx, 1);
        if (typeof updateUI === "function") updateUI();
      }

      state.bullets.splice(i, 1);
      continue;
    }

    // ===== Движение пули (в пикселях) =====
    b.x += (dx / dist) * step * CELL_SIZE;
    b.y += (dy / dist) * step * CELL_SIZE;

    if (state.devMode) debugLogEvent("bullet_move", {
      id: i,
      speed: b.speed,
      step: (step * CELL_SIZE).toFixed(2),
      dist: (dist * CELL_SIZE).toFixed(2),
      to: [b.target.x.toFixed(1), b.target.y.toFixed(1)]
    });
  }
}

// ===== 6. Мышь и башни =====  

/****
 * Заготовка для обработки коллизий, если нужна в будущем
 */
function handleCollisions() {
  // Пока пусто
}

/**
 * Обработчик клика мыши по игровому полю
 * @param {MouseEvent} e - событие мыши
 * @returns {boolean|undefined} - false если обработали ПКМ для отмены
 */
function handleMouseClick(e) {
  if (state.gameOver || state.victory) {
    if (state.devMode) console.debug("[handleMouseClick] Игра закончена, клики игнорируются");
    return;
  }
  let pos = getCellFromMouse(e);
  if (!pos) {
    if (state.devMode) console.debug("[handleMouseClick] Клик вне поля");
    return;
  }
  let [x, y] = pos;

  // Показываем инфо-бокс по башне, если не в режиме строительства
  if (!state.isPlacingTower && grid[y][x].tower) {
    if (state.devMode) console.debug(`[handleMouseClick] Показ инфо по башне на (${x},${y})`);
    showTowerInfo(grid[y][x].tower.type, x, y);
    return;
  }

  if (e.button === 2) { // ПКМ — отмена выбора башни и режима строительства
    if (state.devMode) console.debug("[handleMouseClick] ПКМ — отмена выбора башни и режима строительства");
    state.selectedTowerType = null;
    state.isPlacingTower = false;
    state.placingTowerCell = null;
    updateUI();
    state.buildZoneHints = [];
    return false;
  }

  if (state.selectedTowerType === null) {
    if (state.devMode) console.debug("[handleMouseClick] Башня для строительства не выбрана");
    return;
  }

  if (isCellEmpty(x, y) && canPlaceTower(x, y)) {
    if (state.devMode) console.debug(`[handleMouseClick] Установка башни типа ${state.selectedTowerType} на (${x},${y})`);
    placeTower(x, y, state.selectedTowerType);
    // Режим строительства не сбрасываем (по вашему замыслу)
    state.placingTowerCell = null;
    state.buildZoneHints = [];
    updateUI();
  } else {
    if (state.devMode) console.debug(`[handleMouseClick] Нельзя поставить башню на (${x},${y})`);
  }
}

/**
 * Обработчик движения мыши по игровому полю
 * @param {MouseEvent} e - событие мыши
 */
function handleMouseMove(e) {
  if (!state.isPlacingTower) {
    state.mouseGridX = state.mouseGridY = null;
    state.buildZoneHints = [];
    if (state.devMode) console.debug("[handleMouseMove] Режим строительства выключен — подсказки сброшены");
    return;
  }
  let pos = getCellFromMouse(e);
  if (pos) {
    state.mouseGridX = pos[0];
    state.mouseGridY = pos[1];
    state.buildZoneHints = [];
    let viewRange = 2;

    for (let y = Math.max(0, state.mouseGridY - viewRange); y <= Math.min(GRID_SIZE - 1, state.mouseGridY + viewRange); y++) {
      for (let x = Math.max(0, state.mouseGridX - viewRange); x <= Math.min(GRID_SIZE - 1, state.mouseGridX + viewRange); x++) {
        // Исключаем старт и финиш
        if ((x === 0 && y === 0) || (x === GRID_SIZE - 1 && y === GRID_SIZE - 1)) continue;
        let allowed = isCellEmpty(x, y) && canPlaceTower(x, y);
        state.buildZoneHints.push({ x, y, allowed });
      }
    }
    if (state.devMode) console.debug(`[handleMouseMove] Подсказки обновлены вокруг (${state.mouseGridX},${state.mouseGridY})`);
  }
}
// ===== 7. Проверки пути и установки с профессиональным логированием =====

/**
 * Проверяет, свободна ли клетка для установки башни.
 * Логирует каждую проверку для отладки.
 * @param {number} x - Координата по X
 * @param {number} y - Координата по Y
 * @returns {boolean} true, если клетка свободна, иначе false
 */
function isCellEmpty(x, y) {
  if (state.grid[y][x].blocked) {
    if (state.devMode) debugLogEvent('cell_blocked', { x, y });
    return false;
  }
  if (state.grid[y][x].tower) {
    if (state.devMode) debugLogEvent('cell_tower_exists', { x, y });
    return false;
  }
  for (let t of state.towers) {
    if (t.gridX === x && t.gridY === y) {
      if (state.devMode) debugLogEvent('cell_tower_in_array', { x, y });
      return false;
    }
  }
  if (state.devMode) debugLogEvent('cell_empty', { x, y });
  return true;
}

/**
 * Проверяет возможность поставить башню на клетку.
 * Запрещает строить на входе и выходе.
 * Выполняет проверку, не перекроет ли башня путь врагам.
 * Логирует каждое решение.
 * @param {number} x - Координата по X
 * @param {number} y - Координата по Y
 * @returns {boolean} true, если башню можно поставить
 */
function canPlaceTower(x, y) {
  if ((x === 0 && y === 0) || (x === GRID_SIZE - 1 && y === GRID_SIZE - 1)) {
    if (state.devMode) debugLogEvent("deny_entrance_exit", { x, y });
    return false;
  }
  if (!isCellEmpty(x, y)) {
    if (state.devMode) debugLogEvent("not_empty", { x, y });
    return false;
  }
  
  // Временно блокируем клетку, чтобы проверить путь
  state.grid[y][x].blocked = true;
  let found = hasEnemyPath();
  if (state.devMode) debugLogEvent("path_check", {
    x, y,
    ok: found,
    message: found ? "Путь есть, строить можно" : "Путь перекрывается, строить нельзя",
    towersCount: towers.length
  });
  state.grid[y][x].blocked = false;

  return found;
}

/**
 * Проверяет, существует ли путь для врага от старта до финиша.
 * Использует алгоритм поиска A* с диагональными переходами.
 * Логирует результат проверка.
 * @returns {boolean} true если путь существует, иначе false
 */
function hasEnemyPath() {
  const start = [0, 0];
  const goal = [GRID_SIZE - 1, GRID_SIZE - 1];

  // Вспомогательная функция эвристики: Манхэттен + диагональ
  function heuristic([x1, y1], [x2, y2]) {
    let dx = Math.abs(x1 - x2);
    let dy = Math.abs(y1 - y2);
    // Диагональное расстояние (Octile distance)
    const D = 1;
    const D2 = Math.SQRT2;
    return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
  }

  // 8 направлений движения с соответствующей стоимостью
  const directions = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],   // горизонтали и вертикали, стоимость 1
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]  // диагонали, стоимость sqrt(2)
  ];

  // Множество посещённых клеток
  let closedSet = new Set();
  // Очередь с приоритетом (min-heap или простой массив с сортировкой)
  // Для простоты используем массив и поиск min каждый раз (недорого при небольшом GRID_SIZE)
  let openSet = [{ pos: start, g: 0, f: heuristic(start, goal) }];
  // Карта для отслеживания пути
  let cameFrom = new Map();

  function posToKey([x, y]) {
    return `${x},${y}`;
  }

  while (openSet.length > 0) {
    // Найти элемент с минимальным f
    openSet.sort((a, b) => a.f - b.f);
    let current = openSet.shift();
    let [cx, cy] = current.pos;

    if (cx === goal[0] && cy === goal[1]) {
      if (state.devMode) debugLogEvent("a_star_pass", { cx, cy, result: "finish reached" });
      return true;
    }

    closedSet.add(posToKey(current.pos));

    for (let [dx, dy, cost] of directions) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      if (state.grid[ny][nx].blocked) continue;
      if (closedSet.has(posToKey([nx, ny]))) continue;

      // Проверка на "сквозные" диагональные проходы между углами башен:
      // Если двигаемся по диагонали, надо убедиться, что соседние клетки по горизонтали и вертикали не заблокированы
      if (dx !== 0 && dy !== 0) {
        if (state.grid[cy][nx].blocked || state.grid[ny][cx].blocked) continue;
      }

      let tentative_g = current.g + cost;
      // Проверяем, есть ли уже этот узел в openSet с меньшей стоимостью
      let existingNode = openSet.find(n => n.pos[0] === nx && n.pos[1] === ny);
      if (existingNode && tentative_g >= existingNode.g) {
        continue;
      }

      cameFrom.set(posToKey([nx, ny]), current.pos);
      if (existingNode) {
        existingNode.g = tentative_g;
        existingNode.f = tentative_g + heuristic([nx, ny], goal);
      } else {
        openSet.push({
          pos: [nx, ny],
          g: tentative_g,
          f: tentative_g + heuristic([nx, ny], goal)
        });
      }
    }
  }

  if (state.devMode) debugLogEvent("a_star_fail", { result: "no path for enemy" });
  return false;
}

// Используется импортированная функция placeTower из gameActions.js

// ===== 8. Классы/фабрики =====
// (Импортированы из gameActions.js)


// ===== 9. Отрисовка =====  

function draw() {
  // Лог: начало отрисовки
  console.log("jsdot: draw() start");

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawGrid();
  drawBuildHints();
  drawTowerRanges();
  drawTowers();

  // === ОТРисОВКА ЛАЗЕРНЫХ ЛУЧЕЙ ===
  // Оптимизация: кешируем время один раз
  const nowSec = performance.now() / 1000;

  for (let t of state.towers) {
    if (t.laserVisual && t.laserVisual.show > 0) {
      let conf = towerData[t.type] || {};
      let freq = conf.bulletSpeed || 15;
      let phase = (nowSec * freq) % 1;

      if (phase < 0.5) {
        // Управляем прозрачностью с учётом интенсивности
        let alpha = 0.6 + 0.4 * Math.min(t.laserVisual.show * 10, 1);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = t.laserVisual.color || "#f00";
        ctx.lineWidth = (conf.name && conf.name.startsWith('LA2')) ? 8 : 4;
        ctx.shadowColor = t.laserVisual.color || "#f00";
        ctx.shadowBlur = 16;

        ctx.beginPath();
        ctx.moveTo(t.laserVisual.x1, t.laserVisual.y1);
        ctx.lineTo(t.laserVisual.x2, t.laserVisual.y2);
        ctx.stroke();

        ctx.restore();

        console.log(`jsdot: draw laser from tower ${t.type} with alpha ${alpha.toFixed(2)}`);
      }
    }
  }

  drawEnemies();
  drawBullets();

  if (state.devMode) debugDrawPath(state.path);

  if (state.victory) showVictoryScreen();
  if (state.gameOver) showGameOverScreen();

  // Лог: конец отрисовка
  console.log("jsdot: draw() end");
}

// Анимация — вызываем draw в цикле через requestAnimationFrame
function animationLoop() {
  draw();
  requestAnimationFrame(animationLoop);
}
// Запуск анимации один раз (где-то в инициализации игры)
// animationLoop();

function drawGrid() {
  ctx.save();
  for (let y = 0; y < GRID_SIZE; ++y) {
    for (let x = 0; x < GRID_SIZE; ++x) {
      ctx.strokeStyle =
        x === 0 && y === 0 ? "#e3ed7a" :
        x === GRID_SIZE - 1 && y === GRID_SIZE - 1 ? "#ffae00" :
        "#3a3a3a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      if (state.grid[y][x].blocked) {
        ctx.fillStyle = "#593045";
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x * CELL_SIZE + 3, y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
        ctx.globalAlpha = 1.0;
      }
    }
  }
  ctx.restore();

  if (state.devMode) {
    ctx.save();
    ctx.strokeStyle = "#31aec8";
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.21;
    ctx.beginPath();
    for (let i = 0; i < state.path.length; ++i) {
      let [x, y] = state.path[i];
      if (i === 0) ctx.moveTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2);
      else ctx.lineTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawBuildHints() {
  if (!state.buildZoneHints || !state.buildZoneHints.length) return;

  for (let hint of state.buildZoneHints) {
    let { x, y, allowed } = hint;
    ctx.save();

    let notEnoughMoney = state.selectedTowerType != null && state.money < (towerData[state.selectedTowerType]?.cost || 99999);

    if (allowed && state.selectedTowerType != null && !notEnoughMoney) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = towerData[state.selectedTowerType].color;
    } else if (allowed && state.selectedTowerType != null && notEnoughMoney) {
      let t = Date.now() / 105;
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t));
      ctx.fillStyle = "rgba(255,25,50,1)";
    } else {
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "#ef2b2b";
    }

    ctx.beginPath();
    ctx.rect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    if (allowed && state.selectedTowerType != null) {
      let tconf = towerData[state.selectedTowerType];
      ctx.save();
      ctx.strokeStyle = "#00ff79";
      ctx.globalAlpha = 0.10;
      ctx.beginPath();
      ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, tconf.range * CELL_SIZE, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  if (state.isPlacingTower && state.mouseGridX !== null && state.mouseGridY !== null) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    let canBuild = isCellEmpty(state.mouseGridX, state.mouseGridY) && canPlaceTower(state.mouseGridX, state.mouseGridY);
    ctx.strokeStyle = canBuild ? "#36ef97" : "#b71010";
    ctx.lineWidth = 4;
    ctx.strokeRect(state.mouseGridX * CELL_SIZE + 3, state.mouseGridY * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
    ctx.globalAlpha = 1;
    ctx.restore();

    if (state.selectedTowerType != null) {
      let tconf = towerData[state.selectedTowerType];
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.beginPath();
      ctx.arc(state.mouseGridX * CELL_SIZE + CELL_SIZE / 2, state.mouseGridY * CELL_SIZE + CELL_SIZE / 2, tconf.range * CELL_SIZE, 0, 2 * Math.PI);
      ctx.fillStyle = tconf.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

function drawTowerRanges() {
  if (!state.devMode) return;
  for (let t of towers) {
    let conf = towerData[t.type];
    ctx.save();
    ctx.beginPath();
    ctx.arc(t.cx, t.cy, conf.range * CELL_SIZE, 0, 2 * Math.PI);
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = conf.color;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

function drawTowers() {
  for (let t of state.towers) {
    let conf = towerData[t.type];
    ctx.beginPath();
    ctx.arc(t.cx, t.cy, CELL_SIZE * 0.33, 0, 2 * Math.PI);
    ctx.fillStyle = conf.color;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#282a3c";
    ctx.stroke();

    // --- Подпись: чёрная обводка + тень + цвет ---
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.strokeText(conf.name, t.cx, t.cy + CELL_SIZE / 2 - 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = conf.color;
    ctx.fillText(conf.name, t.cx, t.cy + CELL_SIZE / 2 - 4);
  }
}
function drawEnemies() {
  for (let e of state.enemies) {
    if (isNaN(e.x) || isNaN(e.y)) continue;
    ctx.save();

    // Тело врага
    ctx.beginPath();
    ctx.arc(e.x, e.y, CELL_SIZE * 0.26, 0, 2 * Math.PI);
    ctx.fillStyle = e.conf.color || "#ddd";
    ctx.globalAlpha = 0.86;
    ctx.fill();
    ctx.strokeStyle = "#4a172a";
    ctx.stroke();

    // HP бар
    let hpRatio = e.hp / e.conf.hp;
    const hpBarWidth = CELL_SIZE * 0.34;
    const hpBarHeight = 5;
    const hpBarX = e.x - hpBarWidth / 2;
    const hpBarY = e.y + CELL_SIZE * 0.13;

    ctx.fillStyle = "#ed3838";
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    ctx.fillStyle = "7de17b";
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight);

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    // Имя врага
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(e.conf.name, e.x, e.y - CELL_SIZE * 0.28);

    // Числовое значение HP справа от полоски
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    const hpText = `${Math.ceil(e.hp)} / ${e.conf.hp}`;
    ctx.fillText(hpText, hpBarX + hpBarWidth + 4, hpBarY + hpBarHeight);

    ctx.restore();

    // Для отладки можно оставить или убрать
    // console.log(`jsdot: drew enemy ${e.conf.name} HP ${e.hp.toFixed(1)}/${e.conf.hp}`);
  }
}


function drawBullets() {
  for (let b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = b.color || "#fff";
    ctx.fill();

    ctx.strokeStyle = "#222";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(b.x, b.y, 10, 0, 2 * Math.PI);
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = b.color || "#fff";
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
}

// ===== 10. Вспомогательные =====  
function getCellFromMouse(e) {  
  let rect = canvas.getBoundingClientRect();  
  let mx = e.clientX - rect.left, my = e.clientY - rect.top;  
  let x = Math.floor(mx / CELL_SIZE), y = Math.floor(my / CELL_SIZE);  
  if (x<0||y<0||x>=GRID_SIZE||y>=GRID_SIZE) return null;  
  return [x,y];  
}  

// ===== 11. Управление и ввод =====  
function handleKeyDown(e) {  
  // Быстрый выбор башни по 1 2 3
  if ("123".includes(e.key)) {  
    let idx = parseInt(e.key) - 1;  
    if (idx < towerData.length && money >= towerData[idx].cost) {   
      selectedTowerType = idx; 
      state.isPlacingTower = true;   
      state.buildZoneHints = [];  
      updateUI();   
    }  
  }  
  // ВКЛ/ВЫКЛ DEV MODE по F8
  if (e.key === "F8") toggleDevMode();  
  // Рестарт по F9
  if (e.key === "F9") restartGame();  
  // Очистка локального сохранения по F10
  if (e.key === "F10") clearSavedGameState();  
}

// Перезапуск игры (полностью сбрасывает состояние)
function restartGame() {   
  // Удаляем таблички поражения и победы, если присутствуют
  let go = document.querySelector('.gameover');
  if (go) go.remove();
  let vic = document.querySelector('.victory');
  if (vic) vic.remove();

  state.waveTimeoutActive = false;
  state.wavePauseLeft = 0;
  document.getElementById('wave-timer').style.display = "none";
  state.buildZoneHints = [];
  init();   
}

// Включение/выключение режима разработчика и панели debug
function toggleDevMode() {
  state.devMode = !state.devMode;
  document.getElementById('dev-panel').style.display = state.devMode ? "" : "none";
  updateUI();
}

// Для отладочного логирования/снимка состояния игры
function logGameState() {
  debugLogEvent('full_state', JSON.stringify({
    grid: state.grid, enemies: state.enemies, towers: state.towers, bullets: state.bullets, health: state.health, money: state.money, wave: state.wave
  }));
}
// ===== 12. Дебаг и проверка =====  
function debugDrawPath(p) {  
  if (!state.devMode||!p.length) return;  
  ctx.save();  
  ctx.globalAlpha=0.37;  
  ctx.strokeStyle = "#ffee22";  
  ctx.lineWidth=3;  
  ctx.beginPath();  
  for (let i=0; i<p.length; ++i) {  
    let [x,y]=p[i];  
        ctx[i==0?"moveTo":"lineTo"](x*CELL_SIZE+CELL_SIZE/2,y*CELL_SIZE+CELL_SIZE/2);
  }
  ctx.stroke();
  ctx.globalAlpha=1;
  ctx.restore();

  // dev info
  let html = '';
  if (state.devLog.length>30) state.devLog.splice(0, state.devLog.length-30);
  html += "<b>[DEV]</b> wave:"+state.wave+" | mon:$"+state.money+" | hp:"+state.health+"<br>";
  html += "towers:"+state.towers.length + " | enemies:"+state.enemies.length+"<br>";
  html += state.path.length?"path len="+state.path.length+"":"no path!";
  html += "<br><pre style='max-height:8em;overflow:auto;'>"+state.devLog.map(e=>JSON.stringify(e)).join("\n")+"</pre>";
  document.getElementById('dev-panel').innerHTML = html;
}
function debugLogEvent(ev, data) { if (state.devMode) state.devLog.push({ev, data, t:(+Date.now()).toString(36).substr(-5)}); }

// ===== 13. Победа и поражение =====
function checkGameOver() {
  if (!state.gameOver && state.health <= 0) {
    showGameOverScreen();
    state.gameOver=true;
    state.defeatCause="lose";
  }
}
function showGameOverScreen() {
  let d = document.createElement("div");
  d.className = "gameover";
  d.innerHTML = "Поражение<br>Волна: "+state.wave+"<br><button onclick='restartGame()'>Рестарт</button>";
  d.style.zIndex=5;
  if (!document.querySelector('.gameover')) document.body.appendChild(d);
}
function checkVictoryCondition() {
  if (!state.victory && state.wave > waveData.length && state.enemies.length === 0 && !state.waveTimeoutActive) {
    showVictoryScreen();
    state.victory=true;
    state.defeatCause="win";
  }
}
function showVictoryScreen() {
  let d = document.createElement("div");
  d.className = "victory";
  d.innerHTML = "Вы победили!<br>Волны: "+waveData.length+"<br><button onclick='restartGame()'>Играть ещё</button>";
  d.style.zIndex=6;
  if (!document.querySelector('.victory')) document.body.appendChild(d);
}

// ===== 14. Сохранение (опционально) =====
function saveGameStateToLocalStorage() {
  localStorage.setItem("td_save",JSON.stringify(state));
}
function loadGameStateFromLocalStorage() {
  let data = localStorage.getItem("td_save");
  if (!data) return;
  Object.assign(state, JSON.parse(data));
  updateUI();
}
function clearSavedGameState() { localStorage.removeItem('td_save'); restartGame(); }

// ===== 15. Экспорт функций в глобал для кнопок и загрузка =====
window.selectTowerType = (i) => {
  if (state.money < towerData[i].cost) return false;
  state.selectedTowerType = i;
  state.isPlacingTower = true;
  state.buildZoneHints = [];
  state.placingTowerCell = null;
  updateUI();
};

window.clearTowerSelection = () => {
  state.selectedTowerType = null;
  state.isPlacingTower = false;
  state.buildZoneHints = [];
  state.placingTowerCell = null;
  updateUI();
};

window.upgradeTower = (x, y) => {
  let cell = state.grid[y][x];
  if (!cell.tower) return false;
  let curType = cell.tower.type;
  let nextType = getNextTowerType(curType);
  if (nextType === null) return false;
  let upgradeCost = towerData[nextType].cost;
  if (state.money < upgradeCost) return false;
  state.money -= upgradeCost;
  cell.tower.type = nextType;
  updateUI();
  showTowerInfo(nextType, x, y);
  return true;
};

window.downgradeTower = (x, y) => {
  let cell = state.grid[y][x];
  if (!cell.tower) return false;
  let curType = cell.tower.type;
  let prevType = getPrevTowerType(curType);
  if (prevType === null) return false;
  let downgradeRefund = towerData[prevType].cost;
  state.money += downgradeRefund;
  cell.tower.type = prevType;
  updateUI();
  showTowerInfo(prevType, x, y);
  return true;
};

window.showTowerInfo = showTowerInfo;
window.hideTowerInfo = hideTowerInfo;
window.sellTower = sellTower;
window.clearSavedGameState = clearSavedGameState;
window.restartGame = restartGame;

window.onload = () => init();
window.addEventListener('contextmenu', e => e.preventDefault());