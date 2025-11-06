/**
 * VehicleManager simulates simple top-down driving physics for NPC and player
 * vehicles. The physics are light-weight but expose hooks for future expansion.
 */
const createId = () => {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.randomUUID) {
        return cryptoObj.randomUUID();
    }
    return `veh-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
};

export class VehicleManager {
    constructor(config = {}) {
        this.vehicles = [];
        this.trafficDensity = config.trafficDensity ?? 0.8;
    }

    spawnVehicle(opts) {
        const vehicle = {
            id: createId(),
            type: opts.type || 'sedan',
            position: { ...opts.position },
            velocity: { x: 0, y: 0 },
            heading: opts.heading ?? 0,
            target: opts.target || null,
            color: opts.color || '#f1c40f',
            maxSpeed: opts.maxSpeed ?? 2.4,
            acceleration: opts.acceleration ?? 0.12,
            handling: opts.handling ?? 0.08,
            ai: opts.ai ?? 'civilian',
            length: opts.length ?? 32,
            width: opts.width ?? 16,
            controller: opts.controller ?? 'ai',
            controlInput: null,
            spriteId: opts.spriteId || opts.type || 'sedan',
            displayName: opts.displayName || this._describeVehicle(opts.type),
        };
        vehicle.collisionRadius = Math.hypot(vehicle.length, vehicle.width) / 2;
        this.vehicles.push(vehicle);
        return vehicle;
    }

    removeVehicle(id) {
        this.vehicles = this.vehicles.filter((veh) => veh.id !== id);
    }

    /**
     * Basic physics integration using semi-implicit Euler. Drag is used to keep
     * cars from sliding forever. Collisions with world bounds bounce vehicles.
     */
    update(dt, worldBounds, playerPosition) {
        if (worldBounds) {
            this._maintainTraffic(worldBounds);
        }
        for (const vehicle of this.vehicles) {
            if (vehicle.controller === 'player') {
                this._applyPlayerControl(vehicle, dt);
            } else {
                this._applyAI(vehicle, playerPosition);
                vehicle.velocity.x += Math.cos(vehicle.heading) * vehicle.acceleration * dt;
                vehicle.velocity.y += Math.sin(vehicle.heading) * vehicle.acceleration * dt;
            }

            // Clamp to max speed (|v| < maxSpeed)
            const speed = Math.hypot(vehicle.velocity.x, vehicle.velocity.y);
            if (speed > vehicle.maxSpeed) {
                const scale = vehicle.maxSpeed / speed;
                vehicle.velocity.x *= scale;
                vehicle.velocity.y *= scale;
            }

            // Integrate position
            vehicle.position.x += vehicle.velocity.x * dt * 60; // normalized to 60 FPS
            vehicle.position.y += vehicle.velocity.y * dt * 60;

            // Apply drag to simulate rolling resistance
            vehicle.velocity.x *= 0.96;
            vehicle.velocity.y *= 0.96;

            // Bounce off world bounds (very simple collision response)
            if (vehicle.position.x < worldBounds.minX || vehicle.position.x > worldBounds.maxX) {
                vehicle.velocity.x *= -0.7;
                vehicle.position.x = Math.min(Math.max(vehicle.position.x, worldBounds.minX), worldBounds.maxX);
            }
            if (vehicle.position.y < worldBounds.minY || vehicle.position.y > worldBounds.maxY) {
                vehicle.velocity.y *= -0.7;
                vehicle.position.y = Math.min(Math.max(vehicle.position.y, worldBounds.minY), worldBounds.maxY);
            }
        }
    }

    _applyPlayerControl(vehicle, dt) {
        const input = vehicle.controlInput || { throttle: 0, steer: 0 };
        const steerStrength = vehicle.handling * 1.75;
        vehicle.heading += input.steer * steerStrength;

        const throttle = Math.max(-1, Math.min(1, input.throttle ?? 0));
        const boostMultiplier = input.boost ? 1.35 : 1;
        const applied = vehicle.acceleration * boostMultiplier * throttle;
        vehicle.velocity.x += Math.cos(vehicle.heading) * applied * dt * 60;
        vehicle.velocity.y += Math.sin(vehicle.heading) * applied * dt * 60;

        if (Math.abs(throttle) < 0.05) {
            vehicle.velocity.x *= 0.9;
            vehicle.velocity.y *= 0.9;
        }
    }

    _applyAI(vehicle, playerPosition) {
        if (vehicle.controller === 'player' || vehicle.ai === 'parked') return;
        if (!vehicle.target) {
            vehicle.target = {
                x: vehicle.position.x + (Math.random() * 400 - 200),
                y: vehicle.position.y + (Math.random() * 400 - 200),
            };
        }
        const dx = vehicle.target.x - vehicle.position.x;
        const dy = vehicle.target.y - vehicle.position.y;
        const desiredHeading = Math.atan2(dy, dx);
        let delta = desiredHeading - vehicle.heading;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        vehicle.heading += delta * vehicle.handling;

        if (Math.hypot(dx, dy) < 32) {
            if (vehicle.ai === 'police' && playerPosition) {
                vehicle.target = { ...playerPosition };
            } else {
                vehicle.target = null;
            }
        }
    }

    setTrafficDensity(density, area) {
        this.trafficDensity = Math.max(0, density);
        const bounds = this._normalizeBounds(area);
        const civilians = this.vehicles.filter((veh) => veh.ai === 'civilian');
        const target = Math.round(10 * this.trafficDensity);
        if (civilians.length > target) {
            let toCull = civilians.length - target;
            this.vehicles = this.vehicles.filter((veh) => {
                if (veh.ai === 'civilian' && toCull > 0) {
                    toCull -= 1;
                    return false;
                }
                return true;
            });
        } else if (civilians.length < target) {
            const deficit = target - civilians.length;
            for (let i = 0; i < deficit; i++) {
                this._spawnTrafficVehicle(bounds);
            }
        }
    }

    _maintainTraffic(worldBounds) {
        if (this.trafficDensity <= 0) return;
        const civilians = this.vehicles.filter((veh) => veh.ai === 'civilian');
        const target = Math.round(10 * this.trafficDensity);
        if (civilians.length < target) {
            this._spawnTrafficVehicle(worldBounds);
        }
    }

    _spawnTrafficVehicle(worldBounds) {
        const bounds = this._normalizeBounds(worldBounds);
        const palette = [
            { type: 'sedan', color: '#f1c40f', length: 34, width: 16 },
            { type: 'coupe', color: '#e84393', length: 32, width: 15 },
            { type: 'truck', color: '#55efc4', length: 42, width: 18 },
            { type: 'motorcycle', color: '#ffeaa7', length: 20, width: 8 },
        ];
        const style = palette[Math.floor(Math.random() * palette.length)];
        const position = {
            x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
            y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
        };
        this.spawnVehicle({
            ...style,
            position,
            maxSpeed: 1.8 + Math.random() * 1.2,
            acceleration: 0.08 + Math.random() * 0.06,
            handling: 0.06 + Math.random() * 0.04,
            ai: 'civilian',
        });
    }

    _normalizeBounds(area) {
        if (!area) {
            return { minX: 0, minY: 0, maxX: 1280, maxY: 720 };
        }
        if ('width' in area && 'height' in area) {
            return { minX: 0, minY: 0, maxX: area.width, maxY: area.height };
        }
        return area;
    }

    _describeVehicle(type = 'sedan') {
        const lookup = {
            sedan: 'City Sedan',
            coupe: 'Street Coupe',
            sports: 'Sports Coupe',
            muscle: 'Muscle Classic',
            truck: 'Utility Truck',
            motorcycle: 'Street Bike',
            police: 'Police Cruiser',
            swat: 'SWAT Van',
            helicopter: 'Police Helicopter',
            boat: 'Patrol Boat',
        };
        return lookup[type] || 'Vehicle';
    }
}
