'use strict';
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {root,files}=require('./audit-release.cjs');
const result=spawnSync(process.execPath,[path.join(__dirname,'build.cjs')],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
const releases=path.join(root,'releases');fs.mkdirSync(releases,{recursive:true});
// tar is included with Windows 10/11. An explicit allowlist excludes node_modules, state and .git.
const zip=path.join(releases,'gemini-quota-widget-0.1.0.zip');
if(fs.existsSync(zip))throw Error('Release ZIP already exists; choose a new version or remove it explicitly');
const args=['-a','-c','-f',zip,...files.map(f=>path.relative(root,f)),path.join('dist','gemini-fox-widget.user.js')];
const packed=spawnSync('tar',args,{cwd:root,stdio:'inherit'});if(packed.status!==0)process.exit(packed.status||1);
console.log('Created '+zip);
