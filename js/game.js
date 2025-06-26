// Основной игровой код
// ===== 1. Главные переменные =====  
let canvas, ctx;  
let grid = [];  
let towers = [], enemies = [], bullets = [];  
let path = [];  
let money = 100;  
let health = 10;  
let selectedTowerType = null;  
let isPlacingTower = false;  
let devMode = false;  
let devLog = [];  
let placingTowerCell = null;  
let victory = false;  
let defeatCause = "";  
let buildZoneHints = [];  
let mouseGridX = null, mouseGridY = null;  

// --- КОНТРОЛЬ ВОЛН И СПАВНА ---  
let lastUpdateTime = Date.now();              // таймер главного цикла
let activeSpawners = [];                      // массив очередей спавна (любое кол-во волн одновременно)

let waveTimeoutActive = false;                // пауза между авто-волнами
let nextWaveDelay = 3;
let wavePauseLeft = 0;

let wave = 0;                                 // индекс следующей волны для запуска
let gameOver = false;

// ===== 2. Инициализация =====  
function init() {  
  // 1. Сбросим ВСЕ переменные!  
  towers = []; enemies = []; bullets = [];  
  money = 100; health = 10; wave = 0;      // wave = 0 чтобы подготовиться к запуску первой волны
  selectedTowerType = null;  
  isPlacingTower = false; placingTowerCell = null;  
  mouseGridX = mouseGridY = null;  
  buildZoneHints = [];  
  gameOver = false; victory = false; defeatCause = "";  
  activeSpawners = [];                      // сбрасываем активные спавнеры
  waveTimeoutActive = true;                 // Сразу ставим паузу перед первой волной
  wavePauseLeft = nextWaveDelay;
  if (typeof devLog === "undefined") devLog = [];  

  canvas = document.getElementById('game');  
  if (!canvas) {  
    alert('Canvas не найден!');  
    return;  
  }  
  canvas.width = CANVAS_WIDTH;  
  canvas.height = CANVAS_HEIGHT;  
  ctx = canvas.getContext('2d');  

  createEmptyGrid();  
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {  
    alert('Ошибка при создании сетки!');  
    return;  
  }  
  generateEnemyPath();  
  if (!Array.isArray(path) || path.length < 2) {  
    alert('Путь для врагов не найден! Проверьте сетку!');  
    showGameOverScreen();  
    return;  
  }  
  updateUI();  
  try {  
    document.getElementById('dev-panel').style.display = devMode ? "" : "none";  
    document.getElementById('wave-timer').style.display = 'none';  
  } catch(e) {}  

  if (!canvas._tdEvents) {  
    canvas.addEventListener('mousedown', handleMouseClick);  
    canvas.addEventListener('mousemove', handleMouseMove);  
    canvas.addEventListener('mouseleave', ()=>{mouseGridX=null;mouseGridY=null;buildZoneHints=[];});  
    document.addEventListener('keydown', handleKeyDown);  
    canvas._tdEvents = true;  
  }  

  createUIButtons();

  // Не запускаем волну сразу — пауза перед первой волной
  waveTimeoutActive = true;
  wavePauseLeft = nextWaveDelay; // Обычно это 3 секунды
  updateWaveTimerUI(Math.ceil(nextWaveDelay));
  document.getElementById('wave-timer').style.display = "";
  requestAnimationFrame(gameLoop); 

  if (devMode) {  
    setTimeout(()=>{  
      console.log('[TD] State after init:', {  
        towers, enemies, bullets,  
        grid: grid ? 'OK' : 'fail', path: path ? path.length : 0,  
        wave, money, health  
      });  
    }, 100);  
  }  
}  

// ===== 3. Сетка и маршрут =====  

function createEmptyGrid() {  
  grid = [];  
  for (let y = 0; y < GRID_SIZE; ++y) {  
    let row = [];  
    for (let x = 0; x < GRID_SIZE; ++x)  
      row.push({ tower: null, base: x === GRID_SIZE - 1 && y === GRID_SIZE - 1, blocked: false });  
    grid.push(row);  
  }  
}

// ==== Поиск пути A* между двумя точками с логами =====

