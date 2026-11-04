import model from './companion-model.cjs';
import touch from './touch-reactions.cjs';
import css from './companion.css';
import {createDance} from './dance.mjs';
import {icon} from './companion-icons.mjs';

export function pickQuoteForConfig(config,lastText='') {
  return model.pickQuote(model.quotePool(config.companion,config.randomLines),lastText);
}

export function mount(options) {
  const {root,menu,dom,getConfig,saveConfig:writeConfig,showQuote,showQuota,playSound,resetPosition,openMenu,closeMenu,positionMenu,defaultImage}=options;
  const stateKey='gfw_companion_state_v1';
  let memory=model.normalizeState({});
  let stateSessionOnly=false;
  let preferencesSessionOnly=false;
  function saveConfig(){const saved=writeConfig();preferencesSessionOnly=saved===false;return saved;}
  let stopToy=()=>{};
  let dance=null;
  const $=selector=>menu.querySelector(selector);
  const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  let prefs=model.normalizePreferences(getConfig().companion);
  if(getConfig().companionVersion!==1) {
    prefs.customLines=model.quotePool({...prefs,builtins:false},getConfig().randomLines).map(q=>q.text);
    getConfig().randomLines=[];
    getConfig().companionVersion=1;
  }
  getConfig().companion=prefs;saveConfig();
  const style=make('style');style.textContent=css;document.head.appendChild(style);
  const legacy=make('div','cp-legacy');legacy.hidden=true;
  while(menu.firstChild)legacy.appendChild(menu.firstChild);
  menu.appendChild(legacy);
  menu.classList.add('gfw-companion-menu');
  const layout=make('div');
  dom.setHTML(layout,`
    <header class="cp-head"><div class="cp-emblem" aria-hidden="true">${icon('interaction')}</div><div><div class="cp-eyebrow">GEMINI COMPANION</div><h2 class="cp-title">猫猫陪伴站</h2></div></header>
    <div class="cp-summary"><span><i class="cp-online" aria-hidden="true"></i><span id="gfw-cat-status"></span></span><span id="gfw-affection-summary"></span></div>
    <nav class="cp-tabs" role="tablist" aria-label="猫娘设置模块"></nav>
    <div class="cp-content"></div>
    <footer class="cp-footer"><span id="gfw-companion-message" role="status" aria-live="polite">偏好自动保存 · Esc 收起面板</span><span>v0.5.0</span></footer>
  `);
  while(layout.firstChild)menu.appendChild(layout.firstChild);
  const close=legacy.querySelector('#gfw-menu-close');close.setAttribute('aria-label','关闭设置');$('.cp-head').appendChild(close);
  const panels={};
  const tabs=[['interaction','interaction','互动'],['dialogue','dialogue','台词'],['appearance','appearance','外观'],['audio','audio','声音'],['quota','quota','额度'],['tools','tools','工具']];
  function showTab(id,focus=false) {
    for(const [key] of tabs){const selected=key===id;const tab=$('#gfw-tab-'+key);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;panels[key].hidden=!selected;if(selected&&focus)tab.focus();}
    $('.cp-content').scrollTop=0;
    if(menu.classList.contains('gfw-show'))positionMenu();
  }
  for(const [id,symbol,label] of tabs) {
    const tab=make('button');tab.type='button';tab.id='gfw-tab-'+id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','gfw-panel-'+id);dom.setHTML(tab,icon(symbol));tab.append(make('span','',label));
    tab.addEventListener('click',()=>showTab(id));
    tab.addEventListener('keydown',e=>{
      let i=tabs.findIndex(t=>t[0]===id);
      if(e.key==='ArrowRight')i=(i+1)%tabs.length;else if(e.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else return;
      e.preventDefault();showTab(tabs[i][0],true);
    });
    $('.cp-tabs').appendChild(tab);
    const panel=make('section');panel.id='gfw-panel-'+id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panels[id]=panel;$('.cp-content').appendChild(panel);
  }
  dom.setHTML(panels.interaction,`
    <div class="cp-card cp-bond-card"><div class="cp-section-head"><div><div class="cp-eyebrow">A LITTLE CLOSER</div><h3>今天也要好好贴贴</h3></div><b id="gfw-affection"></b></div><div class="cp-progress" role="progressbar" aria-label="猫猫亲密度" aria-valuemin="0" aria-valuemax="100"><span></span></div><p id="gfw-dance-status"></p><div class="cp-statline" id="gfw-action-counts"></div></div>
    <div class="cp-card"><h3>给猫猫一点关注</h3><div class="cp-actions">
      <button type="button" class="cp-action" data-cp-action="pet"><b>${icon('pet')}</b><span>摸摸头<small>好感 +2 · 2 秒</small></span></button>
      <button type="button" class="cp-action" data-cp-action="feed"><b>${icon('feed')}</b><span>小鱼干投喂<small>好感 +5 · 30 秒</small></span></button>
      <button type="button" class="cp-action" data-cp-action="play"><b>${icon('play')}</b><span>逗猫棒<small>好感 +3 · 抓星星</small></span></button>
      <button type="button" class="cp-action" data-cp-action="sleep"><b>${icon('sleep')}</b><span><span id="gfw-sleep-label">打个盹</span><small>随时唤醒，不扣好感</small></span></button>
    </div></div>
    <div class="cp-card cp-switches"><label class="cp-row"><span>开启趣味互动<small>轻养成和猫猫小脾气</small></span><input id="gfw-fun-enabled" type="checkbox"></label><label class="cp-row"><span>满好感 · 柔情之舞<small>100 自动变身，跳完回到 80</small></span><input id="gfw-dance-enabled" type="checkbox"></label><label class="cp-row"><span>显示快捷互动条<small>摸头、投喂、陪玩与设置</small></span><input id="gfw-quick-dock" type="checkbox"></label></div><p class="cp-help">轻点看额度，连戳会哈气，摸头或投喂会消气。好感度是本机趣味记录，不会因离开而减少。</p>
  `);
  dom.setHTML(panels.dialogue,`
    <div class="cp-card"><h3>今天想听哪种喵？</h3><label class="cp-row"><span>启用内置台词</span><input type="checkbox" id="gfw-builtins"></label><label class="cp-row"><span>台词风格</span><select id="gfw-quote-group"><option value="all">全部混合</option><option value="meme">猫猫玩梗</option><option value="sweet">软乎贴贴</option><option value="work">打工搭子</option></select></label><div class="cp-quote-preview" id="gfw-quote-preview">小基基，今天也一起加油喵。</div><div class="cp-btnrow"><button type="button" class="cp-button" data-cp-command="quote">来一句喵</button></div></div>
    <div class="cp-card"><h3><label for="gfw-custom-lines">专属台词本</label></h3><p>每行一句，最多 40 句，每句 80 字。自定义文字按原样显示。</p><textarea id="gfw-custom-lines" maxlength="3240" placeholder="好猫猫，今天也辛苦啦～"></textarea><div class="cp-btnrow"><button type="button" class="cp-button cp-primary" data-cp-command="save-quotes">保存台词</button><button type="button" class="cp-button" data-cp-command="reset-quotes">恢复内置台词</button></div></div>
  `);
  dom.setHTML(panels.appearance,`
    <div class="cp-card" id="gfw-appearance-general"><h3>猫猫的样子</h3><label class="cp-row"><span>猫猫昵称</span><input type="text" id="gfw-cat-name" maxlength="20" style="width:150px"></label><label class="cp-row"><span>面板配色</span><select id="gfw-companion-theme"><option value="lilac">星糖丁香</option><option value="peach">奶油蜜桃</option><option value="night">夜猫蓝紫</option></select></label><label class="cp-row"><span>立绘不透明度</span><input type="range" id="gfw-cat-opacity" min="0.4" max="1" step="0.05"><output id="gfw-cat-opacity-value"></output></label></div>
    <div class="cp-card" id="gfw-appearance-position"><h3>摆放与动效</h3><label class="cp-row"><span>锁定位置，防止误拖</span><input type="checkbox" id="gfw-position-locked"></label><label class="cp-row"><span>减少动态效果</span><input type="checkbox" id="gfw-reduced-motion"></label><div class="cp-btnrow"><button type="button" class="cp-button" data-cp-command="reset-position">回到右下角</button></div></div>
    <div class="cp-card"><h3>本地自定义立绘</h3><p>选择自己的 WebP / PNG / JPG，最多 2 MB。图片仅保存在本机。</p><input type="file" id="gfw-image-file" accept="image/webp,image/png,image/jpeg" aria-label="选择本地立绘"><div class="cp-btnrow"><button type="button" class="cp-button" data-cp-command="reset-image">恢复原猫娘立绘</button></div></div>
  `);
  dom.setHTML(panels.audio,'<div class="cp-card" id="gfw-companion-audio"><h3>一声轻响，也是一点回应</h3></div>');
  dom.setHTML(panels.quota,`
    <div class="cp-card"><h3>Google 官方剩余额度</h3><div class="cp-quota-grid"><div><span>5 小时</span><strong id="gfw-status-5h">—</strong><small id="gfw-status-reset5h"></small></div><div><span>每周</span><strong id="gfw-status-week">—</strong><small id="gfw-status-resetweek"></small></div></div><p id="gfw-status-freshness"></p><div class="cp-btnrow"><button type="button" class="cp-button cp-primary" data-cp-command="refresh-quota">立即同步</button><button type="button" class="cp-button" data-cp-command="show-quota">查看气泡</button></div></div>
    <div class="cp-card" id="gfw-quota-warning"><h3>数据与预警</h3><p>约 30 秒同步一次；超过 90 秒没有有效更新时隐藏数值。Google 页面本身也可能有延迟。互动、投喂、计时均不产生或消耗额度。</p></div>
  `);
  dom.setHTML(panels.tools,`
    <div class="cp-card"><h3>猫猫番茄钟</h3><div class="cp-center" id="gfw-timer-label">准备好就开始，一起专心一小会儿</div><div class="cp-timer" id="gfw-timer-value" role="timer" aria-label="番茄钟剩余时间">25:00</div><div class="cp-statline"><span id="gfw-focus-count"></span><span>计时结束不会自动开始下一轮</span></div><label class="cp-row"><span>专注分钟（5–120）</span><input type="number" id="gfw-focus-minutes" min="5" max="120"></label><label class="cp-row"><span>休息分钟（1–30）</span><input type="number" id="gfw-break-minutes" min="1" max="30"></label><div class="cp-btnrow"><button type="button" class="cp-button cp-primary" data-cp-command="focus-start">开始专注</button><button type="button" class="cp-button" data-cp-command="break-start">开始休息</button><button type="button" class="cp-button" data-cp-command="timer-pause">暂停</button><button type="button" class="cp-button" data-cp-command="timer-reset">结束计时</button></div><p>按截止时间恢复。退出 Gemini 后不会后台响铃，重新打开时会核对是否结束。</p></div>
    <div class="cp-card"><h3>随身带走陪伴偏好</h3><p>导出昵称、台词、主题和计时偏好，不含立绘、账户、额度或旧版连接参数。</p><div class="cp-btnrow"><button type="button" class="cp-button" data-cp-command="export">导出陪伴偏好</button><button type="button" class="cp-button" data-cp-command="import">导入偏好</button></div><input type="file" id="gfw-settings-file" accept="application/json,.json" hidden><div class="cp-btnrow"><button type="button" class="cp-button" data-cp-command="reset-preferences">重置陪伴偏好</button></div></div>
  `);
  function moveRow(id,target){const element=legacy.querySelector('#'+id);const row=element?.closest('.gfw-m-row');if(row)$(target).appendChild(row);}
  moveRow('gfw-scale-range','#gfw-appearance-general');
  for(const [id,target] of [['gfw-snap-panel','#gfw-appearance-position'],['gfw-audio-panel','#gfw-companion-audio']]) {
    const panel=legacy.querySelector('#'+id);panel.classList.add('cp-subpanel');$(target).appendChild(panel);
  }
  moveRow('gfw-warn-pct','#gfw-quota-warning');
  const alertLabel=$('#gfw-turn-alert-on').parentElement;
  for(const node of [...alertLabel.childNodes])if(node.nodeType===3)node.remove();
  alertLabel.appendChild(document.createTextNode(' 互动 / 计时完成提示'));
  for(const [id,label] of [['gfw-scale-range','挂件大小'],['gfw-scale-num','挂件大小等级，1 到 20'],['gfw-snap-mode','边缘吸附方式'],['gfw-sound-set','按压音效类型'],['gfw-press-vol','按压音量'],['gfw-turn-sound-set','提示音类型'],['gfw-turn-close-sec','气泡停留秒数，0 为常驻'],['gfw-warn-pct','剩余额度预警阈值百分比']])$('#'+id).setAttribute('aria-label',label);
  const timeRow=$('#gfw-turn-close-sec').closest('.gfw-m-row');timeRow.querySelector('.gfw-m-label').textContent='气泡停留（秒）';
  const turnVolume=make('label','cp-row');dom.setHTML(turnVolume,'<span>提示音量</span><input id="gfw-turn-volume" type="range" min="0" max="1" step="0.05"><output id="gfw-turn-volume-value"></output>');$('#gfw-companion-audio').appendChild(turnVolume);
  const dock=make('div');dock.id='gfw-companion-dock';dock.setAttribute('role','toolbar');dock.setAttribute('aria-label','猫猫快捷互动');
  const cooldownControls = [];
  for(const [action,title] of [['pet','摸摸头'],['feed','投喂小鱼干'],['play','逗猫棒'],['menu','打开猫猫设置']]) {
    const button = make('button');
    dom.setHTML(button, icon(action));
    button.type = 'button';
    button.dataset.tip = title;
    button.dataset.cpDockAction = action;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', () => action === 'menu' ? openMenu() : performAction(action));
    dock.appendChild(button);
    if (action === 'menu') continue;
    const badge = make('span', 'cp-dock-cooldown');
    badge.setAttribute('aria-hidden', 'true');
    badge.hidden = true;
    button.appendChild(badge);
    const hint = $('[data-cp-action="' + action + '"] small');
    cooldownControls.push({action, title, button, badge, hint, idleHint: hint.textContent});
  }
  const dockClock=make('button','cp-clock','25:00');dockClock.type='button';dockClock.title='打开番茄钟';dockClock.setAttribute('aria-label','打开番茄钟');dockClock.addEventListener('click',()=>{openMenu();showTab('tools',true);});dock.appendChild(dockClock);document.body.appendChild(dock);
  const sleepingBadge=make('span','cp-sleep-badge','z z Z');sleepingBadge.setAttribute('aria-hidden','true');root.appendChild(sleepingBadge);
  const touchBadge=make('span','cp-touch-badge','💢');touchBadge.hidden=true;touchBadge.setAttribute('aria-hidden','true');root.querySelector('#gfw-img-wrap').appendChild(touchBadge);
  let touchState=touch.empty();
  let reactionTimer=null;
  let wakeTimer=null;
  function finishHiss(){if(reactionTimer!==null)clearTimeout(reactionTimer);reactionTimer=null;root.classList.remove('cp-hissing');touchBadge.hidden=true;}
  function resetTouchSequence(){touchState=touch.interrupt(touchState);}
  function clearTouchReaction(){finishHiss();touchState=touch.calm(touchState);}
  function characterTap(){
    if(dance?.busy()){showQuota();return true;}
    if(!model.normalizePreferences(getConfig().companion).enabled){clearTouchReaction();touchState=touch.empty();return false;}
    const now=performance.now();
    const result=touch.tap(touchState,now);touchState=result.state;
    if(result.hiss){
      stopToy();
      const state=readState();if(state.sleeping){state.sleeping=false;writeState(state);}
      if(wakeTimer!==null)clearTimeout(wakeTimer);root.classList.remove('cp-waking');
      finishHiss();root.classList.add('cp-hissing');touchBadge.hidden=false;
      showQuote('哈——！\n爪爪也是有脾气的，别连戳啦！',2400);
      playSound('hiss');reactionTimer=setTimeout(finishHiss,2400);return true;
    }
    if(now<touchState.hissUntil)return true;
    const state=readState();
    if(state.sleeping){state.sleeping=false;writeState(state);root.classList.add('cp-waking');if(wakeTimer!==null)clearTimeout(wakeTimer);wakeTimer=setTimeout(()=>{root.classList.remove('cp-waking');wakeTimer=null;},900);showQuota();return true;}
    return false;
  }

  function notify(text){$('#gfw-companion-message').textContent=text+((stateSessionOnly||preferencesSessionOnly)?' · 本次状态未保存':'');}
  function readState() {
    if(!stateSessionOnly)try {const raw=localStorage.getItem(stateKey);if(raw)memory=model.normalizeState(JSON.parse(raw));}catch{}
    return model.normalizeState(memory);
  }
  function writeState(next) {memory=next;try{localStorage.setItem(stateKey,JSON.stringify(next));stateSessionOnly=false;}catch{stateSessionOnly=true;notify('当前互动仅保留到关闭窗口。');}renderState();}
  function setPreferences(patch) {prefs=model.normalizePreferences({...model.normalizePreferences(getConfig().companion),...patch});getConfig().companion=prefs;saveConfig();applyPreferences();renderState();dance?.synchronize();}
  function positionDock() {
    if (dock.hidden) return;
    const cat = root.querySelector('#gfw-img-wrap').getBoundingClientRect();
    const width = dock.offsetWidth || 164;
    const height = dock.offsetHeight || 44;
    const edge = 8;
    const gap = 10;
    let left = cat.left - width - gap;
    let top = cat.bottom - height - 4;
    if (left < edge) {
      left = cat.right + gap;
      if (left + width > window.innerWidth - edge) {
        left = (cat.left + cat.right - width) / 2;
        top = cat.bottom + gap;
        if (top + height > window.innerHeight - edge) {
          top = root.getBoundingClientRect().top - height - gap;
        }
      }
    }
    dock.style.left = Math.round(Math.max(edge, Math.min(window.innerWidth - width - edge, left))) + 'px';
    dock.style.top = Math.round(Math.max(edge, Math.min(window.innerHeight - height - edge, top))) + 'px';
  }
  function applyPreferences() {
    prefs=model.normalizePreferences(getConfig().companion);
    menu.dataset.cpTheme=prefs.theme;dock.dataset.cpTheme=prefs.theme;
    root.classList.toggle('cp-reduced-motion',prefs.reducedMotion);menu.classList.toggle('cp-reduced-motion',prefs.reducedMotion);
    root.querySelector('#gfw-img').style.opacity=String(prefs.opacity);
    dock.hidden=!prefs.quickDock||!prefs.enabled;
    if(!prefs.enabled){stopToy();clearTouchReaction();touchState=touch.empty();}positionDock();
  }
  function syncInputs() {
    const values={'gfw-cat-name':prefs.name,'gfw-companion-theme':prefs.theme,'gfw-cat-opacity':prefs.opacity,'gfw-quote-group':prefs.quoteGroup,'gfw-custom-lines':prefs.customLines.join('\n'),'gfw-focus-minutes':prefs.focusMinutes,'gfw-break-minutes':prefs.breakMinutes};
    for(const [id,value] of Object.entries(values))$('#'+id).value=value;
    for(const [id,key] of [['gfw-fun-enabled','enabled'],['gfw-quick-dock','quickDock'],['gfw-position-locked','positionLocked'],['gfw-reduced-motion','reducedMotion'],['gfw-builtins','builtins'],['gfw-dance-enabled','danceEnabled']])$('#'+id).checked=prefs[key];
    $('#gfw-turn-volume').value=getConfig().turnVol;
    $('#gfw-turn-volume-value').textContent=Math.round(getConfig().turnVol*100)+'%';
  }
  function formatTime(ms){const sec=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
  function renderState() {
    const s=readState();
    const now = Date.now();
    dock.hidden=!prefs.enabled||!prefs.quickDock||!!s.reward.run;
    $('#gfw-cat-status').textContent=prefs.name+' · '+(s.sleeping?'打盹中':'陪伴中');
    $('#gfw-affection-summary').textContent='亲密度 '+s.affection;
    $('#gfw-affection').textContent=s.affection+' / 100';
    $('#gfw-dance-status').textContent=s.reward.run?'柔情之舞进行中，结束后好感度回到 80。':!prefs.enabled?'互动已暂停，好感度为你保留。':!prefs.danceEnabled?'满好感舞蹈已关闭，随时可以开启。':dance?.status()==='failed'?'舞蹈立绘加载失败，好感度已保留。重开下方舞蹈开关可重试。':s.affection===100?'心动已满，猫猫准备为你跳一支舞。':'再贴贴 '+(100-s.affection)+' 点，解锁柔情之舞。';
    for(const button of menu.querySelectorAll('[data-cp-action]'))button.disabled=!!s.reward.run||!prefs.enabled;
    for (const {action, title, button, badge, hint, idleHint} of cooldownControls) {
      const seconds = Math.ceil(model.actionCooldown(s, action, now) / 1000);
      const cooldown = seconds ? seconds + ' 秒后可用' : '';
      const label = cooldown ? title + ' · ' + cooldown : title;
      button.disabled = !!s.reward.run;
      button.setAttribute('aria-label', label);
      badge.hidden = !seconds;
      badge.textContent = seconds ? String(seconds) : '';
      hint.textContent = cooldown || idleHint;
    }
    $('.cp-progress').setAttribute('aria-valuenow',String(s.affection));$('.cp-progress span').style.width=s.affection+'%';
    $('#gfw-action-counts').textContent='摸头 '+s.counts.pet+' 次 · 投喂 '+s.counts.feed+' 次 · 陪玩 '+s.counts.play+' 次';
    $('#gfw-sleep-label').textContent=s.sleeping?'叫醒猫猫':'打个盹';sleepingBadge.hidden=!s.sleeping;root.classList.toggle('cp-sleeping',s.sleeping);
    $('#gfw-cat-opacity-value').textContent=Math.round(prefs.opacity*100)+'%';
    const t=s.timer;const remaining=t.status==='running'?Math.max(0,t.deadline-Date.now()):t.status==='idle'?prefs.focusMinutes*60000:t.remainingMs;
    $('#gfw-timer-value').textContent=formatTime(remaining);dockClock.textContent=formatTime(remaining);dockClock.hidden=t.status==='idle';
    $('#gfw-timer-label').textContent=t.status==='idle'?'准备好就开始，一起专心一小会儿':(t.phase==='focus'?'专注':'休息')+' · '+({running:'计时中',paused:'已暂停',done:'完成啦'}[t.status]);
    $('#gfw-focus-count').textContent='已完成 '+s.focusCompleted+' 轮专注';
    const busy=['running','paused'].includes(t.status);
    $('[data-cp-command="focus-start"]').disabled=busy;$('[data-cp-command="break-start"]').disabled=busy;
    $('[data-cp-command="timer-pause"]').disabled=!busy;$('[data-cp-command="timer-pause"]').textContent=t.status==='paused'?'继续':'暂停';
    $('[data-cp-command="timer-reset"]').disabled=t.status==='idle';
    for(const id of ['gfw-focus-minutes','gfw-break-minutes'])$('#'+id).disabled=busy;
    const q=options.getMetrics();
    $('#gfw-status-5h').textContent=q.left5hPct===null?'—':q.left5hPct+'%';$('#gfw-status-week').textContent=q.leftWeekPct===null?'—':q.leftWeekPct+'%';
    $('#gfw-status-5h').classList.toggle('cp-quota-warn', q.isWarn5h);
    $('#gfw-status-week').classList.toggle('cp-quota-warn', q.isWarnWeek);
    $('#gfw-status-reset5h').textContent=q.reset5hText;$('#gfw-status-resetweek').textContent=q.resetWeekText;
    const freshness = $('#gfw-status-freshness');
    if (q.updatedAt) {
      freshness.textContent = '已同步 · ' + Math.max(0, Math.floor((now - q.updatedAt) / 1000)) + ' 秒前更新';
    } else {
      freshness.textContent = q.status === 'stale' ? '上次官方数据已过期，等待更新。' : '等待 Google 官方用量同步。';
    }
    positionDock();
  }
  function reduced(){return prefs.reducedMotion||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
  function particles(symbol) {
    if(reduced())return;
    const r=root.querySelector('#gfw-img-wrap').getBoundingClientRect();
    for(let i=0;i<5;i++){const p=make('span','cp-particle',symbol);p.style.left=(r.left+r.width*.5+(Math.random()-.5)*50)+'px';p.style.top=(r.top+r.height*.3)+'px';p.style.setProperty('--cp-dx',((i-2)*24)+'px');document.body.appendChild(p);setTimeout(()=>p.remove(),900);}
  }
  function quote(text){$('#gfw-quote-preview').textContent=text;showQuote(text);}
  function randomQuote(){const q=pickQuoteForConfig(getConfig(),options.getLastQuote());quote(q.text);}
  function startToy() {
    stopToy();let hits=0;const toy=make('button','cp-toy','⭐');toy.type='button';toy.setAttribute('aria-label','抓住逗猫棒星星');toy.title='点我，抓星星！Esc 结束';document.body.appendChild(toy);
    function move(){const r=root.querySelector('#gfw-img-wrap').getBoundingClientRect();toy.style.left=Math.max(8,Math.min(window.innerWidth-60,r.left-65+Math.random()*Math.max(100,r.width)))+'px';toy.style.top=Math.max(8,Math.min(window.innerHeight-60,r.top-70+Math.random()*Math.max(70,r.height*.5)))+'px';}
    toy.addEventListener('click',()=>{hits++;particles('✨');quote(hits%2?'抓到啦！\n这颗星星，猫猫先收下了。':'猫猫出击！\n下一颗星星也不许跑～');move();});
    move();const timer=setTimeout(()=>{stopToy();notify('本次抓到 '+hits+' 颗星星，陪玩结束啦。');},10000);
    stopToy=()=>{clearTimeout(timer);toy.remove();stopToy=()=>{};};
  }
  function performAction(action) {
    if(!prefs.enabled){notify('趣味互动已暂停，可在互动模块重新开启。');return false;}
    const result=model.interact(readState(),action);
    if(!result.accepted){notify(result.retryAfterMs?'猫猫缓一缓，'+Math.ceil(result.retryAfterMs/1000)+' 秒后再试喵。':'这个互动暂时不可用。');return false;}
    const calming=['pet','feed'].includes(action)&&performance.now()<touchState.hissUntil;
    clearTouchReaction();resetTouchSequence();
    writeState(result.state);
    dance?.synchronize();
    if(result.state.affection===100&&prefs.danceEnabled){stopToy();notify(dance?.status()==='failed'?'舞蹈立绘加载失败，好感度已保留。重开舞蹈开关可重试。':'心动已满，准备跳一支只给你看的舞。');return true;}
    const lines={pet:'好猫猫已充电。\n再摸一下，呼噜声要漏出来了～',feed:'小基基你看！\n小鱼干是猫猫的满分答案。',play:'猫猫祟祟地盯住星星……\n点它！看本喵出爪！',sleep:result.state.sleeping?'猫猫进入省电模式。\n呼噜归我，灵感归你。':'睡醒啦，猫猫重新上线！\n今天也请多指喵～'};
    quote(calming?(action==='feed'?'哼，看在小鱼干的份上……\n好啦，猫猫不哈气了。':'呼噜……摸头犯规！\n这次就原谅你啦。'):lines[action]);particles(action==='feed'?'🐟':action==='play'?'✨':'🤍');
    if(getConfig().turnAlertOn)playSound('task_end',getConfig().turnSoundSet,getConfig().turnVol*.5);
    if(action==='play')startToy();else stopToy();
    notify('收到啦，'+prefs.name+(action==='sleep'?'换了个陪伴状态。':'又和你亲近了一点。'));return true;
  }
  for(const button of menu.querySelectorAll('[data-cp-action]'))button.addEventListener('click',()=>performAction(button.dataset.cpAction));
  const commands={
    quote:randomQuote,
    'save-quotes':()=>{setPreferences({customLines:$('#gfw-custom-lines').value.split(/\r?\n/),builtins:$('#gfw-builtins').checked});syncInputs();notify('已保存 '+prefs.customLines.length+' 句专属台词。');},
    'reset-quotes':()=>{setPreferences({customLines:[],builtins:true,quoteGroup:'all'});syncInputs();notify('已恢复内置台词。');},
    'reset-position':()=>{resetPosition();positionDock();notify('猫猫回到右下角啦。');},
    'reset-image':()=>{getConfig().customImg='';root.querySelector('#gfw-img').src=defaultImage;saveConfig();notify('已恢复原猫娘立绘。');},
    'refresh-quota':()=>{console.info('[GFW_OFFICIAL_REFRESH]');notify('已请求官方同步；短时间重复请求和错误重试会限速。');},
    'show-quota':showQuota,
    'focus-start':()=>startClock('focus'),
    'break-start':()=>startClock('break'),
    'timer-pause':()=>{const s=readState();writeState(s.timer.status==='paused'?model.resumeTimer(s):model.pauseTimer(s));},
    'timer-reset':()=>{const s=readState();s.timer=model.normalizeState({}).timer;writeState(s);notify('计时已结束，可重新选择专注或休息。');},
    export:()=>{const blob=new Blob([model.exportPreferences(prefs)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=make('a');link.href=url;link.download='gemini-cat-preferences.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('已导出陪伴偏好，不含账户与额度。');},
    import:()=>$('#gfw-settings-file').click(),
    'reset-preferences':()=>{setPreferences({...model.DEFAULTS,customLines:[]});syncInputs();notify('陪伴偏好已重置，原挂件位置、大小与官方额度不变。');}
  };
  for(const button of menu.querySelectorAll('[data-cp-command]'))button.addEventListener('click',()=>commands[button.dataset.cpCommand]?.());
  function startClock(phase) {
    const s=readState();if(['running','paused'].includes(s.timer.status)){notify('请先结束当前计时。');return;}
    writeState(model.startTimer(s,phase,phase==='focus'?prefs.focusMinutes:prefs.breakMinutes));
    quote(phase==='focus'?'猫猫专注结界已展开。\n先做一件事，喵陪你。':'休息时间到！\n伸个懒腰，喝口水吧～');
  }
  for(const [id,key] of [['gfw-fun-enabled','enabled'],['gfw-quick-dock','quickDock'],['gfw-position-locked','positionLocked'],['gfw-reduced-motion','reducedMotion'],['gfw-builtins','builtins'],['gfw-dance-enabled','danceEnabled']])$('#'+id).addEventListener('change',e=>setPreferences({[key]:e.target.checked}));
  for(const [id,key] of [['gfw-cat-name','name'],['gfw-companion-theme','theme'],['gfw-quote-group','quoteGroup']])$('#'+id).addEventListener('change',e=>{setPreferences({[key]:e.target.value});syncInputs();});
  for(const [id,key] of [['gfw-focus-minutes','focusMinutes'],['gfw-break-minutes','breakMinutes']])$('#'+id).addEventListener('change',e=>{setPreferences({[key]:Number(e.target.value)});syncInputs();});
  $('#gfw-cat-opacity').addEventListener('input',e=>setPreferences({opacity:Number(e.target.value)}));
  $('#gfw-turn-volume').addEventListener('input',e=>{getConfig().turnVol=Math.min(1,Math.max(0,Number(e.target.value)));saveConfig();$('#gfw-turn-volume-value').textContent=Math.round(getConfig().turnVol*100)+'%';});
  function readFile(file,asData=false){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('文件读取失败。'));asData?reader.readAsDataURL(file):reader.readAsText(file);});}
  $('#gfw-image-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{if(!['image/webp','image/png','image/jpeg'].includes(file.type)||file.size>2097152)throw Error('请选择 2 MB 以内的 WebP / PNG / JPG。');getConfig().customImg=await readFile(file,true);saveConfig();root.querySelector('#gfw-img').src=getConfig().customImg;notify('本机立绘已更新。');}catch(error){notify(error.message);}finally{e.target.value='';}
  });
  root.querySelector('#gfw-img').addEventListener('error',()=>{if(getConfig().customImg){getConfig().customImg='';saveConfig();root.querySelector('#gfw-img').src=defaultImage;notify('这张图片无法显示，已恢复原立绘。');}});
  $('#gfw-settings-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{if(file.size>262144)throw Error('设置文件最多支持 256 KB。');setPreferences(model.importPreferences(await readFile(file)));syncInputs();notify('陪伴偏好已导入。');}catch(error){notify(error.message);}finally{e.target.value='';}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){stopToy();if(menu.classList.contains('gfw-show')){closeMenu();root.querySelector('#gfw-img-wrap').focus();}else dance?.skip();}});
  window.addEventListener('resize',()=>{positionDock();if(menu.classList.contains('gfw-show'))positionMenu();});
  root.addEventListener('transitionend', event => {
    if (event.target === root && (event.propertyName === 'left' || event.propertyName === 'top')) positionDock();
  });
  window.addEventListener('storage',e=>{if(e.key==='gfw_config_v4_realtime'){applyPreferences();syncInputs();}if(e.key===stateKey||e.key==='gfw_config_v4_realtime'){renderState();dance?.synchronize();}});
  function tick() {
    const result=model.tickTimer(readState());
    if(result.completed){writeState(result.state);quote(result.state.timer.phase==='focus'?'专注完成，猫猫给你盖章！\n起来伸个懒腰吧。':'休息结束啦。\n准备好再开始，不着急喵。');if(getConfig().turnAlertOn)playSound('task_end',getConfig().turnSoundSet,getConfig().turnVol);notify('计时完成。下一轮由你手动开始。');}
    renderState();
    dance?.synchronize();
  }
  dance=createDance({root,dom,readState,writeState,preferences:()=>model.normalizePreferences(getConfig().companion),reduced,notify,openMenu,showQuota,onStatus:renderState,onStart:()=>{stopToy();clearTouchReaction();resetTouchSequence();options.closeBubble?.();},onFinish:()=>renderState()});
  setInterval(tick,1000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  const imageWrap=root.querySelector('#gfw-img-wrap');imageWrap.tabIndex=0;imageWrap.setAttribute('role','button');imageWrap.setAttribute('aria-label','猫娘：查看双额度，右键打开设置');
  imageWrap.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat&&!characterTap())showQuota();}else if(e.key==='F10'&&e.shiftKey){e.preventDefault();resetTouchSequence();openMenu();}});
  applyPreferences();syncInputs();renderState();showTab('interaction');tick();
  return {getState:()=>JSON.parse(JSON.stringify(readState())),getPreferences:()=>model.normalizePreferences(getConfig().companion),action:performAction,tick,showTab,characterTap,resetTouchSequence,positionDock};
}
