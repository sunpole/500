// ===== UI функции =====
import { towerData, waveData } from './constants.js';
import { state } from './state.js';
import versionInfo from '../version.json';

// Сортируем индексы башен по цене для удобства поиска следующей/предыдущей башни
const towerCostOrder = towerData
  .map((t, i) => ({ i, cost: t.cost }))  // Создаем массив {индекс, цена}
  .sort((a, b) => a.cost - b.cost)       // Сортируем по цене по возрастанию
  .map(t => t.i);                        // Оставляем только индексы башен

// Получить индекс следующей/предыдущей башни по цене
export function getNextTowerType(type) {
  let idx = towerCostOrder.indexOf(type);
  // Если текущей башни нет в списке или это самая дорогая, возвращаем null
  if (idx === -1 || idx === towerCostOrder.length - 1) return null;
  return towerCostOrder[idx + 1];
}

export function getPrevTowerType(type) {
  let idx = towerCostOrder.indexOf(type);
  // Если башня первая или нет в списке — null
  if (idx <= 0) return null;
  return towerCostOrder[idx - 1];
}

// Проверка, является ли цвет "светлым" по формуле яркости
function isLight(color) {
  if (!color) return false;
  color = color.replace('#', '');  // Убираем # из строки цвета
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);
  // Формула яркости с учётом восприятия цвета человеком
  return (r * 0.299 + g * 0.587 + b * 0.114) > 180;
}

function getAttackType(conf) {
  if (conf.laser) return 'Лазер';
  if (conf.dot) return 'Яд / DOT';
  return 'Снаряд';
}

function getEffectText(conf) {
  if (conf.dot) return `DOT: ${conf.dot.dps} DPS, ${conf.dot.stackDuration}s, до ${conf.dot.maxStacks} стаков`;
  if (conf.laser) return 'Мгновенный лазерный луч';
  return 'Без особого эффекта';
}

function getSelectedTower() {
  const cell = state.selectedTowerCell;
  if (!cell || !state.grid[cell.y] || !state.grid[cell.y][cell.x]) return null;
  const tower = state.grid[cell.y][cell.x].tower;
  return tower ? { tower, x: cell.x, y: cell.y, conf: towerData[tower.type] } : null;
}

export function updateVersionChrome() {
  const label = `500 TD v${versionInfo.version}`;
  document.title = label;
  const versionEl = document.getElementById('version-badge');
  if (versionEl) versionEl.textContent = `v${versionInfo.version}`;
}

export function updateBattlePanel() {
  const panel = document.getElementById('battle-panel');
  if (!panel) return;

  const queuedEnemies = state.activeSpawners.reduce((sum, s) => sum + Math.max(0, s.left || 0), 0);
  const remainingEnemies = state.enemies.length + queuedEnemies;
  const dotEnemies = state.enemies.filter(e => e.dotEffects && e.dotEffects.length).length;
  const dotStacks = state.enemies.reduce((sum, e) => {
    return sum + (e.dotEffects || []).reduce((effSum, eff) => effSum + (eff.stacks || 0), 0);
  }, 0);
  const activeLasers = state.towers.filter(t => t.laserVisual && t.laserVisual.show > 0).length;
  const recentEffect = state.lastEffectSummary && (Date.now() - state.lastEffectSummary.at < 5000)
    ? state.lastEffectSummary
    : null;
  const waveState = state.waitingForWaveStart
    ? 'Ждет запуска'
    : (state.waveTimeoutActive ? `Пауза ${Math.max(0, Math.ceil(state.wavePauseLeft))}с` : 'Волна идет');

  panel.innerHTML = `
    <div class="battle-card">
      <span class="label">Волна</span>
      <strong>${state.wave} / ${waveData.length}</strong>
      <small>${waveState}</small>
    </div>
    <div class="battle-card">
      <span class="label">Враги</span>
      <strong>${remainingEnemies}</strong>
      <small>${state.enemies.length} на поле</small>
    </div>
    <div class="battle-card">
      <span class="label">Жизни</span>
      <strong class="health">${state.health}</strong>
      <small>база</small>
    </div>
    <div class="battle-card">
      <span class="label">Деньги</span>
      <strong class="money">${state.money}</strong>
      <small>монеты</small>
    </div>
    <div class="battle-card effects-card">
      <span class="label">Эффекты</span>
      <strong>${dotStacks ? `Яд: ${dotStacks}` : (recentEffect ? `Недавно: ${recentEffect.type}` : 'Яд: нет')}</strong>
      <small>DOT врагов: ${dotEnemies} | лазеры: ${activeLasers}${recentEffect ? ` | ${recentEffect.stacks} стак(ов)` : ''}</small>
    </div>
  `;
}

