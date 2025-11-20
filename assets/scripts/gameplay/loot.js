export class Loot {
  constructor(x, y, amount, image) {
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.image = image;
    this.timer = 20;
    this.radius = 14;
  }

  update(delta) {
    this.timer -= delta;
    this.bob = Math.sin(performance.now() / 240) * 4;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - this.bob);
    if (this.image) {
      ctx.drawImage(this.image, -18, -18, 36, 36);
    } else {
      ctx.fillStyle = '#ffd25d';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
