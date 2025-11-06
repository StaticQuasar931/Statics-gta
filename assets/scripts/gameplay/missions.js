import { randomChoice } from '../util/random.js';

const MISSION_POOL = [
  { id: 'heist', label: 'Bank Heist', payout: [65000, 95000], wanted: 40 },
  { id: 'race', label: 'Downtown Sprint', payout: [12000, 22000], wanted: 10 },
  { id: 'delivery', label: 'Courier Drop', payout: [8000, 15000], wanted: 5 },
  { id: 'rescue', label: 'Rescue Civilians', payout: [18000, 26000], wanted: -15 },
  { id: 'escort', label: 'Convoy Escort', payout: [20000, 38000], wanted: 15 },
  { id: 'bounty', label: 'Bounty Hunt', payout: [14000, 32000], wanted: 25 },
];

export class MissionSystem {
  constructor(economy, ui) {
    this.economy = economy;
    this.ui = ui;
    this.activeMission = null;
    this.completed = [];
  }

  rollMission() {
    const mission = randomChoice(MISSION_POOL);
    this.activeMission = { ...mission, progress: 0, steps: [] };
    this.ui.updateMission(this.activeMission);
    return this.activeMission;
  }

  completeMission(success = true) {
    if (!this.activeMission) return;
    if (success) {
      const [min, max] = this.activeMission.payout;
      const reward = Math.floor(Math.random() * (max - min) + min);
      this.economy.earn(this.activeMission.label, reward);
      this.completed.push({ ...this.activeMission, reward, success: true });
    } else {
      this.completed.push({ ...this.activeMission, success: false });
      this.ui.showToast(`${this.activeMission.label} failed`, 'error');
    }
    this.activeMission = null;
    this.ui.updateMission(null);
  }
}
