import { POLICE_RESPONSES, WANTED_THRESHOLDS } from './constants.js';

export class PoliceSystem {
  constructor(world, ui) {
    this.world = world;
    this.ui = ui;
    this.wantedScore = 0;
    this.decayTimer = 0;
    this.activeLevel = 0;
    this.dispatchCooldown = 0;
  }

  addWanted(amount) {
    this.wantedScore = Math.min(999, this.wantedScore + amount);
    this.decayTimer = 0;
    this._updateWantedLevel();
  }

  reduceWanted(amount) {
    this.wantedScore = Math.max(0, this.wantedScore - amount);
    this._updateWantedLevel();
  }

  update(delta) {
    this.decayTimer += delta;
    if (this.decayTimer > 20 && this.wantedScore > 0) {
      this.wantedScore = Math.max(0, this.wantedScore - delta * 6);
      this._updateWantedLevel();
    }

    if (this.dispatchCooldown > 0) {
      this.dispatchCooldown -= delta;
    }

    const currentResponse = POLICE_RESPONSES[this.activeLevel - 1];
    if (currentResponse && this.dispatchCooldown <= 0) {
      this.world.dispatchPoliceUnits(currentResponse);
      this.dispatchCooldown = 25;
    }
  }

  _updateWantedLevel() {
    let level = 0;
    for (let i = 0; i < WANTED_THRESHOLDS.length; i += 1) {
      if (this.wantedScore >= WANTED_THRESHOLDS[i]) {
        level = i;
      }
    }
    if (level !== this.activeLevel) {
      this.activeLevel = level;
      this.ui.updateWantedLevel(level);
    }
  }
}
