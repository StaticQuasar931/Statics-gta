import { Vehicle } from './vehicle.js';

const STAR_THRESHOLDS = [0, 50, 120, 300, 600, 1000];

export class PoliceSystem {
  constructor(world) {
    this.world = world;
    this.wanted = 0;
    this.level = 0;
    this.spawnTimer = 0;
    this.units = new Set();
  }

  setWanted(value) {
    this.wanted = value;
    let newLevel = 0;
    for (let i = STAR_THRESHOLDS.length - 1; i >= 0; i -= 1) {
      if (value >= STAR_THRESHOLDS[i]) {
        newLevel = i;
        break;
      }
    }
    if (newLevel !== this.level) {
      const previous = this.level;
      this.level = newLevel;
      if (this.level === 0) {
        this._recallUnits();
        this.world.ui.showToast('Metro patrol stood down.', 'info');
      } else {
        const flavour = this.level >= 4 ? 'Special Tactical teams' : 'Metro patrol';
        const escalation = this.level > previous ? 'inbound' : 'still tracking';
        this.world.ui.showToast(`Wanted level ${this.level}. ${flavour} ${escalation}!`, 'warning');
      }
      this.spawnTimer = 0.25;
    }
  }

  update(delta) {
    this.spawnTimer -= delta;
    if (this.level > 0 && this.spawnTimer <= 0) {
      this._spawnResponse();
      this.spawnTimer = Math.max(6 - this.level, 2.5);
    }

    for (const unit of Array.from(this.units)) {
      if (!this.world.vehicles.includes(unit)) {
        this.units.delete(unit);
        continue;
      }

      if (this.level === 0 || this.world.player.down) continue;

      if (unit.fireCooldown <= 0) {
        const dx = this.world.player.x - unit.x;
        const dy = this.world.player.y - unit.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 420) {
          const direction = Math.atan2(dy, dx);
          const muzzleX = unit.x + Math.cos(direction) * 32;
          const muzzleY = unit.y + Math.sin(direction) * 32;
          this.world.spawnBullet({
            x: muzzleX,
            y: muzzleY,
            direction,
            speed: 520,
            owner: unit,
            damage: 36 + this.level * 4,
          });
          unit.fireCooldown = Math.max(1.6, 2.6 - this.level * 0.35);
        }
      }
    }
  }

  _spawnResponse() {
    const image = this.level >= 4 ? this.world.assets.get('swat') : this.world.assets.get('police');
    const heading = Math.random() * Math.PI * 2;
    const radius = 520 + Math.random() * 160;
    const x = this.world.player.x + Math.cos(heading) * radius;
    const y = this.world.player.y + Math.sin(heading) * radius;
    const vehicle = new Vehicle(x, y, heading + Math.PI, image);
    vehicle.ai = 'police';
    vehicle.faction = 'police';
    vehicle.owner = 'metro';
    vehicle.maxSpeed = 260 + this.level * 20;
    vehicle.acceleration = 160;
    vehicle.locked = true;
    this.units.add(vehicle);
    this.world.addVehicle(vehicle);
  }

  _recallUnits() {
    for (const unit of this.units) {
      this.world.removeVehicle(unit);
    }
    this.units.clear();
  }
}
