import { clamp } from '../engine/math.js';

const WALK_SPEED = 12;

export class NPC {
  constructor(node, { faction = 'civilian', mood = 'calm' } = {}) {
    this.node = node;
    this.position = { x: 0, y: 0, z: 0 };
    this.heading = Math.random() * Math.PI * 2;
    this.speed = WALK_SPEED * (0.7 + Math.random() * 0.6);
    this.faction = faction;
    this.mood = mood;
    this.health = 60;
    this.dead = false;
    this.timer = 0;
  }

  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    if (this.node) {
      this.node.position.x = x;
      this.node.position.y = y;
      this.node.position.z = z;
      this.node.rotation.y = this.heading;
    }
  }

  update(delta, world) {
    if (this.dead) return;
    this.timer -= delta;
    if (this.timer <= 0) {
      this.heading += (Math.random() - 0.5) * Math.PI * 0.5;
      this.timer = 2 + Math.random() * 4;
    }

    const dx = Math.sin(this.heading) * this.speed * delta;
    const dz = Math.cos(this.heading) * this.speed * delta;
    const targetX = this.position.x + dx;
    const targetZ = this.position.z + dz;
    if (!world.isBlocked(targetX, targetZ, 2.2)) {
      this.position.x = targetX;
      this.position.z = targetZ;
    } else {
      this.heading += Math.PI * 0.5;
    }

    this.position.y = world.sampleHeight(this.position.x, this.position.z);

    if (this.node) {
      this.node.position.x = this.position.x;
      this.node.position.y = this.position.y;
      this.node.position.z = this.position.z;
      this.node.rotation.y = this.heading;
    }

    if (this.faction === 'police') {
      const distance = Math.hypot(world.player.position.x - this.position.x, world.player.position.z - this.position.z);
      if (distance < 18 && world.player.wanted > 0) {
        world.raiseWanted(4);
        world.notify('Police spotted you!');
      }
    }
  }

  takeDamage(amount) {
    this.health = clamp(this.health - amount, 0, 80);
    if (this.health <= 0) {
      this.dead = true;
      if (this.node) {
        this.node.hidden = true;
      }
    }
  }
}
