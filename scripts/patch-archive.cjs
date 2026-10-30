const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const source = process.argv[2];
if (!source) throw new Error('Original app.asar path is required');
const appBinary = path.join(path.dirname(source), '..', 'Gemini.exe');
if (fs.existsSync(appBinary)) {
  const executable = fs.readFileSync(appBinary);
  const wire = executable.indexOf(Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'));
  if (wire < 0 || executable[wire + 32] !== 1 || executable[wire + 38] !== 48) {
    throw new Error('This Gemini version requires archive integrity validation or uses an unknown format. No changes made.');
  }
}
const input = fs.readFileSync(source);
const headerSize = input.readUInt32LE(4);
const header = JSON.parse(input.subarray(16, 16 + input.readUInt32LE(12)).toString('utf8'));
const start = 8 + headerSize;
const chunks = [];
let offset = 0;
let changed = 0;
const originals = new Map();
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function visit(tree, prefix = '') {
  for (const [name, entry] of Object.entries(tree.files || {})) {
    const filename = prefix + name;
    if (entry.files) { visit(entry, filename + '/'); continue; }
    if (entry.unpacked || entry.link) continue;
    let content = input.subarray(start + Number(entry.offset), start + Number(entry.offset) + entry.size);
    originals.set(filename, sha(content));
    if (filename === 'src/main.js') {
      if (content.includes(Buffer.from('gemini-fox-widget-status.json'))) throw new Error('Archive is already patched');
      const hook = fs.readFileSync(path.join(__dirname, '..', 'src', 'desktop-hook.cjs'));
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
if (changed !== 1) throw new Error('Expected exactly one changed application entry');
const json = Buffer.from(JSON.stringify(header));
const payloadSize = (4 + json.length + 3) & ~3;
const headerPickle = Buffer.alloc(4 + payloadSize);
headerPickle.writeUInt32LE(payloadSize, 0);
headerPickle.writeUInt32LE(json.length, 4);
json.copy(headerPickle, 8);
const sizePickle = Buffer.alloc(8);
sizePickle.writeUInt32LE(4, 0);
sizePickle.writeUInt32LE(headerPickle.length, 4);
const output = Buffer.concat([sizePickle, headerPickle, ...chunks]);
const outHeader = JSON.parse(output.subarray(16, 16 + output.readUInt32LE(12)).toString());
const outStart = 8 + output.readUInt32LE(4);
let verified = 0;
function verify(tree, prefix = '') {
  for (const [name, e] of Object.entries(tree.files || {})) {
    const f = prefix + name;
    if (e.files) { verify(e, f + '/'); continue; }
    if (e.unpacked || e.link) continue;
    const b = output.subarray(outStart + Number(e.offset), outStart + Number(e.offset) + e.size);
    if (b.length !== e.size || (e.integrity && sha(b) !== e.integrity.hash)) throw new Error('Integrity mismatch: ' + f);
    if (f !== 'src/main.js' && sha(b) !== originals.get(f)) throw new Error('Unexpected file change: ' + f);
    verified++;
  }
}
verify(outHeader);
fs.mkdirSync(path.join(__dirname, '..', 'build'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'build', 'app.patched.asar'), output);
fs.writeFileSync(path.join(__dirname, '..', 'build', 'archive-verification.json'), JSON.stringify({ originalSha256: sha(input), patchedSha256: sha(output), changedFiles: ['src/main.js'], verifiedPackedFiles: verified }, null, 2));
console.log(JSON.stringify({ changedFiles: changed, verifiedPackedFiles: verified, bytes: output.length }));
