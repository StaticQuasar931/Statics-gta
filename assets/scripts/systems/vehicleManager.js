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
    constructor() {
        this.vehicles = [];
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
        };
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
        for (const vehicle of this.vehicles) {
            this._applyAI(vehicle, playerPosition);
            // Acceleration in heading direction
            vehicle.velocity.x += Math.cos(vehicle.heading) * vehicle.acceleration * dt;
            vehicle.velocity.y += Math.sin(vehicle.heading) * vehicle.acceleration * dt;

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

    _applyAI(vehicle, playerPosition) {
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
}
