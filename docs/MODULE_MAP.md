# Карта модулей проекта 500

Дата: 2026-06-13.

Этот документ показывает, как связаны основные модули проекта.

## Общая схема

```text
index.html
   ↓ подключает
js/game.js
   ↓ импортирует
js/constants.js
js/gameActions.js
js/ui.js
js/state.js
```

## index.html

Роль:

- создаёт HTML-контейнеры;
- содержит canvas;
- содержит UI-панель;
- содержит стили;
- подключает основной JS-модуль.

Ключевые элементы:

```text
#game
#ui-panel
#btnNextWave
#wave-timer
#dev-panel
#tower-info
```

Ключевое подключение:

```html
<script type="module" src="js/game.js"></script>
```

## js/game.js

Роль:

- главный игровой модуль;
- инициализация;
- игровой цикл;
- обновление логики;
- отрисовка;
- обработка мыши и клавиатуры;
- экспорт функций в `window` для HTML-кнопок.

Импортирует из `constants.js`:

```js
GRID_SIZE
CELL_SIZE
CANVAS_WIDTH
CANVAS_HEIGHT
towerData
waveData
```

Импортирует из `gameActions.js`:

```js
Bullet
placeTower
sellTower
spawnEnemy
getDeltaTime
distance
applyDotEffect
generateEnemyPath
```

Импортирует из `ui.js`:

```js
updateUI
showTowerInfo
hideTowerInfo
createUIButtons
```

Импортирует из `state.js`:

```js
state
```

## js/constants.js

Роль:

- хранит константы;
- хранит игровые базы.

Экспортирует:

```js
GRID_SIZE
CELL_SIZE
CANVAS_WIDTH
CANVAS_HEIGHT
enemyData
towerData
waveData
```

Зависимости:

```text
нет импортов
```

То есть этот файл является источником данных.

## js/state.js

Роль:

- единое состояние игры.

Экспортирует:

```js
state
getMoney / setMoney
getHealth / setHealth
getWave / setWave
getGameOver / setGameOver
getVictory / setVictory
getDefeatCause / setDefeatCause
```

Зависимости:

```text
нет импортов
```

## js/gameActions.js

Роль:

- игровые фабрики;
- действия с башнями;
- действия с врагами;
- путь;
- DOT.

Импортирует:

```js
GRID_SIZE, CELL_SIZE, towerData, enemyData из constants.js
state из state.js
updateUI из ui.js
```

Экспортирует:

```js
Tower
Enemy
Bullet
generateEnemyPath
placeTower
sellTower
spawnEnemy
getDeltaTime
distance
applyDotEffect
findPath
```

Важный момент:

`gameActions.js` импортирует `updateUI` из `ui.js`, а `ui.js` импортирует `state` и `constants`. Это нормально, но нужно следить, чтобы не появилась циклическая зависимость, которая ломает инициализацию.

## js/ui.js

Роль:

- создание кнопок башен;
- обновление панели;
- показ информации о башне;
- скрытие информации;
- выбор башни;
- снятие выбора.

Импортирует:

```js
towerData, waveData из constants.js
state из state.js
```

Экспортирует:

```js
showTowerInfo
hideTowerInfo
createUIButtons
updateUI
selectTowerType
clearTowerSelection
initUI
```

Важный момент:

Часть функций в `ui.js` используется через inline `onclick`, поэтому они должны быть доступны глобально через `window` или кнопки должны создаваться через `addEventListener`.

## Текущая проблема inline onclick

В HTML, генерируемом UI, используются строки:

```js
onclick="selectTowerType(...)"
onclick="showTowerInfo(...)"
onclick="upgradeTower(...)"
onclick="sellTower(...)"
onclick="hideTowerInfo()"
```

В модульной архитектуре такие функции не видны глобально автоматически.

Поэтому `game.js` в конце делает:

```js
window.selectTowerType = ...
window.clearTowerSelection = ...
window.upgradeTower = ...
window.downgradeTower = ...
window.showTowerInfo = showTowerInfo
window.hideTowerInfo = hideTowerInfo
window.sellTower = sellTower
window.restartGame = restartGame
```

