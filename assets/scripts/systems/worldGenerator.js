/**
 * WorldGenerator is responsible for producing the base layout of the city and the
 * surrounding procedural terrain. The generator is intentionally deterministic
 * via a seed so that the same world can be recreated between saves.
 */
export class WorldGenerator {
    constructor() {
        this.seed = Date.now();
        this.random = this._mulberry32(this.seed);
    }

    setSeed(seed) {
        this.seed = seed;
        this.random = this._mulberry32(seed);
    }

    /**
     * Generates the world data structure that contains both handcrafted city
     * districts and procedural wilderness tiles.
     */
    generate() {
        this.random = this._mulberry32(this.seed);
        const city = this._generateCityLayout();
        const wilderness = this._generateWilderness();
        return {
            seed: this.seed,
            city,
            wilderness,
            pointsOfInterest: this._generatePOI(city),
        };
    }

    /**
     * Semi-handcrafted city layout built from high-level template blocks while
     * still allowing randomness within districts for variety.
     */
    _generateCityLayout() {
        const districts = [
            { name: 'Downtown', color: '#2f89ff', density: 0.9 },
            { name: 'Old Town', color: '#ffb347', density: 0.6 },
            { name: 'Industrial', color: '#9d4edd', density: 0.7 },
            { name: 'Suburbs', color: '#00b894', density: 0.5 },
            { name: 'Coastline', color: '#74b9ff', density: 0.4 },
        ];
        const blocks = [];
        const size = 16; // 16x16 grid for the city core
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const district = districts[Math.floor(this.random() * districts.length)];
                const road = this.random() < 0.15; // 15% chance a tile is a major road
                blocks.push({
                    x,
                    y,
                    district: district.name,
                    color: road ? '#444' : district.color,
                    type: road ? 'road' : 'building',
                    elevation: 0,
                });
            }
        }
        return { size, blocks, districts };
    }

    /**
     * Procedural wilderness around the city using a simple layered noise
     * approach that emulates lakes, forests, and mountains.
     */
    _generateWilderness() {
        const tiles = [];
        const size = 32; // 32x32 radial wilderness tiles
        for (let y = -size; y <= size; y++) {
            for (let x = -size; x <= size; x++) {
                const distance = Math.sqrt(x * x + y * y) / size;
                const noise = this._simplex(x * 0.15, y * 0.15);
                const altitude = noise * 0.8 - distance * 0.4;
                let biome = 'forest';
                if (altitude > 0.3) biome = 'mountain';
                else if (altitude < -0.2) biome = 'lake';
                else if (distance > 0.75) biome = 'rural';
                tiles.push({ x, y, biome, altitude });
            }
        }
        return { size, tiles };
    }

    _generatePOI(city) {
        const stories = [
            'Escaped street racer starting over after a high-profile bust.',
            'Former hacker recruited by underground fixers.',
            'Ex-corporate security specialist turned vigilante.',
            'Disgraced athlete seeking redemption through high-stakes heists.',
        ];
        const garages = [];
        const safehouses = [];
        for (const block of city.blocks) {
            if (block.type === 'building' && this.random() < 0.05) {
                garages.push({ x: block.x, y: block.y });
            }
            if (block.type === 'building' && this.random() < 0.04) {
                safehouses.push({ x: block.x, y: block.y });
            }
        }
        return {
            backgrounds: stories,
            garages,
            safehouses,
            shops: this._generateShops(city.blocks),
        };
    }

    _generateShops(blocks) {
        const categories = ['Weapons', 'Cars', 'Gas', 'Bank', 'Clothing'];
        return blocks
            .filter((block) => block.type === 'building' && this.random() < 0.03)
            .map((block) => ({
                x: block.x,
                y: block.y,
                type: categories[Math.floor(this.random() * categories.length)],
            }));
    }

    /** Deterministic pseudo-random generator (Mulberry32). */
    _mulberry32(a) {
        return () => {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** Simple 2D noise generated from sine waves to fake simplex noise. */
    _simplex(x, y) {
        return (
            Math.sin(x * 2.3 + Math.cos(y * 1.7)) +
            Math.sin(y * 2.8 + Math.cos(x * 1.1))
        ) / 2;
    }
}
