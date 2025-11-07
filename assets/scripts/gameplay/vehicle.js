import { clamp } from '../engine/math.js';

const BASE_ACCELERATION = 32;
const BASE_TURN = 1.8;

export class Vehicle {
  constructor(node, { name = 'Vehicle', maxSpeed = 90, grip = 1, faction = 'civilian' } = {}) {
    this.node = node;
    this.name = name;
    this.position = { x: 0, y: 2, z: 0 };
    this.heading = 0;
    this.speed = 0;
    this.maxSpeed = maxSpeed;
    this.grip = grip;
    this.faction = faction;
    this.health = 150;
    this.driver = null;
    this.ai = null;
    this.turnVelocity = 0;
  }

  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    if (this.node) {
      this.node.position.x = x;
      this.node.position.y = y;
      this.node.position.z = z;
    }
  }

  setHeading(angle) {
    this.heading = angle;
    if (this.node) {
      this.node.rotation.y = this.heading;
    }
  }

  control(throttle, steer, brake, delta, world) {
    const accel = BASE_ACCELERATION * throttle;
    if (brake > 0) {
      this.speed = clamp(this.speed - brake * 60 * delta, -this.maxSpeed * 0.35, this.maxSpeed);
    }
    this.speed += accel * delta;
    const drag = 1 - Math.min(Math.abs(this.speed) / this.maxSpeed, 1) * 0.08;
    this.speed *= drag;
    this.speed = clamp(this.speed, -this.maxSpeed * 0.35, this.maxSpeed);

    if (Math.abs(this.speed) > 2) {
      this.heading += steer * BASE_TURN * delta * this.grip * Math.sign(this.speed);
    }

    const dx = Math.sin(this.heading) * this.speed * delta;
    const dz = Math.cos(this.heading) * this.speed * delta;
    const targetX = this.position.x + dx;
    const targetZ = this.position.z + dz;
    if (!world.isBlocked(targetX, targetZ, 4.4)) {
      this.position.x = targetX;
      this.position.z = targetZ;
    } else {
      this.speed *= -0.4;
    }

    this.position.y = world.sampleHeight(this.position.x, this.position.z) + 2;

    if (this.node) {
      this.node.position.x = this.position.x;
      this.node.position.y = this.position.y;
      this.node.position.z = this.position.z;
      this.node.rotation.y = this.heading;
    }
  }

  updateAI(delta, world) {
    if (!this.ai) return;
    if (this.ai.type === 'traffic') {
      this._trafficUpdate(delta, world);
    } else if (this.ai.type === 'police') {
      this._policeUpdate(delta, world);
    }
  }

  _trafficUpdate(delta, world) {
    const target = this.ai.target;
    if (!target || Math.hypot(target.x - this.position.x, target.z - this.position.z) < 8) {
      this.ai.target = world.pickTrafficDestination();
    }
    const direction = Math.atan2(target.x - this.position.x, target.z - this.position.z);
    const steerError = ((direction - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const steer = clamp(steerError / Math.PI, -1, 1);
    this.control(0.9, steer, 0, delta, world);
  }

  _policeUpdate(delta, world) {
    const { target } = this.ai;
    if (!target) return;
    const direction = Math.atan2(target.position.x - this.position.x, target.position.z - this.position.z);
    const steerError = ((direction - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const steer = clamp(steerError / Math.PI, -1, 1);
    const distance = Math.hypot(target.position.x - this.position.x, target.position.z - this.position.z);
    const brake = distance < 15 ? 0.6 : 0;
    this.control(1, steer, brake, delta, world);
    if (distance < 6 && target.onFoot) {
      target.applyDamage(12 * delta);
      world.raiseWanted(4);
      world.notify('Police contact!');
    }
  }

  getSeatPosition() {
    return {
      x: this.position.x + Math.sin(this.heading) * 1.2,
      y: this.position.y + 1.6,
      z: this.position.z + Math.cos(this.heading) * 1.2,
    };
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }
}
