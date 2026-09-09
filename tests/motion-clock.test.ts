import {test} from 'node:test'
import assert from 'node:assert/strict'
import {motionClock,scheduleMotion,cancelMotion,registerMotionClock} from '../registry/cojeev/motion/clock'

test('phase queue cancels superseded targets, orders morph before due beats, and preserves cancellation across release',async()=>{
 const calls:string[]=[],off=registerMotionClock(t=>{if(t!==null)calls.push('morph:'+t)})
 try{
  motionClock(100);const stale=scheduleMotion(()=>calls.push('stale B'),20);cancelMotion(stale)
  scheduleMotion(()=>{calls.push('C gather');scheduleMotion(()=>calls.push('C land'),10)},20)
  motionClock(119);assert.deepEqual(calls,['morph:100','morph:119'])
  motionClock(120);motionClock(130);assert.deepEqual(calls,['morph:100','morph:119','morph:120','C gather','morph:130','C land'])
  const released=scheduleMotion(()=>calls.push('cancel after release'),5);motionClock(null);cancelMotion(released)
  await new Promise(resolve=>setTimeout(resolve,15));assert.ok(!calls.includes('cancel after release'))
  const real=scheduleMotion(()=>calls.push('converted native timer'),30);motionClock(500);cancelMotion(real);motionClock(1000);assert.ok(!calls.includes('converted native timer'))
 }finally{off();motionClock(null)}
})
