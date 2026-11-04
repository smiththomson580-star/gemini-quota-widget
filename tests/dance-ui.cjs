'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const mount=require('./renderer-harness.cjs');
const built=fs.readFileSync(process.argv[2],'utf8');
const start=h=>{h.imageEvent('load');h.api.companion.action('feed');h.advance(100);};
{
  const h=mount(built,{state:{affection:100},imageReady:true});
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,false);
  assert.equal(h.document.querySelector('#gfw-dance-bubble')?.textContent,'柔情猫娘来啦！','transformation announces the requested greeting');
  assert.equal(h.document.querySelector('#gfw-bubble').classList.contains('gfw-open'),false,'startup quota must not cover an already-started reward');
}
{
  const h=mount(built,{state:{affection:95},config:{customImg:'data:image/png;base64,custom'}});
  const original=h.document.querySelector('#gfw-img').src;
  start(h);
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,false);
  assert.equal(h.api.companion.getState().affection,100);
  assert.ok(h.api.companion.getState().reward.run);
  assert.equal(h.document.querySelector('#gfw-dance-bubble').hidden,false);
  h.click('#gfw-dance-stage .cp-dance-actor');
  assert.equal(h.document.querySelector('#gfw-dance-bubble').hidden,true,'explicit quota access dismisses the greeting');
  assert.ok(h.document.querySelector('#gfw-text').textContent.includes('5 小时'));
  assert.equal(h.api.companion.action('pet'),false,'dance cannot consume interactions');
  h.api.companion.tick();assert.equal(h.document.querySelectorAll('#gfw-dance-stage').length,1);
  h.advance(6000);h.api.companion.tick();assert.equal(h.api.companion.getState().affection,100,'an ordinary refresh cannot end the dance early');
  h.advance(6100);h.api.companion.tick();
  assert.equal(h.api.companion.getState().affection,80);
  assert.equal(h.api.companion.getState().reward.completed,1);
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,true);
  assert.equal(h.document.querySelector('#gfw-img').src,original,'custom image is not replaced by reward');
  assert.equal(h.api.getMetrics().left5hPct,42);assert.equal(h.api.getMetrics().leftWeekPct,73);
  for(let i=0;i<10;i++){h.advance(2100);h.api.companion.action('pet');}h.advance(100);
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,false,'second full affection triggers again');
  assert.equal(h.document.querySelector('#gfw-dance-bubble').hidden,false,'each new transformation announces again');
  h.click('#gfw-dance-skip');assert.equal(h.api.companion.getState().affection,80);
  h.advance(13000);assert.equal(h.api.companion.getState().reward.completed,2,'old callback cannot finish twice');
}
{
  const h=mount(built,{state:{affection:100},config:{companion:{danceEnabled:false}}});h.imageEvent('load');h.api.companion.tick();
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,true);
  h.change('#gfw-dance-enabled',true);h.advance(100);
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,false,'enable an already-full save');
  h.change('#gfw-fun-enabled',false);assert.equal(h.api.companion.getState().affection,80);
}
{
  const h=mount(built,{state:{affection:100}});h.imageEvent('error');h.api.companion.tick();
  assert.equal(h.api.companion.getState().affection,100,'failed artwork is not a reward');
  assert.equal(h.api.companion.getState().reward.run,null);
  assert.ok(h.document.querySelector('#gfw-dance-status').textContent.includes('加载失败'),'failed artwork is actionable in settings');
  h.change('#gfw-dance-enabled',false);h.change('#gfw-dance-enabled',true);h.imageEvent('load');h.advance(100);
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,false,'setting allows image retry');
}
{
  const h=mount(built,{state:{affection:100},config:{companion:{reducedMotion:true}}});h.imageEvent('load');h.advance(100);
  assert.equal(h.document.querySelector('#gfw-dance-stage').classList.contains('cp-dance-reduced'),true);
  h.advance(2300);assert.equal(h.api.companion.getState().affection,80);
}
{
  const h=mount(built,{state:{affection:100},hidden:true});h.imageEvent('load');h.advance(100);
  assert.equal(h.api.companion.getState().reward.run,null,'background page does not spend reward');
  h.document.hidden=false;h.api.companion.tick();h.advance(100);assert.ok(h.api.companion.getState().reward.run);
  const e=new h.window.Event('keydown',{bubbles:true});e.key='Escape';h.document.dispatchEvent(e);
  assert.equal(h.api.companion.getState().affection,80,'keyboard can end this reward');
}
{
  const origin=1800000000000;
  const h=mount(built,{state:{affection:100,reward:{completed:3,run:{token:'closed-renderer',startedAt:origin-13000,durationMs:12000}}}});
  assert.equal(h.api.companion.getState().affection,80,'an expired saved dance settles on reload');
  assert.equal(h.api.companion.getState().reward.completed,4);
  h.imageEvent('load');h.advance(13000);h.api.companion.tick();
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,true,'settled save does not replay');
}
{
  const h=mount(built,{state:{affection:100}});h.imageEvent('load');h.advance(100);h.imageEvent('error');
  assert.equal(h.api.companion.getState().affection,100,'a decode failure during reward also preserves affection');
  assert.equal(h.api.companion.getState().reward.run,null);
  assert.equal(h.document.querySelector('#gfw-dance-stage').hidden,true);
  h.advance(13000);assert.equal(h.api.companion.getState().affection,100,'old completion callback is cancelled');
}
console.log('PASS: affection dance cycles, skip, preferences, image failure/retry, reduced motion, background gating, custom art and official quota independence.');
