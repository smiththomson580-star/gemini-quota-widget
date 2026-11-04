'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const {window,document}=parseHTML('<!doctype html><html><head></head><body></body></html>');
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(value){for(const option of this.querySelectorAll('option'))option.toggleAttribute('selected',option.value===String(value));}});
Object.defineProperty(window.Element.prototype,'innerHTML',{configurable:true,get(){return '';},set(){throw Error('Raw HTML sink blocked');}});
window.Element.prototype.getBoundingClientRect=()=>({left:800,top:400,right:1000,bottom:700,width:200,height:300});
window.Element.prototype.setPointerCapture=()=>{};
window.Element.prototype.focus=function(){this.focused=true;};
const storage=new Map();
let rejectWrites=false;
storage.set('gfw_config_v4_realtime',JSON.stringify({scale:1.2,randomLines:[{text:'我的旧台词'}]}));
const context=vm.createContext({window,document,console,URL,performance,Event:window.Event,CustomEvent:window.CustomEvent,
  innerWidth:1200,innerHeight:900,MutationObserver:window.MutationObserver,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(rejectWrites)throw Error('QuotaExceededError');storage.set(k,v);}},
  requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{}
});
Object.assign(window,{innerWidth:1200,innerHeight:900});
let soundedNotes=0;
const parameter={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
window.AudioContext=class {constructor(){this.currentTime=0;this.state='running';this.destination={};}createOscillator(){return {frequency:parameter,connect(){},start(){soundedNotes++;},stop(){}};}createGain(){return {gain:parameter,connect(){}};}};
vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),context);
const menu=document.querySelector('#gfw-menu');
assert.equal(menu.querySelectorAll('[role="tab"]').length,6,'settings must have six real modules');
assert.equal(menu.querySelector('#gfw-turn-alert-on').parentElement.textContent.trim(),'互动 / 计时完成提示','the reminder label must appear only once');
assert.ok(window.GeminiFoxWidget.companion,'companion API must be mounted');
assert.equal(window.GeminiFoxWidget.getConfig().scale,1.2,'legacy scale survives');
const click=el=>{assert.ok(el,'control exists');el.dispatchEvent(new window.Event('click',{bubbles:true}));};
click(menu.querySelector('[data-cp-action="feed"]'));
assert.equal(window.GeminiFoxWidget.companion.getState().counts.feed,1);
click(menu.querySelector('[data-cp-action="feed"]'));
assert.equal(window.GeminiFoxWidget.companion.getState().counts.feed,1,'rapid repeat respects cooldown');
assert.equal(window.GeminiFoxWidget.getMetrics().leftWeekPct,null,'playing never fabricates official quota');

