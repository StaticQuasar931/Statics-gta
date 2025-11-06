/**
 * WeaponSystem handles inventory, firing, and simple projectile simulation.
 */
const createId = () => {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.randomUUID) {
        return cryptoObj.randomUUID();
    }
    return `proj-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
};

export class WeaponSystem {
    constructor() {
        this.weapons = [
            { id: 'pistol', name: '9mm Pistol', damage: 12, ammo: 45, rate: 0.4, cooldown: 0 },
            { id: 'smg', name: 'Street SMG', damage: 9, ammo: 120, rate: 0.18, cooldown: 0 },
            { id: 'rifle', name: 'Marksman Rifle', damage: 18, ammo: 90, rate: 0.6, cooldown: 0 },
            { id: 'shotgun', name: 'Handmade Shotgun', damage: 28, ammo: 32, rate: 0.9, cooldown: 0 },
            { id: 'grenade', name: 'Flashbang', damage: 45, ammo: 6, rate: 1.2, cooldown: 0 },
        ];
        this.projectiles = [];
        this.time = 0;
    }

    equip(index) {
        this.currentWeapon = this.weapons[index % this.weapons.length];
        return this.currentWeapon;
    }

    fire(origin, direction) {
        const weapon = this.currentWeapon ?? this.weapons[0];
        if (weapon.ammo <= 0) return null;
        if (this.time < weapon.cooldown) return null;
        weapon.ammo -= 1;
        weapon.cooldown = this.time + weapon.rate;
        const projectile = {
            id: createId(),
            position: { ...origin },
            direction,
            speed: 12,
            damage: weapon.damage,
            ttl: 1.6, // time to live in seconds
        };
        this.projectiles.push(projectile);
        return projectile;
    }

    update(dt, npcs, policeSystem) {
        this.time += dt;
        this.projectiles = this.projectiles.filter((p) => {
            p.ttl -= dt;
            p.position.x += Math.cos(p.direction) * p.speed * dt * 60;
            p.position.y += Math.sin(p.direction) * p.speed * dt * 60;
            if (p.ttl <= 0) return false;
            for (const npc of [...npcs.civilians, ...npcs.gangs, ...npcs.police]) {
                if (Math.hypot(npc.position.x - p.position.x, npc.position.y - p.position.y) < 20) {
                    npc.health -= p.damage;
                    npc.state = 'injured';
                    policeSystem?.reportGunshot(p.position);
                    return false;
                }
            }
            return true;
        });
    }
}
