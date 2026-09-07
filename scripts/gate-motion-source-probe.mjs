import fs from 'node:fs'
import vm from 'node:vm'
/** Exact original scheduler/cancellation expressions prove the adapter fixes the mock handle contract. */
export async function probeSourceCancellation(){
 const source=fs.readFileSync('reference/sahajiv-handoff-v4/js/flow.js','utf8'),scheduler=source.slice(source.indexOf('const CLK ='),source.indexOf('const isOff =')),cancellation=source.match(/timers\.forEach\(clearTimeout\)/)[0]
 async function run(frozen,shim){const events=[],nativeClear=clearTimeout,context=vm.createContext({setTimeout,clearTimeout:handle=>{if(shim&&handle&&typeof handle==='object'&&typeof handle.at==='number'&&typeof handle.fn==='function'){handle.fn=()=>{};return}nativeClear(handle)},events});vm.runInContext(scheduler+`;${frozen?'clock(1000);':''}const timers=[schedTimer(()=>events.push('superseded phase'),25)];${cancellation};${frozen?'clock(1030);':''}`,context);if(!frozen)await new Promise(resolve=>setTimeout(resolve,40));return events}
 const live=await run(false,false),frozen=await run(true,false),adapted=await run(true,true)
 return {source:'reference/sahajiv-handoff-v4/js/flow.js',schedulerLines:'79–82',cancellationLine:155,cancellation,live,frozen,adapted,pass:live.length===0&&frozen.length===1&&adapted.length===0,scope:'Only frozen source object handles are canceled by replacing their callback. Native timers delegate unchanged; source files are unmodified.'}
}
