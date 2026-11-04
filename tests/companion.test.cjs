'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/companion-model.cjs');

test('old stored defaults gain new builtins and retain literal custom lines', () => {
  const legacy = [{text:'耳朵不许乱摸……\n刚才那次就算了。'}, {text:'<img src=x onerror=alert(1)> 自定义'}];
  const prefs = m.normalizePreferences({});
  const pool = m.quotePool(prefs, legacy);
  assert.ok(m.BUILTIN_QUOTES.length >= 24);
  assert.ok(pool.some(q => q.text.includes('小基基')));
  assert.ok(pool.some(q => q.text.includes('好猫猫')));
  assert.ok(pool.some(q => q.text === legacy[1].text));
  assert.equal(new Set(pool.map(q=>q.text)).size, pool.length);
});

test('quote groups and disabled builtins work and do not immediately repeat', () => {
  const prefs = m.normalizePreferences({quoteGroup:'meme', customLines:['我的专属猫猫台词']});
  const pool = m.quotePool(prefs, []);
  assert.ok(pool.every(q => q.group === 'meme' || q.group === 'custom'));
  const first = m.pickQuote(pool, '', () => 0);
  assert.notEqual(m.pickQuote(pool, first.text, () => 0).text, first.text);
  assert.deepEqual(m.quotePool(m.normalizePreferences({builtins:false,customLines:['唯一一句']}), []).map(q=>q.text), ['唯一一句']);
});

test('interaction cooldown survives reload; affection is bounded and never changes quota', () => {
  let state = m.normalizeState({}, 100000);
  const before = JSON.stringify(state);
  const first = m.interact(state, 'feed', 100000);
  assert.equal(first.accepted, true);
  assert.equal(first.state.affection, state.affection + 5);
  assert.equal(JSON.stringify(state), before, 'pure transition must not mutate its input');
  state = m.normalizeState(JSON.parse(JSON.stringify(first.state)), 101000);
  const again = m.interact(state, 'feed', 101000);
  assert.equal(again.accepted, false);
  assert.equal(again.retryAfterMs, 29000);
  assert.equal(m.interact({...state,affection:99}, 'feed', 131000).state.affection, 100);
  assert.equal(Object.hasOwn(first.state,'quota'), false);
  assert.equal(m.interact(state,'bogus',140000).accepted,false);
});

test('timer deadline survives reload and completes only once after a delayed tick', () => {
  let state = m.startTimer(m.normalizeState({},1000), 'focus', 5, 1000);
  state = m.normalizeState(JSON.parse(JSON.stringify(state)), 100000);
  let tick = m.tickTimer(state, 400000);
  assert.equal(tick.completed, true);
  assert.equal(tick.state.timer.status,'done');
  assert.equal(tick.state.focusCompleted,1);
  tick = m.tickTimer(tick.state, 500000);
  assert.equal(tick.completed,false);
  assert.equal(tick.state.focusCompleted,1);
});

test('paused timer does not expire and resumes using its actual remaining time', () => {
  let state = m.startTimer(m.normalizeState({},1000),'focus',5,1000);
  state = m.pauseTimer(state,61000);
  assert.equal(state.timer.remainingMs,240000);
  assert.equal(m.tickTimer(state,900000).completed,false);
  state = m.resumeTimer(state,900000);
  assert.equal(state.timer.deadline,1140000);
  assert.equal(m.tickTimer(state,1139999).completed,false);
  assert.equal(m.tickTimer(state,1140000).completed,true);
});

test('preferences import accepts only bounded known fields, never secrets or prototype keys', () => {
  const imported = m.importPreferences(JSON.stringify({format:'gemini-companion-settings',version:1,preferences:{name:'咪咪',opacity:99,focusMinutes:-5,customLines:['  喵  '],apiKey:'private',quotaEndpoint:'https://example.invalid',__proto__:{polluted:true}}}));
  assert.equal(imported.name,'咪咪');
  assert.equal(imported.opacity,1);
  assert.equal(imported.focusMinutes,5);
  assert.deepEqual(imported.customLines,['喵']);
  assert.equal(Object.hasOwn(imported,'apiKey'),false);
  assert.equal({}.polluted,undefined);
  const serialized=m.exportPreferences(imported);
  assert.ok(!serialized.includes('private'));
  assert.throws(()=>m.importPreferences('{"version":99}'));
  assert.throws(()=>m.importPreferences('x'.repeat(262145)));
});

test('malformed state is safe and break timers do not count as focus sessions', () => {
  const safe=m.normalizeState({affection:NaN,focusCompleted:-9,counts:null,timer:{status:'running',deadline:'bad'}},1000);
  assert.equal(safe.affection,30);
  assert.equal(safe.focusCompleted,0);
  assert.equal(safe.timer.status,'idle');
  const done=m.tickTimer(m.startTimer(safe,'break',1,1000),61000);
  assert.equal(done.completed,true);
  assert.equal(done.state.focusCompleted,0);
});
