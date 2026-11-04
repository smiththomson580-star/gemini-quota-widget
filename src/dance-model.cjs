'use strict';
const DURATION_MS=12000;
const REDUCED_DURATION_MS=2200;
const validToken=value=>typeof value==='string'&&value.length>0&&value.length<=96;
function normalizeReward(raw,now=Date.now()){
  const completed=Number.isFinite(raw?.completed)?Math.min(1000000,Math.max(0,Math.floor(raw.completed))):0;
  const r=raw?.run;
  const valid=validToken(r?.token)&&Number.isFinite(r.startedAt)&&r.startedAt>0&&r.startedAt<=now+1000&&[DURATION_MS,REDUCED_DURATION_MS].includes(r.durationMs);
  return {completed,run:valid?{token:r.token,startedAt:r.startedAt,durationMs:r.durationMs}:null};
}
function beginDance(state,token,now=Date.now(),durationMs=DURATION_MS){
  const reward=normalizeReward(state.reward,now);
  const accepted=state.affection===100&&!reward.run&&validToken(token)&&[DURATION_MS,REDUCED_DURATION_MS].includes(durationMs);
  return {accepted,state:accepted?{...state,sleeping:false,reward:{...reward,run:{token,startedAt:now,durationMs}}}:state};
}
function finishDance(state,token){
  if(!validToken(token)||state.reward?.run?.token!==token)return {completed:false,state};
  return {completed:true,state:{...state,affection:80,reward:{completed:Math.min(1000000,state.reward.completed+1),run:null}}};
}
function settleDance(state,now=Date.now()){
  const run=state.reward?.run;
  return run&&now>=run.startedAt+run.durationMs?finishDance(state,run.token):{completed:false,state};
}
module.exports={DURATION_MS,REDUCED_DURATION_MS,normalizeReward,beginDance,finishDance,settleDance};
