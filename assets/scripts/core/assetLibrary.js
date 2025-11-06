export class AssetLibrary {
    constructor() {
        this.catalog = {
            world: [
                { key: 'cityMap', label: 'Metro District Layout', path: 'assets/images/city-map.svg' },
                { key: 'hudLayout', label: 'HUD Layout Study', path: 'assets/images/ui/hud-layout.svg' },
            ],
            buildings: [
                { key: 'building01', label: 'Corporate High-rise', path: 'assets/images/buildings/building-01.svg' },
                { key: 'building02', label: 'Residential Tower', path: 'assets/images/buildings/building-02.svg' },
                { key: 'building03', label: 'Old Town Lofts', path: 'assets/images/buildings/building-03.svg' },
                { key: 'building04', label: 'Industrial Plant', path: 'assets/images/buildings/building-04.svg' },
                { key: 'building05', label: 'Warehouse Depot', path: 'assets/images/buildings/building-05.svg' },
                { key: 'building06', label: 'Suburban Row', path: 'assets/images/buildings/building-06.svg' },
                { key: 'building07', label: 'Coastal Condos', path: 'assets/images/buildings/building-07.svg' },
                { key: 'building08', label: 'Shopping Plaza', path: 'assets/images/buildings/building-08.svg' },
                { key: 'building09', label: 'Cultural Museum', path: 'assets/images/buildings/building-09.svg' },
                { key: 'building10', label: 'Roadside Services', path: 'assets/images/buildings/building-10.svg' },
            ],
            vehicles: [
                { key: 'sedan', label: 'City Sedan', path: 'assets/images/vehicles/sedan.svg' },
                { key: 'sports', label: 'Sports Coupe', path: 'assets/images/vehicles/sports-car.svg' },
                { key: 'muscle', label: 'Muscle Classic', path: 'assets/images/vehicles/muscle-car.svg' },
                { key: 'truck', label: 'Utility Truck', path: 'assets/images/vehicles/truck.svg' },
                { key: 'bike', label: 'Street Bike', path: 'assets/images/vehicles/motorcycle.svg' },
                { key: 'police', label: 'Police Cruiser', path: 'assets/images/vehicles/police-cruiser.svg' },
                { key: 'swat', label: 'SWAT Van', path: 'assets/images/vehicles/swat-van.svg' },
                { key: 'heli', label: 'Police Helicopter', path: 'assets/images/vehicles/helicopter.svg' },
                { key: 'boat', label: 'Patrol Boat', path: 'assets/images/vehicles/boat.svg' },
            ],
            weapons: [
                { key: 'pistol', label: '9mm Pistol', path: 'assets/images/weapons/pistol.svg' },
                { key: 'smg', label: 'Street SMG', path: 'assets/images/weapons/smg.svg' },
                { key: 'rifle', label: 'Marksman Rifle', path: 'assets/images/weapons/rifle.svg' },
                { key: 'shotgun', label: 'Combat Shotgun', path: 'assets/images/weapons/shotgun.svg' },
                { key: 'sniper', label: 'Heavy Sniper', path: 'assets/images/weapons/sniper.svg' },
                { key: 'grenade', label: 'Flash Grenade', path: 'assets/images/weapons/grenade.svg' },
            ],
            characters: [
                { key: 'heroMale', label: 'Protagonist (Male)', path: 'assets/images/characters/protagonist-male.svg' },
                { key: 'heroFemale', label: 'Protagonist (Female)', path: 'assets/images/characters/protagonist-female.svg' },
                { key: 'npcCivilian', label: 'Civilian', path: 'assets/images/characters/npc-civilian.svg' },
                { key: 'npcGang', label: 'Gang Enforcer', path: 'assets/images/characters/npc-gang.svg' },
                { key: 'npcCop', label: 'Officer', path: 'assets/images/characters/npc-cop.svg' },
            ],
            poi: [
                { key: 'safehouse', label: 'Safehouse', path: 'assets/images/poi/poi-safehouse.svg' },
                { key: 'garage', label: 'Garage', path: 'assets/images/poi/poi-garage.svg' },
                { key: 'weaponShop', label: 'Weapons Dealer', path: 'assets/images/poi/poi-shop-weapons.svg' },
                { key: 'carShop', label: 'Car Dealership', path: 'assets/images/poi/poi-shop-cars.svg' },
                { key: 'gas', label: 'Fuel Station', path: 'assets/images/poi/poi-shop-gas.svg' },
                { key: 'bank', label: 'Bank', path: 'assets/images/poi/poi-shop-bank.svg' },
                { key: 'clothing', label: 'Clothing Boutique', path: 'assets/images/poi/poi-shop-clothing.svg' },
                { key: 'generic', label: 'General Store', path: 'assets/images/poi/poi-shop-generic.svg' },
            ],
            police: [
                { key: 'riotOfficer', label: 'Riot Officer', path: 'assets/images/police/riot-officer.svg' },
                { key: 'units', label: 'Police Units', path: 'assets/images/police/police-units.svg' },
            ],
        };
        this.imageIndex = new Map();
        this.pathIndex = new Map();
        this.loadingPromise = null;
    }

    loadAll() {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        const manifestEntries = Object.values(this.catalog).flat();
        const uniquePaths = new Map();
        manifestEntries.forEach((item) => {
            if (!uniquePaths.has(item.path)) {
                uniquePaths.set(item.path, []);
            }
            uniquePaths.get(item.path).push(item.key);
            this.pathIndex.set(item.key, item.path);
        });

        const loaders = [];
        uniquePaths.forEach((keys, path) => {
            loaders.push(
                new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        keys.forEach((key) => this.imageIndex.set(key, img));
                        resolve({ key: keys[0], img });
                    };
                    img.onerror = () => reject(new Error(`Failed to load asset ${path}`));
                    img.src = path;
                }),
            );
        });

        this.loadingPromise = Promise.all(loaders).then(() => this);
        return this.loadingPromise;
    }

    get(key) {
        const sprite = this.imageIndex.get(key);
        if (!sprite) {
            console.warn(`Missing sprite for key: ${key}`);
        }
        return sprite || null;
    }

    getPath(key) {
        return this.pathIndex.get(key) ?? '';
    }

    getByCategory(category) {
        return this.catalog[category] ?? [];
    }

    getCatalogEntries() {
        return Object.entries(this.catalog).flatMap(([category, items]) =>
            items.map((item) => ({ ...item, category })),
        );
    }
}
