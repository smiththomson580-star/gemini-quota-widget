'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('the built default contains the HD transparent sprite while retaining the original',()=>{
  const hd=fs.readFileSync(path.join(root,'assets/catgirl-hd.webp'));
  const source=fs.readFileSync(path.join(root,'dist/gemini-fox-widget.user.js'),'utf8');
  const embedded=source.match(/const DEFAULT_FOX_IMG = "data:image\/webp;base64,([^"]+)"/);
  assert.ok(embedded,'the built widget must contain a standalone default image');
  assert.ok(Buffer.from(embedded[1],'base64').equals(hd),'default sprite must be the HD image, not the old 360px fallback');
  const tag=hd.toString('ascii',12,16);
  let width,height,alpha;
  if(tag==='VP8X'){width=hd.readUIntLE(24,3)+1;height=hd.readUIntLE(27,3)+1;alpha=!!(hd[20]&16);}
  else if(tag==='VP8L'){const bits=hd.readUInt32LE(21);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;alpha=!!(bits&(1<<28));}
  assert.ok(width>=1024 && height>=1024,'high-DPI drawing requires real source pixels');
  assert.equal(alpha,true,'the packaged sprite must keep transparency');
  assert.ok(fs.existsSync(path.join(root,'assets/catgirl.webp')),'retain the original artwork');
});
