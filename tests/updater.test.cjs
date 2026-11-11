'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createUpdater } = require('../src/desktop-updater.cjs');
const repository = 'https://github.com/smiththomson580-star/gemini-quota-widget';
const names = ['gemini-fox-widget.user.js', 'official-quota.cjs', 'desktop-updater.cjs', 'desktop-hook.cjs', 'archive-patcher.cjs', 'client-watch.cjs'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function fixture(t, change = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-widget-update-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'gemini-fox-widget');
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, 'widget-version.json'), JSON.stringify({ version: '0.6.0', protocol: 1 }));
  for (const name of names) fs.writeFileSync(path.join(directory, name), '// old');
  const manifest = { protocol: 1, adapterProtocol: 1, version: '0.6.1', files: names.map(name => ({ name, size: 7, sha256: hash('// new\n') })) };
  const payloads = Object.fromEntries(names.map(name => [name, Buffer.from('// new\n')]));
  const release = { tag_name: 'v0.6.1', draft: false, prerelease: false, assets: [] };
  change({ manifest, payloads, release });
  payloads['gemini-widget-update.json'] = Buffer.from(JSON.stringify(manifest));
  release.assets = Object.entries(payloads).map(([name, bytes]) => ({
    name, size: bytes.length, digest: 'sha256:' + hash(bytes),
    browser_download_url: repository + '/releases/download/' + release.tag_name + '/' + name
  }));
  const states = [];
  let requests = 0;
  const fetch = async url => {
    requests++;
    if (url.includes('/releases/latest')) return Response.json(release);
    const name = url.slice(url.lastIndexOf('/') + 1);
    return new Response(payloads[name], { status: payloads[name] ? 200 : 404 });
  };
  const updater = createUpdater({ directory, appVersion: '1.17.0', fetch, onState: s => states.push(s) });
  return { directory, states, updater, requests: () => requests };
}

test('updates a complete release after checks and preserves the previous directory', async t => {
  const f = fixture(t);
  await Promise.all([f.updater.checkAndInstall(), f.updater.checkAndInstall()]);
  assert.equal(f.states.at(-1).phase, 'installed', f.states.at(-1).message);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.directory, 'widget-version.json'))).version, '0.6.1');
  assert.equal(fs.readFileSync(path.join(f.directory, names[0]), 'utf8'), '// new\n');
  assert.equal(f.requests(), 8, 'duplicate button presses share one download');
  assert.ok(fs.readdirSync(path.dirname(f.directory)).some(n => n.startsWith('gemini-fox-widget.before-update-')));
  await f.updater.checkAndInstall();
  assert.equal(f.states.at(-1).phase, 'installed', 'an installed update stays pending until restart');
});

test('a bad file checksum keeps the current installation', async t => {
  const f = fixture(t, ({ manifest }) => { manifest.files[1].sha256 = '0'.repeat(64); });
  await f.updater.checkAndInstall();
  assert.equal(f.states.at(-1).phase, 'error');
  assert.match(f.states.at(-1).message, /校验/);
  assert.equal(fs.readFileSync(path.join(f.directory, names[0]), 'utf8'), '// old');
});

for (const kind of ['adapter', 'path', 'protocol', 'version']) {
  test('refuses an incompatible ' + kind + ' before replacement', async t => {
    const f = fixture(t, ({ manifest }) => {
      if (kind === 'adapter') manifest.adapterProtocol = 99;
      if (kind === 'path') manifest.files[0].name = '../outside.js';
      if (kind === 'protocol') manifest.protocol = 99;
      if (kind === 'version') manifest.version = '0.9.0';
    });
    await f.updater.checkAndInstall();
    assert.equal(f.states.at(-1).phase, 'error');
    assert.equal(fs.readFileSync(path.join(f.directory, names[0]), 'utf8'), '// old');
  });
}

test('never downgrades to an older release', async t => {
  const f = fixture(t, ({ release }) => { release.tag_name = 'v0.5.0'; });
  await f.updater.checkAndInstall();
  assert.equal(f.states.at(-1).phase, 'current');
  assert.equal(f.requests(), 1);
});

test('reports an unpublished release instead of pretending to update', async t => {
  const f = fixture(t);
  const states = [];
  const updater = createUpdater({ directory: f.directory, appVersion: '1.17.0', fetch: async () => new Response('', { status: 404 }), onState: s => states.push(s) });
  await updater.checkAndInstall();
  assert.equal(states.at(-1).phase, 'unpublished');
});
