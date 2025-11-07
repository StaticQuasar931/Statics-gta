const WALK_SPEED = 90;
const RUN_SPEED = 150;
const STAMINA_DRAIN = 22;
const STAMINA_RECOVER = 18;
const SHOOT_COOLDOWN = 0.25;

export class Player {
  constructor(x, y, image) {
    this.x = x;
    this.y = y;
    this.heading = 0;
    this.speed = 0;
    this.image = image;
    this.radius = 18;

    this.health = 120;
    this.armor = 40;
    this.stamina = 100;
    this.money = 3000;

    this.vehicle = null;
    this.hint = 'Press WASD to move · Shift to run';
    this.weapon = 'pistol';
    this.cooldown = 0;
  }

  update(delta, world) {
    if (this.cooldown > 0) {
      this.cooldown -= delta;
    }

    if (this.vehicle) {
      this._updateDriving(delta, world);
    } else {
      this._updateOnFoot(delta, world);
    }

    if (world.input.wasPressed('e')) {
      this._interact(world);
    }

    if (world.input.wasPressed('pointer') && this.cooldown <= 0) {
      this._shoot(world);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);
    if (this.image) {
      ctx.drawImage(this.image, -24, -32, 48, 64);
    } else {
      ctx.fillStyle = '#4df0ff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  cameraTarget() {
    return { x: this.x, y: this.y };
  }

  _updateOnFoot(delta, world) {
    const input = world.input;
    const horizontal = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
    const vertical = (input.isDown('s') ? 1 : 0) - (input.isDown('w') ? 1 : 0);
    const running = input.isDown('shift');

    const magnitude = Math.hypot(horizontal, vertical);
    let dx = 0;
    let dy = 0;
    if (magnitude > 0) {
      const speed = running && this.stamina > 0 ? RUN_SPEED : WALK_SPEED;
      dx = (horizontal / magnitude) * speed * delta;
      dy = (vertical / magnitude) * speed * delta;
      if (running && this.stamina > 0) {
        this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * delta);
      } else {
        this.stamina = Math.min(100, this.stamina + STAMINA_RECOVER * delta);
      }
    } else {
      this.stamina = Math.min(100, this.stamina + STAMINA_RECOVER * delta);
    }

    this.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, this.x + dx));
    this.y = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, this.y + dy));

    if (world.pointerWorld) {
      this.heading = Math.atan2(world.pointerWorld.y - this.y, world.pointerWorld.x - this.x);
    } else if (magnitude > 0) {
      this.heading = Math.atan2(dy, dx);
    }

    this.hint = 'Explore Neon Grandline';
    const nearbyVehicle = world.findNearbyVehicle(this.x, this.y, 40, (vehicle) => !vehicle.driver && !vehicle.locked);
    if (nearbyVehicle) {
      this.hint = `Press E to enter ${nearbyVehicle.name}`;
    } else {
      const loot = world.findNearbyLoot(this.x, this.y, 36);
      if (loot) {
        this.hint = 'Press E to collect cash';
      } else {
        const shop = world.findNearbyShop(this.x, this.y, 42);
        if (shop) {
          this.hint = `Press E to enter ${shop.label}`;
        }
      }
    }
  }

  _updateDriving(delta, world) {
    const input = world.input;
    const throttle = (input.isDown('w') ? 1 : 0) - (input.isDown('s') ? 1 : 0);
    const steer = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
    const brake = input.isDown('space');
    this.vehicle.control(throttle, steer, brake, delta, world);
    this.x = this.vehicle.x;
    this.y = this.vehicle.y;
    this.heading = this.vehicle.heading;
    this.hint = 'Press E to exit vehicle';
  }

  _interact(world) {
    if (this.vehicle) {
      this.vehicle.driver = null;
      this.vehicle = null;
      this.hint = 'Back on foot';
      return;
    }

    const loot = world.findNearbyLoot(this.x, this.y, 30);
    if (loot) {
      world.collectLoot(loot, this);
      return;
    }

    const shop = world.findNearbyShop(this.x, this.y, 40);
    if (shop) {
      world.openShop(shop, this);
      return;
    }

    const vehicle = world.findNearbyVehicle(this.x, this.y, 40, (candidate) => !candidate.driver);
    if (vehicle) {
      this.vehicle = vehicle;
      vehicle.driver = this;
      if (!vehicle.owner || vehicle.owner !== 'player') {
        world.reportCrime('Vehicle theft reported', 12, 'theft');
      }
      world.ui.showToast(`Driving ${vehicle.name}`, 'info');
    }
  }

  _shoot(world) {
    if (!world.pointerWorld) return;
    this.cooldown = SHOOT_COOLDOWN;
    const direction = Math.atan2(world.pointerWorld.y - this.y, world.pointerWorld.x - this.x);
    const muzzleX = this.x + Math.cos(direction) * 24;
    const muzzleY = this.y + Math.sin(direction) * 24;
    world.spawnBullet({ x: muzzleX, y: muzzleY, direction, speed: 560, owner: this });
    world.reportCrime('Gunfire detected', 6, 'gunfire');
  }
}

const WORLD_LIMIT = 1100;
