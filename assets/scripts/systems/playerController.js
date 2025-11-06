/**
 * PlayerController converts input states into movement, stamina usage, and
 * handles toggling between on-foot and in-vehicle states.
 */
export class PlayerController {
    constructor(weaponSystem, economySystem) {
        this.weaponSystem = weaponSystem;
        this.economySystem = economySystem;
        this.position = { x: 640, y: 360 };
        this.velocity = { x: 0, y: 0 };
        this.speed = 2.4;
        this.stamina = 100;
        this.health = 100;
        this.armor = 0;
        this.inVehicle = null;
        this.radius = 9;
        this.spriteId = 'player-male';
        this.input = { up: false, down: false, left: false, right: false, shoot: false };
        this.gender = 'random';
        this.outfitColor = '#1e90ff';
    }

    setBackground(background) {
        this.background = background;
    }

    customize({ gender, outfitColor }) {
        if (gender === 'random') {
            this.gender = Math.random() > 0.5 ? 'male' : 'female';
        } else {
            this.gender = gender;
        }
        this.outfitColor = outfitColor;
        this.spriteId = this.gender === 'female' ? 'player-female' : 'player-male';
    }

    update(dt) {
        if (this.inVehicle) {
            const vehicle = this.inVehicle;
            const throttle = (this.input.up ? 1 : 0) - (this.input.down ? 1 : 0);
            const steer = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
            vehicle.controller = 'player';
            vehicle.controlInput = {
                throttle,
                steer,
                boost: this.input.sprint,
            };
            this.position.x = vehicle.position.x;
            this.position.y = vehicle.position.y;
            this.stamina = Math.min(100, this.stamina + dt * 15);
            return;
        }

        const acceleration = { x: 0, y: 0 };
        const modifier = this.input.sprint && this.stamina > 0 ? 1.6 : 1;
        const friction = 0.78;

        if (this.input.up) acceleration.y -= this.speed * modifier;
        if (this.input.down) acceleration.y += this.speed * modifier;
        if (this.input.left) acceleration.x -= this.speed * modifier;
        if (this.input.right) acceleration.x += this.speed * modifier;

        this.velocity.x += acceleration.x * dt;
        this.velocity.y += acceleration.y * dt;

        // Apply damping to simulate friction and prevent infinite acceleration
        this.velocity.x *= friction;
        this.velocity.y *= friction;

        this.position.x += this.velocity.x * dt * 60;
        this.position.y += this.velocity.y * dt * 60;

        if (modifier > 1) {
            this.stamina = Math.max(0, this.stamina - dt * 20);
        } else {
            this.stamina = Math.min(100, this.stamina + dt * 10);
        }
    }

    enterVehicle(vehicle) {
        this.inVehicle = vehicle;
        if (vehicle) {
            vehicle.ai = 'player';
            vehicle.controller = 'player';
            vehicle.controlInput = { throttle: 0, steer: 0 };
        }
    }

    exitVehicle() {
        if (this.inVehicle) {
            this.inVehicle.ai = 'civilian';
            this.inVehicle.controller = 'ai';
            this.inVehicle.controlInput = null;
            const exitHeading = this.inVehicle.heading + Math.PI / 2;
            this.position = {
                x: this.inVehicle.position.x + Math.cos(exitHeading) * (this.inVehicle.width ?? 18),
                y: this.inVehicle.position.y + Math.sin(exitHeading) * (this.inVehicle.width ?? 18),
            };
            this.inVehicle = null;
        }
    }

    setHitboxScale(scale = 1) {
        this.radius = 9 * Math.max(0.5, scale);
    }

    getSpriteId() {
        return this.spriteId;
    }
}