Это рабочий, но временный подход.

Будущий более чистый подход:

- не использовать inline `onclick`;
- создавать кнопки через DOM;
- вешать события через `addEventListener`.

## Поток запуска игры

```text
1. Браузер открывает index.html.
2. index.html загружает js/game.js как module.
3. game.js импортирует зависимости.
4. window.onload вызывает init().
5. init() создаёт canvas-контекст.
6. init() создаёт сетку.
7. init() генерирует путь врагов.
8. init() создаёт UI-кнопки.
9. init() запускает requestAnimationFrame(gameLoop).
10. gameLoop вызывает update() и draw().
```

## Поток волны

```text
1. state.waveTimeoutActive = true.
2. state.wavePauseLeft уменьшается.
3. Когда таймер дошёл до 0, вызывается launchWave(state.wave).
4. launchWave создаёт spawner.
5. updateSpawners выпускает врагов по enemy groups.
6. spawnEnemy создаёт врага и добавляет в state.enemies.
7. updateEnemies двигает врагов.
8. checkWaveEnd ждёт завершения спавнеров и смерти врагов.
9. После завершения запускается пауза перед следующей волной.
```

## Поток установки башни

```text
1. Игрок выбирает башню в UI.
2. state.selectedTowerType получает индекс башни.
3. state.isPlacingTower = true.
4. Игрок кликает по canvas.
5. handleMouseClick определяет клетку.
6. Проверяется isCellEmpty.
7. Проверяется canPlaceTower.
8. placeTower создаёт башню.
9. Деньги списываются.
10. Клетка блокируется.
11. Путь врагов пересчитывается.
12. UI обновляется.
```

## Поток атаки

```text
1. updateTowersShooting проходит по state.towers.
2. У башни уменьшается cooldown.
3. Если cooldown <= 0, ищется враг в радиусе.
4. Если башня laser, урон наносится сразу.
5. Если обычная башня, создаётся Bullet.
6. updateBullets двигает Bullet к цели.
7. При попадании наносится damage.
8. Если есть dot, вызывается applyDotEffect.
9. Если враг умер, начисляются деньги.
```

## Поток DOT

```text
1. Снаряд попадает во врага.
2. applyDotEffect добавляет или обновляет эффект.
3. updateEnemies каждый кадр уменьшает hp по eff.dps * eff.stacks * dt.
4. Стаки истекают по времени.
5. Когда стаков нет, эффект удаляется.
```

## Поток поражения

```text
1. Враг дошёл до конца пути.
2. state.health уменьшается на e.conf.damage.
3. checkGameOver проверяет health <= 0.
4. showGameOverScreen показывает поражение.
```

## Поток победы

```text
1. Проверяются все волны.
2. Нет врагов.
3. Нет активного таймера.
4. showVictoryScreen показывает победу.
```

Текущее условие победы нужно проверить отдельно:

```js
state.wave > waveData.length
```

Возможно, потребуется `>=`, но это нужно подтверждать тестом.

## Главные архитектурные зависимости

```text
constants.js → источник данных
state.js → источник состояния
gameActions.js → изменение состояния и создание объектов
ui.js → отображение состояния в HTML
game.js → главный цикл и связь всего вместе
```

## Что важно при восстановлении

Если игра не запускается, сначала проверять:

1. `index.html` подключает `js/game.js`.
2. `game.js` импортирует все нужные функции.
3. `window.onload = () => init()` есть в конце.
4. `init()` не падает до `requestAnimationFrame(gameLoop)`.
5. `state.grid` создан.
6. `state.path` создан.
7. `createUIButtons()` не падает.

## Итог

Карта модулей показывает, что проект уже перешёл к модульной структуре, но ещё несёт следы старого однофайлового подхода: inline `onclick`, CSS внутри HTML, глобальные функции через `window`. Это нормально для переходного этапа, но требует аккуратной стабилизации.