function findPath(start, goal) {
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
      if (devMode) debugLogEvent("path_found", { from: start, to: goal, length: totalPath.length });
      return totalPath;
    }

    closedSet[ckey] = true;
    let [x, y] = current;
    let neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(([nx, ny]) =>
        nx >= 0 && nx < GRID_SIZE &&
        ny >= 0 && ny < GRID_SIZE &&
        !grid[ny][nx].blocked
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
  if (devMode) debugLogEvent("path_fail", { from: start, to: goal });
  return [];
}

// ==== A* для врагов, общий путь от входа до базы =====
function generateEnemyPath() {
  const start = [0, 0], goal = [GRID_SIZE - 1, GRID_SIZE - 1];
  const totalPath = findPath(start, goal);

  if (Array.isArray(totalPath) && totalPath.length > 1) {
    path = totalPath;
    if (devMode) debugLogEvent("enemy_path_updated", { length: path.length, path });
  } else {
    path = [];
    if (devMode) debugLogEvent("enemy_path_error", { path: totalPath, message: "Empty or invalid path" });
  }
}

// ==== Пересчёт маршрутов всех врагов после постройки башни ====
function recalcPathsForAllEnemies() {
  for (let e of enemies) {
    let current = e.path && e.path[e.pathIdx] ? e.path[e.pathIdx] : [0, 0];
    let newPath = findPath(current, [GRID_SIZE - 1, GRID_SIZE - 1]);

    if (newPath && newPath.length > 1) {
      e.path = newPath;
      e.pathIdx = 0;
      if (devMode) debugLogEvent("enemy_path_recalc", { from: current, to: [GRID_SIZE - 1, GRID_SIZE - 1], length: newPath.length });
    } else {
      if (devMode) debugLogEvent("enemy_path_recalc_fail", { from: current, to: [GRID_SIZE - 1, GRID_SIZE - 1] });
      e.path = [];
      e.pathIdx = 0;
    }
  }
}

// ===== 4. Игровой цикл =====  
function gameLoop() {  
  if (gameOver) return;  
  update();  
  draw();  
  requestAnimationFrame(gameLoop);  
}  

