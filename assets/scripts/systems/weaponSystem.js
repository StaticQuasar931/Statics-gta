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
            { id: 'pistol', name: '9mm Pistol', damage: 12, ammo: 45, rate: 0.4, cooldown: 0, icon: 'pistol' },
            { id: 'smg', name: 'Street SMG', damage: 9, ammo: 120, rate: 0.18, cooldown: 0, icon: 'smg' },
            { id: 'rifle', name: 'Marksman Rifle', damage: 18, ammo: 90, rate: 0.6, cooldown: 0, icon: 'rifle' },
            { id: 'shotgun', name: 'Handmade Shotgun', damage: 28, ammo: 32, rate: 0.9, cooldown: 0, icon: 'shotgun' },
            { id: 'grenade', name: 'Flashbang', damage: 45, ammo: 6, rate: 1.2, cooldown: 0, icon: 'grenade' },
        ];
        this.projectiles = [];
        this.time = 0;
    }

    equip(index) {
        this.currentWeapon = this.weapons[index % this.weapons.length];
        return this.currentWeapon;
    }

    fire(origin, direction, originRadius = 0) {
        const weapon = this.currentWeapon ?? this.weapons[0];
        if (weapon.ammo <= 0) return null;
        if (this.time < weapon.cooldown) return null;
        weapon.ammo -= 1;
        weapon.cooldown = this.time + weapon.rate;
        const spawnOffset = originRadius + 6;
        const projectile = {
            id: createId(),
            position: {
                x: origin.x + Math.cos(direction) * spawnOffset,
                y: origin.y + Math.sin(direction) * spawnOffset,
            },
            direction,
            speed: 12,
            damage: weapon.damage,
            ttl: 1.6, // time to live in seconds
            radius: weapon.id === 'shotgun' ? 4 : 3,
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
                const combinedRadius = (npc.radius ?? 6) + p.radius;
                if (Math.hypot(npc.position.x - p.position.x, npc.position.y - p.position.y) <= combinedRadius) {
                    npc.health -= p.damage;
                    npc.state = 'injured';
                    policeSystem?.reportCrime(0.5, p.position);
                    return false;
                }
            }
            return true;
        });
    }
}
