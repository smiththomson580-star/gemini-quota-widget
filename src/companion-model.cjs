'use strict';
const dance=require('./dance-model.cjs');

const BUILTIN_QUOTES = [
  ['meme','小基基，先别急着生成，\n让我蹭蹭你的桌面。'],
  ['meme','好猫猫认证：\n今天也有认真陪你摸鱼。'],
  ['meme','小猫咪能有什么坏心思？\n只是想按住你的光标罢了。'],
  ['meme','猫猫祟祟地路过，\n偷偷给你盖个爪印。'],
  ['meme','喵门已开，\n烦恼请排队出门。'],
  ['meme','不是我在摸鱼，\n是小鱼干主动靠近我。'],
  ['meme','已读，乱喵。\n收到，继续呼噜。'],
  ['meme','这不是卡住，\n是猫猫正在加载宇宙真理。'],
  ['meme','今日最佳工位：\n你的键盘正中央。'],
  ['meme','你的鼠标很好，\n现在归猫猫保管。'],
  ['meme','论文可以慢慢改，\n罐罐必须现在开。'],
  ['meme','猫猫 CPU 有点热，\n申请一口小鱼干散热。'],
  ['sweet','耳朵不许乱摸……\n刚才那次就算了。'],
  ['sweet','好猫猫已经就位，\n摸摸头就可以充电。'],
  ['sweet','今天辛苦啦，\n送你一枚软乎乎的爪印。'],
  ['sweet','累了就歇一会儿，\n我替你守着桌面。'],
  ['sweet','再戳我星星发饰……\n真的要掉下来了。'],
  ['sweet','小基基在忙，\n我负责把今天变可爱。'],
  ['sweet','不必每次都满分，\n今天的你也值得被贴贴。'],
  ['sweet','呼噜声已连接，\n你的专属猫猫在线。'],
  ['sweet','允许你摸一下。\n嗯……再一下也行。'],
  ['sweet','把烦恼放到这里，\n猫猫替你踩两脚。'],
  ['work','首席抓虫官到岗，\nBug 先别跑！'],
  ['work','先完成一小步，\n再奖励自己一大口呼噜。'],
  ['work','Ctrl + S 按了吗？\n猫猫替你问一句。'],
  ['work','番茄钟响之前，\n我们一起专心一小会儿。'],
  ['work','屏幕看久了，\n看看远处，再看看猫猫。'],
  ['work','别光顾着戳我呀，\n代码和论文写完没？'],
  ['work','灵感还没到？\n先喝口水，猫猫等你。'],
  ['work','呼噜呼噜……\n算力全开，随时待命。']
].map(([group,text],i)=>Object.freeze({id:'cat-'+i,group,text,weight:1}));

const DEFAULTS = Object.freeze({
  name:'星糖', enabled:true, quickDock:true, reducedMotion:false, danceEnabled:true,
  theme:'lilac', opacity:1, positionLocked:false,
  builtins:true, quoteGroup:'all', customLines:[], focusMinutes:25, breakMinutes:5
});
const bound=(v,min,max,fallback)=>typeof v==='number' && Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
const cleanLines=lines=>Array.isArray(lines)?[...new Set(lines.filter(x=>typeof x==='string').map(x=>x.trim().slice(0,80)).filter(Boolean))].slice(0,40):[];
function normalizePreferences(raw={}) {
  if(!raw || typeof raw!=='object')raw={};
  const p={...DEFAULTS,customLines:cleanLines(raw.customLines)};
  for(const key of ['enabled','quickDock','reducedMotion','positionLocked','builtins','danceEnabled'])if(typeof raw[key]==='boolean')p[key]=raw[key];
  p.name=typeof raw.name==='string' && raw.name.trim()?raw.name.trim().slice(0,20):DEFAULTS.name;
  p.theme=['lilac','peach','night'].includes(raw.theme)?raw.theme:DEFAULTS.theme;
  p.quoteGroup=['all','meme','sweet','work'].includes(raw.quoteGroup)?raw.quoteGroup:'all';
  p.opacity=bound(raw.opacity,.4,1,1);
  p.focusMinutes=Math.round(bound(raw.focusMinutes,5,120,25));
  p.breakMinutes=Math.round(bound(raw.breakMinutes,1,30,5));
  return p;
}
function quotePool(preferences,legacy=[]) {
  const p=normalizePreferences(preferences);
  const builtinTexts=new Set(BUILTIN_QUOTES.map(q=>q.text));
  builtinTexts.add('5小时和每周额度都盯紧啦，\n今天也放心提问吧。');
  const oldCustom=Array.isArray(legacy)?legacy.filter(q=>q && typeof q.text==='string' && !builtinTexts.has(q.text)).map(q=>q.text):[];
  const custom=cleanLines([...p.customLines,...oldCustom]).map(text=>({group:'custom',text,weight:1}));
  const builtin=p.builtins?BUILTIN_QUOTES.filter(q=>p.quoteGroup==='all'||q.group===p.quoteGroup):[];
  return [...new Map([...builtin,...custom].map(q=>[q.text,q])).values()];
}
function pickQuote(pool,lastText='',random=Math.random) {
  const available=pool.length>1?pool.filter(q=>q.text!==lastText):pool;
  return available[Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)))] || {group:'custom',text:'喵～\n在台词模块写一句专属问候吧。'};
}
function idleTimer(){return {status:'idle',phase:'focus',durationMs:0,remainingMs:0,deadline:null};}
function normalizeState(raw={},now=Date.now()) {
  if(!raw||typeof raw!=='object')raw={};
  const counts={};for(const k of ['pet','feed','play'])counts[k]=Math.floor(bound(raw.counts?.[k],0,1000000,0));
  const lastActionAt={};for(const k of ['pet','feed','play'])lastActionAt[k]=bound(raw.lastActionAt?.[k],0,now,0);
  let timer=idleTimer();
  const t=raw.timer;
  if(t && ['running','paused','done'].includes(t.status) && Number.isFinite(t.durationMs) && t.durationMs>=60000 && t.durationMs<=7200000) {
    timer={status:t.status,phase:t.phase==='break'?'break':'focus',durationMs:t.durationMs,remainingMs:bound(t.remainingMs,0,t.durationMs,t.durationMs),deadline:null};
    if(t.status==='running') {
      if(typeof t.deadline==='number' && Number.isFinite(t.deadline) && t.deadline>0 && t.deadline<=now+7200000)timer.deadline=t.deadline;
      else timer=idleTimer();
    }
  }
  return {affection:Math.floor(bound(raw.affection,0,100,30)),counts,lastActionAt,sleeping:raw.sleeping===true,focusCompleted:Math.floor(bound(raw.focusCompleted,0,1000000,0)),timer,reward:dance.normalizeReward(raw.reward,now)};
}
const actionRules = new Map([
  ['pet', { cooldownMs: 2000, gain: 2 }],
  ['feed', { cooldownMs: 30000, gain: 5 }],
  ['play', { cooldownMs: 8000, gain: 3 }]
]);

