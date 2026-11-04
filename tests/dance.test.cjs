'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../src/companion-model.cjs');
const d=require('../src/dance-model.cjs');

test('100 affection earns one tokenized dance, finishes at 80 and can be earned again',()=>{
  const base=m.normalizeState({affection:95},100000);
  assert.equal(d.beginDance(base,'a',100000).accepted,false);
  const fed=m.interact(base,'feed',100000).state;
  const first=d.beginDance(fed,'a',100000);
  assert.equal(first.accepted,true);assert.equal(first.state.affection,100);
  assert.equal(d.beginDance(first.state,'b',100100).accepted,false);
  assert.equal(d.finishDance(first.state,'wrong').completed,false);
  const done=d.finishDance(first.state,'a');
  assert.equal(done.completed,true);assert.equal(done.state.affection,80);
  assert.equal(done.state.reward.completed,1);assert.equal(done.state.reward.run,null);
  assert.equal(d.finishDance(done.state,'a').completed,false);
  let state=done.state;for(let i=0;i<10;i++)state=m.interact(state,'pet',102000+i*2000).state;
  assert.equal(state.affection,100);
  assert.equal(d.beginDance(state,'b',125000).accepted,true);
  assert.equal(base.affection,95,'pure transitions');
});

test('saved running reward survives all timer transitions and expires once after reload',()=>{
  let s=d.beginDance(m.normalizeState({affection:100},100000),'reload',100000).state;
  s=m.startTimer(s,'focus',5,100100);s=m.pauseTimer(s,100200);s=m.resumeTimer(s,100300);
  s=m.normalizeState(JSON.parse(JSON.stringify(s)),105000);
  assert.equal(s.reward.run.token,'reload');
  assert.equal(d.settleDance(s,111999).completed,false);
  const done=d.settleDance(s,112000);
  assert.equal(done.completed,true);assert.equal(done.state.affection,80);
  assert.equal(done.state.timer.status,'running');
  assert.equal(d.settleDance(done.state,999999).completed,false);
});

test('interactions are not consumed during dance and quota never enters reward state',()=>{
  const s=d.beginDance(m.normalizeState({affection:100,sleeping:true},100000),'busy',100000).state;
  assert.equal(s.sleeping,false);
  for(const action of ['pet','feed','play','sleep']){
    const r=m.interact(s,action,101000);assert.equal(r.accepted,false);
    assert.equal(r.state.affection,100);assert.deepEqual(r.state.counts,s.counts);
  }
  assert.equal(Object.hasOwn(s,'quota'),false);
});

test('old and malformed saves are bounded; dance preference is whitelisted',()=>{
  assert.deepEqual(m.normalizeState({affection:100},100000).reward,{completed:0,run:null});
  assert.deepEqual(d.normalizeReward({completed:-5,run:{token:'x',startedAt:'bad',durationMs:12000}},100000),{completed:0,run:null});
  assert.equal(d.beginDance(m.normalizeState({affection:100},100000),'',100000).accepted,false);
  assert.equal(m.normalizePreferences({}).danceEnabled,true);
  assert.equal(m.normalizePreferences({danceEnabled:false}).danceEnabled,false);
  const p=m.importPreferences(m.exportPreferences({danceEnabled:false}));assert.equal(p.danceEnabled,false);
});
