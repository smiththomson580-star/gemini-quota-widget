'use strict';

// Ephemeral gesture state only: never stored with affection or official quota.
function empty(){return {taps:[],hissUntil:0,cooldownUntil:0};}
function tap(state,now){
  if(now<state.cooldownUntil)return {state:{...state,taps:[]},hiss:false};
  const taps=state.taps.filter(at=>at<=now && now-at<=2000).concat(now).slice(-5);
  if(taps.length===5)return {state:{taps:[],hissUntil:now+2400,cooldownUntil:now+8000},hiss:true};
  return {state:{...state,taps},hiss:false};
}
function interrupt(state){return {...state,taps:[]};}
function calm(state){return {...state,taps:[],hissUntil:0};}
module.exports={empty,tap,interrupt,calm};
