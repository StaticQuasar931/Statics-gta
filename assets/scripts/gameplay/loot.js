export class Loot {
  constructor(node, amount = 150) {
    this.node = node;
    this.amount = amount;
    this.position = { x: 0, y: 0, z: 0 };
    this.heightOffset = Math.random() * Math.PI * 2;
  }

  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  }

  update(delta) {
    if (!this.node) return;
    this.heightOffset += delta;
    const bob = Math.sin(this.heightOffset) * 0.6;
    this.node.position.x = this.position.x;
    this.node.position.y = this.position.y + 1.5 + bob;
    this.node.position.z = this.position.z;
  }
}
