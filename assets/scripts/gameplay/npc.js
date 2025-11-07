import { clamp } from '../engine/math.js';

const WALK_SPEED = 12;

export class NPC {
  constructor(node, { faction = 'civilian', mood = 'calm' } = {}, attachments = []) {
    this.node = node;
    this.position = { x: 0, y: 0, z: 0 };
    this.heading = Math.random() * Math.PI * 2;
    this.speed = WALK_SPEED * (0.7 + Math.random() * 0.6);
    this.faction = faction;
    this.mood = mood;
    this.health = 60;
    this.dead = false;
    this.timer = 0;
    this.attachments = attachments;
    this.impactCooldown = 0;
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
    this._updateAttachments();
  }

  update(delta, world) {
    if (this.dead) return;
    this.timer -= delta;
    this.impactCooldown = Math.max(0, this.impactCooldown - delta);
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
    this._updateAttachments();

    if (this.faction === 'police') {
      const distance = Math.hypot(world.player.position.x - this.position.x, world.player.position.z - this.position.z);
      if (distance < 18 && world.player.wanted > 0) {
        world.reportCrime('Spotted by patrol', 'minor', { ...this.position }, { source: 'police', silent: true });
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
      for (const attachment of this.attachments) {
        if (attachment.node) {
          attachment.node.hidden = true;
        }
      }
    }
  }

  registerImpact(force) {
    if (this.dead || this.impactCooldown > 0) return null;
    this.impactCooldown = 1.2;
    this.takeDamage(force);
    return this.dead ? 'fatal' : 'injured';
  }

  _updateAttachments() {
    if (!this.attachments?.length) return;
    const sin = Math.sin(this.heading);
    const cos = Math.cos(this.heading);
    for (const attachment of this.attachments) {
      const { node, offset = { x: 0, y: 0, z: 0 } } = attachment;
      if (!node) continue;
      const x = this.position.x + offset.x * cos + offset.z * sin;
      const z = this.position.z + offset.z * cos - offset.x * sin;
      node.position.x = x;
      node.position.y = this.position.y + offset.y;
      node.position.z = z;
      node.rotation.y = this.heading;
    }
  }
}
