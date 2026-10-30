const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const filename = process.argv[2];
const { window, document } = parseHTML('<!doctype html><html><head></head><body></body></html>');
Object.defineProperty(window.Element.prototype, 'innerHTML', {
  configurable: true,
  get() { return ''; },
  set() { throw new TypeError("This document requires 'TrustedHTML' assignment."); }
});
window.Element.prototype.getBoundingClientRect = () => ({ left: 800, top: 400, right: 1000, bottom: 700, width: 200, height: 300 });
const storage = new Map();
const globals = {
  window, document,
  innerWidth: 1200, innerHeight: 900,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) },
  MutationObserver: window.MutationObserver,
  performance,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  setTimeout: () => 1, clearTimeout: () => {},
  setInterval: () => 1, clearInterval: () => {},
  console, URL
};
Object.assign(window, { innerWidth: 1200, innerHeight: 900 });
const context = vm.createContext(globals);
assert.doesNotThrow(() => vm.runInContext(fs.readFileSync(filename,'utf8'), context), 'widget must mount without TrustedHTML sinks');
assert.equal(document.querySelectorAll('#gemini-fox-widget-root').length, 1);
assert.ok(document.querySelector('#gfw-menu select'));
assert.ok(document.querySelector('#gemini-fox-widget-root img').src.startsWith('data:image/webp;base64,'));
assert.equal(document.querySelector('#gemini-fox-widget-root svg').namespaceURI, 'http://www.w3.org/2000/svg');
console.log('PASS: full widget mounted with raw HTML sinks blocked; image, menu, and SVG preserved.');
