import { clamp, vec3, normalizeVec3 } from '../engine/math.js';

const WALK_SPEED = 18;
const RUN_SPEED = 32;
const TURN_SPEED = 2.8;
const SHOOT_COOLDOWN = 0.28;

export class Player {
  constructor(node) {
    this.node = node;
    this.position = vec3();
    this.heading = 0;
    this.health = 120;
    this.armor = 40;
    this.stamina = 100;
    this.money = 2500;
    this.wanted = 0;
    this.vehicle = null;
    this.activeWeapon = 'pistol';
    this.weaponCooldown = 0;
    this.onFoot = true;
    this.interactHint = '';
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

  attachVehicle(vehicle) {
    this.vehicle = vehicle;
    this.onFoot = false;
    vehicle.driver = this;
  }

  detachVehicle() {
    if (this.vehicle) {
      this.vehicle.driver = null;
      this.vehicle = null;
    }
    this.onFoot = true;
  }

  update(delta, input, world) {
    if (this.weaponCooldown > 0) {
      this.weaponCooldown -= delta;
    }

    if (this.onFoot) {
      this._updateOnFoot(delta, input, world);
    } else if (this.vehicle) {
      this._updateDriving(delta, input, world);
    }

    if (input.wasPressed('e')) {
      this._handleInteract(world);
    }

    if ((input.wasPressed('pointer') || input.wasPressed(' ')) && this.weaponCooldown <= 0) {
      this._fire(world);
    }

    if (this.node) {
      this.node.position.x = this.position.x;
      this.node.position.y = this.position.y;
      this.node.position.z = this.position.z;
      this.node.rotation.y = this.heading;
    }
  }

  _updateOnFoot(delta, input, world) {
    const forward = (input.isDown('w') ? 1 : 0) - (input.isDown('s') ? 1 : 0);
    const turn = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
    const running = input.isDown('shift');

    this.heading += turn * TURN_SPEED * delta;

    const speed = running ? RUN_SPEED : WALK_SPEED;
    const velocity = forward * speed;
    const dx = Math.sin(this.heading) * velocity * delta;
    const dz = Math.cos(this.heading) * velocity * delta;

    if (running && forward !== 0) {
      this.stamina = Math.max(0, this.stamina - delta * 16);
    } else {
      this.stamina = Math.min(100, this.stamina + delta * 12);
    }

    const target = {
      x: this.position.x + dx,
      y: this.position.y,
      z: this.position.z + dz,
    };

    const blocked = world.isBlocked(target.x, target.z, 3.2);
    if (!blocked) {
      this.position.x = target.x;
      this.position.z = target.z;
    }

    this.position.y = world.sampleHeight(this.position.x, this.position.z);
    this.onFoot = true;

    // search for nearby vehicles or loot
    this.interactHint = '';
    const nearbyVehicle = world.findNearestVehicle(this.position, 6, (vehicle) => !vehicle.driver);
    if (nearbyVehicle) {
      this.interactHint = 'Press E to enter vehicle';
    } else {
      const loot = world.findNearestLoot(this.position, 4);
      if (loot) {
        this.interactHint = 'Press E to collect loot';
      } else {
        const shop = world.findNearbyShop(this.position, 6);
        if (shop) {
          this.interactHint = `Press E to enter ${shop.label}`;
        }
      }
    }
  }

  _updateDriving(delta, input, world) {
    if (!this.vehicle) {
      this.onFoot = true;
      return;
    }

    const throttle = (input.isDown('w') ? 1 : 0) - (input.isDown('s') ? 1 : 0);
    const steer = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
    const brake = input.isDown('space') ? 1 : 0;
    this.vehicle.control(throttle, steer, brake, delta, world);
    const seat = this.vehicle.getSeatPosition();
    this.position.x = seat.x;
    this.position.y = seat.y;
    this.position.z = seat.z;
    this.heading = this.vehicle.heading;
    this.interactHint = 'Press E to exit vehicle';
  }

  _handleInteract(world) {
    if (this.onFoot) {
      const loot = world.findNearestLoot(this.position, 3.5);
      if (loot) {
        world.collectLoot(loot, this);
        return;
      }
      const shop = world.findNearbyShop(this.position, 5);
      if (shop) {
        world.openShop(shop, this);
        return;
      }
      const vehicle = world.findNearestVehicle(this.position, 5, (candidate) => !candidate.driver);
      if (vehicle) {
        this.attachVehicle(vehicle);
        world.notify(`Entered ${vehicle.name}`);
      }
    } else {
      this.detachVehicle();
      world.notify('Back on foot');
    }
  }

  _fire(world) {
    if (!this.onFoot && !this.vehicle) return;
    this.weaponCooldown = SHOOT_COOLDOWN;
    const muzzle = {
      x: this.position.x + Math.sin(this.heading) * 2.2,
      y: this.position.y + 4.2,
      z: this.position.z + Math.cos(this.heading) * 2.2,
    };
    const direction = normalizeVec3({ x: Math.sin(this.heading), y: 0, z: Math.cos(this.heading) });
    world.spawnBullet({ origin: muzzle, direction, owner: this, damage: 28 });
    world.raiseWanted(8);
  }

  applyDamage(amount) {
    let remaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining * 0.6);
      this.armor -= absorbed;
      remaining -= absorbed;
    }
    this.health = clamp(this.health - remaining, 0, 150);
  }

  isAlive() {
    return this.health > 0;
  }
}
