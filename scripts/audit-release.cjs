'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const allowedRoots=['src','scripts','tests','assets','third_party','docs','.github'];
const allowedFiles=['README.md','LICENSE','NOTICE.md','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','package.json','package-lock.json','install.ps1','install.cmd','uninstall.cmd','.gitignore','.gitattributes'];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=[...allowedFiles.map(f=>path.join(root,f)),...allowedRoots.flatMap(d=>walk(path.join(root,d)))];
for(const file of files){
  if(!fs.existsSync(file))throw Error('Missing release file '+path.basename(file));
  if(/\.(?:asar|exe|lnk|log|sqlite|db)$/i.test(file))throw Error('Unexpected binary or state file');
  if(file.endsWith('.webp'))continue;
  const text=fs.readFileSync(file,'utf8');
  const deny=[/C:[\\/]+Users[\\/]+/i,/(?:\d{1,3}\.){3}\d{1,3}/,/AIza[0-9A-Za-z_-]{30,}/,/gh[pousr]_[0-9A-Za-z]{30,}/,/-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,/data:image\/webp;base64,[A-Za-z0-9+/=]{100,}/];
  if(!file.startsWith(path.join(root,'third_party')+path.sep))deny.push(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if(deny.some(p=>p.test(text)))throw Error('Possible local or credential data in '+path.relative(root,file));
}
for(const file of files.filter(f=>f.endsWith('.webp'))){
  const asset=fs.readFileSync(file);
  if(asset.toString('ascii',0,4)!=='RIFF'||asset.toString('ascii',8,12)!=='WEBP')throw Error('Invalid artwork');
  // Check both the preserved original and every derived sprite.
  for(let offset=12;offset+8<=asset.length;){const tag=asset.toString('ascii',offset,offset+4);const size=asset.readUInt32LE(offset+4);if(['EXIF','XMP '].includes(tag))throw Error('Artwork contains metadata');offset+=8+size+(size%2);}
}
console.log('Release audit passed: '+files.length+' allowlisted files; no application archives, account state or image metadata.');
module.exports={root,files};
