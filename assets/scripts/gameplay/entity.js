import THREE from '../engine/three.js';

export class Entity {
  constructor({ mesh, type, radius = 1.5, height = 2.2 }) {
    this.mesh = mesh;
    this.type = type;
    this.radius = radius;
    this.height = height;
    this.velocity = new THREE.Vector3();
    this.health = 100;
    this.maxHealth = 100;
    this.isAlive = true;
    this.hitbox = new THREE.Box3();
    this._updateHitbox();
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
    this._updateHitbox();
  }

  translate(dx, dy, dz) {
    this.mesh.position.x += dx;
    this.mesh.position.y += dy;
    this.mesh.position.z += dz;
    this._updateHitbox();
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      this.onDeath?.();
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  update(delta) {
    if (!this.isAlive) return;
    this.mesh.position.addScaledVector(this.velocity, delta);
    this._updateHitbox();
  }

  _updateHitbox() {
    this.hitbox.setFromObject(this.mesh);
  }
}
