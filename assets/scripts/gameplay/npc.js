import THREE from '../engine/three.js';
import { Entity } from './entity.js';
import { randomChoice, randomRange } from '../util/random.js';

const FACTIONS = ['civilians', 'gang', 'police'];

export class NPC extends Entity {
  constructor({ mesh, faction = 'civilians', mood = 'calm' }) {
    super({ mesh, type: 'npc', radius: 1, height: 1.8 });
    this.faction = faction;
    this.mood = mood;
    this.state = 'idle';
    this.stateTimer = randomRange(1, 6);
    this.speed = faction === 'police' ? 32 : 18;
    this.weapon = faction === 'police' ? 'rifle' : 'pistol';
    this.alertness = faction === 'police' ? 1 : 0.5;
    this.dropMoneyRange = [50, 500];
    this.targetPosition = this.mesh.position.clone();
  }

  update(delta, world) {
    if (!this.isAlive) return;
    this.stateTimer -= delta;
    if (this.stateTimer <= 0) {
      this._chooseNewState();
    }
    if (this.state === 'walking') {
      const direction = this.targetPosition.clone().sub(this.mesh.position);
      direction.y = 0;
      if (direction.lengthSq() > 1) {
        direction.normalize();
        this.velocity.copy(direction.multiplyScalar(this.speed));
        const lookTarget = this.mesh.position.clone().add(direction);
        this.mesh.lookAt(lookTarget.x, this.mesh.position.y, lookTarget.z);
      } else {
        this.velocity.set(0, 0, 0);
        this.stateTimer = 0;
      }
    } else if (this.state === 'flee') {
      const playerPos = world.player.mesh.position;
      const direction = this.mesh.position.clone().sub(playerPos);
      direction.y = 0;
      direction.normalize();
      this.velocity.copy(direction.multiplyScalar(this.speed * 1.3));
    } else {
      this.velocity.set(0, 0, 0);
    }

    super.update(delta);
  }

  _chooseNewState() {
    const state = randomChoice(['idle', 'walking', 'chatting']);
    this.state = state;
    this.stateTimer = randomRange(2, 6);
    if (state === 'walking') {
      const offset = new THREE.Vector3(randomRange(-25, 25), 0, randomRange(-25, 25));
      this.targetPosition = this.mesh.position.clone().add(offset);
    }
  }

  escalate(world) {
    if (this.faction !== 'police') {
      this.state = 'flee';
      this.stateTimer = randomRange(4, 9);
      return;
    }
    this.state = 'engage';
    this.stateTimer = randomRange(5, 12);
    world.spawnPoliceBackup(this);
  }
}
