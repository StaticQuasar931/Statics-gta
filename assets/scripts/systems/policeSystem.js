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
        this.dispatchTimer = 0;
        this.lastKnownPosition = null;
        this.helicopter = null;
        this.roadblocks = [];
    }

    update(dt, playerPosition) {
        this.timer += dt;
        this.dispatchTimer += dt;
        if (this.wantedLevel > 0) {
            this.heat = Math.max(0, this.heat - dt * (1.2 - Math.min(0.6, this.wantedLevel * 0.1)));
            this.lastKnownPosition = { ...playerPosition };
            if (this.heat <= 0) {
                this.wantedLevel = Math.max(0, this.wantedLevel - 1);
                this.heat = 18 + this.wantedLevel * 6;
            }
        } else {
            this.helicopter = null;
            this.lastKnownPosition = null;
        }

        // Spawn police vehicles based on wanted level
        if (this.dispatchTimer > this._dispatchInterval() && this.wantedLevel > 0) {
            this.dispatchTimer = 0;
            this._spawnResponseUnits(playerPosition);
            this.npcManager.spawnPolicePatrol(playerPosition, this.wantedLevel);
        }

        const pursuitTarget = this.lastKnownPosition || playerPosition;
        for (const vehicle of this.vehicleManager.vehicles) {
            if (vehicle.ai === 'police') {
                vehicle.target = { ...pursuitTarget };
                vehicle.maxSpeed = Math.max(vehicle.maxSpeed, 2.6 + this.wantedLevel * 0.5);
                vehicle.handling = Math.max(vehicle.handling, 0.1 + this.wantedLevel * 0.02);
            }
        }

        this.npcManager.alertPolice(pursuitTarget, this.wantedLevel);
        this._pruneRoadblocks();
        if (this.wantedLevel >= 4) {
            this._maintainRoadblocks(pursuitTarget);
        } else if (this.roadblocks.length) {
            this._clearRoadblocks();
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
            this.lastKnownPosition = { ...position };
        }
    }

    _dispatchInterval() {
        const base = 8 - this.wantedLevel * 1.2;
        return Math.max(2.5, base);
    }

    _currentUnitCap() {
        return 2 + Math.ceil(this.wantedLevel * 1.2);
    }

    _spawnResponseUnits(playerPosition) {
        const activeVehicles = this.vehicleManager.vehicles.filter((veh) => veh.ai === 'police');
        const capacity = this._currentUnitCap();
        if (activeVehicles.length >= capacity) return;
        const spawnCount = Math.min(capacity - activeVehicles.length, Math.ceil(this.wantedLevel / 2));

        for (let i = 0; i < spawnCount; i++) {
            const spawn = this.vehicleManager.spawnVehicle({
                type: this.wantedLevel >= 3 && i === spawnCount - 1 ? 'swat' : 'police',
                color: '#74b9ff',
                position: {
                    x: playerPosition.x + (Math.random() * 500 - 250),
                    y: playerPosition.y + (Math.random() * 500 - 250),
                },
                ai: 'police',
                maxSpeed: 2.8 + this.wantedLevel * 0.5,
                acceleration: 0.18 + this.wantedLevel * 0.04,
                handling: 0.1 + this.wantedLevel * 0.03,
                target: { ...playerPosition },
                spriteId: this.wantedLevel >= 3 && i === spawnCount - 1 ? 'swat' : 'police',
                displayName: this.wantedLevel >= 3 && i === spawnCount - 1 ? 'SWAT Van' : 'Police Cruiser',
                length: this.wantedLevel >= 3 && i === spawnCount - 1 ? 48 : 34,
                width: this.wantedLevel >= 3 && i === spawnCount - 1 ? 22 : 18,
            });
            spawn.color = this.wantedLevel >= 3 && i === spawnCount - 1 ? '#636e72' : '#74b9ff';
        }

        if (this.wantedLevel >= 4 && !this.helicopter) {
            this.helicopter = this.vehicleManager.spawnVehicle({
                type: 'helicopter',
                color: '#b2bec3',
                position: {
                    x: playerPosition.x + 200,
                    y: playerPosition.y - 200,
                },
                ai: 'police',
                maxSpeed: 3.6,
                acceleration: 0.12,
                handling: 0.18,
                target: { ...playerPosition },
                spriteId: 'helicopter',
                displayName: 'Police Helicopter',
                length: 64,
                width: 40,
            });
        }
    }

    _maintainRoadblocks(playerPosition) {
        const desired = 2;
        const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
        const bounds = { minX: 60, minY: 60, maxX: 1220, maxY: 660 };
        while (this.roadblocks.length < desired) {
            const offsetAngle = (Math.PI / desired) * this.roadblocks.length + Math.random() * 0.5;
            const distance = 240 + Math.random() * 90;
            const spawn = {
                x: clamp(playerPosition.x + Math.cos(offsetAngle) * distance, bounds.minX, bounds.maxX),
                y: clamp(playerPosition.y + Math.sin(offsetAngle) * distance, bounds.minY, bounds.maxY),
            };
            const blocker = this.vehicleManager.spawnVehicle({
                type: 'swat',
                spriteId: 'swat',
                color: '#2d3436',
                position: spawn,
                heading: offsetAngle + Math.PI / 2,
                ai: 'parked',
                maxSpeed: 0,
                acceleration: 0,
                handling: 0.02,
                displayName: 'SWAT Roadblock',
                length: 52,
                width: 24,
            });
            blocker.velocity.x = 0;
            blocker.velocity.y = 0;
            this.roadblocks.push(blocker.id);
        }
    }

    _pruneRoadblocks() {
        if (!this.roadblocks.length) return;
        const activeIds = new Set(this.vehicleManager.vehicles.map((veh) => veh.id));
        this.roadblocks = this.roadblocks.filter((id) => activeIds.has(id));
    }

    _clearRoadblocks() {
        for (const id of this.roadblocks) {
            this.vehicleManager.removeVehicle(id);
        }
        this.roadblocks = [];
    }
}
