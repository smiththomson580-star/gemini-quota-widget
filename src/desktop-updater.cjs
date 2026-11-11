'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const REPOSITORY = 'smiththomson580-star/gemini-quota-widget';
const API_URL = 'https://api.github.com/repos/' + REPOSITORY + '/releases/latest';
const MANIFEST_NAME = 'gemini-widget-update.json';
const FILE_NAMES = ['gemini-fox-widget.user.js', 'official-quota.cjs', 'desktop-updater.cjs', 'desktop-hook.cjs', 'archive-patcher.cjs', 'client-watch.cjs'];
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function versionParts(version) {
  if (typeof version !== 'string' || !/^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(version)) throw Error('更新包版本号无效。');
  return version.split('.').map(Number);
}

function newerVersion(a, b) {
  const aa = versionParts(a), bb = versionParts(b);
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return aa[i] > bb[i];
  }
  return false;
}

function installedVersion(directory) {
  const data = JSON.parse(fs.readFileSync(path.join(directory, 'widget-version.json'), 'utf8'));
  versionParts(data.version);
  return data.version;
}

async function bodyBytes(response, limit) {
  if (!response.ok) throw Error('下载失败，HTTP ' + response.status + '。稍后可重试。');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw Error('更新文件超过大小限制。');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function releaseAsset(release, name) {
  const matches = release.assets?.filter(a => a.name === name) ?? [];
  if (matches.length !== 1) throw Error('此版本缺少完整的一键更新包，请等待作者重新发布。');
  const asset = matches[0];
  const expected = 'https://github.com/' + REPOSITORY + '/releases/download/' + encodeURIComponent(release.tag_name) + '/' + name;
  if (asset.browser_download_url !== expected || !Number.isInteger(asset.size) || asset.size <= 0 || asset.size > MAX_FILE_BYTES || !/^sha256:[0-9a-f]{64}$/i.test(asset.digest ?? '')) {
    throw Error('更新附件地址或校验信息无效。');
  }
  return asset;
}

function validateManifest(manifest, version) {
  if (manifest.protocol !== 1) throw Error('该版本需要新版安装器，请先手动安装一次。');
  if (manifest.version !== version) throw Error('更新包版本与发布标签不一致。');
  if (manifest.adapterProtocol !== 1) throw Error('此更新需要新版客户端适配组件，请先手动安装一次。');
  if (!Array.isArray(manifest.files) || manifest.files.length !== FILE_NAMES.length) throw Error('更新包文件不完整。');
  const seen = new Set();
  for (const file of manifest.files) {
    if (!FILE_NAMES.includes(file.name) || seen.has(file.name) || !/^[0-9a-f]{64}$/i.test(file.sha256 ?? '') || !Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_FILE_BYTES) {
      throw Error('更新包文件名或校验信息无效。');
    }
    seen.add(file.name);
  }
}

function replaceDirectory(directory, stage) {
  const backup = directory + '.before-update-' + crypto.randomUUID();
  fs.renameSync(directory, backup);
  try {
    fs.renameSync(stage, directory);
  } catch (error) {
    fs.renameSync(backup, directory);
    throw error;
  }
}

function createUpdater({ directory, appVersion, fetch, onState }) {
  const runningVersion = installedVersion(directory);
  let active = null;
  const publish = state => onState({ version: installedVersion(directory), ...state });
  const get = url => fetch(url, {
    headers: { 'User-Agent': 'Gemini-Quota-Widget/' + runningVersion, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30000),
    credentials: 'omit'
  });

  async function download(asset) {
    const bytes = await bodyBytes(await get(asset.browser_download_url), MAX_FILE_BYTES);
    if (bytes.length !== asset.size || digest(bytes) !== asset.digest.slice(7).toLowerCase()) throw Error('下载内容校验失败，请重新尝试。');
    return bytes;
  }

  async function checkAndInstall() {
    let stage = null;
    try {
      publish({ phase: 'checking', message: '正在检查 GitHub 正式发布…' });
      const response = await get(API_URL);
      if (response.status === 404) {
        publish({ phase: 'unpublished', message: '作者尚未发布正式更新包，稍后再来看看喵。' });
        return;
      }
      const release = JSON.parse((await bodyBytes(response, 1024 * 1024)).toString('utf8'));
      const version = release.tag_name?.replace(/^v/, '');
      versionParts(version);
      if (release.draft !== false || release.prerelease !== false) throw Error('只支持正式发布版本。');
      const current = installedVersion(directory);
      if (!newerVersion(version, current)) {
        publish(current === runningVersion
          ? { phase: 'current', message: '当前已安装 v' + current + '，暂时没有新版。' }
          : { phase: 'installed', message: '已安装 v' + current + '，保存草稿后重开 Gemini 生效。' });
        return;
      }
      const manifestAsset = releaseAsset(release, MANIFEST_NAME);
      const manifest = JSON.parse((await download(manifestAsset)).toString('utf8'));
      validateManifest(manifest, version);
      publish({ phase: 'downloading', message: '发现 v' + version + '，正在下载并校验…' });
      stage = fs.mkdtempSync(path.join(path.dirname(directory), 'gemini-widget-update-'));
      for (const file of manifest.files) {
        const bytes = await download(releaseAsset(release, file.name));
        if (bytes.length !== file.size || digest(bytes) !== file.sha256.toLowerCase()) throw Error(file.name + ' 校验失败。');
        new vm.Script(bytes.toString('utf8'), { filename: file.name });
        fs.writeFileSync(path.join(stage, file.name), bytes);
      }
      fs.writeFileSync(path.join(stage, 'widget-version.json'), JSON.stringify({ version, protocol: 1, adapterProtocol: 1 }));
      replaceDirectory(directory, stage);
      stage = null;
      publish({ phase: 'installed', message: '已安装 v' + version + '，保存草稿后重开 Gemini 生效。' });
    } catch (error) {
      publish({ phase: 'error', message: '更新未完成。' + String(error.message).slice(0, 180) });
    } finally {
      if (stage) fs.rmSync(stage, { recursive: true, force: true });
    }
  }

  return {
    initialState: () => ({ version: installedVersion(directory), clientVersion: appVersion, phase: 'idle', message: '点击检查并更新，获取作者最新正式版本。' }),
    checkAndInstall() {
      if (active) return active;
      active = checkAndInstall().finally(() => { active = null; });
      return active;
    }
  };
}

module.exports = { createUpdater };
