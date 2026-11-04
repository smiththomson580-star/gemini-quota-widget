'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const t=require('../src/touch-reactions.cjs');

test('the fifth completed tap within two seconds hisses once',()=>{
  let state=t.empty();
  for(const at of [1000,1250,1500,1750]){const r=t.tap(state,at);assert.equal(r.hiss,false);state=r.state;}
  const before=JSON.stringify(state);
  const r=t.tap(state,2000);
  assert.equal(r.hiss,true);
  assert.equal(r.state.hissUntil,4400);
  assert.equal(r.state.cooldownUntil,10000);
  assert.equal(JSON.stringify(state),before,'the transition must not mutate its caller');
});
test('slow taps and interrupted sequences do not accumulate into a hiss',()=>{
  let state=t.empty();
  for(const at of [1000,2100,3200,4300,5400]){const r=t.tap(state,at);assert.equal(r.hiss,false);state=r.state;}
  state=t.empty();
  for(const at of [10000,10100,10200,10300])state=t.tap(state,at).state;
  state=t.interrupt(state);
  assert.equal(t.tap(state,10400).hiss,false);
});
test('cooldown suppresses repeated hisses and expires without a stored backlog',()=>{
  let state=t.empty();
  for(const at of [1000,1100,1200,1300,1400])state=t.tap(state,at).state;
  for(let at=1500;at<9400;at+=100){const r=t.tap(state,at);assert.equal(r.hiss,false);state=r.state;}
  for(const at of [9400,9500,9600,9700]){const r=t.tap(state,at);assert.equal(r.hiss,false);state=r.state;}
  assert.equal(t.tap(state,9800).hiss,true);
});
test('calming clears an active reaction while retaining a quiet cooldown',()=>{
  let state=t.empty();for(const at of [1000,1100,1200,1300,1400])state=t.tap(state,at).state;
  const calm=t.calm(state);
  assert.equal(calm.hissUntil,0);
  assert.equal(calm.cooldownUntil,9400);
  assert.deepEqual(calm.taps,[]);
});
