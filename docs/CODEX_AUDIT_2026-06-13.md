# Codex audit 2026-06-13

Дата аудита: 2026-06-13.

Ветка аудита:

```text
codex/audit-500-td-game
```

Цель аудита: безопасно проверить структуру проекта, расположение игровых данных, места их использования, известные подозрения по коду и базовую сборку. Игровой код в этом проходе не исправлялся.

## 1. Ограничения аудита

- Работа велась только в локальной папке `C:\!CODE_CLUB\new 2026\500_td_game`.
- Вложенная папка `500_td_game/500_td_game` не использовалась.
- Прямые изменения в `main` не выполнялись.
- Исправления кода намеренно не делались: этот PR содержит только отчёт.

## 2. Прочитанные документы

Перед аудитом были прочитаны:

- `README.md`
- `docs/DOCS_INDEX.md`
- `docs/CHAT_CONTEXT.md`
- `docs/CHAT_DEEP_ANALYSIS_2026-06-13.md`
- `docs/DEVELOPMENT_MEMORY_2026-06-13.md`
- `docs/REPOSITORY_SEARCH_ANALYSIS_2026-06-13.md`
- `docs/NEXT_RESEARCH_PLAN_2026-06-13.md`
- `docs/KNOWN_ISSUES_FROM_CODE_AUDIT.md`
- `docs/DIAGNOSTIC_CHECKLIST.md`

Главный вывод из документации: проект нужно развивать маленькими безопасными патчами, не смешивать архитектуру, баланс, UI и исправления багов, а найденные проблемы сначала фиксировать в документации.

## 3. Команды, которые запускались

```powershell
git status -sb
Get-ChildItem -Force
Get-Content -Raw README.md
Get-Content -Raw docs\DOCS_INDEX.md
Get-Content -Raw -Encoding UTF8 docs\CHAT_CONTEXT.md
Get-Content -Raw -Encoding UTF8 docs\CHAT_DEEP_ANALYSIS_2026-06-13.md
Get-Content -Raw -Encoding UTF8 docs\DEVELOPMENT_MEMORY_2026-06-13.md
Get-Content -Raw -Encoding UTF8 docs\REPOSITORY_SEARCH_ANALYSIS_2026-06-13.md
Get-Content -Raw -Encoding UTF8 docs\NEXT_RESEARCH_PLAN_2026-06-13.md
Get-Content -Raw -Encoding UTF8 docs\KNOWN_ISSUES_FROM_CODE_AUDIT.md
Get-Content -Raw -Encoding UTF8 docs\DIAGNOSTIC_CHECKLIST.md
git switch -c codex/audit-500-td-game
rg --files
rg -n "enemyData|towerData|waveData" .
rg -n "\bgrid\b|\btowers\b|\bmoney\b|placingTowerCell|findPath|bbulletSpeed|upgradeTower\(|sellTower\(|console\.log|getNextTowerType|getPrevTowerType" js index.html package.json vite.config.js docs
npm install
npm run build
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5173' -WorkingDirectory 'C:\!CODE_CLUB\new 2026\500_td_game' -WindowStyle Hidden
```

Также проект был открыт через локальный адрес:

```text
http://127.0.0.1:5173/
```

## 4. Структура файлов

Фактические файлы верхнего уровня:

```text
.git
docs
js
.gitignore
CHANGELOG.md
index.html
index12.html
LICENSE
package-lock.json
package.json
README.md
ROADMAP.md
vite.config.js
```

Файлы JavaScript:

```text
js/constants.js
js/state.js
js/game.js
js/gameActions.js
js/ui.js
```

Отдельной вложенной рабочей папки `500_td_game/500_td_game` в корне проекта не найдено.

## 5. Где находятся данные

Основные игровые данные объявлены в `js/constants.js`:

- `enemyData`: строка 9
- `towerData`: строка 23
- `waveData`: строка 166

Дополнительно старые версии этих данных есть в `index12.html`. Этот файл выглядит как сохранённый монолитный вариант игры и не является текущим модульным входом Vite.