// ===== 5. Обновление =====  
function update() {
  let dt = getDeltaTime();
  console.log('update dt:', dt);  // <-- сюда

  updateTimers(dt);
  if (!waveTimeoutActive) {
    updateSpawners(dt);
    updateEnemies(dt);
    bullets = bullets.filter(b => b.target && b.target.hp > 0);
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
  if (waveTimeoutActive && wavePauseLeft > 0) {  
    wavePauseLeft -= dt;  
    updateWaveTimerUI(Math.max(0, Math.ceil(wavePauseLeft)));  
    if (wavePauseLeft <= 0) {  
      waveTimeoutActive = false;  
      document.getElementById('wave-timer').style.display = "none";  
      if (wave < waveData.length) {      // Проверяем, есть ли еще волны
        launchWave(wave);                // Запускаем новую волну через спавнер
        wave++;
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
  for (const s of activeSpawners) {
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
  // activeSpawners = activeSpawners.filter(s => !s.finished);
}

function launchWave(waveIndex) {
  const spawner = createSpawnerForWave(waveIndex);
  if (spawner) activeSpawners.push(spawner);
}

function getDeltaTime() {  
  const now = Date.now();  
  const dt = (now - lastUpdateTime) / 1000;  
  lastUpdateTime = now;  
  return dt;  
}

// === Масштабирующие функции для волновой сложности ===

/**
 * @param {number} wave - номер волны
 * @returns {number} множитель здоровья врагов
 */
function scalingHP(wave) {
  const bonus = Math.floor((wave - 1) / 5) * 150;
  return 1 + bonus;
}

function scalingHP(wave) {
  const bonus = Math.floor((wave - 1) / 1) * 50;
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

/**
 * @param {number} wave
 * @returns {number} общий множитель
 */
function scalingAll(wave) {
  const bonus = Math.floor((wave - 1) / 10) * 0.20;
  return 1 + bonus;
}

/**
 * Спавн врага с учётом масштабирования параметров
 * @param {number} eidx - тип врага
 * @param {number} waveIndex - индекс волны (0-based)
 */
function spawnEnemy(eidx, waveIndex) {
  try {
    if (!Array.isArray(path) || path.length < 2) {
      if (devMode) console.warn("[spawnEnemy] Отменено — нет пути");
      return;
    }

    const econf = enemyData[eidx];
    if (!econf) {
      console.error(`[spawnEnemy] Неизвестный враг: ${eidx}`);
      return;
    }

    const w = waveIndex + 1;
    const allMult = scalingAll(w);

    const hpMult     = scalingHP(w)      * allMult;
    const speedMult  = scalingSpeed(w)   * allMult;
    const rewardMult = scalingReward(w)  * allMult;
    const damageMult = scalingDamage(w)  * allMult;

    const scaledConf = {
      ...econf,
      hp: Math.round(econf.hp * hpMult),
      speed: Math.round(econf.speed * speedMult),
      reward: Math.round(econf.reward * rewardMult),
      damage: Math.floor(econf.damage * damageMult) // урон округляем вниз
    };

    const enemy = new Enemy([...path], scaledConf, eidx);
    enemy.dotEffects = [];
    enemies.push(enemy);

    if (devMode) debugLogEvent("enemy_spawned", { eidx, wave: w, conf: scaledConf });

  } catch (err) {
    console.error("[spawnEnemy] Ошибка:", err);
  }
}

/**
 * Проверяет завершение волны
 */
function checkWaveEnd() {
  // Проверяем, что все спавнеры завершены, нет врагов, игра не окончена и нет активного таймаута волны
  const allSpawnersDone = activeSpawners.every(s => s.finished);
  if (
    allSpawnersDone &&
    enemies.length === 0 &&
    wave < waveData.length &&
    !gameOver &&
    !waveTimeoutActive
  ) {
    waveTimeoutActive = true;
    wavePauseLeft = nextWaveDelay;
    updateWaveTimerUI(nextWaveDelay);

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
  for (let i = enemies.length - 1; i >= 0; --i) {
    const e = enemies[i];

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
      money += e.conf.reward || 0;
      enemies.splice(i, 1);
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
        if (devMode) debugLogEvent("enemy_repath_success", { from: [cx, cy], newLen: newPath.length });
      } else {
        if (devMode) debugLogEvent("enemy_stuck", { at: [cx, cy], reason: "no path" });
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
      health -= e.conf.damage;
      if (devMode) debugLogEvent('enemy_base', {
        eidx: e.type,
        damage: e.conf.damage,
        wave,
        health
      });
      enemies.splice(i, 1);
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
  for (const t of towers) {
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
  for (let t of towers) {
    t.cooldown -= dt;
    if (t.cooldown <= 0) {
      const conf = towerData[t.type];
      // Поиск всех врагов в радиусе
      let inRange = enemies.filter(
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
            money += target.conf.reward || 0;
            let idx = enemies.indexOf(target);
            if (idx > -1) enemies.splice(idx, 1);
            if (typeof updateUI === "function") updateUI();
          }
        }
        else {
          bullets.push(new Bullet(t.cx, t.cy, target, t));
          t.cooldown = conf.cooldown;
        }
      }
    }
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; --i) {
    let b = bullets[i];

    // Если цель уже умерла — удаляем пулю
    if (!b.target || b.target.hp <= 0) {
      if (devMode) debugLogEvent("bullet_removed_dead_target", { id: i });
      bullets.splice(i, 1);
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
        money += b.target.conf.reward;

        debugLogEvent('enemy_die', {
          eid: b.target.type,
          wv: wave,
          money
        });

        let idx = enemies.indexOf(b.target);
        if (idx > -1) enemies.splice(idx, 1);
        if (typeof updateUI === "function") updateUI();
      }

      bullets.splice(i, 1);
      continue;
    }

    // ===== Движение пули (в пикселях) =====
    b.x += (dx / dist) * step * CELL_SIZE;
    b.y += (dy / dist) * step * CELL_SIZE;

    if (devMode) debugLogEvent("bullet_move", {
      id: i,
      speed: b.speed,
      step: (step * CELL_SIZE).toFixed(2),
      dist: (dist * CELL_SIZE).toFixed(2),
      to: [b.target.x.toFixed(1), b.target.y.toFixed(1)]
    });
  }
}
function applyDotEffect(enemy, dot) {
  if (!dot) return;

  let eff = enemy.dotEffects.find(e => e.type === dot.type);

  if (!eff) {
    // Новый дот-эффект
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
    // Уже есть такой эффект
    if (dot.multiStacks && eff.stacks < eff.maxStacks) {
      eff.stacks++;
      eff.expires.push(dot.stackDuration);
    } else {
      // Обновляем все таймеры
      eff.expires = eff.expires.map(() => dot.stackDuration);
    }
    if (dot.multiDps) {
      eff.dps += dot.dps;
    }
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
  if (gameOver || victory) {
    if (devMode) console.debug("[handleMouseClick] Игра закончена, клики игнорируются");
    return;
  }
  let pos = getCellFromMouse(e);
  if (!pos) {
    if (devMode) console.debug("[handleMouseClick] Клик вне поля");
    return;
  }
  let [x, y] = pos;

  // Показываем инфо-бокс по башне, если не в режиме строительства
  if (!isPlacingTower && grid[y][x].tower) {
    if (devMode) console.debug(`[handleMouseClick] Показ инфо по башне на (${x},${y})`);
    showTowerInfo(grid[y][x].tower.type, x, y);
    return;
  }

  if (e.button === 2) { // ПКМ — отмена выбора башни и режима строительства
    if (devMode) console.debug("[handleMouseClick] ПКМ — отмена выбора башни и режима строительства");
    selectedTowerType = null;
    isPlacingTower = false;
    placingTowerCell = null;
    updateUI();
    buildZoneHints = [];
    return false;
  }

  if (selectedTowerType === null) {
    if (devMode) console.debug("[handleMouseClick] Башня для строительства не выбрана");
    return;
  }

  if (isCellEmpty(x, y) && canPlaceTower(x, y)) {
    if (devMode) console.debug(`[handleMouseClick] Установка башни типа ${selectedTowerType} на (${x},${y})`);
    placeTower(x, y, selectedTowerType);
    // Режим строительства не сбрасываем (по вашему замыслу)
    placingTowerCell = null;
    buildZoneHints = [];
    updateUI();
  } else {
    if (devMode) console.debug(`[handleMouseClick] Нельзя поставить башню на (${x},${y})`);
  }
}

/**
 * Обработчик движения мыши по игровому полю
 * @param {MouseEvent} e - событие мыши
 */
function handleMouseMove(e) {
  if (!isPlacingTower) {
    mouseGridX = mouseGridY = null;
    buildZoneHints = [];
    if (devMode) console.debug("[handleMouseMove] Режим строительства выключен — подсказки сброшены");
    return;
  }
  let pos = getCellFromMouse(e);
  if (pos) {
    mouseGridX = pos[0];
    mouseGridY = pos[1];
    buildZoneHints = [];
    let viewRange = 2;

    for (let y = Math.max(0, mouseGridY - viewRange); y <= Math.min(GRID_SIZE - 1, mouseGridY + viewRange); y++) {
      for (let x = Math.max(0, mouseGridX - viewRange); x <= Math.min(GRID_SIZE - 1, mouseGridX + viewRange); x++) {
        // Исключаем старт и финиш
        if ((x === 0 && y === 0) || (x === GRID_SIZE - 1 && y === GRID_SIZE - 1)) continue;
        let allowed = isCellEmpty(x, y) && canPlaceTower(x, y);
        buildZoneHints.push({ x, y, allowed });
      }
    }
    if (devMode) console.debug(`[handleMouseMove] Подсказки обновлены вокруг (${mouseGridX},${mouseGridY})`);
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
  if (grid[y][x].blocked) {
    if (devMode) debugLogEvent('cell_blocked', { x, y });
    return false;
  }
  if (grid[y][x].tower) {
    if (devMode) debugLogEvent('cell_tower_exists', { x, y });
    return false;
  }
  for (let t of towers) {
    if (t.gridX === x && t.gridY === y) {
      if (devMode) debugLogEvent('cell_tower_in_array', { x, y });
      return false;
    }
  }
  if (devMode) debugLogEvent('cell_empty', { x, y });
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
    if (devMode) debugLogEvent("deny_entrance_exit", { x, y });
    return false;
  }
  if (!isCellEmpty(x, y)) {
    if (devMode) debugLogEvent("not_empty", { x, y });
    return false;
  }
  
  // Временно блокируем клетку, чтобы проверить путь
  grid[y][x].blocked = true;
  let found = hasEnemyPath();
  if (devMode) debugLogEvent("path_check", {
    x, y,
    ok: found,
    message: found ? "Путь есть, строить можно" : "Путь перекрывается, строить нельзя",
    towersCount: towers.length
  });
  grid[y][x].blocked = false;

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
      if (devMode) debugLogEvent("a_star_pass", { cx, cy, result: "finish reached" });
      return true;
    }

    closedSet.add(posToKey(current.pos));

    for (let [dx, dy, cost] of directions) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      if (grid[ny][nx].blocked) continue;
      if (closedSet.has(posToKey([nx, ny]))) continue;

      // Проверка на "сквозные" диагональные проходы между углами башен:
      // Если двигаемся по диагонали, надо убедиться, что соседние клетки по горизонтали и вертикали не заблокированы
      if (dx !== 0 && dy !== 0) {
        if (grid[cy][nx].blocked || grid[ny][cx].blocked) continue;
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

  if (devMode) debugLogEvent("a_star_fail", { result: "no path for enemy" });
  return false;
}

/**
 * Устанавливает башню на поле, обновляет ресурсы, и пересчитывает пути врагов.
 * Логирует все ключевые этапы установки.
 * @param {number} x - Координата по X
 * @param {number} y - Координата по Y
 * @param {string} type - Тип башни
 */
function placeTower(x, y, type) {
  let conf = towerData[type];
  if (money < conf.cost) {
    if (devMode) debugLogEvent('not_enough_money', { x, y, type, money });
    return;
  }

  towers.push(new Tower(x, y, type));
  grid[y][x].tower = towers[towers.length - 1];
  grid[y][x].blocked = true; // Теперь башня блокирует путь
  money -= conf.cost;

  if (devMode) debugLogEvent('tower_built', {
    x, y, type,
    cost: conf.cost,
    money_left: money,
    total_towers: towers.length
  });

  generateEnemyPath();
  recalcPathsForAllEnemies(); // Обновление маршрутов для всех врагов

  if (devMode) {
    debugLogEvent('path_updated_after_tower', {
      new_path: path.map(pair => ({ x: pair[0], y: pair[1] }))
    });
  }

  updateUI();
}


// ===== 8. Классы/фабрики =====  

function Tower(x, y, type) {  
  return {  
    gridX: x, gridY: y, type,  
    cx: x * CELL_SIZE + CELL_SIZE / 2,  
    cy: y * CELL_SIZE + CELL_SIZE / 2,  
    cooldown: 0  
  };
} 

function Enemy(pth, conf, type) {
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
    dotEffects: [] // <-- ВАЖНО: теперь у каждого врага всегда есть массив эффектов DOT
  };
}


function Bullet(x, y, target, tower) {
  let conf = towerData[tower.type];
  let bullet = {
    x, y, target,
    damage: conf.damage,
    speed: conf.bulletSpeed,
    color: conf.color,
    towerType: tower.type,
    hit: false
  };
  // --- Передаем dot из towerData (если он есть) ---
  if (conf.dot) bullet.dot = conf.dot;
  return bullet;
}


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

  for (let t of towers) {
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

  if (devMode) debugDrawPath(path);

  if (victory) showVictoryScreen();
  if (gameOver) showGameOverScreen();

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

      if (grid[y][x].blocked) {
        ctx.fillStyle = "#593045";
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x * CELL_SIZE + 3, y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
        ctx.globalAlpha = 1.0;
      }
    }
  }
  ctx.restore();

  if (devMode) {
    ctx.save();
    ctx.strokeStyle = "#31aec8";
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.21;
    ctx.beginPath();
    for (let i = 0; i < path.length; ++i) {
      let [x, y] = path[i];
      if (i === 0) ctx.moveTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2);
      else ctx.lineTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawBuildHints() {
  if (!buildZoneHints || !buildZoneHints.length) return;

  for (let hint of buildZoneHints) {
    let { x, y, allowed } = hint;
    ctx.save();

    let notEnoughMoney = selectedTowerType != null && money < (towerData[selectedTowerType]?.cost || 99999);

    if (allowed && selectedTowerType != null && !notEnoughMoney) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = towerData[selectedTowerType].color;
    } else if (allowed && selectedTowerType != null && notEnoughMoney) {
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

    if (allowed && selectedTowerType != null) {
      let tconf = towerData[selectedTowerType];
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

  if (isPlacingTower && mouseGridX !== null && mouseGridY !== null) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    let canBuild = isCellEmpty(mouseGridX, mouseGridY) && canPlaceTower(mouseGridX, mouseGridY);
    ctx.strokeStyle = canBuild ? "#36ef97" : "#b71010";
    ctx.lineWidth = 4;
    ctx.strokeRect(mouseGridX * CELL_SIZE + 3, mouseGridY * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
    ctx.globalAlpha = 1;
    ctx.restore();

    if (selectedTowerType != null) {
      let tconf = towerData[selectedTowerType];
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.beginPath();
      ctx.arc(mouseGridX * CELL_SIZE + CELL_SIZE / 2, mouseGridY * CELL_SIZE + CELL_SIZE / 2, tconf.range * CELL_SIZE, 0, 2 * Math.PI);
      ctx.fillStyle = tconf.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

function drawTowerRanges() {
  if (!devMode) return;
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
  for (let t of towers) {
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
  for (let e of enemies) {
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

    ctx.fillStyle = "#7de17b";
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
  for (let b of bullets) {
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
function distance(x1,y1,x2,y2) { return Math.hypot(x1-x2,y1-y2); }  

// ===== 11. Управление и ввод =====  
function handleKeyDown(e) {  
  // Быстрый выбор башни по 1 2 3
  if ("123".includes(e.key)) {  
    let idx = parseInt(e.key) - 1;  
    if (idx < towerData.length && money >= towerData[idx].cost) {   
      selectedTowerType = idx; 
      isPlacingTower = true;   
      buildZoneHints = [];  
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

  waveTimeoutActive = false;
  wavePauseLeft = 0;
  document.getElementById('wave-timer').style.display = "none";
  buildZoneHints = [];
  init();   
}

// Включение/выключение режима разработчика и панели debug
function toggleDevMode() {
  devMode = !devMode;
  document.getElementById('dev-panel').style.display = devMode ? "" : "none";
  updateUI();
}

// Для отладочного логирования/снимка состояния игры
function logGameState() {
  debugLogEvent('full_state', JSON.stringify({
    grid, enemies, towers, bullets, health, money, wave
  }));
}
// ===== 12. Дебаг и проверка =====  
function debugDrawPath(p) {  
  if (!devMode||!p.length) return;  
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
  if (devLog.length>30) devLog.splice(0, devLog.length-30);
  html += "<b>[DEV]</b> wave:"+wave+" | mon:$"+money+" | hp:"+health+"<br>";
  html += "towers:"+towers.length + " | enemies:"+enemies.length+"<br>";
  html += path.length?"path len="+path.length+"":"no path!";
  html += "<br><pre style='max-height:8em;overflow:auto;'>"+devLog.map(e=>JSON.stringify(e)).join("\n")+"</pre>";
  document.getElementById('dev-panel').innerHTML = html;
}
function debugLogEvent(ev, data) { if (devMode) devLog.push({ev, data, t:(+Date.now()).toString(36).substr(-5)}); }

// ===== 13. Победа и поражение =====
function checkGameOver() {
  if (!gameOver && health <= 0) { showGameOverScreen(); gameOver=true;defeatCause="lose"; }
}
function showGameOverScreen() {
  let d = document.createElement("div");
  d.className = "gameover";
  d.innerHTML = "Поражение<br>Волна: "+wave+"<br><button onclick='restartGame()'>Рестарт</button>";
  d.style.zIndex=5;
  if (!document.querySelector('.gameover')) document.body.appendChild(d);
}
function checkVictoryCondition() {
  if (!victory && wave > waveData.length && enemies.length === 0 && !waveTimeoutActive) {
    showVictoryScreen(); victory=true;defeatCause="win";
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
  let state = {grid,towers,enemies,bullets,health, money, wave, devLog};
  localStorage.setItem("td_save",JSON.stringify(state));
}
function loadGameStateFromLocalStorage() {
  let data = localStorage.getItem("td_save");
  if (!data) return;
  let s = JSON.parse(data);
  grid=s.grid; towers=s.towers;enemies=s.enemies;bullets=s.bullets;
  health=s.health;money=s.money;wave=s.wave;devLog=s.devLog;
  updateUI();
}
function clearSavedGameState() { localStorage.removeItem('td_save'); restartGame(); }

// ===== 15. Экспорт функций в глобал для кнопок и загрузка =====
window.selectTowerType       = selectTowerType;
window.clearTowerSelection   = clearTowerSelection;
window.upgradeTower          = upgradeTower;
window.downgradeTower        = downgradeTower;
window.showTowerInfo         = showTowerInfo;
window.hideTowerInfo         = hideTowerInfo;
window.sellTower             = sellTower;
window.clearSavedGameState   = clearSavedGameState;

window.onload = () => init();
window.addEventListener('contextmenu', e => e.preventDefault());