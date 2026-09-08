import type * as THREE from "three";
import type { SculptureGeometry } from "@/registry/sahajiv/lib/sculpture-geometry";
import { createVelocityField, stirVelocityField, advanceVelocityField, clearVelocityField } from "./sculpture-flow";
import { createParticleSpring, sampleSculptureSurface, stepParticleSpring, pulseParticleSpring, resetParticleSpring, type ParticlePointer } from "./sculpture-particles";
import { materialPixelSize, orientSculptureTriangles } from "./sculpture-stage-geometry";

export type SculptureStudio = "ribbons" | "petals" | "tiles";
export type MaterialEffect =
 | {kind:"glass";refraction:number;frost:number;thickness:number;dispersion:number;studio:SculptureStudio}
 | {kind:"flow";distortion:number;chromatic:number;spread:number;settle:number;swirl:number;pulse:number}
 | {kind:"particle";count:number;size:number;strength:number;radius:number;spring:number;damping:number;swirl:number;pulse:number};
export type MaterialConfiguration = {effect:MaterialEffect;visible:boolean;run:boolean;quiet:boolean;respond:boolean;turn:number;pitch:number;zoom:number;speed:number};
export type MaterialColors = {ink:string;accent:string;paper:string;other:string};
export type MaterialRenderer = {configure:(options:MaterialConfiguration)=>void;colors:(colors:MaterialColors)=>void;resize:(width:number,height:number,dpr:number)=>void;pointer:(x:number,y:number,dx:number,dy:number)=>void;leave:()=>void;draw:(seconds:number,elapsed:number)=>boolean;dispose:(loseContext?:boolean)=>void};

