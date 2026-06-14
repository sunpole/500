(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function l(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(s){if(s.ep)return;s.ep=!0;const a=l(s);fetch(s.href,a)}})();const g=15,c=40,q=g*c,z=g*c;let O=[],m=[],I=[],D=null;async function F(t){const o=`./data/${t}`,l=await fetch(o);if(!l.ok)throw new Error(`Failed to load ${t}: ${l.status} ${l.statusText}`);return l.json()}async function ue(){return D||(D=Promise.all([F("enemies.json"),F("towers.json"),F("waves.json")]).then(([t,o,l])=>(O=t,m=o,I=l,{enemyData:O,towerData:m,waveData:I})),D)}const e={money:100,health:10,wave:0,gameOver:!1,victory:!1,defeatCause:"",selectedTowerType:null,selectedTowerCell:null,isPlacingTower:!1,placingTowerCell:null,buildZoneHints:[],mouseGridX:null,mouseGridY:null,devMode:!1,devLog:[],lastEffectSummary:null,lastUpdateTime:Date.now(),activeSpawners:[],waveTimeoutActive:!1,waitingForWaveStart:!1,nextWaveDelay:3,wavePauseLeft:0,grid:[],path:[],towers:[],enemies:[],bullets:[]},pe="1.0.2",W={version:pe};function U(){return m.map((t,o)=>({i:o,cost:t.cost})).sort((t,o)=>t.cost-o.cost).map(t=>t.i)}function K(t){const o=U();let l=o.indexOf(t);return l===-1||l===o.length-1?null:o[l+1]}function J(t){const o=U();let l=o.indexOf(t);return l<=0?null:o[l-1]}function he(t){if(!t)return!1;t=t.replace("#","");let o=parseInt(t.substring(0,2),16),l=parseInt(t.substring(2,4),16),r=parseInt(t.substring(4,6),16);return o*.299+l*.587+r*.114>180}function _(t){return t.laser?"Лазер":t.dot?"Яд / DOT":"Снаряд"}function ee(t){return t.dot?`DOT: ${t.dot.dps} DPS, ${t.dot.stackDuration}s, до ${t.dot.maxStacks} стаков`:t.laser?"Мгновенный лазерный луч":"Без особого эффекта"}function ge(){const t=e.selectedTowerCell;if(!t||!e.grid[t.y]||!e.grid[t.y][t.x])return null;const o=e.grid[t.y][t.x].tower;return o?{tower:o,x:t.x,y:t.y,conf:m[o.type]}:null}function te(){const t=`500 TD v${W.version}`;document.title=t;const o=document.getElementById("version-badge");o&&(o.textContent=`v${W.version}`)}function H(){const t=document.getElementById("battle-panel");if(!t)return;const o=e.activeSpawners.reduce((f,u)=>f+Math.max(0,u.left||0),0),l=e.enemies.length+o,r=e.enemies.filter(f=>f.dotEffects&&f.dotEffects.length).length,s=e.enemies.reduce((f,u)=>f+(u.dotEffects||[]).reduce((p,h)=>p+(h.stacks||0),0),0),a=e.towers.filter(f=>f.laserVisual&&f.laserVisual.show>0).length,i=e.lastEffectSummary&&Date.now()-e.lastEffectSummary.at<5e3?e.lastEffectSummary:null,d=e.waitingForWaveStart?"Ждет запуска":e.waveTimeoutActive?`Пауза ${Math.max(0,Math.ceil(e.wavePauseLeft))}с`:"Волна идет";t.innerHTML=`
    <div class="battle-card">
      <span class="label">Волна</span>
      <strong>${e.wave} / ${I.length}</strong>
      <small>${d}</small>
    </div>
    <div class="battle-card">
      <span class="label">Враги</span>
      <strong>${l}</strong>
      <small>${e.enemies.length} на поле</small>
    </div>
    <div class="battle-card">
      <span class="label">Жизни</span>
      <strong class="health">${e.health}</strong>
      <small>база</small>
    </div>
    <div class="battle-card">
      <span class="label">Деньги</span>
      <strong class="money">${e.money}</strong>
      <small>монеты</small>
    </div>
    <div class="battle-card effects-card">
      <span class="label">Эффекты</span>
      <strong>${s?`Яд: ${s}`:i?`Недавно: ${i.type}`:"Яд: нет"}</strong>
      <small>DOT врагов: ${r} | лазеры: ${a}${i?` | ${i.stacks} стак(ов)`:""}</small>
    </div>
  `}function L(t,o=null,l=null){let r=m[t];if(!r){console.warn(`showTowerInfo: башня с типом ${t} не найдена в towerData`);return}const s=K(t),a=J(t),i=s!==null?m[s]:null,d=a!==null?m[a]:null;Number.isInteger(o)&&Number.isInteger(l)&&(e.selectedTowerCell={x:o,y:l});function f(b,M){return M=M||"",b=b||"",'<td class="'+M+'">'+b+"</td>"}function u(b,M){return'<td class="'+M+(b?"":" dimmed")+'">'+(b||"")+"</td>"}let p=`
    <table class="tower-info-table">
      <tbody>
        <tr>
          ${u(d==null?void 0:d.cost,"col-left")}
          ${f(r.cost,"col-center")}
          ${u(i==null?void 0:i.cost,"col-right")}
          ${f("Стоимость","label-cell")}
        </tr>
        <tr>
          ${u(d==null?void 0:d.range,"col-left")}
          ${f(r.range,"col-center")}
          ${u(i==null?void 0:i.range,"col-right")}
          ${f("Дальность","label-cell")}
        </tr>
        <tr>
          ${u(d==null?void 0:d.damage,"col-left")}
          ${f(r.damage,"col-center")}
          ${u(i==null?void 0:i.damage,"col-right")}
          ${f("Урон","label-cell")}
        </tr>
        <tr>
          ${u(d?d.cooldown+"s":"","col-left")}
          ${f(r.cooldown+"s","col-center")}
          ${u(i?i.cooldown+"s":"","col-right")}
          ${f("Перезарядка","label-cell")}
        </tr>
        <tr>
          ${u(d==null?void 0:d.bulletSpeed,"col-left")}
          ${f(r.bulletSpeed,"col-center")}
          ${u(i==null?void 0:i.bulletSpeed,"col-right")}
          ${f("Скор.пули","label-cell")}
        </tr>
        <tr>
          ${u(d?_(d):"","col-left")}
          ${f(_(r),"col-center")}
          ${u(i?_(i):"","col-right")}
          ${f("Тип атаки","label-cell")}
        </tr>
      </tbody>
    </table>
    <div class="tower-effect-note">${ee(r)}</div>
  `;r.laser&&(p+=`
      <table class="tower-info-table tower-info-laser">
        <tbody>
          <tr class="tower-info-extra-row">
            <td colspan="4">Лазерная башня</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center" style="color: ${r.color}">Урон за тик</td>
            <td class="col-center">${r.damage}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Перезарядка (сек)</td>
            <td class="col-center">${r.cooldown}</td>
          </tr>
        </tbody>
      </table>
    `),r.dot&&(p+=`
      <table class="tower-info-table tower-info-dot">
        <tbody>
          <tr class="tower-info-extra-row">
            <td colspan="4">DOT-эффект (${r.dot.type})</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Урон в секунду (DPS)</td>
            <td class="col-center">${r.dot.dps}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Длительность одного стака (сек)</td>
            <td class="col-center">${r.dot.stackDuration}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Максимум стаков</td>
            <td class="col-center">${r.dot.maxStacks}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">DPS суммируется?</td>
            <td class="col-center">${r.dot.multiDps?"Нет":"Да"}</td>
          </tr>
          <tr>
            <td colspan="3" class="col-center">Стаки накладываются?</td>
            <td class="col-center">${r.dot.multiStacks?"Да":"Нет"}</td>
          </tr>
        </tbody>
      </table>
    `);let h="",y="";if(a!==null&&o!==null&&l!==null&&(h=Q(`▼ ${d.name} +${d.cost}`,`downgradeTower(${o},${l})`,d.color,!0)),s!==null&&o!==null&&l!==null){const b=e.money>=i.cost;y=Q(`${i.name} ${i.cost} ▲`,`upgradeTower(${o},${l})`,i.color,b)}let $="";if(o!==null&&l!==null){let b=Math.round(.5*r.cost);$=`
      <button 
        onclick="sellTower(${o},${l})"
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
        title="Продать башню за ${b} монет"
      >
        <svg width="16" height="16" style="margin-right:5px;" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#ede066" stroke="#af9033" stroke-width="2"/><text x="8" y="11" font-size="8" font-family="monospace" text-anchor="middle" fill="#af9033" font-weight="bold">$</text></svg>
        Продать <b>${b}</b>
      </button>
    `}let T=`
    <div style="margin:10px 0;text-align:center;min-width:230px;">
      <span style="float:left;">${h}</span>
      <span style="display:inline-block;">
        ${$}
        <button onclick="hideTowerInfo()" style="margin-left:7px;background:#181a22;color:#fafafa;font-size:15px;border-radius:7px;padding:8px 13px;">OK</button>
      </span>
      <span style="float:right;">${y}</span>
    </div>
    <div style="clear:both;"></div>
  `,w=`<b style="font-size:17px;display:block;text-align:center;margin-bottom:5px;">${r.name}</b>${p}${T}`;const S=document.getElementById("tower-info");S?(S.innerHTML=w,S.style.display=""):console.warn("showTowerInfo: элемент #tower-info не найден"),e.devMode&&console.log(`showTowerInfo: показана информация о башне "${r.name}" (type=${t})`)}function Q(t,o,l,r){r=r!==!1;var s="background:"+l+";color:"+(he(l)?"#222":"#fff")+";font-weight:bold;min-width:90px;cursor:"+(r?"pointer":"not-allowed")+";margin:0 5px 0 5px;padding:7px 15px;border-radius:7px;border:2px solid #222;font-size:16px;"+(r?"":"filter: grayscale(0.7) brightness(0.65);");return"<button"+(r?"":' disabled="disabled"')+' style="'+s+'" onclick="'+(r?o:"void(0)")+'">'+t+"</button>"}function N(){const t=document.getElementById("tower-info");t&&(t.style.display="none")}function oe(){let t=document.getElementById("ui-panel");if(!t){console.warn("createUIButtons: элемент #ui-panel не найден");return}te(),H();const o=ge();let l=`
    <div class="shop-header">
      <div>
        <strong>Магазин башен</strong>
        <span class="version-inline">v${W.version}</span>
      </div>
      <small>Выберите башню, затем кликните по свободной клетке поля.</small>
    </div>
    <div class="tower-shop-grid">
  `;function r(a,i){let d=parseInt(a.replace("#",""),16),f=d>>16&255,u=d>>8&255,p=d&255;return f=Math.round(f*(1-i)),u=Math.round(u*(1-i)),p=Math.round(p*(1-i)),"#"+((1<<24)+(f<<16)+(u<<8)+p).toString(16).slice(1)}function s(a){if(!a)return!1;a=a.replace("#","");let i=parseInt(a.substring(0,2),16),d=parseInt(a.substring(2,4),16),f=parseInt(a.substring(4,6),16);return i*.299+d*.587+f*.114>180}for(let a=0;a<m.length;++a){let i=m[a].color,d=e.money>=m[a].cost,f=d?i:r(i,.6),u=s(f)?"#282828":"#fff";d||(u="#888");let p=e.selectedTowerType==a?"selected":"";const h=m[a];let y=`--tower-color:${i};background:${f};color:${u};`;l+='<div class="tower-card '+p+(d?"":" disabled")+'"><button class="tower-buy-btn" style="'+y+'" onclick="selectTowerType('+a+')" id="btn-tower-'+a+'" '+(d?"":"disabled")+' class="'+p+'"><span>'+h.name+"</span><strong>"+h.cost+'</strong></button> <div class="tower-card-stats"><span>R '+h.range+"</span><span>DMG "+h.damage+"</span><span>CD "+h.cooldown+'s</span></div><div class="tower-card-effect">'+_(h)+'</div><button class="tower-info-btn" onclick="showTowerInfo('+a+')" title="Показать параметры">i</button></div>'}l+="</div>",l+=`
    <div class="selected-tower-card">
      <div>
        <span class="label">Выбранная башня</span>
        <strong>${o?o.conf.name:e.selectedTowerType!==null?m[e.selectedTowerType].name:"не выбрана"}</strong>
        <small>${o?`Клетка ${o.x}, ${o.y} | ${ee(o.conf)}`:"Для улучшения или продажи кликните по построенной башне."}</small>
      </div>
      <div class="selected-actions">
        <button onclick="upgradeSelectedTower()" ${o?"":"disabled"}>Улучшить</button>
        <button onclick="sellSelectedTower()" ${o?"":"disabled"}>Продать</button>
        <button onclick="clearTowerSelection()">Снять выбор</button>
      </div>
    </div>`,l+=`
    <small class="hotkeys">
      <span style="color:#727c88;">1-9, 0</span> — быстро выбрать башню 
      &nbsp;•&nbsp; 
      <span style="color:#de4541;">ПКМ / Esc</span> — отменить выбор
      <br>
      <span style="color:#7ad436;font-weight:bold;background:#202f16;padding:0 4px 0 6px;border-radius:3px;">F8</span> 
      — dev режим &nbsp; 
      <span style="color:#308fc7;font-weight:bold;background:#12263c;padding:0 4px 0 6px;border-radius:3px;">F9</span> 
      — рестарт игры &nbsp; 
      <span style="color:#c44be0;font-weight:bold;background:#231035;padding:0 4px 0 6px;border-radius:3px;">F10</span> 
      — сбросить прогресс
    </small>`,t.innerHTML=l}function v(){oe()}function E(t,o){e.devMode&&e.devLog.push({ev:t,data:o,t:(+Date.now()).toString(36).slice(-5)})}function we(t,o,l){return{gridX:t,gridY:o,type:l,cx:t*c+c/2,cy:o*c+c/2,cooldown:0}}function me(t,o,l){let r=Array.isArray(t)&&t.length?t[0][0]*c+c/2:0,s=Array.isArray(t)&&t.length?t[0][1]*c+c/2:0;return{path:t,pathIdx:0,conf:o,type:l,hp:o.hp,x:r,y:s,initPos:1,progress:0,dotEffects:[]}}function ye(t,o,l,r){let s=m[r.type],a={x:t,y:o,target:l,damage:s.damage,speed:s.bulletSpeed,color:s.color,towerType:r.type,hit:!1};return s.dot&&(a.dot=s.dot),a}function R(){const t=[0,0],o=[g-1,g-1],l=V(t,o);Array.isArray(l)&&l.length>1?(e.path=l,e.devMode&&E("enemy_path_updated",{length:e.path.length,path:e.path})):(e.path=[],e.devMode&&E("enemy_path_error",{path:l,message:"Empty or invalid path"}))}function ve(t,o,l){let r=m[l];if(e.money<r.cost){e.devMode&&E("not_enough_money",{x:t,y:o,type:l,money:e.money});return}e.towers.push(new we(t,o,l)),e.grid[o][t].tower=e.towers[e.towers.length-1],e.grid[o][t].blocked=!0,e.money-=r.cost,e.devMode&&E("tower_built",{x:t,y:o,type:l,cost:r.cost,money_left:e.money,total_towers:e.towers.length}),R(),le(),v()}function be(t,o){let l=e.grid[o][t];if(!l.tower)return!1;let r=l.tower.type,s=Math.round(.5*m[r].cost);e.money+=s;let a=e.towers.indexOf(l.tower);return a>-1&&e.towers.splice(a,1),e.grid[o][t].tower=null,e.grid[o][t].blocked=!1,v(),N(),R(),le(),!0}function le(){for(let t of e.enemies){let o=t.path&&t.path[t.pathIdx]?t.path[t.pathIdx]:[0,0],l=V(o,[g-1,g-1]);l&&l.length>1?(t.path=l,t.pathIdx=0,e.devMode&&E("enemy_path_recalc",{from:o,to:[g-1,g-1],length:l.length})):(e.devMode&&E("enemy_path_recalc_fail",{from:o,to:[g-1,g-1]}),t.path=[],t.pathIdx=0)}}function Te(t){return 1+Math.floor((t-1)/10)*.2}function xe(t){return 1+Math.floor((t-1)/5)*150}function Me(t){const o=Math.floor((t-1)/3)*.01,l=Math.floor((t-1)/10)*.05;return 1+o+l}function Se(t){return 1+Math.floor((t-1)/5)*2}function ke(t){return 1+Math.floor((t-1)/10)}function $e(t,o){try{if(!Array.isArray(e.path)||e.path.length<2){e.devMode&&console.warn("[spawnEnemy] Отменено — нет пути");return}const l=O[t];if(!l){console.error(`[spawnEnemy] Неизвестный враг: ${t}`);return}const r=o+1,s=Te(r),a=xe(r)*s,i=Me(r)*s,d=Se(r)*s,f=ke(r)*s,u={...l,hp:Math.round(l.hp*a),speed:Math.round(l.speed*i),reward:Math.round(l.reward*d),damage:Math.floor(l.damage*f)},p=new me([...e.path],u,t);p.dotEffects=[],e.enemies.push(p),e.devMode&&E("enemy_spawned",{eidx:t,wave:r,conf:u})}catch(l){console.error("[spawnEnemy] Ошибка:",l)}}function Ie(){const t=Date.now(),o=(t-e.lastUpdateTime)/1e3;return e.lastUpdateTime=t,o}function Ee(t,o,l,r){return Math.hypot(t-l,o-r)}function Ae(t,o){if(!o)return;let l=t.dotEffects.find(r=>r.type===o.type);l?(o.multiStacks&&l.stacks<l.maxStacks?(l.stacks++,l.expires.push(o.stackDuration)):l.expires=l.expires.map(()=>o.stackDuration),o.multiDps&&(l.dps+=o.dps)):(l={type:o.type,dps:o.dps,stacks:1,maxStacks:o.maxStacks||1,stackDuration:o.stackDuration,multiDps:o.multiDps,multiStacks:o.multiStacks,expires:[o.stackDuration]},t.dotEffects.push(l)),e.lastEffectSummary={type:o.type,dps:o.dps,stacks:l.stacks,at:Date.now()}}function V(t,o){function l([u,p]){return`${u},${p}`}function r(u,p){const h=Math.abs(u[0]-p[0]),y=Math.abs(u[1]-p[1]);return h+y+(Math.SQRT2-2)*Math.min(h,y)}let s=[t],a={},i={},d={};a[l(t)]=0,i[l(t)]=r(t,o);let f={};for(;s.length;){let u=0;for(let w=1;w<s.length;++w)(i[l(s[w])]||1/0)<(i[l(s[u])]||1/0)&&(u=w);let p=s[u];s.splice(u,1);let h=l(p);if(p[0]===o[0]&&p[1]===o[1]){let w=[p];for(;d[l(w[0])];)w.unshift(d[l(w[0])]);return e.devMode&&E("path_found",{from:t,to:o,length:w.length}),w}f[h]=!0;let[y,$]=p,T=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];for(let[w,S,b]of T){const M=[y+w,$+S],[P,C]=M;if(P<0||P>=g||C<0||C>=g||e.grid[C][P].blocked||w!==0&&S!==0&&(e.grid[$][P].blocked||e.grid[C][y].blocked))continue;let A=l(M);if(f[A])continue;let j=a[h]+b;(!(A in a)||j<a[A])&&(d[A]=p,a[A]=j,i[A]=a[A]+r(M,o),s.some(([de,fe])=>de===M[0]&&fe===M[1])||s.push(M))}}return e.devMode&&E("path_fail",{from:t,to:o}),[]}let k,n;function ne(){if(e.towers=[],e.enemies=[],e.bullets=[],e.money=100,e.health=10,e.wave=0,e.selectedTowerType=null,e.selectedTowerCell=null,e.isPlacingTower=!1,e.placingTowerCell=null,e.mouseGridX=e.mouseGridY=null,e.buildZoneHints=[],e.gameOver=!1,e.victory=!1,e.defeatCause="",e.activeSpawners=[],e.waveTimeoutActive=!0,e.waitingForWaveStart=!0,e.wavePauseLeft=0,typeof e.devLog>"u"&&(e.devLog=[]),k=document.getElementById("game"),!k){alert("Canvas не найден!");return}if(k.width=q,k.height=z,n=k.getContext("2d"),Pe(),!Array.isArray(e.grid)||e.grid.length!==g){alert("Ошибка при создании сетки!");return}if(R(),!Array.isArray(e.path)||e.path.length<2){alert("Путь для врагов не найден! Проверьте сетку!"),Z();return}te(),v();try{document.getElementById("dev-panel").style.display=e.devMode?"":"none",document.getElementById("wave-timer").style.display="none"}catch{}if(!k._tdEvents){k.addEventListener("mousedown",Re),k.addEventListener("mousemove",Ve),k.addEventListener("mouseleave",()=>{e.mouseGridX=null,e.mouseGridY=null,e.buildZoneHints=[]}),document.addEventListener("keydown",Ke);const t=document.getElementById("btnNextWave");t&&t.addEventListener("click",De),k._tdEvents=!0}oe(),e.waveTimeoutActive=!0,e.waitingForWaveStart=!0,e.wavePauseLeft=0,B("Нажмите кнопку, когда оборона готова"),document.getElementById("wave-timer").style.display="",requestAnimationFrame(re),e.devMode&&setTimeout(()=>{console.log("[TD] State after init:",{towers:e.towers,enemies:e.enemies,bullets:e.bullets,grid:e.grid?"OK":"fail",path:e.path?e.path.length:0,wave:e.wave,money:e.money,health:e.health})},100)}function Pe(){e.grid=[];for(let t=0;t<g;++t){let o=[];for(let l=0;l<g;++l)o.push({tower:null,base:l===g-1&&t===g-1,blocked:!1});e.grid.push(o)}}function re(){e.gameOver||(Ce(),Ye(),requestAnimationFrame(re))}function Ce(){let t=Ie();e.devMode&&console.log("update dt:",t),_e(t),e.waveTimeoutActive||(Be(t),Oe(t),e.bullets=e.bullets.filter(o=>o.target&&o.target.hp>0),He(t),We(t),Ne(t),Fe()),ot(),lt(),H()}function De(){if(!(e.gameOver||e.victory)&&e.waveTimeoutActive){e.waitingForWaveStart=!1,e.wavePauseLeft=0,B(0);const t=document.getElementById("wave-timer");t&&(t.style.display="none"),se()}}function _e(t){e.waitingForWaveStart||e.waveTimeoutActive&&e.wavePauseLeft>0&&(e.wavePauseLeft-=t,B(Math.max(0,Math.ceil(e.wavePauseLeft))),e.wavePauseLeft<=0&&(e.waveTimeoutActive=!1,document.getElementById("wave-timer").style.display="none",se()))}function se(){e.wave<I.length&&(Ge(e.wave),e.wave++,e.waveTimeoutActive=!1,e.waitingForWaveStart=!1,v(),H())}function Le(t){if(!I[t])return null;let o=JSON.parse(JSON.stringify(I[t].enemies));return{spawnList:o,spawnIdx:0,nextEnemySpawnAt:0,left:o.reduce((l,r)=>l+r.n,0),finished:!1,waveIndex:t}}function Be(t){for(const o of e.activeSpawners){if(o.finished)continue;let l=o.spawnList,r=o.spawnIdx;if(r>=l.length){o.finished=!0;continue}let s=l[r];if(!s){o.finished=!0;continue}o.nextEnemySpawnAt-=t,s.n>0&&o.nextEnemySpawnAt<=0&&($e(s.e,o.waveIndex),s.n--,o.left--,o.nextEnemySpawnAt=s.d),s.n<=0&&o.spawnIdx++,o.left<=0&&o.spawnIdx>=l.length&&(o.finished=!0)}}function Ge(t){const o=Le(t);o&&e.activeSpawners.push(o)}function Fe(){if(e.activeSpawners.every(o=>o.finished)&&e.enemies.length===0&&e.wave<I.length&&!e.gameOver&&!e.waveTimeoutActive){e.waveTimeoutActive=!0,e.waitingForWaveStart=!0,e.wavePauseLeft=0,B("Волна завершена. Можно запускать следующую.");const o=document.getElementById("wave-timer");o&&(o.style.display="block")}}function B(t){const o=document.getElementById("wave-timer");o&&(o.textContent=typeof t=="number"?`Следующая волна: ${t} сек.`:t)}function Oe(t){for(let o=e.enemies.length-1;o>=0;--o){const l=e.enemies[o];for(let p=l.dotEffects.length-1;p>=0;--p){const h=l.dotEffects[p];l.hp-=h.dps*h.stacks*t,h.expires=h.expires.map(y=>y-t).filter(y=>y>0),h.stacks=h.expires.length,h.stacks<=0&&l.dotEffects.splice(p,1)}if(l.hp<=0||isNaN(l.hp)){e.money+=l.conf.reward||0,e.enemies.splice(o,1),typeof v=="function"&&v();continue}if(!Array.isArray(l.path)||l.path.length<2||l.pathIdx>=l.path.length-1){const p=Math.floor(l.x/c),h=Math.floor(l.y/c),y=V([p,h],[g-1,g-1]);if(Array.isArray(y)&&y.length>1)l.path=y,l.pathIdx=0,l.progress=0,e.devMode&&x("enemy_repath_success",{from:[p,h],newLen:y.length});else{e.devMode&&x("enemy_stuck",{at:[p,h],reason:"no path"});continue}}const r=l.conf.speed/100;for(l.progress+=t*r;l.progress>=1&&l.pathIdx<l.path.length-1;)l.progress-=1,l.pathIdx++;if(l.pathIdx>=l.path.length-1){e.health-=l.conf.damage,e.devMode&&x("enemy_base",{eidx:l.type,damage:l.conf.damage,wave:e.wave,health:e.health}),e.enemies.splice(o,1),typeof v=="function"&&v();continue}const[s,a]=l.path[l.pathIdx],[i,d]=l.path[l.pathIdx+1]||[s,a],f=s+(i-s)*l.progress,u=a+(d-a)*l.progress;l.x=f*c+c/2,l.y=u*c+c/2}}function We(t){for(const o of e.towers)o.laserVisual&&(o.laserVisual.show-=t,o.laserVisual.show<=0&&(o.laserVisual=null))}function He(t){for(let o of e.towers)if(o.cooldown-=t,o.cooldown<=0){const l=m[o.type];let r=e.enemies.filter(s=>Ee(o.cx,o.cy,s.x,s.y)<=l.range*c);if(r.length){let s=r.sort((a,i)=>i.pathIdx-a.pathIdx||a.hp-i.hp)[0];if(l.laser){if(s.hp-=l.damage,o.cooldown=l.cooldown,o.laserVisual={x1:o.cx,y1:o.cy,x2:s.x,y2:s.y,color:l.color||"#0ff",show:.1},s.hp<=0){e.money+=s.conf.reward||0;let a=e.enemies.indexOf(s);a>-1&&e.enemies.splice(a,1),typeof v=="function"&&v()}}else e.bullets.push(new ye(o.cx,o.cy,s,o)),o.cooldown=l.cooldown}}}function Ne(t){for(let o=e.bullets.length-1;o>=0;--o){let l=e.bullets[o];if(!l.target||l.target.hp<=0){e.devMode&&x("bullet_removed_dead_target",{id:o}),e.bullets.splice(o,1);continue}let r=(l.target.x-l.x)/c,s=(l.target.y-l.y)/c,a=Math.hypot(r,s),i=t*(l.speed/100);if(a<i+.2){if(l.hit=!0,l.target.hp-=l.damage,l.dot&&Ae(l.target,l.dot),x("hit",{tower:l.towerType,eidx:l.target.type,dmg:l.damage,left:l.target.hp}),l.target.hp<=0){e.money+=l.target.conf.reward,x("enemy_die",{eid:l.target.type,wv:e.wave,money:e.money});let d=e.enemies.indexOf(l.target);d>-1&&e.enemies.splice(d,1),typeof v=="function"&&v()}e.bullets.splice(o,1);continue}l.x+=r/a*i*c,l.y+=s/a*i*c,e.devMode&&x("bullet_move",{id:o,speed:l.speed,step:(i*c).toFixed(2),dist:(a*c).toFixed(2),to:[l.target.x.toFixed(1),l.target.y.toFixed(1)]})}}function Re(t){if(e.gameOver||e.victory){e.devMode&&console.debug("[handleMouseClick] Игра закончена, клики игнорируются");return}let o=ae(t);if(!o){e.devMode&&console.debug("[handleMouseClick] Клик вне поля");return}let[l,r]=o;if(e.grid[r][l].tower){e.devMode&&console.debug(`[handleMouseClick] Показ инфо по башне на (${l},${r})`),e.selectedTowerCell={x:l,y:r},e.selectedTowerType=e.grid[r][l].tower.type,L(e.grid[r][l].tower.type,l,r),v();return}if(t.button===2)return e.devMode&&console.debug("[handleMouseClick] ПКМ — отмена выбора башни и режима строительства"),e.selectedTowerType=null,e.selectedTowerCell=null,e.isPlacingTower=!1,e.placingTowerCell=null,v(),e.buildZoneHints=[],!1;if(e.selectedTowerType===null){e.devMode&&console.debug("[handleMouseClick] Башня для строительства не выбрана");return}G(l,r)&&X(l,r)?(e.devMode&&console.debug(`[handleMouseClick] Установка башни типа ${e.selectedTowerType} на (${l},${r})`),ve(l,r,e.selectedTowerType),e.selectedTowerCell={x:l,y:r},e.placingTowerCell=null,e.buildZoneHints=[],v()):e.devMode&&console.debug(`[handleMouseClick] Нельзя поставить башню на (${l},${r})`)}function Ve(t){if(!e.isPlacingTower){e.mouseGridX=e.mouseGridY=null,e.buildZoneHints=[],e.devMode&&console.debug("[handleMouseMove] Режим строительства выключен — подсказки сброшены");return}let o=ae(t);if(o){e.mouseGridX=o[0],e.mouseGridY=o[1],e.buildZoneHints=[];let l=2;for(let r=Math.max(0,e.mouseGridY-l);r<=Math.min(g-1,e.mouseGridY+l);r++)for(let s=Math.max(0,e.mouseGridX-l);s<=Math.min(g-1,e.mouseGridX+l);s++){if(s===0&&r===0||s===g-1&&r===g-1)continue;let a=G(s,r)&&X(s,r);e.buildZoneHints.push({x:s,y:r,allowed:a})}e.devMode&&console.debug(`[handleMouseMove] Подсказки обновлены вокруг (${e.mouseGridX},${e.mouseGridY})`)}}function G(t,o){if(e.grid[o][t].blocked)return e.devMode&&x("cell_blocked",{x:t,y:o}),!1;if(e.grid[o][t].tower)return e.devMode&&x("cell_tower_exists",{x:t,y:o}),!1;for(let l of e.towers)if(l.gridX===t&&l.gridY===o)return e.devMode&&x("cell_tower_in_array",{x:t,y:o}),!1;return e.devMode&&x("cell_empty",{x:t,y:o}),!0}function X(t,o){if(t===0&&o===0||t===g-1&&o===g-1)return e.devMode&&x("deny_entrance_exit",{x:t,y:o}),!1;if(!G(t,o))return e.devMode&&x("not_empty",{x:t,y:o}),!1;e.grid[o][t].blocked=!0;let l=Xe();return e.devMode&&x("path_check",{x:t,y:o,ok:l,message:l?"Путь есть, строить можно":"Путь перекрывается, строить нельзя",towersCount:e.towers.length}),e.grid[o][t].blocked=!1,l}function Xe(){const t=[0,0],o=[g-1,g-1];function l([f,u],[p,h]){let y=Math.abs(f-p),$=Math.abs(u-h);const T=1,w=Math.SQRT2;return T*(y+$)+(w-2*T)*Math.min(y,$)}const r=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];let s=new Set,a=[{pos:t,g:0,f:l(t,o)}],i=new Map;function d([f,u]){return`${f},${u}`}for(;a.length>0;){a.sort((h,y)=>h.f-y.f);let f=a.shift(),[u,p]=f.pos;if(u===o[0]&&p===o[1])return e.devMode&&x("a_star_pass",{cx:u,cy:p,result:"finish reached"}),!0;s.add(d(f.pos));for(let[h,y,$]of r){let T=u+h,w=p+y;if(T<0||w<0||T>=g||w>=g||e.grid[w][T].blocked||s.has(d([T,w]))||h!==0&&y!==0&&(e.grid[p][T].blocked||e.grid[w][u].blocked))continue;let S=f.g+$,b=a.find(M=>M.pos[0]===T&&M.pos[1]===w);b&&S>=b.g||(i.set(d([T,w]),f.pos),b?(b.g=S,b.f=S+l([T,w],o)):a.push({pos:[T,w],g:S,f:S+l([T,w],o)}))}}return e.devMode&&x("a_star_fail",{result:"no path for enemy"}),!1}function Ye(){e.devMode&&console.log("jsdot: draw() start"),n.clearRect(0,0,q,z),Ze(),je(),Qe(),qe();const t=performance.now()/1e3;for(let o of e.towers)if(o.laserVisual&&o.laserVisual.show>0){let l=m[o.type]||{},r=l.bulletSpeed||15;if(t*r%1<.5){let a=.6+.4*Math.min(o.laserVisual.show*10,1);n.save(),n.globalAlpha=a,n.strokeStyle=o.laserVisual.color||"#f00",n.lineWidth=l.name&&l.name.startsWith("LA2")?8:4,n.shadowColor=o.laserVisual.color||"#f00",n.shadowBlur=16,n.beginPath(),n.moveTo(o.laserVisual.x1,o.laserVisual.y1),n.lineTo(o.laserVisual.x2,o.laserVisual.y2),n.stroke(),n.restore(),e.devMode&&console.log(`jsdot: draw laser from tower ${o.type} with alpha ${a.toFixed(2)}`)}}ze(),Ue(),e.devMode&&tt(e.path),e.victory&&ie(),e.gameOver&&Z(),e.devMode&&console.log("jsdot: draw() end")}function Ze(){n.save();for(let t=0;t<g;++t)for(let o=0;o<g;++o)n.strokeStyle=o===0&&t===0?"#e3ed7a":o===g-1&&t===g-1?"#ffae00":"#3a3a3a",n.lineWidth=2,n.strokeRect(o*c,t*c,c,c),e.grid[t][o].blocked&&(n.fillStyle="#593045",n.globalAlpha=.2,n.fillRect(o*c+3,t*c+3,c-6,c-6),n.globalAlpha=1);if(n.restore(),e.devMode){n.save(),n.strokeStyle="#31aec8",n.lineWidth=5,n.globalAlpha=.21,n.beginPath();for(let t=0;t<e.path.length;++t){let[o,l]=e.path[t];t===0?n.moveTo(o*c+c/2,l*c+c/2):n.lineTo(o*c+c/2,l*c+c/2)}n.stroke(),n.globalAlpha=1,n.restore()}}function je(){var t;if(!(!e.buildZoneHints||!e.buildZoneHints.length)){for(let o of e.buildZoneHints){let{x:l,y:r,allowed:s}=o;n.save();let a=e.selectedTowerType!=null&&e.money<(((t=m[e.selectedTowerType])==null?void 0:t.cost)||99999);if(s&&e.selectedTowerType!=null&&!a)n.globalAlpha=.7,n.fillStyle=m[e.selectedTowerType].color;else if(s&&e.selectedTowerType!=null&&a){let i=Date.now()/105;n.globalAlpha=.4+.5*Math.abs(Math.sin(i)),n.fillStyle="rgba(255,25,50,1)"}else n.globalAlpha=.24,n.fillStyle="#ef2b2b";if(n.beginPath(),n.rect(l*c+2,r*c+2,c-4,c-4),n.fill(),n.globalAlpha=1,n.restore(),s&&e.selectedTowerType!=null){let i=m[e.selectedTowerType];n.save(),n.strokeStyle="#00ff79",n.globalAlpha=.1,n.beginPath(),n.arc(l*c+c/2,r*c+c/2,i.range*c,0,2*Math.PI),n.stroke(),n.globalAlpha=1,n.restore()}}if(e.isPlacingTower&&e.mouseGridX!==null&&e.mouseGridY!==null){n.save(),n.globalAlpha=.5;let o=G(e.mouseGridX,e.mouseGridY)&&X(e.mouseGridX,e.mouseGridY);if(n.strokeStyle=o?"#36ef97":"#b71010",n.lineWidth=4,n.strokeRect(e.mouseGridX*c+3,e.mouseGridY*c+3,c-6,c-6),n.globalAlpha=1,n.restore(),e.selectedTowerType!=null){let l=m[e.selectedTowerType];n.save(),n.globalAlpha=.1,n.beginPath(),n.arc(e.mouseGridX*c+c/2,e.mouseGridY*c+c/2,l.range*c,0,2*Math.PI),n.fillStyle=l.color,n.fill(),n.globalAlpha=1,n.restore()}}}}function Qe(){if(e.devMode)for(let t of e.towers){let o=m[t.type];n.save(),n.beginPath(),n.arc(t.cx,t.cy,o.range*c,0,2*Math.PI),n.globalAlpha=.13,n.fillStyle=o.color,n.fill(),n.globalAlpha=1,n.restore()}}function qe(){for(let t of e.towers){let o=m[t.type];n.beginPath(),n.arc(t.cx,t.cy,c*.33,0,2*Math.PI),n.fillStyle=o.color,n.shadowColor="#fff",n.shadowBlur=5,n.fill(),n.shadowBlur=0,n.strokeStyle="#282a3c",n.stroke(),n.font="12px monospace",n.textAlign="center",n.shadowColor="#000",n.shadowBlur=4,n.lineWidth=2,n.strokeStyle="#000",n.strokeText(o.name,t.cx,t.cy+c/2-4),n.shadowBlur=0,n.fillStyle=o.color,n.fillText(o.name,t.cx,t.cy+c/2-4)}}function ze(){for(let t of e.enemies){if(isNaN(t.x)||isNaN(t.y))continue;n.save(),n.beginPath(),n.arc(t.x,t.y,c*.26,0,2*Math.PI),n.fillStyle=t.conf.color||"#ddd",n.globalAlpha=.86,n.fill(),n.strokeStyle="#4a172a",n.stroke(),t.dotEffects&&t.dotEffects.length&&(n.beginPath(),n.arc(t.x,t.y,c*.34,0,2*Math.PI),n.strokeStyle="#81ff8d",n.lineWidth=3,n.globalAlpha=.75,n.stroke(),n.globalAlpha=1);let o=t.hp/t.conf.hp;const l=c*.34,r=5,s=t.x-l/2,a=t.y+c*.13;n.fillStyle="#ed3838",n.fillRect(s,a,l,r),n.fillStyle="7de17b",n.fillRect(s,a,l*o,r),n.strokeStyle="#111",n.lineWidth=1,n.strokeRect(s,a,l,r),n.font="12px monospace",n.textAlign="center",n.fillStyle="#fff",n.fillText(t.conf.name,t.x,t.y-c*.28),n.font="10px monospace",n.textAlign="left",n.fillStyle="#fff";const i=`${Math.ceil(t.hp)} / ${t.conf.hp}`;n.fillText(i,s+l+4,a+r),n.restore()}}function Ue(){for(let t of e.bullets)n.beginPath(),n.arc(t.x,t.y,6,0,2*Math.PI),n.fillStyle=t.color||"#fff",n.fill(),n.strokeStyle="#222",n.stroke(),n.beginPath(),n.arc(t.x,t.y,10,0,2*Math.PI),n.globalAlpha=.1,n.strokeStyle=t.color||"#fff",n.stroke(),n.globalAlpha=1}function ae(t){let o=k.getBoundingClientRect(),l=t.clientX-o.left,r=t.clientY-o.top,s=Math.floor(l/c),a=Math.floor(r/c);return s<0||a<0||s>=g||a>=g?null:[s,a]}function Ke(t){if(/^[1-9]$/.test(t.key)||t.key==="0"){const o=t.key==="0"?9:Number(t.key)-1;Je(o)}t.key==="Escape"&&(window.clearTowerSelection(),N()),t.key==="F8"&&et(),t.key==="F9"&&Y(),t.key==="F10"&&ce()}function Je(t){return t<0||t>=m.length||e.money<m[t].cost?!1:(e.selectedTowerType=t,e.selectedTowerCell=null,e.isPlacingTower=!0,e.buildZoneHints=[],e.placingTowerCell=null,v(),!0)}function Y(){let t=document.querySelector(".gameover");t&&t.remove();let o=document.querySelector(".victory");o&&o.remove(),e.waveTimeoutActive=!1,e.wavePauseLeft=0,document.getElementById("wave-timer").style.display="none",e.buildZoneHints=[],ne()}function et(){e.devMode=!e.devMode,document.getElementById("dev-panel").style.display=e.devMode?"":"none",v()}function tt(t){if(!e.devMode||!t.length)return;n.save(),n.globalAlpha=.37,n.strokeStyle="#ffee22",n.lineWidth=3,n.beginPath();for(let l=0;l<t.length;++l){let[r,s]=t[l];n[l==0?"moveTo":"lineTo"](r*c+c/2,s*c+c/2)}n.stroke(),n.globalAlpha=1,n.restore();let o="";e.devLog.length>30&&e.devLog.splice(0,e.devLog.length-30),o+="<b>[DEV]</b> wave:"+e.wave+" | mon:$"+e.money+" | hp:"+e.health+"<br>",o+="towers:"+e.towers.length+" | enemies:"+e.enemies.length+"<br>",o+=e.path.length?"path len="+e.path.length:"no path!",o+="<br><pre style='max-height:8em;overflow:auto;'>"+e.devLog.map(l=>JSON.stringify(l)).join(`
`)+"</pre>",document.getElementById("dev-panel").innerHTML=o}function x(t,o){e.devMode&&e.devLog.push({ev:t,data:o,t:(+Date.now()).toString(36).substr(-5)})}function ot(){!e.gameOver&&e.health<=0&&(Z(),e.gameOver=!0,e.defeatCause="lose")}function Z(){let t=document.createElement("div");t.className="gameover",t.innerHTML="Поражение<br>Волна: "+e.wave+"<br><button onclick='restartGame()'>Рестарт</button>",t.style.zIndex=5,document.querySelector(".gameover")||document.body.appendChild(t)}function lt(){!e.victory&&e.wave>I.length&&e.enemies.length===0&&!e.waveTimeoutActive&&(ie(),e.victory=!0,e.defeatCause="win")}function ie(){let t=document.createElement("div");t.className="victory",t.innerHTML="Вы победили!<br>Волны: "+I.length+"<br><button onclick='restartGame()'>Играть ещё</button>",t.style.zIndex=6,document.querySelector(".victory")||document.body.appendChild(t)}function ce(){localStorage.removeItem("td_save"),Y()}window.selectTowerType=t=>{if(e.money<m[t].cost)return!1;e.selectedTowerType=t,e.selectedTowerCell=null,e.isPlacingTower=!0,e.buildZoneHints=[],e.placingTowerCell=null,v()};window.clearTowerSelection=()=>{e.selectedTowerType=null,e.selectedTowerCell=null,e.isPlacingTower=!1,e.buildZoneHints=[],e.placingTowerCell=null,v()};window.upgradeTower=(t,o)=>{if(!Number.isInteger(t)||!Number.isInteger(o)){const i=e.selectedTowerCell;if(!i)return!1;t=i.x,o=i.y}let l=e.grid[o][t];if(!l.tower)return!1;let r=l.tower.type,s=K(r);if(s===null)return!1;let a=m[s].cost;return e.money<a?!1:(e.money-=a,l.tower.type=s,v(),L(s,t,o),!0)};window.downgradeTower=(t,o)=>{if(!Number.isInteger(t)||!Number.isInteger(o)){const i=e.selectedTowerCell;if(!i)return!1;t=i.x,o=i.y}let l=e.grid[o][t];if(!l.tower)return!1;let r=l.tower.type,s=J(r);if(s===null)return!1;let a=m[s].cost;return e.money+=a,l.tower.type=s,v(),L(s,t,o),!0};window.showTowerInfo=L;window.hideTowerInfo=N;window.sellTower=(t,o)=>{if(!Number.isInteger(t)||!Number.isInteger(o)){const r=e.selectedTowerCell;if(!r)return!1;t=r.x,o=r.y}const l=be(t,o);return l&&(e.selectedTowerCell=null,e.selectedTowerType=null,e.isPlacingTower=!1),v(),l};window.upgradeSelectedTower=()=>window.upgradeTower();window.sellSelectedTower=()=>window.sellTower();window.clearSavedGameState=ce;window.restartGame=Y;window.onload=()=>{ue().then(ne).catch(t=>{console.error("[TD] Failed to load game data:",t),alert("Не удалось загрузить данные игры. Проверьте public/data/*.json и запуск через Vite.")})};window.addEventListener("contextmenu",t=>t.preventDefault());
