const BASE_PATH = 'assets/images';

/**
 * Lightweight asset loader that eagerly fetches SVG placeholders for all core
 * sandbox entities (vehicles, characters, weapons, and POI markers). The
 * loader exposes helper getters so renderers can request sprites without
 * worrying about fetch or caching semantics.
 */
export class AssetLibrary {
    constructor() {
        this.cache = new Map();
        this.pending = new Map();
        this.vehicleMap = {
            sedan: `${BASE_PATH}/vehicles/sedan.svg`,
            coupe: `${BASE_PATH}/vehicles/sports-car.svg`,
            sports: `${BASE_PATH}/vehicles/sports-car.svg`,
            muscle: `${BASE_PATH}/vehicles/muscle-car.svg`,
            truck: `${BASE_PATH}/vehicles/truck.svg`,
            motorcycle: `${BASE_PATH}/vehicles/motorcycle.svg`,
            police: `${BASE_PATH}/vehicles/police-cruiser.svg`,
            swat: `${BASE_PATH}/vehicles/swat-van.svg`,
            helicopter: `${BASE_PATH}/vehicles/helicopter.svg`,
            boat: `${BASE_PATH}/vehicles/boat.svg`,
            default: `${BASE_PATH}/vehicles/sedan.svg`,
        };
        this.characterMap = {
            'player-male': `${BASE_PATH}/characters/protagonist-male.svg`,
            'player-female': `${BASE_PATH}/characters/protagonist-female.svg`,
            civilian: `${BASE_PATH}/characters/npc-civilian.svg`,
            gang: `${BASE_PATH}/characters/npc-gang.svg`,
            police: `${BASE_PATH}/characters/npc-cop.svg`,
            default: `${BASE_PATH}/characters/npc-civilian.svg`,
        };
        this.poiMap = {
            safehouse: `${BASE_PATH}/poi/poi-safehouse.svg`,
            garage: `${BASE_PATH}/poi/poi-garage.svg`,
            'shop-weapons': `${BASE_PATH}/poi/poi-shop-weapons.svg`,
            'shop-cars': `${BASE_PATH}/poi/poi-shop-cars.svg`,
            'shop-gas': `${BASE_PATH}/poi/poi-shop-gas.svg`,
            'shop-bank': `${BASE_PATH}/poi/poi-shop-bank.svg`,
            'shop-clothing': `${BASE_PATH}/poi/poi-shop-clothing.svg`,
            'shop-generic': `${BASE_PATH}/poi/poi-shop-generic.svg`,
        };
        this.weaponMap = {
            pistol: `${BASE_PATH}/weapons/pistol.svg`,
            smg: `${BASE_PATH}/weapons/smg.svg`,
            rifle: `${BASE_PATH}/weapons/rifle.svg`,
            shotgun: `${BASE_PATH}/weapons/shotgun.svg`,
            grenade: `${BASE_PATH}/weapons/grenade.svg`,
            sniper: `${BASE_PATH}/weapons/sniper.svg`,
        };
        this.buildingSet = [
            `${BASE_PATH}/buildings/building-01.svg`,
            `${BASE_PATH}/buildings/building-02.svg`,
            `${BASE_PATH}/buildings/building-03.svg`,
            `${BASE_PATH}/buildings/building-04.svg`,
            `${BASE_PATH}/buildings/building-05.svg`,
            `${BASE_PATH}/buildings/building-06.svg`,
            `${BASE_PATH}/buildings/building-07.svg`,
            `${BASE_PATH}/buildings/building-08.svg`,
            `${BASE_PATH}/buildings/building-09.svg`,
            `${BASE_PATH}/buildings/building-10.svg`,
        ];
        this.readiness = null;
    }

    /** Returns a promise that resolves once the core manifest has been loaded. */
    preloadAll() {
        if (!this.readiness) {
            const manifest = [
                ...new Set([
                    ...Object.values(this.vehicleMap),
                    ...Object.values(this.characterMap),
                    ...Object.values(this.poiMap),
                    ...Object.values(this.weaponMap),
                    ...this.buildingSet,
                ]),
            ];
            const loaders = manifest.map((path) => this._load(path));
            this.readiness = Promise.all(loaders).catch((error) => {
                console.warn('Asset preload failed', error);
                return [];
            });
        }
        return this.readiness;
    }

    /** Returns whether the core manifest has been fetched already. */
    isReady() {
        return !!this.cache.size;
    }

    getVehicleSprite(type) {
        return this._getImage(this.vehicleMap[type] || this.vehicleMap.default);
    }

    getVehiclePath(type) {
        return this.vehicleMap[type] || this.vehicleMap.default;
    }

    getCharacterSprite(id) {
        return this._getImage(this.characterMap[id] || this.characterMap.default);
    }

    getCharacterPath(id) {
        return this.characterMap[id] || this.characterMap.default;
    }

    getPOISprite(type) {
        const key = this._normalizePOIKey(type);
        if (!key) return null;
        return this._getImage(this.poiMap[key]);
    }

    getPOIPath(type) {
        const key = this._normalizePOIKey(type);
        return key ? this.poiMap[key] : null;
    }

    getWeaponSprite(id) {
        return this._getImage(this.weaponMap[id]);
    }

    getWeaponPath(id) {
        return this.weaponMap[id];
    }

    getBuildingSprite(path) {
        if (!path) return null;
        return this._getImage(path);
    }

    _getImage(path) {
        if (!path) return null;
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }
        if (!this.pending.has(path)) {
            this._load(path);
        }
        return this.cache.get(path) ?? null;
    }

    _load(path) {
        if (this.cache.has(path)) {
            return Promise.resolve(this.cache.get(path));
        }
        if (this.pending.has(path)) {
            return this.pending.get(path);
        }
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = path;
        })
            .then((img) => {
                this.cache.set(path, img);
                this.pending.delete(path);
                return img;
            })
            .catch((error) => {
                console.warn(`Failed to load asset: ${path}`, error);
                this.pending.delete(path);
                return null;
            });
        this.pending.set(path, promise);
        return promise;
    }

    _normalizePOIKey(type) {
        if (!type) return null;
        const toKey = (value) =>
            value
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .trim();
        let key = typeof type === 'string' ? type.toLowerCase() : String(type);
        key = toKey(key);
        if (this.poiMap[key]) {
            return key;
        }
        const shopKey = `shop-${key}`;
        if (this.poiMap[shopKey]) {
            return shopKey;
        }
        if (key.startsWith('shop-')) {
            return 'shop-generic';
        }
        return null;
    }
}
