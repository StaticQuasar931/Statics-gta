const WALK_SPEED = 40;
const PANIC_SPEED = 110;

export class Pedestrian {
  constructor(x, y, image, role = 'civilian') {
    this.x = x;
    this.y = y;
    this.heading = Math.random() * Math.PI * 2;
    this.speed = WALK_SPEED;
    this.image = image;
    this.role = role;
    this.radius = 16;
    this.dead = false;
    this.panic = false;
    this.timer = 3 + Math.random() * 4;
  }

  update(delta, world) {
    if (this.dead) return;

    this.timer -= delta;
    if (this.timer <= 0) {
      this.timer = 2 + Math.random() * 3;
      this.heading += (Math.random() - 0.5) * Math.PI * 0.7;
      if (this.panic) {
        this.speed = PANIC_SPEED;
      } else {
        this.speed = WALK_SPEED + Math.random() * 20;
      }
    }

    if (world.wanted > 50 && Math.random() < 0.01) {
      this.panic = true;
      this.speed = PANIC_SPEED;
    }

    this.x += Math.cos(this.heading) * this.speed * delta;
    this.y += Math.sin(this.heading) * this.speed * delta;

    const limit = 1100;
    if (this.x < -limit || this.x > limit || this.y < -limit || this.y > limit) {
      this.heading += Math.PI;
    }

    if (Math.random() < 0.002 && this.role !== 'cop') {
      world.spawnLoot(this.x, this.y, 30 + Math.floor(Math.random() * 60));
    }

    const distanceToPlayer = Math.hypot(world.player.x - this.x, world.player.y - this.y);
    if (distanceToPlayer < 140 && world.player.vehicle && !this.panic) {
      this.panic = true;
      this.speed = PANIC_SPEED;
    }
  }

  draw(ctx) {
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.heading);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ff5166';
      ctx.fillRect(-18, -6, 36, 12);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);
    if (this.image) {
      ctx.drawImage(this.image, -20, -26, 40, 52);
    } else {
      ctx.fillStyle = this.role === 'gang' ? '#ff6b6b' : '#9bc9ff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  takeDamage(amount, world) {
    if (this.dead) return;
    if (amount > 50) {
      this.dead = true;
      const bounty = this.role === 'cop' ? 40 + Math.floor(Math.random() * 60) : 80 + Math.floor(Math.random() * 120);
      world.spawnLoot(this.x, this.y, bounty);
      if (this.role === 'cop') {
        world.reportCrime('Officer down', 180, 'homicide');
      } else {
        world.reportCrime('Civilian killed', 100, 'homicide');
      }
    } else {
      this.panic = true;
      this.speed = PANIC_SPEED;
      world.reportCrime('Shots fired near crowd', 22, 'gunfire');
    }
  }
}
