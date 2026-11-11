'use strict';
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
module.exports=function mount(built,{state={},config={},hidden=false,imageReady=false,random=Math.random,updateState}={}){
  const {window,document}=parseHTML('<!doctype html><html><head></head><body></body></html>');
  delete window.__geminiFoxWidgetLoaded;delete window.GeminiFoxWidget;
  delete window.__gfwUpdateState;
  if(updateState)window.__gfwUpdateState=updateState;
  Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.value===String(v));}});
  Object.defineProperty(window.Element.prototype,'innerHTML',{configurable:true,get(){return '';},set(){throw Error('Unsafe HTML sink');}});
  window.Element.prototype.getBoundingClientRect=()=>({left:800,top:400,right:1000,bottom:700,width:200,height:300});
  window.Element.prototype.setPointerCapture=()=>{};window.Element.prototype.focus=()=>{};
  let time=0,serial=0;const timers=new Map(),origin=1800000000000;
  const storage=new Map([['gfw_companion_state_v1',JSON.stringify(state)],['gfw_config_v4_realtime',JSON.stringify(config)]]);
  class Clock extends Date{static now(){return origin+time;}}
  const schedule=(fn,ms=0)=>{const id=++serial;timers.set(id,{at:time+ms,fn});return id;};
  function advance(ms){const end=time+ms;for(let guard=0;guard<5000;guard++){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].fn();}time=end;}
  Object.assign(window,{innerWidth:1200,innerHeight:900,__gfwOfficialQuota:{updatedAt:origin,fiveHour:{remainingPct:42,resetText:'later'},week:{remainingPct:73,resetText:'later'}}});
  document.hidden=hidden;
  const math=Object.create(Math);math.random=random;
  const context=vm.createContext({window,document,Date:Clock,Math:math,console,URL,performance:{now:()=>time},Event:window.Event,CustomEvent:window.CustomEvent,innerWidth:1200,innerHeight:900,MutationObserver:window.MutationObserver,
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout:schedule,clearTimeout:id=>timers.delete(id),setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});
  vm.runInContext(built,context);
  if(imageReady)document.querySelector('#gfw-dance-atlas').dispatchEvent(new window.Event('load'));
  advance(200);
  const api=window.GeminiFoxWidget;
  const click=selector=>document.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true}));
  function change(selector,value){const e=document.querySelector(selector);if(typeof value==='boolean')e.checked=value;else e.value=value;e.dispatchEvent(new window.Event('change',{bubbles:true}));}
  const imageEvent=type=>document.querySelector('#gfw-dance-atlas').dispatchEvent(new window.Event(type));
  return {window,document,api,advance,click,change,imageEvent,storage,origin,now:()=>origin+time};
};
