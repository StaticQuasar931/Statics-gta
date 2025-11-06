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
    constructor(world) {
        this.civilians = [];
        this.gangs = [];
        this.police = [];
        this.world = world;
        this._spawnInitialPopulation();
    }

    _spawnInitialPopulation() {
        for (let i = 0; i < 40; i++) {
            this.civilians.push(this._createNPC('civilian'));
        }
        for (let i = 0; i < 12; i++) {
            this.gangs.push(this._createNPC('gang'));
        }
    }

    _createNPC(faction) {
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
            const speed = aggression ? 1.8 : 1.2;
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
}
