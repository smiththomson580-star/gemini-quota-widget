'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const mount = require('./renderer-harness.cjs');
const source = fs.readFileSync(process.argv[2], 'utf8');
let sawGrin = false, sawTears = false;
let seed = 17;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const choices = '#gfw-joker-board button[data-joker-index]:not([disabled])';
const table = '#gfw-joker-table';
function tapCat(t) {
  const cat = t.document.querySelector('#gfw-img-wrap');
  for (const type of ['pointerdown', 'pointerup']) {
    const event = new t.window.Event(type, { bubbles: true });
    Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 900, clientY: 500, isPrimary: true });
    cat.dispatchEvent(event);
  }
}
function openGame(t) {
  t.click('[data-cp-dock-action="joker"]');
}

for (let i = 0; i < 30; i++) {
  const t = mount(source, { state: { affection: 65 }, random });
  tapCat(t);
  assert.equal(t.document.querySelector(table)?.hidden, true, '单击猫猫显示额度');
  assert.match(t.document.querySelector('#gfw-text').textContent, /5 小时/);
  openGame(t);
  assert.equal(t.document.querySelector('#gfw-companion-dock > ' + table)?.hidden, false, '牌桌在快捷互动条内展开');
  assert.equal(t.document.querySelector(table + ' img'), null, '牌桌沿用原挂件立绘');
  assert.equal(t.document.querySelector('#gfw-menu').classList.contains('gfw-show'), false);
  const first = t.document.querySelector(choices);
  assert.ok(first);
  assert.equal(t.document.querySelectorAll('#gfw-joker-board .cp-joker-card').length,17,'8 对牌和一张鬼牌');
  assert.equal(t.api.companion.getState().affection, 65);
  for (let turn = 0; turn < 60 && t.api.companion.getState().affection === 65; turn++) {
    const card = t.document.querySelector(choices);
    assert.ok(card, '未完成的牌局必须提供可抽的牌');
    card.dispatchEvent(new t.window.Event('click', { bubbles: true }));
    t.advance(450);
    sawGrin ||= !!t.document.querySelector('#gfw-img-wrap .cp-joker-on-widget[data-expression="grin"]');
    // 第二次点击上一回合的牌不应越过回合锁。
    card.dispatchEvent(new t.window.Event('click', { bubbles: true }));
    t.advance(1500);
    sawTears ||= !!t.document.querySelector('#gfw-img-wrap .cp-joker-on-widget[data-expression="tears"]');
    t.advance(1750);
  }
  assert.equal(t.api.companion.getState().affection, 85, '整局结算一次 +20');
  t.advance(5000);
  assert.equal(t.api.companion.getState().affection, 85);
}
assert.ok(sawGrin && sawTears, '双方抽到鬼牌时各有表情');

function beatCat() {
  const t = mount(source, { state: { affection: 65 }, random: () => .99 });
  openGame(t);
  for (let i = 0; i < 10 && t.api.companion.getState().affection === 65; i++) {
    t.click(choices);
    t.advance(1700);
  }
  assert.match(t.document.querySelector('.cp-joker-status').textContent, /你赢啦/);
  return t;
}
const sulking = beatCat();
sulking.click('#gfw-companion-dock [data-cp-dock-action="cuddle"]');
sulking.click('#gfw-work-panel [data-cp-dock-action="feed"]');
assert.match(sulking.document.querySelector('#gfw-text').textContent, /还在生气/);
sulking.advance(720);
assert.match(sulking.document.querySelector('#gfw-text').textContent, /这个是证物/);
assert.equal(sulking.api.companion.getState().affection, 90, '小剧情沿用投喂奖励');
const expired = beatCat();
expired.advance(3001);
expired.api.companion.action('feed');
assert.match(expired.document.querySelector('#gfw-text').textContent, /好好地全部吃下去了/);

const abandoned = mount(source, { state: { affection: 65 } });
openGame(abandoned);
abandoned.click(choices);
abandoned.click('#gfw-joker-leave');
abandoned.advance(10000);
assert.equal(abandoned.api.companion.getState().affection, 65, '退局不结算');
assert.equal(abandoned.document.querySelector('#gfw-joker-board').hidden, true);

const milestone = mount(source, { state: { affection: 80 }, imageReady: true, random });
openGame(milestone);
for (let i = 0; i < 60 && milestone.api.companion.getState().affection < 100; i++) {
  milestone.click(choices);
  milestone.advance(3200);
}
assert.equal(milestone.api.companion.getState().affection, 100, '完赛触发满好感');
assert.equal(milestone.document.querySelector('#gfw-dance-stage').hidden, false);

const resumed = mount(source, { state: { affection: 65 }, random });
openGame(resumed);
resumed.click(choices);
resumed.advance(3500);
const handBefore = resumed.document.querySelector('.cp-joker-player').textContent;
openGame(resumed);
assert.equal(resumed.document.querySelector(table).hidden, true, '再次点纸牌可收起');
assert.equal(resumed.document.querySelector('[data-cp-dock-action="joker"]').getAttribute('aria-expanded'), 'false');
openGame(resumed);
assert.equal(resumed.document.querySelector('.cp-joker-player').textContent, handBefore, '重新展开可续局');
tapCat(resumed);
assert.equal(resumed.document.querySelector(table).hidden, true);
assert.match(resumed.document.querySelector('#gfw-text').textContent, /5 小时/);
openGame(resumed);
assert.equal(resumed.document.querySelector('.cp-joker-player').textContent, handBefore, '查询额度后可以接着玩');
const honest=mount(source,{random:()=>.99});
openGame(honest);
honest.change('#gfw-joker-persona','honest');
const backs=honest.document.querySelectorAll(choices);
backs[0].dispatchEvent(new honest.window.Event('pointerenter'));
assert.match(honest.document.querySelector('#gfw-joker-cue').textContent,/不紧张/);
backs[8].dispatchEvent(new honest.window.Event('pointerenter'));
assert.match(honest.document.querySelector('#gfw-joker-cue').textContent,/没有一直看/);
assert.equal(honest.api.companion.getPreferences().jokerPersona,'honest');
console.log('Old Maid UI passed');
