import THREE from '../engine/three.js';

export class Loot {
  constructor({ mesh, amount = 100, ttl = 35 }) {
    this.mesh = mesh;
    this.amount = amount;
    this.ttl = ttl;
    this.elapsed = 0;
    this.pulse = 0;
    this.hitbox = new THREE.Box3().setFromObject(mesh);
  }

  update(delta) {
    this.elapsed += delta;
    this.pulse += delta * 4;
    this.mesh.position.y = 2 + Math.sin(this.pulse) * 0.8;
    this.hitbox.setFromObject(this.mesh);
  }

  isExpired() {
    return this.elapsed >= this.ttl;
  }
}
