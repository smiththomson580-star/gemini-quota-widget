import model from './dance-model.cjs';
import atlas from '../assets/gentle-dance.webp';
import {icon} from './companion-icons.mjs';

// Ephemeral presentation, persisted token/deadline. Never touches quota or custom artwork.
export function createDance(options){
  const {root,dom,readState,writeState,preferences,reduced,notify}=options;
  const stage=document.createElement('section');stage.id='gfw-dance-stage';stage.hidden=true;
  stage.setAttribute('role','region');stage.setAttribute('aria-label','柔情猫娘满好感舞蹈');
  dom.setHTML(stage,`<div class="cp-dance-aura" aria-hidden="true"></div><div id="gfw-dance-bubble" class="cp-dance-bubble" role="status" aria-live="polite" aria-atomic="true">柔情猫娘来啦！</div><button class="cp-dance-actor" type="button" aria-label="柔情猫娘：查看双额度" title="轻点看双额度 · 右键设置"><span class="cp-dance-viewport"><img id="gfw-dance-atlas" alt="" draggable="false"></span></button><div class="cp-dance-caption"><span><b>柔情之舞</b><small id="gfw-dance-countdown" role="status" aria-live="off"></small></span><button id="gfw-dance-settings" type="button" aria-label="打开猫猫设置" title="打开设置">${icon('menu')}</button><button id="gfw-dance-skip" type="button" aria-label="收起本次舞蹈，好感度回到80" title="收起本次舞蹈 · Esc">${icon('close')}</button></div>`);
  document.body.appendChild(stage);
  const image=stage.querySelector('img');
  const viewport=stage.querySelector('.cp-dance-viewport');
  const greeting=stage.querySelector('#gfw-dance-bubble');
  let loaded=false,failed=false,activeToken=null,pending=false,releaseLock=null,finishTimer=null,frameTimer=null,startTimer=null;
  let wasEnabled=preferences().enabled&&preferences().danceEnabled;
  let activeReduced=false;
  const clear=()=>{
    for(const id of [finishTimer,frameTimer,startTimer])if(id!==null)clearTimeout(id);
    finishTimer=frameTimer=startTimer=null;stage.hidden=true;root.classList.remove('cp-dancing');activeToken=null;
    if(releaseLock){const release=releaseLock;releaseLock=null;release();}
  };
  function position(){
    if(stage.hidden)return;
    const r=root.querySelector('#gfw-img-wrap').getBoundingClientRect();
    // Reserve greeting, movement and caption space so nothing clips on small windows.
    const h=Math.min(440,Math.max(100,window.innerHeight-168),Math.max(100,(window.innerWidth-40)*2));
    const w=h/2;
    stage.style.setProperty('--cp-dance-height',h+'px');
    const fullWidth=Math.max(184,w+28);
    const fullHeight=h+126;
    stage.style.width=fullWidth+'px';
    stage.style.left=Math.round(Math.max(8,Math.min(window.innerWidth-fullWidth-8,(r.left+r.right-fullWidth)/2)))+'px';
    stage.style.top=Math.round(Math.max(8,Math.min(window.innerHeight-fullHeight-8,r.bottom-h-94)))+'px';
  }
  function finish(){
    if(!activeToken)return;
    const result=model.finishDance(readState(),activeToken);
    clear();
    if(result.completed){writeState(result.state);options.onFinish?.();notify('这支舞只跳给你。好感度回到 80，攒满再跳喵。');}
  }
  // Every beat changes the actual arms/legs pose; CSS only adds a soft step/bounce.
  const poses=[0,1,2,1,4,5,4,3,1,2,4,5,3,6,6,7,7,7,7,7];
  function frame(){
    if(!activeToken)return;
    const run=readState().reward.run;
    if(!run||run.token!==activeToken){clear();return;}
    const elapsed=Math.max(0,Date.now()-run.startedAt);
    if(elapsed>=run.durationMs){finish();return;}
    const index=activeReduced?7:poses[Math.min(poses.length-1,Math.floor(elapsed/600))];
    image.style.left=(-(index%4)*100)+'%';image.style.top=(-Math.floor(index/4)*100)+'%';
    viewport.dataset.pose=String(index);
    stage.querySelector('#gfw-dance-countdown').textContent=activeReduced?'谢谢你一直陪着我':'只为你 · '+Math.ceil((run.durationMs-elapsed)/1000)+'s';
    frameTimer=setTimeout(frame,100);
  }
  function begin(){
    if(!eligible())return;
    const token=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    const result=model.beginDance(readState(),token,Date.now(),reduced()?model.REDUCED_DURATION_MS:model.DURATION_MS);
    if(!result.accepted)return;
    activeToken=token;activeReduced=!!reduced();writeState(result.state);
    // In old hosts without Web Locks, read back after competing storage writes settle.
    startTimer=setTimeout(()=>{
      startTimer=null;
      if(readState().reward.run?.token!==token){clear();return;}
      greeting.hidden=false;stage.hidden=false;stage.dataset.cpTheme=preferences().theme;
      stage.classList.toggle('cp-dance-reduced',activeReduced);
      root.classList.add('cp-dancing');options.onStart?.();position();frame();
      finishTimer=setTimeout(finish,Math.max(0,result.state.reward.run.startedAt+result.state.reward.run.durationMs-Date.now()));
    },32);
  }
  function eligible(){const p=preferences();const s=readState();return loaded&&!failed&&!document.hidden&&p.enabled&&p.danceEnabled&&s.affection===100&&!s.reward.run&&!activeToken;}
  function coordinate(operation){
    if(pending)return;
    const locks=window.navigator?.locks;
    if(locks?.request){
      pending=true;
      locks.request('gfw-affection-dance-v1',{ifAvailable:true},lock=>{
        if(!lock)return;
        return new Promise(resolve=>{releaseLock=resolve;operation();if(!activeToken){releaseLock=null;resolve();}});
      }).catch(()=>{clear();notify('舞蹈暂时等待窗口协调，稍后会再试。');}).finally(()=>{pending=false;});
    }else operation();
  }
  function recover(){
    // Read only after acquiring the same lock as the playing owner. An observer
    // must never write an old whole-state snapshot over the owner's new timer.
    const current=readState(),p=preferences();
    const run=current.reward.run;if(!run)return;
    const result=!p.enabled||!p.danceEnabled?model.finishDance(current,run.token):model.settleDance(current);
    if(result.completed){writeState(result.state);options.onFinish?.();}
  }
  function synchronize(){
    const p=preferences();const enabled=p.enabled&&p.danceEnabled;
    if(enabled&&!wasEnabled&&failed){failed=false;loaded=false;image.src=atlas;}
    wasEnabled=enabled;stage.dataset.cpTheme=p.theme;
    if(activeToken&&readState().reward.run?.token!==activeToken)clear();
    if(activeToken){
      const run=readState().reward.run;
      if(!enabled||activeReduced!==!!reduced()||Date.now()>=run.startedAt+run.durationMs)finish();
      return;
    }
    const run=readState().reward.run;
    if(run){if(!enabled||Date.now()>=run.startedAt+run.durationMs)coordinate(recover);return;}
    if(!eligible()||pending)return;
    coordinate(begin);
  }
  image.addEventListener('load',()=>{loaded=true;failed=false;synchronize();options.onStatus?.();});
  image.addEventListener('error',()=>{
    loaded=false;failed=true;
    if(activeToken){const s=readState();if(s.reward.run?.token===activeToken){s.reward.run=null;clear();writeState(s);}else clear();}
    notify('舞蹈立绘未能加载，好感度已保留。重新开启舞蹈开关可重试。');
    options.onStatus?.();
  });
  image.src=atlas;
  stage.querySelector('#gfw-dance-skip').addEventListener('click',finish);
  stage.querySelector('#gfw-dance-settings').addEventListener('click',options.openMenu);
  stage.querySelector('.cp-dance-actor').addEventListener('click',()=>{greeting.hidden=true;options.showQuota();});
  stage.querySelector('.cp-dance-actor').addEventListener('contextmenu',e=>{e.preventDefault();options.openMenu();});
  window.addEventListener('resize',position);
  window.addEventListener('pagehide',clear);
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',synchronize);
  if(image.complete&&image.naturalWidth>0)loaded=true;
  return {synchronize,skip:finish,busy:()=>!!activeToken,position,status:()=>failed?'failed':activeToken?'playing':loaded?'ready':'loading'};
}
