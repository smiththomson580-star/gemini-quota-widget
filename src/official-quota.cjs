'use strict';
// Only parse the dedicated Google usage page, never chat messages or widget text.
function parseUsageRows(rows, now = Date.now()) {
  const result = { source: 'gemini.google.com/usage', updatedAt: now };
  for (const raw of rows) {
    const text = String(raw).replace(/\s+/g, ' ').trim();
    const kind = /每周限额|Weekly limit/i.test(text) ? 'week' : /当前用量|Current usage/i.test(text) ? 'fiveHour' : null;
    if (!kind) continue;
    const match = text.match(/(?:已使用|已用|Used)\s*(\d+(?:\.\d+)?)\s*%/i) || text.match(/(\d+(?:\.\d+)?)\s*%\s*used/i);
    if (!match) continue;
    const used = Number(match[1]);
    if (!Number.isFinite(used) || used < 0 || used > 100) continue;
    const reset = text.match(/(?:重置时间|Resets?(?: at| on| in)?)\s*[:：]?\s*([^%]+?)(?=已使用|已用|\d+(?:\.\d+)?\s*%\s*used|$)/i);
    result[kind] = { usedPct: used, remainingPct: Math.round((100-used)*100)/100, resetText: reset ? reset[1].trim() : '重置时间未提供' };
  }
  return result.fiveHour && result.week ? result : null;
}
function readUsagePage() {
  if (location.hostname !== 'gemini.google.com' || !/\/usage\/?$/.test(location.pathname)) return null;
  const nodes = [...document.querySelectorAll('li, [role="listitem"]')];
  return nodes.filter(n => !n.closest('#gemini-fox-widget-root, #gfw-menu')).map(n => (n.getAttribute('aria-label') || '') + ' ' + n.textContent);
}
module.exports = { parseUsageRows, readUsagePage };
