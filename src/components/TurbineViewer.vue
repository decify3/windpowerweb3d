<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue';
import * as THREE from 'three';
import {SceneManager} from '../three/SceneManager';import {ModelLoader} from '../three/ModelLoader';
import {ModelHierarchy} from '../three/ModelHierarchy';import {SelectionManager} from '../three/SelectionManager';
import {HighlightManager} from '../three/HighlightManager';import {TransparencyManager} from '../three/TransparencyManager';
import {SectionPlane} from '../three/SectionPlane';import {AnimationManager} from '../three/AnimationManager';import {ExplodedView} from '../three/ExplodedView';
import LoadingScreen from './LoadingScreen.vue';import type {ViewMode,Axis} from '../data/turbine';
import {getModelDefinition,defaultModelId,type ModelDefinition} from '../data/models/registry';
import {PresentationStage} from '../three/PresentationStage';
const props=defineProps<{modelId?:string;selected:string;mode:ViewMode;level:number;paused:boolean;running:boolean;speed:number;autoRotate:boolean;axis:Axis;section:number;lod:number}>();
const emit=defineEmits<{select:[id:string];ready:[ready:boolean];stats:[fps:number,calls:number,triangles:number];hidden:[ids:string[]];isolated:[v:boolean];retry:[]}>();
const model=()=>getModelDefinition(props.modelId??defaultModelId);
const host=ref<HTMLDivElement>();const progress=ref(0);const error=ref('');const ready=ref(false);
let scene:SceneManager|undefined;const loader=new ModelLoader();let disposed=false;
let stage:PresentationStage|undefined;
let object:THREE.Object3D,hierarchy:ModelHierarchy,selection:SelectionManager,highlight:HighlightManager,materials:TransparencyManager,section:SectionPlane,rotor:AnimationManager|undefined,explosion:ExplodedView;
function current(){return hierarchy.get(props.selected);}
function choose(){if(!ready.value)return;hierarchy.show(props.selected);emit('hidden',[...hierarchy.hidden]);highlight.select(props.selected===model().rootComponentId?undefined:current());materials.update(props.mode,props.selected===model().rootComponentId?null:current());scene!.camera.focus(current(),true,props.selected===model().rootComponentId);updateSection();}
function updateSection(){if(ready.value)section.set(props.mode==='section',props.axis,props.section,props.selected===model().rootComponentId?object:current());}
function fit(){if(ready.value)scene!.camera.focus(object,true,true);}
function focus(){if(ready.value)scene!.camera.focus(current(),true,props.selected===model().rootComponentId);}
function toggle(id:string){if(ready.value){hierarchy.toggle(id);emit('hidden',[...hierarchy.hidden]);}}
function isolate(){if(ready.value){hierarchy.isolate(hierarchy.isolated?null:props.selected);emit('isolated',!!hierarchy.isolated);focus();}}
function reset(){if(!ready.value)return;explosion.reset();rotor?.stop();hierarchy.reset();materials.update('normal',null);highlight.select();section.set(false,props.axis,50,object);scene!.camera.controls.autoRotate=false;emit('hidden',[]);emit('isolated',false);fit();}
function stop(){rotor?.stop();}
function capture(){if(!scene)return;scene.composer.render();const a=document.createElement('a');a.href=scene.renderer.domElement.toDataURL('image/png');a.download=`${model().screenshotBase}-digital-prototype.png`;a.click();}
function diagnostics(){if(!ready.value)return null;const def=model();const rid=def.rotorComponentId;return {selected:props.selected,mode:props.mode,level:props.level,lod:props.lod,hidden:[...hierarchy.hidden],isolated:hierarchy.isolated,rotor:(rid?hierarchy.get(rid).quaternion.toArray():[0,0,0,1]),positions:Object.fromEntries([...hierarchy.objects].map(([id,o])=>[id,o.position.toArray()])),camera:scene!.camera.camera.position.toArray(),target:scene!.camera.controls.target.toArray(),clipping:section.plane.constant,stageVisible:stage?.visible,sweptDisk:(()=>{
 const hub=rid?hierarchy.get(rid).getWorldPosition(new THREE.Vector3()):null;if(!hub)return [];
 const radius=def.turbineConfig.rotor_diameter_m/2;
 return [...Array.from({length:72},(_,i)=>new THREE.Vector3(hub.x,hub.y+Math.cos(i/72*Math.PI*2)*radius,hub.z+Math.sin(i/72*Math.PI*2)*radius)),new THREE.Vector3(0,0,0)].map(p=>p.project(scene!.camera.camera).toArray());
})(),meshCount:(()=>{let n=0;object.traverse(o=>{if(o instanceof THREE.Mesh)n++});return n;})()};}
defineExpose({fit,focus,toggle,isolate,reset,stop,capture,diagnostics});
watch(()=>props.selected,choose);
watch(()=>props.mode,()=>{if(ready.value){materials.update(props.mode,props.selected===model().rootComponentId?null:current());updateSection();}});
watch(()=>[props.axis,props.section],updateSection);
watch(()=>props.level,level=>{if(ready.value){rotor?.stop();explosion.set(level,()=>{updateSection();scene!.camera.focus(props.selected===model().rootComponentId?object:current(),true,props.selected===model().rootComponentId);});}});
watch(()=>props.paused,paused=>explosion?.pause(paused));
watch(()=>props.running,running=>{if(rotor)rotor.running=running&&props.level===0;});
watch(()=>props.speed,speed=>{if(rotor)rotor.speed=speed;});
watch(()=>props.autoRotate,v=>{if(scene)scene.camera.controls.autoRotate=v;});
watch(()=>[props.selected,props.level,props.mode],()=>{if(stage)stage.visible=model().features.stageDisk&&props.selected===model().rootComponentId&&props.level===0&&props.mode==='normal';});
function lost(e:Event){e.preventDefault();error.value='WebGL 上下文已丢失，请重新加载模型。';ready.value=false;emit('ready',false);}
onMounted(async()=>{
 emit('ready',false);
 try{
  const def:ModelDefinition=model();
  scene=new SceneManager(host.value!,def);scene.renderer.domElement.addEventListener('webglcontextlost',lost);scene.onStats=(...stats)=>emit('stats',...stats);
  const suffix=props.lod===0?'':`-lod${props.lod}`;object=await loader.load(`${import.meta.env.BASE_URL}models/${def.glbBaseName}${suffix}.glb`,n=>progress.value=n);
  if(disposed){object.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});return;}
  scene.scene.add(object);hierarchy=new ModelHierarchy(object,def.components);materials=new TransparencyManager(object);highlight=new HighlightManager(scene.outline);
  object.updateWorldMatrix(true,true);if(def.features.stageDisk){stage=new PresentationStage();scene.scene.add(stage);}
  stage&&(stage.visible=def.features.stageDisk&&props.selected===def.rootComponentId&&props.level===0&&props.mode==='normal');
  section=new SectionPlane(scene.scene,materials);
  if(def.rotorComponentId&&def.features.rotorSpin){rotor=new AnimationManager(hierarchy.get(def.rotorComponentId),def.initialRotorSpeed);explosion=new ExplodedView(hierarchy,def.components,def.explosionRule??(()=>1));}
  else explosion=new ExplodedView(hierarchy,def.components,def.explosionRule??(()=>1));
  selection=new SelectionManager(scene.renderer.domElement,scene.camera.camera,hierarchy,id=>emit('select',id));
  scene.onFrame=delta=>rotor?.tick(delta);ready.value=true;emit('ready',true);scene.camera.focus(object,false,true);
  scene.onResize=()=>{if(ready.value)scene!.camera.focus(current(),false,props.selected===def.rootComponentId);};
  if(rotor){rotor.speed=props.speed;rotor.running=props.running&&props.level===0;}
  scene.camera.controls.autoRotate=props.autoRotate;
  materials.update(props.mode,props.selected===def.rootComponentId?null:current());updateSection();
  if(props.selected!==def.rootComponentId)choose();
  if(props.level>0){explosion.set(props.level);explosion.pause(props.paused);}
  (window as Window & {turbineDiagnostics?:()=>unknown}).turbineDiagnostics=diagnostics;
 }catch(e){console.error(e);error.value=String(e);emit('ready',false);}
});
onBeforeUnmount(()=>{disposed=true;selection?.dispose();explosion?.dispose();section?.dispose();materials?.dispose();loader.dispose();scene?.renderer.domElement.removeEventListener('webglcontextlost',lost);scene?.dispose();delete (window as Window & {turbineDiagnostics?:()=>unknown}).turbineDiagnostics;});
</script>
<template><div ref="host" class="three-host" :data-ready="ready" :data-selected="selected" :data-view-mode="mode"><LoadingScreen v-if="!ready||error" :progress="progress" :error="error" @retry="emit('retry')"/></div></template>
