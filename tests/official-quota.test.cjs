const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseUsageRows} = require('../src/official-quota.cjs');
test('official Chinese usage is inverted to remaining; zero is valid',()=>{
  const q=parseUsageRows(['当前用量已使用 100%重置时间：18:01','每周限额重置时间：11月3日11:01已使用 32%'],123);
  assert.equal(q.fiveHour.remainingPct,0); assert.equal(q.week.remainingPct,68);
  assert.equal(q.fiveHour.resetText,'18:01'); assert.equal(q.week.resetText,'11月3日11:01');
  assert.equal(q.updatedAt,123);
});
test('no partial, fabricated, or out of range quotas',()=>{
  for(const rows of [[],['5小时剩余 63% 每周 100%'],['当前用量已使用 101%','每周限额已使用 30%'],['当前用量已使用 0%']]) assert.equal(parseUsageRows(rows),null);
});
test('English page and decimals',()=>{
  const q=parseUsageRows(['Current usage 12.5% used Resets at 6:01 PM','Weekly limit 0% used Resets on Nov 3, 11:01 AM']);
  assert.equal(q.fiveHour.remainingPct,87.5); assert.equal(q.week.remainingPct,100);
});
