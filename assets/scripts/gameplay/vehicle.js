import THREE from '../engine/three.js';
import { Entity } from './entity.js';
import { VEHICLE_SPEEDS, VEHICLE_ACCELERATION, VEHICLE_TURN_RATE } from './constants.js';

export class Vehicle extends Entity {
  constructor({ mesh, id, ai = null }) {
    super({ mesh, type: 'vehicle', radius: 3.6, height: 2.2 });
    this.id = id;
    this.maxSpeed = VEHICLE_SPEEDS[id] ?? 60;
    this.acceleration = VEHICLE_ACCELERATION;
    this.turnRate = VEHICLE_TURN_RATE;
    this.speed = 0;
    this.heading = 0;
    this.driver = null;
    this.ai = ai;
    this.fuel = 100;
    this.maxFuel = 100;
    this.integrity = 100;
    this.hitPoints = 120;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.brakeInput = 0;
    this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.target = new THREE.Vector3();
  }

  update(delta) {
    if (!this.isAlive) return;

    if (this.driver) {
      this._applyControls(delta);
    } else if (this.ai) {
      this.ai.update(this, delta);
    } else {
      this._applyFriction(delta);
    }

    super.update(delta);
    this._updateOrientation();
    this._consumeFuel(delta);
  }

  _applyControls(delta) {
    const accel = this.acceleration * this.throttleInput;
    this.speed += accel * delta;
    if (this.brakeInput > 0) {
      this.speed = Math.max(0, this.speed - (this.acceleration * 1.8) * this.brakeInput * delta);
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed * 0.35, this.maxSpeed);
    const turnAmount = this.steerInput * this.turnRate * delta * (this.speed / this.maxSpeed);
    this.heading += turnAmount;
    this.mesh.rotation.y = -this.heading;

    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.velocity.copy(forward.multiplyScalar(this.speed));
  }

  _applyFriction(delta) {
    if (Math.abs(this.speed) < 0.1) {
      this.speed = 0;
      this.velocity.set(0, 0, 0);
      return;
    }
    const friction = 12 * delta;
    this.speed -= Math.sign(this.speed) * friction;
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.velocity.copy(forward.multiplyScalar(this.speed));
  }

  _updateOrientation() {
    if (this.velocity.lengthSq() > 0.0001) {
      const headingVec = this.velocity.clone().normalize();
      this.heading = Math.atan2(headingVec.x, headingVec.z);
      this.mesh.rotation.y = -this.heading;
    }
  }

  _consumeFuel(delta) {
    if (this.speed === 0) return;
    const consumption = Math.abs(this.speed) / this.maxSpeed * delta * 0.9;
    this.fuel = Math.max(0, this.fuel - consumption);
    if (this.fuel <= 0) {
      this.speed = 0;
      this.throttleInput = 0;
    }
  }

  applyInputs({ throttle = 0, steer = 0, brake = 0 }) {
    this.throttleInput = THREE.MathUtils.clamp(throttle, -1, 1);
    this.steerInput = THREE.MathUtils.clamp(steer, -1, 1);
    this.brakeInput = THREE.MathUtils.clamp(brake, 0, 1);
  }

  repair(amount = 25) {
    this.integrity = Math.min(100, this.integrity + amount);
  }

  refuel(amount = 20) {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    this.integrity = Math.max(0, this.integrity - amount * 0.8);
  }
}
