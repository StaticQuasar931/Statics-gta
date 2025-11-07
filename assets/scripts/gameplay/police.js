import { Vehicle } from './vehicle.js';

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
    const newLevel = Math.min(5, Math.floor(value / 25));
    if (newLevel !== this.level) {
      this.level = newLevel;
      if (this.level === 0) {
        this._recallUnits();
        this.world.ui.showToast('Metro patrol stood down.', 'info');
      } else {
        this.world.ui.showToast(`Wanted level ${this.level}. Metro patrol inbound!`, 'warning');
      }
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