/** Native Three materials and original field/spring dynamics; no remote textures or scene assets. */
export async function createMaterialRenderer(canvas:HTMLCanvasElement,mesh:SculptureGeometry,configuration:MaterialConfiguration,colors:MaterialColors,signal?:AbortSignal):Promise<MaterialRenderer>{
 const three=await import("three");
 if(signal?.aborted)throw new DOMException("Material initialization cancelled.","AbortError");
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>(),targets=new Set<THREE.WebGLRenderTarget>();
 let ownedRenderer:THREE.WebGLRenderer|undefined,disposed=false;
 function dispose(loseContext=true){
  if(disposed)return;disposed=true;
  // Every allocation is owned before subsequent setup can throw. Continue cleanup if a lost context rejects one release.
  for(const resources of [geometries,materials,textures,targets]){for(const resource of resources){try{resource.dispose();}catch{}}resources.clear();}
  try{ownedRenderer?.dispose();}catch{}
  if(loseContext){try{ownedRenderer?.forceContextLoss();}catch{}}
 }
 try{
 const renderer=new three.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:"low-power"});
 ownedRenderer=renderer;
 renderer.outputColorSpace=three.SRGBColorSpace;renderer.toneMapping=three.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.transmissionResolutionScale=.5;
 renderer.debug.onShaderError=()=>{throw new Error("The material shader could not compile. Showing the static shape.");};
 const scene=new three.Scene(),camera=new three.OrthographicCamera(-1.7,1.7,1.3,-1.3,.1,30),group=new three.Group();camera.position.z=6;scene.add(group);
 const geometry=new three.BufferGeometry();geometries.add(geometry);geometry.setAttribute("position",new three.BufferAttribute(Float32Array.from(mesh.positions),3));geometry.setAttribute("normal",new three.BufferAttribute(Float32Array.from(mesh.normals),3));geometry.setIndex(new three.BufferAttribute(orientSculptureTriangles(mesh),1));
 const surface=new three.MeshPhysicalMaterial({roughness:.28,metalness:.04,clearcoat:.8,iridescence:.22});materials.add(surface);
 const object=new three.Mesh(geometry,surface);group.add(object);
 scene.add(new three.HemisphereLight(0xffffff,0x9b8c85,.85));const key=new three.DirectionalLight(0xfffaf0,1.8);key.position.set(-3,4,5);scene.add(key);const fill=new three.DirectionalLight(0xe0eaff,.65);fill.position.set(4,-1,3);scene.add(fill);
 // A small original studio environment. Data textures avoid image decoding or network work.
 const faces=Array.from({length:6},(_,face)=>{const data=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const u=x/63,v=y/63,patch=Math.exp(-((u-(face%2?.7:.3))**2/.013+(v-.3)**2/.16)),wash=.25+.5*(1-v),i=(y*64+x)*4;data[i]=Math.min(255,(wash+patch*.7)*255);data[i+1]=Math.min(255,(wash+patch*.72)*255);data[i+2]=Math.min(255,(wash+patch*.76)*255);data[i+3]=255;}const texture=new three.DataTexture(data,64,64);textures.add(texture);return texture;});
 const environment=new three.CubeTexture(faces);environment.colorSpace=three.SRGBColorSpace;environment.needsUpdate=true;textures.add(environment);scene.environment=environment;
 const backdropGeometry=new three.PlaneGeometry(12,10);geometries.add(backdropGeometry);
 const backdrop=new three.ShaderMaterial({uniforms:{paper:{value:new three.Color(colors.paper)},a:{value:new three.Color(colors.accent)},b:{value:new three.Color(colors.other)},ink:{value:new three.Color(colors.ink)},studio:{value:0}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`varying vec2 vUv;uniform vec3 paper;uniform vec3 a;uniform vec3 b;uniform vec3 ink;uniform float studio;
 void main(){vec2 p=(vUv-.5)*5.;float f;
 if(studio<.5){f=smoothstep(.20,.32,sin(p.x*4.+sin(p.y*3.)*1.4));}
 else if(studio<1.5){vec2 q=fract(p*1.4)-.5;float r=length(q),ang=atan(q.y,q.x);f=1.-smoothstep(.26,.31,r*(1.+.16*cos(5.*ang)));}
 else{vec2 q=fract(p*1.25)-.5;f=1.-smoothstep(.16,.19,min(abs(q.x+q.y),abs(q.x-q.y)));}
 vec3 pigment=mix(mix(a,b,smoothstep(-2.,2.,p.y)),ink,.2);vec3 c=mix(paper,pigment,f*.9);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});materials.add(backdrop);const back=new three.Mesh(backdropGeometry,backdrop);back.position.z=-1.65;scene.add(back);
 const flow=createVelocityField(),flowTexture=new three.DataTexture(flow.texture,flow.width,flow.height);flowTexture.minFilter=three.LinearFilter;flowTexture.magFilter=three.LinearFilter;flowTexture.needsUpdate=true;textures.add(flowTexture);
 const target=new three.WebGLRenderTarget(1,1,{depthBuffer:true});targets.add(target);
 const postScene=new three.Scene(),postCamera=new three.OrthographicCamera(-1,1,1,-1,0,1),postGeometry=new three.PlaneGeometry(2,2);geometries.add(postGeometry);
 const post=new three.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:target.texture},field:{value:flowTexture},strength:{value:.1},chromatic:{value:.35}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",fragmentShader:`varying vec2 vUv;uniform sampler2D picture;uniform sampler2D field;uniform float strength;uniform float chromatic;
 void main(){vec3 current=texture2D(field,vUv).rgb;vec2 v=(current.xy*255.-128.)/127.;vec2 delta=v*strength;vec2 uv=clamp(vUv-delta,vec2(.001),vec2(.999));vec2 fringe=delta*chromatic*.22;
 vec3 c=vec3(texture2D(picture,clamp(uv+fringe,vec2(.001),vec2(.999))).r,texture2D(picture,uv).g,texture2D(picture,clamp(uv-fringe,vec2(.001),vec2(.999))).b);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});materials.add(post);postScene.add(new three.Mesh(postGeometry,post));
 const dotData=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4,a=Math.max(0,Math.min(1,(.48-Math.hypot((x+.5)/16-.5,(y+.5)/16-.5))*25));dotData[i]=dotData[i+1]=dotData[i+2]=255;dotData[i+3]=Math.round(a*255);}
 const dots=new three.DataTexture(dotData,16,16);dots.needsUpdate=true;textures.add(dots);
 const pointGeometry=new three.BufferGeometry();geometries.add(pointGeometry);const pointMaterial=new three.PointsMaterial({map:dots,alphaTest:.2,size:2.3,sizeAttenuation:false,vertexColors:true,toneMapped:false});materials.add(pointMaterial);const points=new three.Points(pointGeometry,pointMaterial);points.frustumCulled=false;group.add(points);
 let options=configuration,halfHeight=1.3,aspect=1,particleCount=0,particleState=createParticleSpring(new Float32Array()),pointer:ParticlePointer|undefined,pulse=configuration.effect.kind==="glass"?0:configuration.effect.pulse;
 let targetTiltX=0,targetTiltY=0,tiltX=0,tiltY=0;
 function recolor(next:MaterialColors){colors=next;scene.background=new three.Color(next.paper);surface.color.set(next.accent);if(options.effect.kind==="glass")surface.color.lerp(new three.Color(0xffffff),.9);surface.attenuationColor.set(next.accent);backdrop.uniforms.paper.value.set(next.paper);backdrop.uniforms.a.value.set(next.accent);backdrop.uniforms.b.value.set(next.other);backdrop.uniforms.ink.value.set(next.ink);
   const values=new Float32Array(particleState.rest.length),base=new three.Color(next.accent),ink=new three.Color(next.ink),temp=new three.Color();for(let i=0;i<values.length;i+=3){temp.copy(base).lerp(ink,.58+(particleState.rest[i+1]+1)*.12);values[i]=temp.r;values[i+1]=temp.g;values[i+2]=temp.b;}pointGeometry.setAttribute("color",new three.BufferAttribute(values,3));
 }
 function configure(next:MaterialConfiguration){
  const previous=options;options=next;const effect=next.effect;back.visible=effect.kind==="glass";object.visible=effect.kind!=="particle";points.visible=effect.kind==="particle";
  if(effect.kind==="glass"){surface.transmission=1;surface.thickness=effect.thickness;surface.ior=effect.refraction;surface.roughness=effect.frost;surface.dispersion=effect.dispersion;surface.attenuationDistance=6;surface.metalness=0;surface.clearcoat=.25;surface.iridescence=.05;surface.envMapIntensity=.65;backdrop.uniforms.studio.value=effect.studio==="petals"?1:effect.studio==="tiles"?2:0;}
  else if(effect.kind==="flow"){surface.transmission=0;surface.roughness=.26;post.uniforms.strength.value=effect.distortion*.12;post.uniforms.chromatic.value=effect.chromatic;}
  else{if(particleCount!==effect.count){particleCount=effect.count;particleState=createParticleSpring(sampleSculptureSurface(mesh,effect.count,17));pointGeometry.setAttribute("position",new three.BufferAttribute(particleState.positions,3).setUsage(three.DynamicDrawUsage));recolor(colors);}pointMaterial.size=effect.size;}
  if(next.quiet){clearVelocityField(flow);flowTexture.needsUpdate=true;resetParticleSpring(particleState);if(pointGeometry.getAttribute("position"))pointGeometry.getAttribute("position").needsUpdate=true;pointer=undefined;targetTiltX=targetTiltY=tiltX=tiltY=0;}
  if(effect.kind!=="glass"&&effect.pulse!==pulse){pulse=effect.pulse;if(next.run){if(effect.kind==="flow"){stirVelocityField(flow,.37,.47,.7,.12,effect.spread,effect.swirl);stirVelocityField(flow,.62,.56,-.2,.6,effect.spread,effect.swirl);}else pulseParticleSpring(particleState,effect.strength);}}
  if(!next.respond&&previous.respond){pointer=undefined;targetTiltX=targetTiltY=0;}
 }
 const result:MaterialRenderer={
  configure,colors:recolor,
  resize(width,height,dpr){const size=materialPixelSize(width,height,dpr);renderer.setPixelRatio(size.ratio);renderer.setSize(size.cssWidth,size.cssHeight,false);target.setSize(size.width,size.height);aspect=size.cssWidth/size.cssHeight;halfHeight=Math.max(1.3,1.3/aspect);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();if(options.effect.kind==="particle")pointMaterial.size=options.effect.size;},
  pointer(x,y,dx,dy){if(!options.respond)return;const effect=options.effect;if(effect.kind==="glass"){targetTiltX=(y-.5)*-.24;targetTiltY=(x-.5)*.35;}else if(effect.kind==="flow"){stirVelocityField(flow,x,y,dx*5,dy*5,effect.spread,effect.swirl);}else{const p=new three.Vector3((x-.5)*halfHeight*aspect*2,(y-.5)*halfHeight*2,0);group.updateMatrixWorld();group.worldToLocal(p);pointer={x:p.x,y:p.y,z:p.z,radius:effect.radius,strength:effect.strength,swirl:effect.swirl};}},
  leave(){pointer=undefined;targetTiltX=targetTiltY=0;},
  draw(seconds,elapsed){if(disposed)return false;const effect=options.effect;if(options.run){const blend=1-Math.exp(-seconds*9);tiltX+=(targetTiltX-tiltX)*blend;tiltY+=(targetTiltY-tiltY)*blend;}group.rotation.set(-.16+options.pitch*Math.PI/180+Math.sin(elapsed*.37)*.05+tiltX,.35+options.turn*Math.PI/180+Math.sin(elapsed*.43)*.16+tiltY,0);group.scale.setScalar(options.zoom);
   if(effect.kind==="flow"){if(options.run)advanceVelocityField(flow,seconds*options.speed,effect.settle);flowTexture.needsUpdate=true;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
   else{if(effect.kind==="particle"&&options.run){stepParticleSpring(particleState,seconds*options.speed,effect.spring,effect.damping,pointer);pointGeometry.getAttribute("position").needsUpdate=true;}renderer.render(scene,camera);}
   return options.run;
  },
  dispose
 };
 configure(configuration);recolor(colors);return result;
 }catch(error){dispose();throw error;}
}
