/**
 * MissionSystem provides a lightweight task framework and demo missions.
 */
export class MissionSystem {
    constructor(economySystem, policeSystem) {
        this.economySystem = economySystem;
        this.policeSystem = policeSystem;
        this.activeMission = null;
        this.missions = [
            {
                id: 'tutorial',
                name: 'Tutorial Getaway',
                description: 'Steal the marked car and escape the small police patrol.',
                reward: 500,
                steps: ['Reach the car', 'Escape the cops', 'Reach the safehouse'],
            },
            {
                id: 'heist',
                name: 'Downtown Heist',
                description: 'Rob the downtown bank and deliver the cash to a fence.',
                reward: 1200,
                steps: ['Enter the bank', 'Crack the vault', 'Lose wanted level', 'Deliver cash'],
            },
        ];
    }

    startMission(id) {
        this.activeMission = this.missions.find((mission) => mission.id === id) || null;
        if (this.activeMission) {
            this.activeMission.stepIndex = 0;
        }
        return this.activeMission;
    }

    completeStep() {
        if (!this.activeMission) return null;
        this.activeMission.stepIndex += 1;
        if (this.activeMission.stepIndex >= this.activeMission.steps.length) {
            const reward = this.economySystem.award(this.activeMission.reward, this.activeMission.name);
            this.policeSystem.reportCrime(-1, { x: 0, y: 0 });
            const completed = this.activeMission;
            this.activeMission = null;
            return { completed, reward };
        }
        return this.activeMission.steps[this.activeMission.stepIndex];
    }
}
