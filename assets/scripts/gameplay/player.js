import THREE from '../engine/three.js';
import { Entity } from './entity.js';
import { PLAYER_HEALTH, PLAYER_RUN_SPEED, PLAYER_WALK_SPEED, WEAPON_STATS } from './constants.js';

export class Player extends Entity {
  constructor({ mesh, input }) {
    super({ mesh, type: 'player', radius: 1.2, height: 2 });
    this.input = input;
    this.health = PLAYER_HEALTH;
    this.maxHealth = PLAYER_HEALTH;
    this.armor = 75;
    this.maxArmor = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.money = 500;
    this.inventory = new Map();
    this.weapons = ['pistol'];
    this.activeWeapon = 'pistol';
    this.weaponCooldown = 0;
    this.vehicle = null;
    this.isSprinting = false;
    this.cameraOffset = new THREE.Vector3(0, 22, 38);
    this.direction = new THREE.Vector3(0, 0, -1);
    this.aimTarget = new THREE.Vector3();
    this.stats = { kills: 0, arrests: 0, missions: 0 };
  }

  setCameraOffset(offset) {
    this.cameraOffset.copy(offset);
  }

  update(delta) {
    super.update(delta);
    this._recoverStamina(delta);
    if (this.weaponCooldown > 0) {
      this.weaponCooldown = Math.max(0, this.weaponCooldown - delta);
    }
  }

  _recoverStamina(delta) {
    const regenRate = this.isSprinting ? 2 : 15;
    if (!this.input.isDown('shift')) {
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * delta);
    }
  }

  handleMovement(delta, groundNormal = new THREE.Vector3(0, 1, 0)) {
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = groundNormal.clone();

    forward.set(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, up).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.input.isDown('w')) moveZ -= 1;
    if (this.input.isDown('s')) moveZ += 1;
    if (this.input.isDown('a')) moveX -= 1;
    if (this.input.isDown('d')) moveX += 1;

    const movement = forward.clone().multiplyScalar(moveZ).add(right.clone().multiplyScalar(moveX));
    if (movement.lengthSq() > 0) {
      movement.normalize();
      this.direction.copy(movement);
    }

    this.isSprinting = this.input.isDown('shift') && this.stamina > 10;
    const speed = this.isSprinting ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - 22 * delta);
    }

    this.velocity.set(0, 0, 0);
    if (movement.lengthSq() > 0) {
      this.velocity.copy(movement).multiplyScalar(speed);
      const lookTarget = this.mesh.position.clone().add(this.direction);
      this.mesh.lookAt(lookTarget.x, this.mesh.position.y, lookTarget.z);
    }
  }

  applyCamera(camera, { heightOffset = 22, distance = 38, smoothing = 0.12 } = {}) {
    const desired = this.mesh.position
      .clone()
      .add(new THREE.Vector3(0, heightOffset, 0))
      .add(this.direction.clone().multiplyScalar(-distance));

    camera.position.lerp(desired, smoothing);
    const target = this.mesh.position.clone().add(new THREE.Vector3(0, 6, 0));
    camera.lookAt(target);
  }

  equipWeapon(id) {
    if (!this.weapons.includes(id)) {
      this.weapons.push(id);
    }
    this.activeWeapon = id;
  }

  canFire() {
    if (!this.activeWeapon) return false;
    const stats = WEAPON_STATS[this.activeWeapon];
    if (!stats) return false;
    return this.weaponCooldown <= 0;
  }

  onWeaponFired() {
    const stats = WEAPON_STATS[this.activeWeapon];
    if (!stats) return;
    this.weaponCooldown = stats.fireRate;
  }

  enterVehicle(vehicle) {
    this.vehicle = vehicle;
    vehicle.driver = this;
  }

  exitVehicle() {
    if (!this.vehicle) return;
    const vehicle = this.vehicle;
    this.vehicle.driver = null;
    this.vehicle = null;
    const exitOffset = this.direction.clone().multiplyScalar(-4).add(new THREE.Vector3(0, 0, 4));
    const exitPosition = vehicle.mesh.position.clone().add(exitOffset.setY(0));
    this.mesh.position.copy(exitPosition).setY(3);
  }

  addMoney(amount) {
    this.money = Math.max(0, this.money + amount);
  }

  spendMoney(amount) {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }
}