const textarea=menu.querySelector('#gfw-custom-lines');
textarea.value='<img src=x onerror=alert(1)> 喵';
menu.querySelector('#gfw-builtins').checked=false;
click(menu.querySelector('[data-cp-command="save-quotes"]'));
window.GeminiFoxWidget.getConfig().randomLines=[];
click(menu.querySelector('[data-cp-command="quote"]'));
const text=document.querySelector('#gfw-text');
assert.ok(text.textContent.includes('<img src=x onerror=alert(1)> 喵'));
assert.equal(text.querySelector('img'),null,'custom dialogue is text rather than markup');
window.GeminiFoxWidget.openQuotaBubble();
assert.ok(text.textContent.includes('5 小时'));
assert.ok(text.textContent.includes('每周'));
click(menu.querySelector('[data-cp-command="focus-start"]'));
assert.equal(window.GeminiFoxWidget.companion.getState().timer.status,'running');
click(menu.querySelector('[data-cp-command="timer-pause"]'));
assert.equal(window.GeminiFoxWidget.companion.getState().timer.status,'paused');
assert.ok(storage.has('gfw_companion_state_v1'),'companion state persists locally');
window.GeminiFoxWidget.openMenu();
const escape=new window.Event('keydown');escape.key='Escape';document.dispatchEvent(escape);
assert.equal(menu.classList.contains('gfw-show'),false,'Escape closes settings');
assert.ok(document.querySelector('#gfw-companion-dock'));
vm.runInContext('Math.random=()=>0',context);
window.GeminiFoxWidget.getConfig().companion.builtins=true;
window.GeminiFoxWidget.getConfig().companion.customLines=[];
click(menu.querySelector('[data-cp-command="quote"]'));
const previousQuote=text.textContent;
window.GeminiFoxWidget.openQuotaBubble();window.GeminiFoxWidget.showNextQuote();
assert.notEqual(text.textContent,previousQuote,'switching from panel quotes to bubble quotes must avoid an immediate repeat');
const bubbleQuote=text.textContent;
click(menu.querySelector('[data-cp-command="quote"]'));
assert.notEqual(text.textContent,bubbleQuote,'repeat avoidance is shared in both directions');
window.GeminiFoxWidget.getConfig().soundOn=false;
window.GeminiFoxWidget.getConfig().turnAlertOn=true;
const finishing=window.GeminiFoxWidget.companion.getState();
finishing.timer={status:'running',phase:'focus',durationMs:60000,remainingMs:1,deadline:Date.now()-1};
storage.set('gfw_companion_state_v1',JSON.stringify(finishing));
soundedNotes=0;
window.GeminiFoxWidget.companion.tick();
assert.ok(soundedNotes>0,'disabling press sounds must not disable the independently enabled timer reminder');
const beforeStorageFailure=window.GeminiFoxWidget.companion.getState().counts.pet;
rejectWrites=true;
window.GeminiFoxWidget.companion.action('pet');
assert.equal(window.GeminiFoxWidget.companion.getState().counts.pet,beforeStorageFailure+1,'a full local store must not discard this session\'s accepted interactions');
assert.ok(document.querySelector('#gfw-companion-message').textContent.includes('未保存'));
const mount=require('./renderer-harness.cjs');
const built=fs.readFileSync(process.argv[2],'utf8');
{
  const h=mount(built);
  const feed='[data-cp-dock-action="feed"]';
  h.click(feed);
  const badge=h.document.querySelector(feed+' .cp-dock-cooldown');
  const hint=h.document.querySelector('[data-cp-action="feed"] small');
  assert.ok(badge && !badge.hidden,'the dock shows a cooldown even with settings closed');
  assert.equal(badge.textContent,'30');
  assert.match(hint.textContent,/30 秒/);
  h.advance(10000);
  h.api.companion.tick();
  assert.equal(badge.textContent,'20');
  h.click(feed);
  assert.equal(h.api.companion.getState().counts.feed,1);
  h.advance(20000);
  h.api.companion.tick();
  assert.equal(badge.hidden,true);
  h.click(feed);
  assert.equal(h.api.companion.getState().counts.feed,2);
}
{
  const h=mount(built,{config:{turnAutoCloseSec:0}});
  assert.equal(h.document.querySelector('#gfw-val-5h').classList.contains('gfw-warn'),false);
  h.change('#gfw-warn-pct',50);
  assert.equal(h.document.querySelector('#gfw-val-5h').classList.contains('gfw-warn'),true,'saved threshold controls the visible warning');
  assert.equal(h.document.querySelector('#gfw-val-week').classList.contains('gfw-warn'),false);
  const row=h.document.querySelector('#gfw-val-5h');
  const refresh=()=>h.window.dispatchEvent(new h.window.Event('gfw-official-quota'));
  refresh();
  assert.equal(h.document.querySelector('#gfw-val-5h'),row,'identical samples do not redraw the quota bubble');
  h.advance(90000);
  refresh();
  h.api.companion.tick();
  assert.match(h.document.querySelector('.gfw-min-hdr').textContent,/已过期/);
  assert.equal(h.document.querySelector('#gfw-val-5h').textContent,'—');
  assert.match(h.document.querySelector('#gfw-status-freshness').textContent,/已过期/);
  h.window.__gfwOfficialQuota={
    updatedAt:h.now(),fiveHour:{remainingPct:0,resetText:'<b>明天</b>'},
    week:{remainingPct:73.25,resetText:'下周'}
  };
  refresh();
  assert.equal(h.document.querySelector('#gfw-val-5h').textContent,'0%');
  assert.equal(h.document.querySelector('#gfw-val-week').textContent,'73.25%');
  assert.equal(h.document.querySelector('.gfw-min-reset').textContent,'重置：<b>明天</b>');
  h.window.__gfwOfficialQuota.week.remainingPct=101;
  refresh();
  assert.equal(h.document.querySelector('#gfw-val-week').textContent,'—');
  assert.match(h.document.querySelector('.gfw-min-hdr').textContent,/等待同步/);
}
{
  const h=mount(built);
  const root=h.document.querySelector('#gemini-fox-widget-root');
  const cat=h.document.querySelector('#gfw-img-wrap');
  const dock=h.document.querySelector('#gfw-companion-dock');
  h.window.innerWidth=360;
  h.window.innerHeight=480;
  root.getBoundingClientRect=()=>({left:32,right:326,top:128,bottom:470,width:294,height:342});
  cat.getBoundingClientRect=()=>({left:100,right:260,top:300,bottom:470,width:160,height:170});
  h.api.companion.tick();
  assert.ok(parseFloat(dock.style.top)+44<=128,'when neither side fits, the dock clears the cat and its bubble');
}
console.log('PASS: companion controls, cooldown feedback, quota validity and warning, narrow dock, persistence and keyboard close.');
