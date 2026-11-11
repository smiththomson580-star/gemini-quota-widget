'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { patchArchive } = require('../src/archive-patcher.cjs');
const { repairClient } = require('../src/client-watch.cjs');

function fixture(t, integrity = false, unpacked = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-compatibility-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const versionDir = path.join(root, 'app-99.8.7');
  const resources = path.join(versionDir, 'resources');
  fs.mkdirSync(resources, { recursive: true });
  const wire = Buffer.alloc(64);
  Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX').copy(wire);
  wire[32] = 1;
  wire[38] = integrity ? 49 : 48;
  fs.writeFileSync(path.join(versionDir, 'Gemini.exe'), wire);
  const files = {
    'package.json': Buffer.from(JSON.stringify({ main: 'entry.cjs', version: '99.8.7' })),
    'entry.cjs': Buffer.from('globalThis.originalMain = true;'),
    'untouched.txt': Buffer.from('retain me')
  };
  let offset = 0;
  const header = { files: {} };
  for (const [name, bytes] of Object.entries(files)) {
    header.files[name] = { offset: String(offset), size: bytes.length };
    offset += bytes.length;
  }
  if (unpacked) {
    const external = path.join(resources, 'app.asar.unpacked');
    fs.mkdirSync(external);
    fs.writeFileSync(path.join(external, 'package.json'), Buffer.concat([files['package.json'], Buffer.from('\n')]));
    header.files['package.json'] = { unpacked: true, size: files['package.json'].length, integrity: { hash: crypto.createHash('sha256').update(files['package.json']).digest('hex') } };
  }
  const json = Buffer.from(JSON.stringify(header));
  const payloadSize = (4 + json.length + 3) & ~3;
  const headerPickle = Buffer.alloc(4 + payloadSize);
  headerPickle.writeUInt32LE(payloadSize);
  headerPickle.writeUInt32LE(json.length, 4);
  json.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  const original = Buffer.concat([sizePickle, headerPickle, ...Object.values(files)]);
  const archive = path.join(resources, 'app.asar');
  fs.writeFileSync(archive, original);
  return { root, versionDir, resources, archive, original };
}

test('adapts an unseen version using its declared main entry and retains other files', t => {
  const f = fixture(t);
  const result = patchArchive(f.archive, Buffer.from('\n// gemini-fox-widget-status.json\nglobalThis.widget = true;'));
  assert.deepEqual(result.report.changedFiles, ['entry.cjs']);
  assert.equal(result.report.verifiedPackedFiles, 3);
  assert.notDeepEqual(result.output, f.original);
  assert.deepEqual(fs.readFileSync(f.archive), f.original, 'validation itself is read-only');
});

test('refuses enforced integrity without modifying the application', t => {
  const f = fixture(t, true);
  assert.throws(() => patchArchive(f.archive, Buffer.from('// hook')), /integrity/);
  assert.deepEqual(fs.readFileSync(f.archive), f.original);
});

test('reads the external package declaration used by Gemini', t => {
  const f = fixture(t, false, true);
  const result = patchArchive(f.archive, Buffer.from('// hook'));
  assert.deepEqual(result.report.changedFiles, ['entry.cjs']);
  assert.equal(result.report.verifiedPackedFiles, 2);
});

test('repairs a new client once, then updates its hook from the saved original', t => {
  const f = fixture(t);
  const hook = Buffer.from('// gemini-fox-widget-status.json\nglobalThis.widget = 1;');
  assert.equal(repairClient(f.versionDir, hook, []).phase, 'ready');
  const first = fs.readFileSync(f.archive);
  assert.equal(repairClient(f.versionDir, hook, []).phase, 'ready');
  assert.deepEqual(fs.readFileSync(f.archive), first);
  assert.equal(repairClient(f.versionDir, Buffer.from('// gemini-fox-widget-status.json\nglobalThis.widget = 2;'), []).phase, 'ready');
  assert.notDeepEqual(fs.readFileSync(f.archive), first);
  assert.ok(fs.readdirSync(f.resources).some(n => n.startsWith('app.asar.before-gemini-fox-')));
});

test('waits while the target client version is running', t => {
  const f = fixture(t);
  assert.equal(repairClient(f.versionDir, Buffer.from('// hook'), [path.join(f.versionDir, 'Gemini.exe')]).phase, 'waitingExit');
  assert.deepEqual(fs.readFileSync(f.archive), f.original);
});
