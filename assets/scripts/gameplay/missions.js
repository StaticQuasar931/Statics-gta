const MISSION_POOL = [
  {
    label: 'Courier Dash',
    description: 'Race across Neon Square to deliver encrypted drives.',
    duration: 120,
    reward: 650,
    start(world) {
      this.target = { x: world.player.x + 280, y: world.player.y - 120 };
    },
    update(delta, world) {
      const distance = Math.hypot(world.player.x - this.target.x, world.player.y - this.target.y);
      if (distance < 60) {
        this.completed = true;
      }
    },
  },
  {
    label: 'High Stakes Escape',
    description: 'Steal a sports car and outrun the Metro patrol for two minutes.',
    duration: 150,
    reward: 900,
    start(world) {
      world.reportCrime('Mission: carjacking underway', 18, 'theft');
    },
    update(delta, world) {
      if (world.player.vehicle && world.police.level >= 2) {
        this.timerWhileDriving = (this.timerWhileDriving ?? 0) + delta;
        if (this.timerWhileDriving >= 40) {
          this.completed = true;
        }
      }
    },
  },
  {
    label: 'Vault Breach',
    description: 'Hit the Aurora Bank and escape with $1500.',
    duration: 180,
    reward: 1500,
    start(world) {
      this.collected = 0;
    },
    update(delta, world) {
      if (world.player.money >= (this.startingMoney ??= world.player.money) + 1500) {
        this.completed = true;
      }
    },
  },
];

export class MissionSystem {
  constructor(ui) {
    this.ui = ui;
    this.activeMission = null;
  }

  nextMission(world) {
    const missionTemplate = MISSION_POOL[Math.floor(Math.random() * MISSION_POOL.length)];
    const mission = { ...missionTemplate };
    mission.elapsed = 0;
    mission.completed = false;
    mission.failed = false;
    mission.start?.(world);
    this.activeMission = mission;
    this.ui.showMission(mission.label, mission.description);
  }

  update(delta, world) {
    if (!this.activeMission) return;
    const mission = this.activeMission;
    mission.elapsed += delta;
    mission.update?.(delta, world);
    if (mission.completed) {
      world.player.money += mission.reward;
      this.ui.showToast(`${mission.label} complete! +$${mission.reward}`, 'success');
      world.reportCrime('Mission complete payout', 0, 'gunfire');
      this.activeMission = null;
      return;
    }
    if (mission.elapsed >= mission.duration) {
      this.ui.showToast(`${mission.label} failed`, 'error');
      this.activeMission = null;
    }
  }
}
