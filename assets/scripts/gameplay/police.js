const LEVELS = [0, 15, 35, 70, 110, 160];

export class PoliceSystem {
  constructor(world) {
    this.world = world;
    this.wanted = 0;
    this.decayTimer = 0;
    this.alert = false;
  }

  addWanted(amount) {
    this.wanted = Math.min(160, this.wanted + amount);
    this.decayTimer = 12;
  }

  reportCrime(_type, amount) {
    this.addWanted(amount);
    this.alert = true;
  }

  update(delta) {
    if (this.wanted > 0) {
      this.decayTimer -= delta;
      if (this.decayTimer <= 0) {
        this.wanted = Math.max(0, this.wanted - delta * 6);
      }
    }

    const level = this.getLevel();
    if (level >= 2 && this.world.countActivePolice() < level) {
      this.world.spawnPolicePatrol(level);
    }
  }

  getLevel() {
    for (let i = LEVELS.length - 1; i >= 0; i -= 1) {
      if (this.wanted >= LEVELS[i]) return i;
    }
    return 0;
  }
}