function actionCooldown(state, action, now = Date.now()) {
  const rule = actionRules.get(action);
  const last = state.lastActionAt[action];
  return rule && last > 0 ? Math.max(0, last + rule.cooldownMs - now) : 0;
}

function interact(state,action,now=Date.now()) {
  const next=normalizeState(state,now);
  if(next.reward.run)return {accepted:false,state:next,retryAfterMs:Math.max(0,next.reward.run.startedAt+next.reward.run.durationMs-now)};
  if(action==='sleep'){next.sleeping=!next.sleeping;return {accepted:true,state:next,retryAfterMs:0};}
  const rule = actionRules.get(action);
  if (!rule) return {accepted:false,state:next,retryAfterMs:0};
  const remaining = actionCooldown(next, action, now);
  if(remaining>0)return {accepted:false,state:next,retryAfterMs:remaining};
  next.lastActionAt[action]=now;
  next.counts[action]=Math.min(1000000,next.counts[action]+1);
  next.affection=Math.min(100,next.affection+rule.gain);
  next.sleeping=false;
  return {accepted:true,state:next,retryAfterMs:0};
}
function startTimer(state,phase,minutes,now=Date.now()) {
  const next=normalizeState(state,now);
  const kind=phase==='break'?'break':'focus';
  const durationMs=Math.round(bound(minutes,kind==='break'?1:5,kind==='break'?30:120,kind==='break'?5:25))*60000;
  next.timer={status:'running',phase:kind,durationMs,remainingMs:durationMs,deadline:now+durationMs};
  return next;
}
function tickTimer(state,now=Date.now()) {
  const next=normalizeState(state,now);
  const t=next.timer;
  let completed=false;
  if(t.status==='running') {
    t.remainingMs=Math.max(0,t.deadline-now);
    if(t.remainingMs===0){t.status='done';t.deadline=null;completed=true;if(t.phase==='focus')next.focusCompleted=Math.min(1000000,next.focusCompleted+1);}
  }
  return {state:next,completed};
}
function pauseTimer(state,now=Date.now()) {
  const next=tickTimer(state,now).state;
  if(next.timer.status==='running'){next.timer.status='paused';next.timer.deadline=null;}
  return next;
}
function resumeTimer(state,now=Date.now()) {
  const next=normalizeState(state,now);
  if(next.timer.status==='paused'){next.timer.status='running';next.timer.deadline=now+next.timer.remainingMs;}
  return next;
}
function exportPreferences(p){return JSON.stringify({format:'gemini-companion-settings',version:1,preferences:normalizePreferences(p)},null,2);}
function importPreferences(text) {
  if(typeof text!=='string'||text.length>262144)throw Error('设置文件过大，最多支持 256 KB。');
  let value;try{value=JSON.parse(text);}catch{throw Error('文件不是有效的 JSON 设置。');}
  if(value?.format!=='gemini-companion-settings'||value.version!==1||!value.preferences||typeof value.preferences!=='object')throw Error('不是受支持的猫猫设置文件。');
  return normalizePreferences(value.preferences);
}
module.exports={BUILTIN_QUOTES,DEFAULTS,normalizePreferences,quotePool,pickQuote,normalizeState,actionCooldown,interact,startTimer,tickTimer,pauseTimer,resumeTimer,exportPreferences,importPreferences};
