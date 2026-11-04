'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const vm=require('node:vm');
const path=require('node:path');
const {buildSync}=require('esbuild');
const {parseHTML}=require('linkedom');
const companion=require('../src/companion-model.cjs');
const root=path.resolve(__dirname,'..');
const source=buildSync({entryPoints:[path.join(root,'src/dance.mjs')],bundle:true,platform:'browser',format:'iife',globalName:'Dance',loader:{'.webp':'dataurl'},write:false}).outputFiles[0].text;
const domSource=buildSync({entryPoints:[path.join(root,'src/dom-builder.mjs')],bundle:true,platform:'browser',format:'iife',globalName:'Dom',write:false}).outputFiles[0].text;
const origin=1800000000000;
function manager(){let held=false;return {request(name,options,callback){if(held)return Promise.resolve(callback(null));held=true;try{return Promise.resolve(callback({name})).finally(()=>{held=false;});}catch(error){held=false;return Promise.reject(error);}}};}
function fixture(shared,locks,clock,prefs=companion.normalizePreferences({})){
  const {document}=parseHTML('<!doctype html><html><head></head><body><div id="root"><div id="gfw-img-wrap"></div></div></body></html>');
  const element=document.querySelector('#root');element.firstChild.getBoundingClientRect=()=>({left:800,right:1000,top:400,bottom:700});
  let onRead=null,writes=0;
  const readState=()=>{const snapshot=companion.normalizeState(JSON.parse(JSON.stringify(shared.state)),clock.now);if(onRead){const fn=onRead;onRead=null;fn();}return snapshot;};
  const writeState=s=>{writes++;shared.state=JSON.parse(JSON.stringify(s));};
  const timers=new Map();let id=0;
  const window={navigator:{locks},innerWidth:1200,innerHeight:900,addEventListener(){}};
  class Clock extends Date{static now(){return clock.now;}}
  const context=vm.createContext({window,document,Date:Clock,console,setTimeout:(fn,ms)=>{const token=++id;timers.set(token,{fn,ms});return token;},clearTimeout:i=>timers.delete(i)});
  vm.runInContext(domSource+'\n'+source,context);
  const dance=context.Dance.createDance({root:element,dom:context.Dom,readState,writeState,preferences:()=>prefs,reduced:()=>false,notify(){},openMenu(){},showQuota(){}});
  return {dance,document,prefs,get writes(){return writes;},readOnce:fn=>{onRead=fn;},load:()=>document.querySelector('#gfw-dance-atlas').dispatchEvent(new document.defaultView.Event('load'))};
}
for(const key of ['danceEnabled','enabled'])test('reload can immediately disable '+key,async()=>{
    const clock={now:origin};const shared={state:companion.normalizeState({affection:100,reward:{completed:2,run:{token:'previous-window',startedAt:origin-2000,durationMs:12000}}},origin)};
    const h=fixture(shared,manager(),clock);h.prefs[key]=false;h.dance.synchronize();await Promise.resolve();await Promise.resolve();
    assert.equal(shared.state.affection,80,'disabling '+key+' settles a reloaded running reward immediately');
    assert.equal(shared.state.reward.completed,3);assert.equal(shared.state.reward.run,null);
});
test('observer holds off expiry under owner lock and preserves a newly started timer',async()=>{
    const clock={now:origin},shared={state:companion.normalizeState({affection:100},origin)},locks=manager();
    const owner=fixture(shared,locks,clock);owner.load();assert.ok(shared.state.reward.run);
    const observer=fixture(shared,locks,clock);observer.load();
    clock.now+=12001; // Owner timers are temporarily throttled; its Web Lock is still held.
    observer.readOnce(()=>{shared.state=companion.startTimer(shared.state,'focus',5,clock.now);});
    observer.dance.synchronize();await Promise.resolve();await Promise.resolve();
    assert.equal(shared.state.timer.status,'running','observer expiry cannot overwrite a just-started owner timer');
    assert.equal(observer.writes,0,'a lock observer cannot settle while the owner still holds its lock');
    owner.dance.synchronize();
    assert.equal(shared.state.affection,80);assert.equal(shared.state.timer.status,'running');assert.equal(shared.state.reward.completed,1);
});
test('unowned expired reward recovers once under a free lock',async()=>{
    const clock={now:origin},shared={state:companion.normalizeState({affection:100,reward:{completed:0,run:{token:'gone',startedAt:origin-13000,durationMs:12000}}},origin)};
    const h=fixture(shared,manager(),clock);h.dance.synchronize();await Promise.resolve();await Promise.resolve();
    assert.equal(shared.state.affection,80,'unowned expired reward can be recovered under a free lock');
    assert.equal(shared.state.reward.completed,1);
});
