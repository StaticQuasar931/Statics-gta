/**
 * NPC manager handles pedestrians, gangs, and police units.
 */
const createId = () => {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.randomUUID) {
        return cryptoObj.randomUUID();
    }
    return `npc-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
};

export class NPCManager {
    constructor(world, config = {}) {
        this.civilians = [];
        this.gangs = [];
        this.police = [];
        this.world = world;
        this.config = {
            pedestrianDensity: config.pedestrianDensity ?? 1,
            baseCivilians: 36,
            baseGangs: 12,
        };
        this.radiusMap = {
            civilian: 6,
            gang: 6.5,
            police: 7,
        };
        this._spawnInitialPopulation();
    }

    _spawnInitialPopulation() {
        const targets = this._targetCounts();
        this._populateGroup(this.civilians, 'civilian', targets.civilians);
        this._populateGroup(this.gangs, 'gang', targets.gangs);
    }

    _createNPC(faction) {
        const baseSpeed =
            faction === 'police' ? 2 : faction === 'gang' ? 1.7 : 1.2;
        return {
            id: createId(),
            faction,
            position: {
                x: 320 + Math.random() * 640,
                y: 240 + Math.random() * 320,
            },
            target: null,
            state: 'idle',
            health: 100,
            baseSpeed,
            radius: this.radiusMap[faction] ?? 6,
            spriteId: faction,
        };
    }

    update(dt, playerPosition) {
        const updateNPC = (npc, aggression) => {
            if (!npc.target || Math.random() < 0.01) {
                npc.target = {
                    x: npc.position.x + (Math.random() * 200 - 100),
                    y: npc.position.y + (Math.random() * 200 - 100),
                };
            }
            if (aggression && Math.random() < 0.1) {
                npc.target = { ...playerPosition };
                npc.state = 'hostile';
            }
            const dx = npc.target.x - npc.position.x;
            const dy = npc.target.y - npc.position.y;
            const dist = Math.hypot(dx, dy);
            const speed = aggression ? npc.baseSpeed + 0.2 : npc.baseSpeed;
            if (dist > 4) {
                npc.position.x += (dx / dist) * speed * dt * 60;
                npc.position.y += (dy / dist) * speed * dt * 60;
            }
            if (dist < 20 && aggression) {
                npc.state = 'engaged';
            }
        };

        for (const civ of this.civilians) updateNPC(civ, false);
        for (const gang of this.gangs) updateNPC(gang, true);
        for (const officer of this.police) updateNPC(officer, true);
        this._cleanDead();
        this._maintainPopulation();
    }

    spawnPolicePatrol(center, level) {
        const officer = this._createNPC('police');
        officer.position = {
            x: center.x + (Math.random() * 160 - 80),
            y: center.y + (Math.random() * 160 - 80),
        };
        officer.health = 140 + level * 10;
        this.police.push(officer);
    }

    alertPolice(position, level) {
        for (const officer of this.police) {
            officer.target = { ...position };
            officer.state = 'responding';
        }
        if (level >= 3) {
            // Spawn additional reinforcements to simulate escalation
            this.spawnPolicePatrol(position, level);
        }
    }

    _cleanDead() {
        const filterAlive = (npc) => npc.health > 0;
        this.civilians = this.civilians.filter(filterAlive);
        this.gangs = this.gangs.filter(filterAlive);
        this.police = this.police.filter(filterAlive);
    }

    setDensity(multiplier) {
        this.config.pedestrianDensity = Math.max(0.2, multiplier);
        const targets = this._targetCounts();
        this._balanceGroup(this.civilians, 'civilian', targets.civilians);
        this._balanceGroup(this.gangs, 'gang', targets.gangs);
    }

    _targetCounts() {
        const density = Math.max(0.2, this.config.pedestrianDensity);
        return {
            civilians: Math.round(this.config.baseCivilians * density),
            gangs: Math.round(this.config.baseGangs * Math.max(0.3, density * 0.6)),
        };
    }

    _populateGroup(container, faction, target) {
        while (container.length < target) {
            container.push(this._createNPC(faction));
        }
    }

    _balanceGroup(container, faction, target) {
        if (container.length > target) {
            container.splice(target);
        }
        while (container.length < target) {
            container.push(this._createNPC(faction));
        }
    }

    _maintainPopulation() {
        const targets = this._targetCounts();
        this._populateGroup(this.civilians, 'civilian', targets.civilians);
        this._populateGroup(this.gangs, 'gang', targets.gangs);
    }
}
