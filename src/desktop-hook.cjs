// Load the user's widget in the Gemini web page without changing renderer permissions.
;(() => {
  const { app, webContents, WebContentsView } = require('electron');
  const fs = require('fs');
  const path = require('path');
  const sourceFile = path.join(process.resourcesPath, 'gemini-fox-widget', 'gemini-fox-widget.user.js');
  const statusFile = path.join(app.getPath('userData'), 'gemini-fox-widget-status.json');
  const attached = new WeakSet();
  const collectors = new WeakSet();
  const sessions = new Map();
  const { parseUsageRows, readUsagePage } = require(path.join(process.resourcesPath, 'gemini-fox-widget', 'official-quota.cjs'));
  const quotaFile = path.join(app.getPath('userData'), 'gemini-official-quota.json');
  function startQuotaReader(target) {
    if (sessions.has(target.session)) return sessions.get(target.session);
    const state={window:null,busy:false,last:null,targets:new Set(),lastAttempt:0,retryAfter:0};
    sessions.set(target.session,state);
    state.refresh=async()=>{
      if(state.busy || Date.now()<state.retryAfter || Date.now()-state.lastAttempt<5000 || target.isDestroyed())return;
      state.busy=true;state.lastAttempt=Date.now();
      try {
        if(!target.getURL().startsWith('https://gemini.google.com/'))throw Error('请先在 Gemini 主窗口完成 Google 验证或登录');
        if(!state.window || state.window.webContents.isDestroyed()) {
          state.window=new WebContentsView({webPreferences:{session:target.session,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
          collectors.add(state.window.webContents);
          state.window.webContents.setUserAgent(target.getUserAgent());
          state.window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
        }
        const url=new URL(target.getURL());
        const account=url.pathname.match(/^\/u\/\d+/)?.[0] || '';
        try { await state.window.webContents.loadURL(url.origin+account+'/usage'); }
        catch(error) {
          const landed=state.window.webContents.getURL();
          if(!landed.startsWith(url.origin+account+'/usage'))throw Error('官方用量页加载失败，请在主窗口查看用量并完成 Google 验证');
        }
        let q=null;
        for(let attempt=0;attempt<20;attempt++) {
          const rows=await state.window.webContents.executeJavaScript('('+readUsagePage.toString()+')()',false);
          q=rows && parseUsageRows(rows);
          if(q)break;
          await new Promise(resolve=>setTimeout(resolve,500));
        }
        if(!q)throw Error('Official usage page did not supply both quota rows');
        state.last=q;state.retryAfter=0;
        fs.writeFileSync(quotaFile,JSON.stringify({ok:true,...q},null,2));
        for(const contents of state.targets) {
          if(contents.isDestroyed()){state.targets.delete(contents);continue;}
          const current=new URL(contents.getURL());
          if(current.origin!==url.origin || (current.pathname.match(/^\/u\/\d+/)?.[0]||'')!==account)continue;
          await contents.executeJavaScript('window.__gfwOfficialQuota='+JSON.stringify(q)+';window.dispatchEvent(new Event("gfw-official-quota"));',false);
        }
      } catch(error) {
        state.retryAfter=Date.now()+120000;
        fs.writeFileSync(quotaFile,JSON.stringify({ok:false,error:String(error.message),lastSuccessfulAt:state.last?.updatedAt || null},null,2));
      } finally {state.busy=false;}
    };
    const timer=setInterval(()=>state.refresh(),30000);timer.unref();
    return state;
  }
  function report(data) {
    try {
      fs.writeFileSync(statusFile, JSON.stringify({ at: new Date().toISOString(), version: app.getVersion(), ...data }, null, 2));
    } catch (_) {}
  }
  const probe = `(() => {
    const root = document.getElementById('gemini-fox-widget-root');
    const image = root && root.querySelector('img');
    const rect = root && root.getBoundingClientRect();
    return {
      loaded: window.__geminiFoxWidgetLoaded === true,
      rootCount: document.querySelectorAll('#gemini-fox-widget-root').length,
      imageLoaded: !!(image && image.complete && image.naturalWidth > 0),
      inViewport: !!(rect && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight),
      menuPresent: !!document.getElementById('gfw-menu')
    };
  })()`;
  function attach(contents) {
    if (attached.has(contents)) return;
    attached.add(contents);
    const inject = async () => {
      try {
        if(collectors.has(contents))return;
        const url = new URL(contents.getURL());
        if (url.protocol !== 'https:' || url.hostname !== 'gemini.google.com') return;
        const source = fs.readFileSync(sourceFile, 'utf8');
        const outcome = await contents.executeJavaScript('(() => { try {\n' + source + '\n;return {ok:true}; } catch(error) { return {ok:false, error:String(error.message || error), stack:String(error.stack || "")}; } })()', false);
        if (!outcome.ok) { report(outcome); return; }
        const quota=startQuotaReader(contents);quota.targets.add(contents);
        if(/\/usage\/?$/.test(url.pathname)) {
          const rows=await contents.executeJavaScript('('+readUsagePage.toString()+')()',false);
          const direct=rows && parseUsageRows(rows);
          if(direct)quota.last=direct;
        }
        if(quota.last) await contents.executeJavaScript('window.__gfwOfficialQuota='+JSON.stringify(quota.last)+';window.dispatchEvent(new Event("gfw-official-quota"));',false);
        quota.refresh();
        const timer = setTimeout(async () => {
          try {
            if (!contents.isDestroyed()) report({ ok: true, ...await contents.executeJavaScript(probe, false) });
          } catch (error) { report({ ok: false, error: String(error.message || error) }); }
        }, 1200);
        timer.unref();
      } catch (error) { report({ ok: false, error: String(error.message || error) }); }
    };
    contents.on('dom-ready', inject);
    contents.on('console-message', (_event, _level, message) => {
      if(message==='[GFW_OFFICIAL_REFRESH]' && !collectors.has(contents))sessions.get(contents.session)?.refresh();
    });
    if (contents.getURL().startsWith('https://gemini.google.com/')) inject();
  }
  app.on('web-contents-created', (_event, contents) => attach(contents));
  for (const contents of webContents.getAllWebContents()) attach(contents);
})();
