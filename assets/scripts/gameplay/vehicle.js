const BASE_FRICTION = 0.92;
const BRAKE_FORCE = 0.7;
const STEER_SPEED = 2.6;

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
    this.maxSpeed = 240;
    this.acceleration = 120;
    this.faction = 'civ';
    this.locked = false;
    this.ai = null;
    this.owner = 'civ';
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

    this.speed *= BASE_FRICTION;

    if (Math.abs(this.speed) < 2) {
      this.speed = 0;
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
      this.speed *= BRAKE_FORCE;
    }

    if (this.speed !== 0) {
      this.heading += steer * STEER_SPEED * delta * Math.sign(this.speed);
    }

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
        world.reportCrime('Vehicular impact', 8, 'collision');
        if (ped.dead) {
          world.reportCrime('Vehicular manslaughter', 16, 'homicide');
          const payout = 120 + Math.floor(Math.random() * 180);
          world.spawnLoot(ped.x, ped.y, payout);
        }
      }
    }
  }

  _updateTraffic(delta, world) {
    if (Math.abs(this.speed) < 20) {
      this.speed = 80 + Math.random() * 40;
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
    const desired = distance > 140 ? this.maxSpeed : this.maxSpeed * 0.4;
    this.speed += (desired - this.speed) * 0.6 * delta;
    if (distance < 80 && world.player.vehicle === this) {
      world.reportCrime('Police collision', 6, 'collision');
    }
  }
}

const BOUND = 1100;

function randomName() {
  const prefixes = ['Aurora', 'Pulse', 'Vortex', 'Phantom', 'Metro'];
  const suffixes = ['GT', 'Runner', 'Cruiser', 'Sprint', 'Wave'];
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}
