/**
 * Tracks the player's wanted level and orchestrates police AI spawns.
 */
export class PoliceSystem {
    constructor(vehicleManager, npcManager) {
        this.vehicleManager = vehicleManager;
        this.npcManager = npcManager;
        this.wantedLevel = 0;
        this.heat = 0;
        this.timer = 0;
    }

    update(dt, playerPosition) {
        this.timer += dt;
        if (this.wantedLevel > 0) {
            this.heat = Math.max(0, this.heat - dt * 5);
            if (this.heat <= 0) {
                this.wantedLevel -= 1;
                this.heat = 20; // 20 seconds per level
            }
        }

        // Spawn police vehicles based on wanted level
        if (this.timer > 5 && this.wantedLevel > 0) {
            this.timer = 0;
            this.vehicleManager.spawnVehicle({
                type: 'police',
                color: '#74b9ff',
                position: {
                    x: playerPosition.x + (Math.random() * 400 - 200),
                    y: playerPosition.y + (Math.random() * 400 - 200),
                },
                ai: 'police',
                maxSpeed: 3.2,
                acceleration: 0.2,
                handling: 0.12,
                target: { ...playerPosition },
            });
            this.npcManager.spawnPolicePatrol(playerPosition, this.wantedLevel);
        }
    }

    reportGunshot(position) {
        this._increaseWanted(1, position);
    }

    reportCrime(severity, position) {
        this._increaseWanted(severity, position);
    }

    _increaseWanted(amount, position) {
        this.wantedLevel = Math.max(0, Math.min(5, this.wantedLevel + amount));
        if (this.wantedLevel > 0) {
            this.heat = 30;
            this.npcManager.alertPolice(position, this.wantedLevel);
        }
    }
}
