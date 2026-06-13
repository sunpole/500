# Текущее состояние проекта 500

Дата фиксации: 2026-06-13.

Этот файл описывает состояние проекта на момент восстановления документации.

Важно: это не полноценный аудит всего кода, а зафиксированная карта текущего состояния по доступным файлам и обсуждениям.

## Репозиторий

```text
Владелец: sunpole
Репозиторий: 500
Основная ветка: main
Тип проекта: браузерная игра / tower defense
Язык документации: русский
```

## Техническая база

Проект использует:

- HTML;
- CSS;
- JavaScript modules;
- Vite;
- npm.

В `package.json` есть:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

## Входная HTML-страница

Файл:

```text
index.html
```

Важные элементы:

```html
<canvas id="game"></canvas>
<div class="ui-panel" id="ui-panel"></div>
<button id="btnNextWave" class="td-btn">ЗАПУСТИТЬ СЛЕДУЮЩУЮ ВОЛНУ</button>
<span id="wave-timer" class="wave-counter" style="display:none"></span>
<div class="dev-panel" id="dev-panel" style="display:none"></div>
<div id="tower-info"></div>
<script type="module" src="js/game.js"></script>
```

Это значит, что основная точка входа игры:

```text
js/game.js
```

## Важное наблюдение по index.html

В заголовке страницы указано:

```text
0.2.0 Tower Defense — Всё в одном
```

Но проект уже частично разделён на модули. Это может быть следом от старой версии, когда всё было в одном файле.

Будущая задача: уточнить актуальную версию проекта и обновить title/README/changelog.

## Текущие стили

Часть CSS всё ещё находится прямо в `index.html` внутри `<style>`.

Это значит, что разделение проекта ещё не полностью завершено.

Будущая задача: решить, нужно ли выносить CSS в отдельный файл. Делать это только отдельным безопасным патчем.

## Основные JavaScript-файлы

По проверенным файлам:

```text
js/constants.js
js/game.js
js/state.js
js/gameActions.js
js/ui.js
```

`ui.js` упоминается в импортах, но в рамках текущего этапа нужно дополнительно проверить его содержимое и описать отдельно.

## js/constants.js

Файл хранит:

- размеры поля;
- базу врагов;
- базу башен;
- базу волн.

Основные константы:

```js
GRID_SIZE = 15
CELL_SIZE = 40
CANVAS_WIDTH = GRID_SIZE * CELL_SIZE
CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE
```

Итоговый canvas: 600×600 пикселей.

## js/state.js

Файл содержит централизованное состояние игры:

```js
state = {
  money: 100,
  health: 10,
  wave: 0,
  gameOver: false,
  victory: false,
  selectedTowerType: null,
  isPlacingTower: false,
  devMode: false,
  activeSpawners: [],
  nextWaveDelay: 3,
  grid: [],
  path: [],
  towers: [],
  enemies: [],
  bullets: []
}
```

Это важный файл для восстановления, потому что почти вся игра должна опираться на `state`.

## js/game.js

`game.js` — основной игровой модуль.

Он импортирует:

```js
import { GRID_SIZE, CELL_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, towerData, waveData } from './constants.js';
import { Bullet, placeTower, sellTower, spawnEnemy, getDeltaTime, distance, applyDotEffect, generateEnemyPath } from './gameActions.js';
import { updateUI, showTowerInfo, hideTowerInfo, createUIButtons } from './ui.js';
import { state } from './state.js';
```

Основные функции в `game.js`:

- `init()`;
- `createEmptyGrid()`;
- `gameLoop()`;
- `update()`;
- `updateTimers()`;
- `createSpawnerForWave()`;
- `updateSpawners()`;
- `launchWave()`;
- `checkWaveEnd()`;
- `updateWaveTimerUI()`;
- `updateEnemies()`;
- `updateTowers()`;
- `updateTowersShooting()`;
- `updateBullets()`;
- `handleMouseClick()`;
- `handleMouseMove()`;
- `isCellEmpty()`;
- `canPlaceTower()`;
- `hasEnemyPath()`;
- `draw()`;
- функции отрисовки.

## Что делает init()

`init()` сбрасывает состояние:

- башни;
- врагов;
- пули;
- деньги;
- здоровье;
- волну;
- выбранную башню;
- режим строительства;
- флаги победы/поражения;
- активные спавнеры;
- таймер до волны.

Затем:

- ищет canvas;
- задаёт размеры canvas;
- создаёт сетку;
- генерирует путь врагов;
- обновляет UI;
- добавляет обработчики событий;
- создаёт кнопки UI;
- запускает игровой цикл.

## Стартовые значения игры

По текущему коду:

```text
Деньги: 100
Здоровье: 10
Волна: 0
Задержка до волны: 3 секунды
```

## Логика волн

