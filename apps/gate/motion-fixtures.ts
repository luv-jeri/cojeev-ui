export const motionCharacters=['glide','stretch','jelly','comet','drop','rubber','pebble','ripple','halo'] as const
export const motionWidths=[360,390,768,1024,1440,1920]
export type MotionScenario={id:string;family:'group'|'morph'|'roles'|'adjuster'|'behavior';shape?:string;variant?:string;vertical?:boolean;speed?:number;intensity?:number;hover?:boolean;hoverStrength?:number;pin?:string;reduced?:boolean;off?:boolean;profile?:boolean;fullCascade?:boolean}
export const motionScenarios:MotionScenario[]=[
 ...motionCharacters.map(variant=>({id:'travel-'+variant,family:'group' as const,shape:'pill',variant})),
 ...['stretch','jelly','rubber','pebble'].map(variant=>({id:'vertical-'+variant,family:'group' as const,shape:'pill',variant,vertical:true})),
 ...['bar','radio','menu','fields','stepper','carousel','nested','checkboxes','no-active','hidden'].map(shape=>({id:'group-'+shape,family:'group' as const,shape,variant:'drop'})),
 {id:'speed-strength',family:'group',shape:'pill',variant:'stretch',speed:1.75,intensity:1.6,hoverStrength:1.8},
 {id:'hover-off',family:'group',shape:'pill',variant:'glide',hover:false},
 {id:'pinned-character',family:'group',shape:'pill',variant:'glide',pin:'jelly'},
 {id:'flow-off',family:'group',shape:'pill',variant:'off'},
 {id:'flow-reduced',family:'group',shape:'pill',variant:'drop',reduced:true},
 {id:'blob-effects',family:'morph',profile:true},
 {id:'full-export-effects',family:'morph',profile:true,fullCascade:true},
 {id:'blob-reduced',family:'morph',profile:true,reduced:true},
 {id:'categories',family:'morph'},
 {id:'morph-off',family:'morph',off:true},
 ...motionCharacters.map(variant=>({id:'roles-'+variant,family:'roles' as const,variant})),
 {id:'roles-reduced',family:'roles',variant:'jelly',reduced:true},
 {id:'roles-off',family:'roles',variant:'off'},
 {id:'adjuster',family:'adjuster'},
 {id:'lifecycle',family:'behavior',variant:'drop'},
 {id:'live-settings',family:'behavior',variant:'glide'},
 {id:'media-change',family:'behavior',variant:'jelly'},
]
export function groupMarkup(shape='pill',nested=false):string{
 const classes=shape==='bar'?'v-tabs -underline':shape==='radio'?'v-iradios':shape==='menu'?'v-menu':shape==='stepper'?'v-stepper-flow':shape==='carousel'?'v-carousel__dots':'v-tabs'
 const fields=shape==='fields',checkboxes=shape==='checkboxes',itemClass=shape==='menu'?'v-menu__item':shape==='stepper'?'v-step':shape==='carousel'?'':'v-tab'
 let items=''
 for(let index=0;index<3;index++){
  const selected=index===0&&shape!=='no-active',id=(nested?'nested-item-':'item-')+index,common=`id="${id}" data-item="${index}" data-slot="motion-item" style="--item-w:${84+index*12}px"`
  if(fields)items+=`<input ${common} class="motion-item v-input" aria-label="Field ${index+1}" placeholder="Field ${index+1}">`
  else if(shape==='radio'||checkboxes)items+=`<label ${common} class="motion-item ${shape==='radio'?'v-iradio':''}"><input type="${checkboxes?'checkbox':'radio'}" name="choice${nested}" ${selected?'checked':''}>Choice ${index+1}</label>`
  else if(shape==='stepper')items+=`<button ${common} class="motion-item ${itemClass}" ${selected?'aria-current="step"':''}><span class="v-step__n">${index+1}</span><span>Step ${index+1}</span></button>`
  else items+=`<button ${common} class="motion-item ${itemClass}" ${shape==='menu'?'role="menuitem" tabindex="0"':''} aria-selected="${selected}">${index+1===1?'One':index+1===2?'Two':'Three'}</button>`
 }
 const inner=shape==='nested'?groupMarkup('pill',true):''
 return `<div id="${nested?'nested-group':'group'}" class="motion-group ${classes}" data-slot="motion-group" ${fields?'data-flow-fields':''} data-flow-group ${shape==='hidden'?'hidden':''}>${items}${inner}</div>`
}
export function fixtureMarkup(scenario:MotionScenario){
 if(scenario.family==='group')return groupMarkup(scenario.shape)
 if(scenario.family==='behavior')return groupMarkup()+`<button id="body" class="motion-body v-btn v-alive" data-slot="motion-body" data-morph="fill" data-tier="blob" data-r="18" style="--mfill:var(--v-pink)">Body</button>`
 if(scenario.family==='adjuster')return '<div id="adjuster-mount"></div>'
 if(scenario.family==='roles')return `<button id="press" class="motion-item v-btn" data-slot="motion-press">Press</button><label id="toggle" class="motion-item v-switch" data-slot="motion-toggle"><input type="checkbox" aria-label="Toggle"></label><div class="v-sliderwrap"><input id="slider" class="v-slider" type="range" min="0" max="100" value="20" data-slot="motion-slider"><output data-slot="motion-output">20</output></div><button id="opener" class="motion-item v-btn" data-slot="motion-opener">Open surface</button><div id="surface" class="motion-surface v-popover" data-slot="motion-surface" hidden>${groupMarkup()}</div><div id="feedback" class="motion-item v-alert" data-slot="motion-feedback" hidden>Arrived</div><details id="disclosure" class="v-collapsible" data-slot="motion-disclosure"><summary>Disclosure</summary><div class="v-collapsible__body">Disclosure content</div></details><span id="loader" class="v-pulse" data-slot="spinner" data-label="Working"></span>`
 return `<button id="body" class="motion-body v-alive" data-slot="motion-body" data-morph="both" data-tier="blob" data-shape="pebble" data-r="18" data-sw="1.5" data-dash="3 3" style="--mfill:var(--v-pink);--mstroke:var(--v-ink)">Body</button><div id="spin" class="motion-body v-alive" data-slot="motion-spin" data-morph="fill" data-tier="spinner" data-colors="#E9A2C3,#A6B56A,#EBC76A" style="--mfill:var(--v-pink)"></div><div id="category-area"><button id="cat-buttons" class="motion-item v-btn" data-slot="motion-category" data-category="buttons">Button</button><button id="cat-icons" class="motion-item v-ibtn -pink" data-slot="motion-category" data-category="icons">Icon</button><span id="cat-pills" class="motion-item v-badge" data-slot="motion-category" data-category="pills">Badge</span><article id="cat-cards" class="motion-item v-card" data-slot="motion-category" data-category="cards">Card</article><div id="cat-skeleton" class="motion-item v-skel" data-slot="motion-category" data-category="skeleton"></div><span id="cat-small" class="motion-item v-badge -sm" data-slot="motion-category" data-category="pills">Small</span><p id="cat-text" class="motion-item v-label" data-slot="motion-category" data-category="buttons">Text</p><div id="cat-scroll" class="motion-item v-card" data-slot="motion-category" data-category="cards" style="overflow:auto">Scrolling content</div></div>`
}
/** Identical specimen layout on both sides; engine paint/keyframes are never imported across sides. */
export const fixtureCSS=`
html,body{margin:0;min-height:100%;background:var(--v-canvas);font-family:var(--font-text);color:var(--v-text)}
*{box-sizing:border-box}button,input{font:inherit}input::placeholder{color:var(--v-text-2);opacity:1}button{cursor:pointer;border:0}svg{display:block;max-width:100%}[hidden]{display:none}
#motion-stage{width:calc(100% - 48px);max-width:960px;min-height:440px;margin:24px;display:flex;flex-wrap:wrap;gap:24px;align-content:flex-start;align-items:flex-start;padding:20px 0}
.motion-group{display:flex;position:relative;gap:8px;width:100%;padding:0;margin:0;border:0;min-height:40px;align-items:flex-start;justify-content:space-between;background:transparent;border-radius:16px;box-shadow:none}
.motion-group.-vertical{flex-direction:column;gap:28px;width:150px}.motion-group .motion-group{width:100%}
.motion-item{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;flex:none;width:var(--item-w,100px);height:40px;min-height:0;padding:0 8px;border:0;border-radius:18px;font-family:var(--font-text);font-size:13px;font-weight:500;line-height:1;white-space:nowrap;color:var(--v-text);background:transparent;box-shadow:none;text-decoration:none}
:where(.motion-item[aria-selected="true"]){background:var(--glide-bg);color:var(--glide-fg)}
.motion-item.v-btn{background:var(--primary);color:var(--primary-foreground)}
.motion-item input[type=radio],.motion-item input[type=checkbox]{width:13px;height:13px;appearance:auto;margin:0}:where(.motion-item.v-input){background:var(--v-beige);outline:0;border:0;box-shadow:none}
.motion-item .v-step__n{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:50%;background:var(--v-beige)}
:where(.motion-group.v-carousel__dots .motion-item){width:12px;height:12px;border-radius:50%;background:var(--v-beige)}
.motion-surface{position:relative;width:100%;padding:20px;background:var(--v-beige);border-radius:20px;box-shadow:none}
.motion-body{position:relative;isolation:isolate;width:150px;height:110px;flex:none;padding:0;border-radius:18px;border:0;background:transparent;overflow:visible;color:var(--v-ink)}
#spin{width:80px;height:80px}#category-area{display:flex;flex-wrap:wrap;gap:20px;width:100%}#category-area .motion-item{background:var(--v-beige)}
.v-morph-host{isolation:isolate}.v-morph-rel{position:relative}.v-morph-host>svg.v-morph{max-width:none;max-height:none}.v-morph-host>svg.v-morph,.v-morph-host>svg.v-morph *{pointer-events:none}
.v-pulse{display:inline-grid;place-items:center;width:34px;height:34px;position:relative}.v-pulse__label{font-weight:500;color:var(--v-text-2);opacity:1;position:absolute;inset:auto auto -20px 50%;transform:translateX(-50%);font-size:11px;white-space:nowrap}
#feedback{height:40px;line-height:1;padding:0 8px}.motion-item.v-switch{transition-property:background,box-shadow}#disclosure{width:100%}#adjuster-mount{width:100%}
`