## 6. Где данные используются

`enemyData`:

- импортируется в `js/gameActions.js`
- используется при создании врагов в `spawnEnemy`

`towerData`:

- импортируется в `js/game.js`
- импортируется в `js/gameActions.js`
- импортируется в `js/ui.js`
- используется для стоимости, радиуса, урона, скорости снаряда, цвета и UI

`waveData`:

- импортируется в `js/game.js`
- импортируется в `js/ui.js`
- используется для старта волн и отображения прогресса волн

## 7. Результаты npm install и build

`npm install` завершился успешно:

```text
added 10 packages, and audited 11 packages
```

Но npm сообщил о проблемах безопасности:

```text
4 vulnerabilities (2 moderate, 2 high)
```

Это не ломает установку, но требует отдельного будущего анализа через `npm audit`.

`npm run build` завершился успешно:

```text
vite v5.4.19 building for production...
5 modules transformed.
dist/assets/main-gB7_93bD.js  33.67 kB | gzip: 11.49 kB
built in 785ms
```

Предупреждение сборки:

```text
The CJS build of Vite's Node API is deprecated.
```

Вывод: сборка проходит, но есть предупреждение Vite и npm audit-риск.

## 8. Браузерная проверка

Проект был запущен через `npm run dev -- --host 127.0.0.1 --port 5173`.

Страница открылась:

- `canvas#game` найден;
- `#ui-panel` найден;
- белого экрана на старте не обнаружено;
- ошибок уровня `error` и `warn` в консоли при первичной загрузке не обнаружено.

При этом консоль быстро заполняется логами из игрового цикла:

```text
update dt: ...
jsdot: draw() start
jsdot: draw() end
```

Вывод: базовый старт страницы работает, но подозрение про чрезмерные `console.log` в игровом цикле подтверждено браузерной проверкой.

## 9. Проверка подозрений

### 9.1. `grid` вместо `state.grid`

Статус: подтверждено статическим аудитом.

Найдено в `js/game.js`:

- `handleMouseClick()`: `grid[y][x].tower`
- `handleMouseClick()`: `showTowerInfo(grid[y][x].tower.type, x, y)`

Риск: при клике по существующей башне может возникнуть `ReferenceError: grid is not defined`.

### 9.2. `towers` вместо `state.towers`

Статус: подтверждено статическим аудитом.

Найдено в `js/game.js`:

- `canPlaceTower()`: `towers.length` внутри dev-лога
- `drawTowerRanges()`: `for (let t of towers)`

Риск: при включённом dev mode или отрисовке радиусов может возникнуть `ReferenceError: towers is not defined`.

### 9.3. `money` вместо `state.money`

Статус: подтверждено статическим аудитом.

Найдено в:

- `js/ui.js`: `const can = money >= next.cost`
- `js/game.js`: `money >= towerData[idx].cost` в обработке клавиш

Риск: при показе информации о башне с доступным апгрейдом или при выборе башни клавишами может возникнуть `ReferenceError: money is not defined`.

### 9.4. `placingTowerCell` вместо `state.placingTowerCell`

Статус: частично подтверждено как кодовый риск.

Найдено в `js/ui.js`:

```js
placingTowerCell = null;
```

Но текущие inline-кнопки выбора башни используют глобальную функцию `window.selectTowerType` из `js/game.js`, где уже применяется `state.placingTowerCell`. Поэтому это не подтверждено как ошибка текущей основной кнопки выбора башни, но остаётся риском, если экспортированная `selectTowerType()` из `ui.js` будет вызвана напрямую.

### 9.5. `findPath`

Статус: подтверждено статическим аудитом.

`findPath()` экспортируется из `js/gameActions.js`, но `js/game.js` вызывает `findPath()` в `updateEnemies()` без импорта.

Текущий импорт в `js/game.js` содержит:

```js
generateEnemyPath
```

Но не содержит:

```js
findPath
```

Риск: при ветке пересчёта пути врага в `updateEnemies()` может возникнуть `ReferenceError: findPath is not defined`.

