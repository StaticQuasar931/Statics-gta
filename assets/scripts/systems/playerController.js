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
        this.input = { up: false, down: false, left: false, right: false, shoot: false };
        this.gender = 'random';
        this.outfitColor = '#1e90ff';
    }

    setBackground(background) {
        this.background = background;
    }

    customize({ gender, outfitColor }) {
        this.gender = gender;
        this.outfitColor = outfitColor;
    }

    update(dt) {
        if (this.inVehicle) {
            this.position.x = this.inVehicle.position.x;
            this.position.y = this.inVehicle.position.y;
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
    }

    exitVehicle() {
        if (this.inVehicle) {
            this.position = { ...this.inVehicle.position };
            this.inVehicle = null;
        }
    }
}
