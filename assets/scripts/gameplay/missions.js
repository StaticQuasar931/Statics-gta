const MISSIONS = [
  {
    id: 'courier',
    label: 'Neon Courier',
    description: 'Deliver a payload to the harbor district without losing your vehicle.',
    reward: 2200,
  },
  {
    id: 'heist',
    label: 'Micro Vault Heist',
    description: 'Infiltrate the Skyline Bank branch and escape with any loot you find.',
    reward: 5600,
  },
  {
    id: 'race',
    label: 'Gridlock Grand Prix',
    description: 'Win a night sprint through Downtown traffic checkpoints.',
    reward: 3200,
  },
];

export class MissionSystem {
  constructor(ui) {
    this.ui = ui;
    this.activeMission = null;
    this.progress = 0;
  }

  nextMission(player) {
    const mission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
    this.activeMission = mission;
    this.progress = 0;
    this.ui.showToast(`Mission started: ${mission.label}`, 'info');
    this.ui.showMission(mission.label, mission.description);
  }

  completeMission(player) {
    if (!this.activeMission) return;
    player.money += this.activeMission.reward;
    this.ui.showToast(`Mission complete! Earned $${this.activeMission.reward.toLocaleString()}`, 'success');
    this.ui.showMission('Free Roam', 'Explore, earn cash, or trigger another mission.');
    this.activeMission = null;
  }
}
