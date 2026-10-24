import * as THREE from 'three';
export class AnimationManager {
  running=false;speed:number;private base:THREE.Quaternion;
  constructor(private rotor:THREE.Object3D,initialSpeed=2){this.speed=initialSpeed;this.base=rotor.quaternion.clone();}
  tick(delta:number){if(this.running)this.rotor.rotateX(delta*.32*this.speed);}
  stop(){this.running=false;this.rotor.quaternion.copy(this.base);}
}