/**
 * Показывает информацию о башне в формате HTML таблицы.
 * @param {number} type - индекс типа башни из towerData
 * @param {number|null} x - координаты (не используются сейчас)
 * @param {number|null} y
 */
export function showTowerInfo(type, x = null, y = null) {
  let conf = towerData[type];
  if (!conf) {
    console.warn(`showTowerInfo: башня с типом ${type} не найдена в towerData`);
    return;
  }

  const nextType = getNextTowerType(type);
  const prevType = getPrevTowerType(type);
  const next = nextType !== null ? towerData[nextType] : null;
  const prev = prevType !== null ? towerData[prevType] : null;
  if (Number.isInteger(x) && Number.isInteger(y)) {
    state.selectedTowerCell = { x, y };
  }

  function cell(content, className) {
    className = className || '';
    content = content || '';
    return '<td class="' + className + '">' + content + '</td>';
  }

  // Функция для ячейки с затенением, если значение отсутствует
  function cellWithOpacity(val, baseClass) {
    return '<td class="' + baseClass + (val ? '' : ' dimmed') + '">' + (val || '') + '</td>';
  }

  let stats = `
    <table class="tower-info-table">
      <tbody>
        <tr>
          ${cellWithOpacity(prev?.cost, 'col-left')}
          ${cell(conf.cost, 'col-center')}
          ${cellWithOpacity(next?.cost, 'col-right')}
          ${cell('Стоимость', 'label-cell')}
        </tr>
        <tr>
          ${cellWithOpacity(prev?.range, 'col-left')}
          ${cell(conf.range, 'col-center')}
          ${cellWithOpacity(next?.range, 'col-right')}
          ${cell('Дальность', 'label-cell')}
        </tr>
        <tr>
          ${cellWithOpacity(prev?.damage, 'col-left')}
          ${cell(conf.damage, 'col-center')}
          ${cellWithOpacity(next?.damage, 'col-right')}
          ${cell('Урон', 'label-cell')}
        </tr>
        <tr>
          ${cellWithOpacity(prev ? prev.cooldown + 's' : '', 'col-left')}
          ${cell(conf.cooldown + 's', 'col-center')}
          ${cellWithOpacity(next ? next.cooldown + 's' : '', 'col-right')}
          ${cell('Перезарядка', 'label-cell')}
        </tr>
        <tr>
          ${cellWithOpacity(prev?.bulletSpeed, 'col-left')}
          ${cell(conf.bulletSpeed, 'col-center')}
          ${cellWithOpacity(next?.bulletSpeed, 'col-right')}
          ${cell('Скор.пули', 'label-cell')}
        </tr>
        <tr>
          ${cellWithOpacity(prev ? getAttackType(prev) : '', 'col-left')}
          ${cell(getAttackType(conf), 'col-center')}
          ${cellWithOpacity(next ? getAttackType(next) : '', 'col-right')}
          ${cell('Тип атаки', 'label-cell')}
        </tr>
      </tbody>
    </table>
    <div class="tower-effect-note">${getEffectText(conf)}</div>
  `;

  // Дополнительная информация для лазерных башен
  if (conf.laser) {
    stats += `
      <table class="tower-info-table tower-info-laser">
        <tbody>
          <tr class="tower-info-extra-row">
            <td colspan="4">Лазерная башня</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center" style="color: ${conf.color}">Урон за тик</td>
            <td class="col-center">${conf.damage}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Перезарядка (сек)</td>
            <td class="col-center">${conf.cooldown}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  // Дополнительная информация для DOT-эффекта
  if (conf.dot) {
    stats += `
      <table class="tower-info-table tower-info-dot">
        <tbody>
          <tr class="tower-info-extra-row">
            <td colspan="4">DOT-эффект (${conf.dot.type})</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Урон в секунду (DPS)</td>
            <td class="col-center">${conf.dot.dps}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Длительность одного стака (сек)</td>
            <td class="col-center">${conf.dot.stackDuration}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Максимум стаков</td>
            <td class="col-center">${conf.dot.maxStacks}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">DPS суммируется?</td>
            <td class="col-center">${conf.dot.multiDps ? 'Нет' : 'Да'}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Стаки накладываются?</td>
            <td class="col-center">${conf.dot.multiStacks ? 'Да' : 'Нет'}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  // --- Кнопки ---
  let downgradeBtn = '', upgradeBtn = '';
  if (prevType !== null && x !== null && y !== null) {
    downgradeBtn = mkBtn(`▼ ${prev.name} +${prev.cost}`, `downgradeTower(${x},${y})`, prev.color, true);
  }
  if (nextType !== null && x !== null && y !== null) {
    const can = state.money >= next.cost;
    upgradeBtn = mkBtn(`${next.name} ${next.cost} ▲`, `upgradeTower(${x},${y})`, next.color, can);
  }
  let sellBtn = '';
  if (x !== null && y !== null) {
    let refund = Math.round(0.5 * conf.cost);
    sellBtn = `
      <button 
        onclick="sellTower(${x},${y})"
        style="
          background:#f8d23a;
          color:#49390a;
          font-weight:bold;
          min-width:100px;
          margin:0 2px;
          border:2px solid #b9a429;
          border-radius:7px;
          font-size:15px;
          box-shadow:0 0 7px #fbe17599;
          cursor:pointer;
          padding:8px 10px;
          display:inline-flex;
          align-items:center;
        "
        title="Продать башню за ${refund} монет"
      >
        <svg width="16" height="16" style="margin-right:5px;" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#ede066" stroke="#af9033" stroke-width="2"/><text x="8" y="11" font-size="8" font-family="monospace" text-anchor="middle" fill="#af9033" font-weight="bold">$</text></svg>
        Продать <b>${refund}</b>
      </button>
    `;
  }
  let buttons = `
    <div style="margin:10px 0;text-align:center;min-width:230px;">
      <span style="float:left;">${downgradeBtn}</span>
      <span style="display:inline-block;">
        ${sellBtn}
        <button onclick="hideTowerInfo()" style="margin-left:7px;background:#181a22;color:#fafafa;font-size:15px;border-radius:7px;padding:8px 13px;">OK</button>
      </span>
      <span style="float:right;">${upgradeBtn}</span>
    </div>
    <div style="clear:both;"></div>
  `;

  // --- Итоговый HTML ---
  let info = `<b style="font-size:17px;display:block;text-align:center;margin-bottom:5px;">${conf.name}</b>${stats}${buttons}`;
  const el = document.getElementById('tower-info');
  if (el) {
    el.innerHTML = info;
    el.style.display = "";
  } else {
    console.warn('showTowerInfo: элемент #tower-info не найден');
  }

  // Лог для отладки, показываем тип башне и основные параметры
  if (state.devMode) console.log(`showTowerInfo: показана информация о башне "${conf.name}" (type=${type})`);
}

// --- Кнопки ---
function mkBtn(label, cb, color, enabled) {
  enabled = enabled !== false;
  var style = 'background:' + color + ';color:' + (isLight(color) ? '#222' : '#fff') +
    ';font-weight:bold;min-width:90px;cursor:' + (enabled ? 'pointer' : 'not-allowed') +
    ';margin:0 5px 0 5px;padding:7px 15px;border-radius:7px;border:2px solid #222;font-size:16px;' +
    (enabled ? '' : 'filter: grayscale(0.7) brightness(0.65);');
  return '<button' + (enabled ? '' : ' disabled="disabled"') + ' style="' + style +
    '" onclick="' + (enabled ? cb : 'void(0)') + '">' + label + '</button>';
}


function upgradeTower(x, y) {
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
  showTowerInfo(nextType, x, y); // <-- остаётся открытым, обновляется на новую башню
  return true;
}

function downgradeTower(x, y) {
  let cell = state.grid[y][x];
  if (!cell.tower) return false;
  let curType = cell.tower.type;
  let prevType = getPrevTowerType(curType);
  if (prevType === null) return false;
  let downgradeRefund = towerData[prevType].cost;
  state.money += downgradeRefund;
  cell.tower.type = prevType;
  updateUI();
  showTowerInfo(prevType, x, y); // <-- остаётся открытым, обновляется на новую башню
  return true;
}

export function hideTowerInfo() {
  const el = document.getElementById('tower-info');
  if (el) {
    el.style.display = "none";
  }
}

export function createUIButtons() {
  let panel = document.getElementById('ui-panel');
  if (!panel) {
    console.warn('createUIButtons: элемент #ui-panel не найден');
    return;
  }

  updateVersionChrome();
  updateBattlePanel();
  const selected = getSelectedTower();

  let html = `
    <div class="shop-header">
      <div>
        <strong>Магазин башен</strong>
        <span class="version-inline">v${versionInfo.version}</span>
      </div>
      <small>Выберите башню, затем кликните по свободной клетке поля.</small>
    </div>
    <div class="tower-shop-grid">
  `;

  // Вспомогательная функция затемнения цвета
  function darkenColor(hex, percent) {
    let num = parseInt(hex.replace("#", ""), 16);
    let r = (num >> 16) & 0xFF,
      g = (num >> 8) & 0xFF,
      b = num & 0xFF;
    r = Math.round(r * (1 - percent));
    g = Math.round(g * (1 - percent));
    b = Math.round(b * (1 - percent));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Вспомогательно для контрастного текста (дублирование с глобальной, можно вынести)
  function isLight(color) {
    if (!color) return false;
    color = color.replace('#', '');
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 180;
  }

  // Генерация кнопок башен
  for (let i = 0; i < towerData.length; ++i) {
    let baseColor = towerData[i].color;
    let affordable = state.money >= towerData[i].cost;
    let background = affordable ? baseColor : darkenColor(baseColor, 0.6);
    let textColor = isLight(background) ? "#282828" : "#fff";
    if (!affordable) textColor = "#888";
    let selClass = (state.selectedTowerType == i ? "selected" : "");
    const conf = towerData[i];
    let btnStyle = `--tower-color:${baseColor};background:${background};color:${textColor};`;

    html += '<div class="tower-card ' + selClass + (affordable ? '' : ' disabled') + '">' +
      '<button class="tower-buy-btn" ' +
      'style="' + btnStyle + '" ' +
      'onclick="selectTowerType(' + i + ')" ' +
      'id="btn-tower-' + i + '" ' +
      (affordable ? '' : 'disabled') + ' ' +
      'class="' + selClass + '">' +
        '<span>' + conf.name + '</span><strong>' + conf.cost + '</strong>' +
      '</button> ' +
      '<div class="tower-card-stats">' +
        '<span>R ' + conf.range + '</span>' +
        '<span>DMG ' + conf.damage + '</span>' +
        '<span>CD ' + conf.cooldown + 's</span>' +
      '</div>' +
      '<div class="tower-card-effect">' + getAttackType(conf) + '</div>' +
      '<button class="tower-info-btn" onclick="showTowerInfo(' + i + ')" title="Показать параметры">i</button>' +
    '</div>';
  }

  html += `</div>`;

  html += `
    <div class="selected-tower-card">
      <div>
        <span class="label">Выбранная башня</span>
        <strong>${selected ? selected.conf.name : (state.selectedTowerType !== null ? towerData[state.selectedTowerType].name : 'не выбрана')}</strong>
        <small>${selected ? `Клетка ${selected.x}, ${selected.y} | ${getEffectText(selected.conf)}` : 'Для улучшения или продажи кликните по построенной башне.'}</small>
      </div>
      <div class="selected-actions">
        <button onclick="upgradeSelectedTower()" ${selected ? '' : 'disabled'}>Улучшить</button>
        <button onclick="sellSelectedTower()" ${selected ? '' : 'disabled'}>Продать</button>
        <button onclick="clearTowerSelection()">Снять выбор</button>
      </div>
    </div>`;

  // -- Стильные хоткеи с разными цветами для каждой F-кнопки --
  html += `
    <small class="hotkeys">
      <span style="color:#727c88;">1,2,3</span> — быстро выбрать башню 
      &nbsp;•&nbsp; 
      <span style="color:#de4541;">ПКМ</span> — отменить выбор
      <br>
      <span style="color:#7ad436;font-weight:bold;background:#202f16;padding:0 4px 0 6px;border-radius:3px;">F8</span> 
      — dev режим &nbsp; 
      <span style="color:#308fc7;font-weight:bold;background:#12263c;padding:0 4px 0 6px;border-radius:3px;">F9</span> 
      — рестарт игры &nbsp; 
      <span style="color:#c44be0;font-weight:bold;background:#231035;padding:0 4px 0 6px;border-radius:3px;">F10</span> 
      — сбросить прогресс
    </small>`;

  panel.innerHTML = html;
}

export function updateUI() {
  createUIButtons();
}

export function selectTowerType(i) {
  if (state.money < towerData[i].cost) return false;
  state.selectedTowerType = i;
  state.selectedTowerCell = null;
  state.isPlacingTower = true;
  state.buildZoneHints = [];
  state.placingTowerCell = null;
  updateUI();
}

export function clearTowerSelection() {
  state.selectedTowerType = null;
  state.selectedTowerCell = null;
  state.isPlacingTower = false;
  state.buildZoneHints = [];
  state.placingTowerCell = null;
  updateUI();
}



// Инициализация UI — создаём контейнеры, если их нет
export function initUI() {
  if (!document.getElementById('ui-panel')) {
    const uiPanel = document.createElement('div');
    uiPanel.id = 'ui-panel';
    uiPanel.style.padding = '8px';
    document.body.appendChild(uiPanel);
  }
  if (!document.getElementById('tower-info')) {
    const towerInfo = document.createElement('div');
    towerInfo.id = 'tower-info';
    towerInfo.style.position = 'absolute';
    towerInfo.style.top = '10px';
    towerInfo.style.right = '10px';
    towerInfo.style.backgroundColor = 'rgba(30,30,30,0.9)';
    towerInfo.style.color = '#fff';
    towerInfo.style.padding = '12px';
    towerInfo.style.borderRadius = '8px';
    towerInfo.style.display = 'none';
    towerInfo.style.maxWidth = '250px';
    towerInfo.style.zIndex = '100';
    document.body.appendChild(towerInfo);
  }
  if (!document.getElementById('status-bar')) {
    const statusBar = document.createElement('div');
    statusBar.id = 'status-bar';
    statusBar.style.position = 'fixed';
    statusBar.style.bottom = '10px';
    statusBar.style.left = '10px';
    statusBar.style.backgroundColor = 'rgba(0,0,0,0.7)';
    statusBar.style.color = '#fff';
    statusBar.style.padding = '6px 12px';
    statusBar.style.borderRadius = '6px';
    statusBar.style.fontSize = '16px';
    statusBar.style.fontFamily = 'monospace';
    statusBar.innerHTML = `
      <span id="money-display"></span> | 
      <span id="health-display"></span> | 
      <span id="wave-display"></span>
    `;
    document.body.appendChild(statusBar);
  }
  updateUI();
}
