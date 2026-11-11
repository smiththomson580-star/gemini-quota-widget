'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function patchArchive(source, hook) {
  const executable = fs.readFileSync(path.join(path.dirname(source), '..', 'Gemini.exe'));
  const wire = executable.indexOf(Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'));
  if (wire < 0 || executable[wire + 32] !== 1 || executable[wire + 38] !== 48) {
    throw Error('Client integrity enforcement or executable format requires a new adapter.');
  }
  const input = fs.readFileSync(source);
  const header = JSON.parse(input.subarray(16, 16 + input.readUInt32LE(12)).toString('utf8'));
  const start = 8 + input.readUInt32LE(4);
  const packageEntry = header.files['package.json'];
  if (!packageEntry || packageEntry.link) throw Error('Unsupported client package layout.');
  let packageBytes;
  if (packageEntry.unpacked) {
    packageBytes = fs.readFileSync(path.join(path.dirname(source), 'app.asar.unpacked', 'package.json'));
    if (packageBytes.length > 1024 * 1024) throw Error('Client package declaration is too large.');
  } else {
    const packageStart = start + Number(packageEntry.offset);
    packageBytes = input.subarray(packageStart, packageStart + packageEntry.size);
  }
  const pkg = JSON.parse(packageBytes.toString('utf8'));
  if (pkg.type === 'module') throw Error('Client ESM entry needs a new adapter.');
  const main = path.posix.normalize(pkg.main || 'index.js');
  if (main.startsWith('../') || path.posix.isAbsolute(main) || !/\.(c?js)$/.test(main)) throw Error('Unsupported client main entry.');
  const originals = new Map();
  const chunks = [];
  let offset = 0, changed = 0;
  function visit(tree, prefix = '') {
    for (const [name, entry] of Object.entries(tree.files || {})) {
      const filename = prefix + name;
      if (entry.files) { visit(entry, filename + '/'); continue; }
      if (entry.unpacked || entry.link) continue;
      let content = input.subarray(start + Number(entry.offset), start + Number(entry.offset) + entry.size);
      if (content.length !== entry.size) throw Error('Truncated client archive.');
      originals.set(filename, sha(content));
      if (filename === main) {
        if (content.includes(Buffer.from('gemini-fox-widget-status.json'))) throw Error('Archive is already patched.');
        content = Buffer.concat([content, Buffer.from('\n'), hook]);
        new vm.Script(content.toString('utf8'));
        changed++;
      }
      entry.size = content.length;
      entry.offset = String(offset);
      if (entry.integrity) {
        const blockSize = entry.integrity.blockSize || 4194304;
        const blocks = [];
        for (let i = 0; i < content.length; i += blockSize) blocks.push(sha(content.subarray(i, i + blockSize)));
        entry.integrity = { algorithm: 'SHA256', hash: sha(content), blockSize, blocks };
      }
      offset += content.length;
      chunks.push(content);
    }
  }
  visit(header);
  if (changed !== 1) throw Error('Expected exactly one client main entry.');
  const json = Buffer.from(JSON.stringify(header));
  const payloadSize = (4 + json.length + 3) & ~3;
  const headerPickle = Buffer.alloc(4 + payloadSize);
  headerPickle.writeUInt32LE(payloadSize);
  headerPickle.writeUInt32LE(json.length, 4);
  json.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  const output = Buffer.concat([sizePickle, headerPickle, ...chunks]);
  const outHeader = JSON.parse(output.subarray(16, 16 + output.readUInt32LE(12)).toString('utf8'));
  const outStart = 8 + output.readUInt32LE(4);
  let verified = 0;
  function verify(tree, prefix = '') {
    for (const [name, entry] of Object.entries(tree.files || {})) {
      const filename = prefix + name;
      if (entry.files) { verify(entry, filename + '/'); continue; }
      if (entry.unpacked || entry.link) continue;
      const bytes = output.subarray(outStart + Number(entry.offset), outStart + Number(entry.offset) + entry.size);
      if (bytes.length !== entry.size || (entry.integrity && sha(bytes) !== entry.integrity.hash)) throw Error('Client file integrity mismatch.');
      if (filename !== main && sha(bytes) !== originals.get(filename)) throw Error('Unexpected client file change.');
      verified++;
    }
  }
  verify(outHeader);
  return { output, report: { originalSha256: sha(input), patchedSha256: sha(output), changedFiles: [main], verifiedPackedFiles: verified } };
}

module.exports = { patchArchive };
