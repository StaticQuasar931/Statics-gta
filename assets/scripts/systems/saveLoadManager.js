/**
 * Persists and loads game state via localStorage. Saves include the procedural
 * seed so the same world can be reconstructed when loading.
 */
export class SaveLoadManager {
    constructor() {
        this.storageKey = 'statics-escape-road-saves';
        this.maxSlots = 3;
    }

    loadSaves() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error('Failed to load saves', err);
            return [];
        }
    }

    save(slot, data) {
        const saves = this.loadSaves();
        saves[slot] = { ...data, timestamp: new Date().toISOString() };
        localStorage.setItem(this.storageKey, JSON.stringify(saves.slice(0, this.maxSlots)));
    }
}
