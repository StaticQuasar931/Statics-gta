const BASE_FRICTION = 0.985;
const BRAKE_FORCE = 4.2;
const STEER_SPEED = 2.9;

export class Vehicle {
  constructor(x, y, heading, image) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.speed = 0;
    this.image = image;
    this.driver = null;
    this.radius = 26;
    this.name = randomName();
    this.maxSpeed = 320;
    this.acceleration = 200;
    this.faction = 'civ';
    this.locked = false;
    this.ai = null;
    this.owner = 'civ';
    this.hp = 180;
    this.fireCooldown = 0;
  }

  update(delta, world) {
    if (!this.driver) {
      if (this.ai === 'traffic') {
        this._updateTraffic(delta, world);
      } else if (this.ai === 'police') {
        this._updatePolice(delta, world);
      }
    }

    this.x += Math.cos(this.heading) * this.speed * delta;
    this.y += Math.sin(this.heading) * this.speed * delta;

    const frictionFactor = Math.pow(BASE_FRICTION, delta * 60);
    this.speed *= frictionFactor;

    if (Math.abs(this.speed) < 2) {
      this.speed = 0;
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    }

    if (this.driver === world.player) {
      this._checkCollisions(world);
    }
  }

  control(throttle, steer, brake, delta, world) {
    const targetSpeed = throttle * this.maxSpeed;
    const acceleration = this.acceleration * delta;
    if (throttle !== 0) {
      this.speed += (targetSpeed - this.speed) * Math.min(1, acceleration / this.maxSpeed);
    }

    if (brake) {
      const brakeFactor = Math.max(0, 1 - BRAKE_FORCE * delta);
      this.speed *= brakeFactor;
    }

    if (this.speed !== 0) {
      this.heading += steer * STEER_SPEED * delta * Math.sign(this.speed);
    }

    const maxForward = this.maxSpeed;
    const maxReverse = this.maxSpeed * 0.45;
    this.speed = Math.max(-maxReverse, Math.min(this.speed, maxForward));

    this.x = Math.max(-BOUND, Math.min(BOUND, this.x));
    this.y = Math.max(-BOUND, Math.min(BOUND, this.y));

    if (this.driver === world.player) {
      const target = world.pointerWorld;
      if (target) {
        this.heading += ((Math.atan2(target.y - this.y, target.x - this.x) - this.heading + Math.PI * 3) % (Math.PI * 2) - Math.PI * 1.5) * 0.02;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);
    ctx.save();
    ctx.scale(1.4, 0.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (this.image) {
      ctx.drawImage(this.image, -36, -20, 72, 40);
    } else {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(-32, -18, 64, 36);
    }
    ctx.restore();
  }

  _checkCollisions(world) {
    for (const ped of world.pedestrians) {
      if (ped.dead) continue;
      const distance = Math.hypot(ped.x - this.x, ped.y - this.y);
      if (distance < this.radius + ped.radius) {
        ped.takeDamage(Math.abs(this.speed) * 0.6 + 20, world);
        world.reportCrime('Vehicular impact', 28, 'collision');
        if (ped.dead) {
          world.reportCrime('Vehicular manslaughter', 60, 'homicide');
          const payout = 120 + Math.floor(Math.random() * 180);
          world.spawnLoot(ped.x, ped.y, payout);
        }
      }
    }
  }

  _updateTraffic(delta, world) {
    if (Math.abs(this.speed) < 50) {
      this.speed = 120 + Math.random() * 80;
    }
    this.heading += Math.sin(world.dayTime / 60 + this.x * 0.001) * 0.01;
  }

  _updatePolice(delta, world) {
    const target = world.player;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const angle = Math.atan2(dy, dx);
    const steer = Math.sin(angle - this.heading);
    this.heading += steer * 2.8 * delta;
    const distance = Math.hypot(dx, dy);
    const desired = distance > 140 ? this.maxSpeed : this.maxSpeed * 0.5;
    this.speed += (desired - this.speed) * 0.7 * delta;
    if (distance < 80 && world.player.vehicle === this) {
      world.reportCrime('Police collision', 26, 'collision');
    }
  }

  applyDamage(amount, world) {
    this.hp -= amount;
    if (this.hp > 0) return;
    if (this.faction === 'police') {
      world.reportCrime('Metro unit destroyed', 140, 'homicide');
    }
    world.spawnLoot(this.x, this.y, 180 + Math.floor(Math.random() * 160));
    world.removeVehicle(this);
    if (world.police?.units) {
      world.police.units.delete(this);
    }
  }
}

const BOUND = 1100;

function randomName() {
  const prefixes = ['Aurora', 'Pulse', 'Vortex', 'Phantom', 'Metro'];
  const suffixes = ['GT', 'Runner', 'Cruiser', 'Sprint', 'Wave'];
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}
