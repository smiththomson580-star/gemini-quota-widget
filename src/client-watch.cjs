'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawn } = require('node:child_process');
const { patchArchive } = require('./archive-patcher.cjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const adapterCodeHash = () => sha(Buffer.concat([
  fs.readFileSync(__filename),
  fs.readFileSync(path.join(__dirname, 'archive-patcher.cjs'))
]));

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function repairClient(versionDir, hook, runningPaths) {
  const resources = path.join(versionDir, 'resources');
  const archive = path.join(resources, 'app.asar');
  const stateFile = path.join(resources, 'gemini-widget-adapter.json');
  const current = fs.readFileSync(archive);
  const state = readJSON(stateFile);
  const hookSha = sha(hook);
  if (state?.hookSha === hookSha && state.archiveSha === sha(current)) return { phase: 'ready', message: '当前客户端已接入挂件。' };
  const exe = path.join(versionDir, 'Gemini.exe').toLowerCase();
  if (runningPaths.some(p => p.toLowerCase() === exe)) return { phase: 'waitingExit', message: '客户端正在运行，正常退出后将自动完成接入。' };
  const backupPrefix = 'app.asar.before-gemini-fox-';
  let original = archive;
  if (current.includes(Buffer.from('gemini-fox-widget-status.json'))) {
    const saved = typeof state?.backup === 'string' && path.basename(state.backup) === state.backup && state.backup.startsWith(backupPrefix) ? state.backup : backupPrefix + path.basename(versionDir).slice(4);
    original = path.join(resources, saved);
    if (!fs.existsSync(original)) throw Error('找不到原客户端备份，需要先恢复或重新安装 Gemini。');
  }
  const { output, report } = patchArchive(original, hook);
  let backup = path.basename(original);
  if (original === archive) {
    backup = backupPrefix + path.basename(versionDir).slice(4);
    const candidate = path.join(resources, backup);
    if (fs.existsSync(candidate) && sha(fs.readFileSync(candidate)) !== report.originalSha256) backup += '-' + report.originalSha256.slice(0, 12);
    if (!fs.existsSync(path.join(resources, backup))) fs.copyFileSync(archive, path.join(resources, backup));
  }
  const stage = archive + '.widget-' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(stage, output);
    fs.renameSync(stage, archive);
    fs.writeFileSync(stateFile, JSON.stringify({ hookSha, archiveSha: report.patchedSha256, backup }, null, 2));
  } finally {
    if (fs.existsSync(stage)) fs.unlinkSync(stage);
  }
  return { phase: 'ready', message: '已验证并接入新版客户端。' };
}

function runningClients() {
  if (process.platform !== 'win32') return [];
  const powershell = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const command = '[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); @(Get-Process -Name Gemini -ErrorAction SilentlyContinue | ForEach-Object { $_.Path }) | ConvertTo-Json -Compress; exit 0';
  const text = execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 10000 }).trim();
  if (!text) return [];
  const result = JSON.parse(text);
  return Array.isArray(result) ? result : [result];
}

function newestClient(root) {
  const versions = fs.readdirSync(root).filter(n => /^app-\d+\.\d+\.\d+$/.test(n));
  versions.sort((a, b) => {
    const aa = a.slice(4).split('.').map(Number), bb = b.slice(4).split('.').map(Number);
    return bb[0] - aa[0] || bb[1] - aa[1] || bb[2] - aa[2];
  });
  if (!versions.length) throw Error('未找到 Gemini 客户端。');
  return path.join(root, versions[0]);
}

function runWatcher(once = false) {
  const runtime = __dirname;
  const root = path.dirname(runtime);
  const lock = path.join(root, 'gemini-widget-watch.pid');
  const disabled = path.join(root, 'gemini-widget-watch.disabled');
  const ownSha = adapterCodeHash();
  if (!once) {
    const existing = readJSON(lock);
    if (Number.isInteger(existing?.pid) && existing.pid > 0) {
      try {
        process.kill(existing.pid, 0);
        return;
      } catch (error) {
        if (error.code !== 'ESRCH') return;
      }
    }
    if (fs.existsSync(lock)) fs.unlinkSync(lock);
    try {
      fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }), { flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST') return;
      throw error;
    }
    process.on('exit', () => {
      if (readJSON(lock)?.pid === process.pid) fs.unlinkSync(lock);
    });
  }
  let last = '';
  function tick() {
    if (fs.existsSync(disabled)) {
      if (!once) process.exit(0);
      return;
    }
    let status;
    try {
      if (!once && adapterCodeHash() !== ownSha) {
        if (readJSON(lock)?.pid === process.pid) fs.unlinkSync(lock);
        spawn(process.execPath, [__filename], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
        process.exit(0);
      }
      const target = newestClient(root);
      const hook = fs.readFileSync(path.join(runtime, 'desktop-hook.cjs'));
      const current = fs.readFileSync(path.join(target, 'resources', 'app.asar'));
      const metadata = readJSON(path.join(target, 'resources', 'gemini-widget-adapter.json'));
      if (metadata?.hookSha === sha(hook) && metadata.archiveSha === sha(current)) {
        status = { phase: 'ready', version: path.basename(target).slice(4), message: '当前客户端已接入挂件。' };
      } else {
        status = { ...repairClient(target, hook, runningClients()), version: path.basename(target).slice(4) };
      }
    } catch (error) {
      status = { phase: 'needsAdapter', message: '自动适配暂未完成。' + String(error.message).slice(0, 220) };
    }
    const serialized = JSON.stringify(status);
    if (serialized !== last) {
      fs.writeFileSync(path.join(root, 'gemini-widget-compatibility.json'), serialized);
      last = serialized;
    }
    if (once) console.log(serialized);
  }
  tick();
  if (!once) {
    setInterval(tick, 3000);
    let pending = null;
    const watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
      const changed = String(filename || '').replaceAll('\\', '/');
      if (!/^app-\d+\.\d+\.\d+(?:$|\/(?:Gemini\.exe|resources\/app\.asar)$)/.test(changed)) return;
      clearTimeout(pending);
      pending = setTimeout(tick, 150);
    });
    watcher.on('error', () => watcher.close());
  }
}

if (require.main === module) runWatcher(process.argv.includes('--once'));
module.exports = { repairClient };