Волны запускаются не мгновенно. Есть пауза перед первой волной.

`state.waveTimeoutActive = true`

`state.wavePauseLeft = state.nextWaveDelay`

Когда таймер доходит до нуля:

```js
launchWave(state.wave);
state.wave++;
```

## Спавнеры

Волна превращается в объект-спавнер:

```js
{
  spawnList,
  spawnIdx,
  nextEnemySpawnAt,
  left,
  finished,
  waveIndex
}
```

Это значит, что волны выпускают врагов постепенно, а не все сразу.

## js/gameActions.js

Файл содержит игровые действия и фабрики:

- `Tower()`;
- `Enemy()`;
- `Bullet()`;
- `generateEnemyPath()`;
- `placeTower()`;
- `sellTower()`;
- `spawnEnemy()`;
- `getDeltaTime()`;
- `distance()`;
- `applyDotEffect()`;
- `findPath()`.

## Башни

Башня создаётся как объект:

```js
{
  gridX,
  gridY,
  type,
  cx,
  cy,
  cooldown
}
```

## Враги

Враг создаётся как объект:

```js
{
  path,
  pathIdx,
  conf,
  type,
  hp,
  x,
  y,
  initPos,
  progress,
  dotEffects
}
```

## Снаряды

Снаряд создаётся как объект:

```js
{
  x,
  y,
  target,
  damage,
  speed,
  color,
  towerType,
  hit
}
```

Если у башни есть `dot`, он копируется в снаряд.

## Масштабирование врагов

В `gameActions.js` есть функции масштабирования:

- `scalingAll(wave)`;
- `scalingHP(wave)`;
- `scalingSpeed(wave)`;
- `scalingReward(wave)`;
- `scalingDamage(wave)`.

Это значит, что фактические параметры врага при появлении могут отличаться от базовых значений в `enemyData`.

Важно для баланса: при анализе волн нельзя смотреть только на `enemyData`, нужно учитывать scaling.

## Путь врагов

Путь строится от:

```text
[0, 0]
```

до:

```text
[GRID_SIZE - 1, GRID_SIZE - 1]
```

То есть от левого верхнего угла к правому нижнему.

## Важное наблюдение по поиску пути

В проекте видны две логики поиска пути:

1. `hasEnemyPath()` в `game.js`, где описаны 8 направлений и диагональные переходы.
2. `findPath()` в `gameActions.js`, где видны 4 направления движения.

Это нужно проверить, потому что проверка возможности поставить башню и реальный путь врагов могут отличаться.

## Возможные текущие проблемы, которые нужно проверить

### 1. Ссылки на переменные без `state.`

В `game.js` встречаются обращения, которые нужно проверить:

```js
grid[y][x]
towers.length
findPath(...)
debugLogEvent(...)
```

Если эти имена не объявлены или не импортированы, будет `ReferenceError`.

Правильное направление:

- `grid` → `state.grid`;
- `towers` → `state.towers`;
- `findPath` нужно импортировать или использовать одну реализацию;
- `debugLogEvent` нужно определить/импортировать или вызывать только если существует.

### 2. Много console.log в игровом цикле

В `update()` есть лог `console.log('update dt:', dt)`.

В `draw()` есть логи начала/конца отрисовки и лазеров.

Это может сильно тормозить игру.

Лучше переводить такие логи под условие:

```js
if (state.devMode) console.log(...)
```

### 3. Потенциальная разница между проверкой пути и движением

Если одна функция допускает диагонали, а другая нет, игрок может получить странное поведение.

Нужно привести алгоритм пути к единому правилу.

### 4. CSS всё ещё внутри HTML

Это не баг, но архитектурная незавершённость.

### 5. Данные всё ещё в JS

Это не баг, но будущая задача: вынести в JSON.

## Что сейчас считается рабочей гипотезой

Проект находится в переходном состоянии:

```text
Старый однофайловый проект → модульный Vite-проект
```

Это значит, что часть кода уже разделена, но часть старой структуры ещё осталась.

## Что не нужно делать сразу

Не нужно сразу:

- выносить CSS;
- выносить все данные в JSON;
- переписывать поиск пути;
- менять баланс;
- удалять старые функции;
- чистить console.log без проверки;
- менять GitHub Pages.

Сначала нужно запустить проект и записать фактические ошибки.

## Что нужно сделать следующим аудитом

1. Проверить `js/ui.js`.
2. Проверить все импорты.
3. Найти все `ReferenceError`-риски.
4. Проверить, вызывается ли `init()`.
5. Проверить, не отсутствует ли запуск игры в конце `game.js`.
6. Проверить все функции отрисовки.
7. Проверить победу и поражение.
8. Проверить работу кнопки следующей волны.

## Статус

Документация текущего состояния создана.

Код не исправлялся.

Следующий шаг — фактический запуск и аудит ошибок.