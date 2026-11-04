'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const built=fs.readFileSync(process.argv[2],'utf8');
function mount(){
  const {window,document}=parseHTML('<!doctype html><html><head></head><body></body></html>');
  // linkedom's window proxy shares custom global properties between documents.
  // A real fresh renderer has neither singleton flag nor previous public API.
  delete window.__geminiFoxWidgetLoaded;delete window.GeminiFoxWidget;
  Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.value===String(v));}});
  Object.defineProperty(window.Element.prototype,'innerHTML',{configurable:true,get(){return '';},set(){throw Error('Unsafe HTML sink');}});
  window.Element.prototype.getBoundingClientRect=()=>({left:800,top:400,right:1000,bottom:700,width:200,height:300});
  window.Element.prototype.setPointerCapture=()=>{};
  window.Element.prototype.focus=()=>{};
  let time=0,serial=0,hissSounds=0;
  const timers=new Map(),storage=new Map();
  const origin=1800000000000;
  class Clock extends Date{static now(){return origin+time;}}
  const schedule=(fn,ms=0)=>{const id=++serial;timers.set(id,{at:time+ms,fn});return id;};
  function advance(ms){const end=time+ms;for(let guard=0;guard<1000;guard++){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].fn();}time=end;}
  const parameter={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},value:0};
  window.AudioContext=class{constructor(){this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination={};}createOscillator(){return {frequency:parameter,connect(){},disconnect(){},start(){},stop(){}};}createGain(){return {gain:parameter,connect(){},disconnect(){}};}createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData(){return data;}};}createBufferSource(){return {connect(){},disconnect(){},start(){hissSounds++;},stop(){}};}createBiquadFilter(){return {frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};}};
  Object.assign(window,{innerWidth:1200,innerHeight:900,__gfwOfficialQuota:{updatedAt:origin,fiveHour:{remainingPct:42,resetText:'later'},week:{remainingPct:73,resetText:'later'}}});
  const context=vm.createContext({window,document,Date:Clock,console,URL,performance:{now:()=>time},Event:window.Event,CustomEvent:window.CustomEvent,innerWidth:1200,innerHeight:900,MutationObserver:window.MutationObserver,
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout:schedule,clearTimeout:id=>timers.delete(id),setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});
  vm.runInContext(built,context);advance(200);
  const api=window.GeminiFoxWidget;
  const wrap=document.querySelector('#gfw-img-wrap'),root=document.querySelector('#gemini-fox-widget-root');
  function pointer(type,x=900,y=500,button=0){const e=new window.Event(type,{bubbles:true});Object.assign(e,{pointerId:1,pointerType:'mouse',button,clientX:x,clientY:y,isPrimary:true});wrap.dispatchEvent(e);}
  function tap(){pointer('pointerdown');pointer('pointerup');advance(100);}
  function click(selector){document.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true}));}
  return {api,root,wrap,document,window,advance,pointer,tap,click,sounds:()=>hissSounds};
}
{
  const h=mount();const before=h.api.companion.getState().affection;
  h.tap();assert.ok(h.document.querySelector('#gfw-text').textContent.includes('5 小时'),'ordinary tap still opens quota');
  for(let n=0;n<3;n++)h.tap();assert.equal(h.root.classList.contains('cp-hissing'),false);
  h.tap();assert.equal(h.root.classList.contains('cp-hissing'),true,'the fifth rapid character tap must hiss');
  assert.ok(h.document.querySelector('#gfw-text').textContent.includes('哈'));
  assert.equal(h.sounds(),1);
  for(let n=0;n<8;n++)h.tap();assert.equal(h.sounds(),1,'no hiss flooding during cooldown');
  assert.equal(h.api.companion.getState().affection,before,'hissing has no affection penalty');
  assert.equal(h.api.getMetrics().left5hPct,42);assert.equal(h.api.getMetrics().leftWeekPct,73);
  h.api.companion.action('feed');assert.equal(h.root.classList.contains('cp-hissing'),false,'an accepted treat calms the character');
  assert.equal(h.api.companion.getState().counts.feed,1);
}
for(const kind of ['drag','locked-drag','cancel','contextmenu','longpress']){
  const h=mount();for(let i=0;i<4;i++)h.tap();
  if(kind==='contextmenu')h.pointer('contextmenu',900,500,2);
  else {h.pointer('pointerdown');if(kind==='drag'||kind==='locked-drag'){h.api.getConfig().companion.positionLocked=kind==='locked-drag';h.pointer('pointermove',930,500);h.pointer('pointerup',930,500);}
    else if(kind==='cancel')h.pointer('pointercancel');else{h.advance(1400);h.pointer('pointerup');}}
  h.tap();assert.equal(h.root.classList.contains('cp-hissing'),false,kind+' must break the tap sequence');
}
{
  const h=mount();h.api.getConfig().companion.enabled=false;for(let n=0;n<7;n++)h.tap();
  assert.equal(h.root.classList.contains('cp-hissing'),false,'disabled fun means no hidden reactions');assert.equal(h.sounds(),0);
}
{
  const h=mount();h.api.getConfig().soundOn=false;for(let n=0;n<5;n++)h.tap();
  assert.equal(h.root.classList.contains('cp-hissing'),true);assert.equal(h.sounds(),0,'muted press sounds also mute hissing');
  h.advance(2500);assert.equal(h.root.classList.contains('cp-hissing'),false,'transient state clears itself');
  assert.equal(h.document.querySelector('#gfw-bubble').classList.contains('gfw-open'),false,'hiss bubble does not remain open');
}
{
  const h=mount();h.api.companion.action('sleep');h.tap();
  assert.equal(h.api.companion.getState().sleeping,false,'a gentle tap wakes a sleeping cat');
  assert.equal(h.root.classList.contains('cp-waking'),true);
  assert.ok(h.document.querySelector('#gfw-text').textContent.includes('5 小时'),'waking preserves quota access');
  h.advance(1000);assert.equal(h.root.classList.contains('cp-waking'),false);
}
{
  const h=mount();h.api.companion.action('pet');
  function enter(repeat=false){const e=new h.window.Event('keydown',{bubbles:true});e.key='Enter';e.repeat=repeat;h.wrap.dispatchEvent(e);h.advance(100);}
  enter();assert.ok(h.document.querySelector('#gfw-text').textContent.includes('5 小时'),'keyboard quota access must not be trapped behind an open quote');
  for(let n=0;n<6;n++)enter(true);
  assert.equal(h.root.classList.contains('cp-hissing'),false,'holding a key is not repeated deliberate taps');
  for(let n=0;n<4;n++)enter();
  assert.equal(h.root.classList.contains('cp-hissing'),true,'keyboard deliberate taps can use the same hidden interaction');
}
console.log('PASS: physical tap counting, gesture exclusions, no extra controls, calm/wake, sound gating and quota independence.');