### 9.6. `conf.bbulletSpeed`

Статус: подтверждено.

Найдено в `js/ui.js`:

```js
conf.bbulletSpeed
```

В `towerData` поле называется:

```js
bulletSpeed
```

Риск: скорость пули в таблице башни будет отображаться как пустое или `undefined` значение.

### 9.7. `upgradeTower()` / `sellTower()` без координат

Статус: подтверждено статическим аудитом.

В `js/ui.js` общая панель создаёт кнопки:

```js
upgradeTower()
sellTower()
```

Но рабочие функции ожидают координаты:

- `window.upgradeTower = (x, y) => ...`
- `sellTower(x, y)`

Риск: нажатие этих общих кнопок может привести к ошибке из-за `undefined` координат. Отдельные кнопки в карточке башни при `showTowerInfo(type, x, y)` уже передают координаты.

### 9.8. `getNextTowerType` / `getPrevTowerType`

Статус: подтверждено статическим аудитом.

Эти функции определены в `js/ui.js`, но не экспортируются. При этом `js/game.js` использует их внутри глобальных:

```js
window.upgradeTower
window.downgradeTower
```

Риск: при апгрейде или даунгрейде через глобальные обработчики может возникнуть `ReferenceError`.

### 9.9. `console.log` в игровом цикле

Статус: подтверждено статическим аудитом и браузерной проверкой.

Найдено в `js/game.js`:

- `console.log('update dt:', dt)`
- `console.log("jsdot: draw() start")`
- `console.log("jsdot: draw() end")`
- лог лазера внутри `draw()`

Браузерная консоль быстро заполняется этими сообщениями.

Риск: падение производительности, сложность отладки реальных ошибок, переполнение консоли.

## 10. Что не подтвердилось полностью

- Белый экран на старте не подтвердился: страница открылась, canvas и UI присутствуют.
- Ошибки уровня `error` и `warn` при первичной загрузке не подтвердились.
- `placingTowerCell` не подтвердился как ошибка текущей inline-кнопки выбора башни, потому что используется глобальная обёртка из `game.js`.
- Все игровые сценарии вручную не проверялись. Этот аудит не является полным playtest.

## 11. Что нужно исправлять первым

Первым нужно исправлять не баланс и не JSON, а подтверждённые runtime-риски, которые могут ломать базовые действия игрока:

1. `grid` заменить на `state.grid` в `handleMouseClick()`.
2. `towers` заменить на `state.towers` в `canPlaceTower()` и `drawTowerRanges()`.
3. `money` заменить на `state.money` в `js/ui.js` и `js/game.js`.
4. Добавить корректный импорт или единый доступ к `findPath`.
5. Исправить `conf.bbulletSpeed` на `conf.bulletSpeed`.
6. Разобраться с `upgradeTower`/`downgradeTower`: функции `getNextTowerType` и `getPrevTowerType` должны быть доступны там, где используются.
7. Убрать или ограничить `console.log` в игровом цикле через `state.devMode`.

## 12. Минимальный безопасный следующий патч

Минимальный следующий PR лучше сделать как маленький runtime-fix без изменения баланса и без выноса JSON:

- заменить только несуществующие глобальные переменные на `state.*`;
- добавить недостающий импорт `findPath` в `js/game.js`;
- исправить опечатку `conf.bbulletSpeed`;
- не трогать структуру данных, значения волн, баланс башен и визуальный дизайн;
- после патча запустить `npm run build`;
- открыть игру в браузере и проверить: старт, выбор башни, установка башни, показ информации о башне.

Отдельным следующим шагом после этого можно заняться `console.log` в игровом цикле, если хочется держать первый фикс ещё меньше.

## 13. Итог

Проект собирается и стартует локально, но в коде есть несколько подтверждённых мест, которые могут упасть в runtime при конкретных действиях игрока. Самый безопасный путь — сначала сделать маленький PR с исправлением `ReferenceError`-рисков и очевидной опечатки, а уже потом переходить к JSON, балансу или UI.
