'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const mount = require('./renderer-harness.cjs');
const built = fs.readFileSync(process.argv[2], 'utf8');
const t = mount(built);
const button = t.document.querySelector('#gfw-update-check');
assert.ok(button, '设置工具页提供更新按钮');
assert.equal(button.disabled, true, '旧安装清楚提示需要先升级组件');
const h = mount(built, { updateState: { version: '0.6.0', phase: 'idle', message: '点击检查' } });
const updateButton = h.document.querySelector('#gfw-update-check');
assert.equal(updateButton.disabled, false);
for (const phase of ['checking', 'downloading', 'installed', 'error', 'current', 'unpublished']) {
  h.window.__gfwUpdateState = { phase, message: '更新状态 ' + phase };
  h.window.dispatchEvent(new h.window.Event('gfw-widget-update'));
  assert.equal(updateButton.disabled, phase === 'checking' || phase === 'downloading');
  assert.equal(h.document.querySelector('#gfw-update-status').textContent, '更新状态 ' + phase);
}
console.log('PASS: updater availability and host progress states.');
