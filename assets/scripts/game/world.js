import { InputManager } from '../core/input.js';

const SAVE_KEY = 'statics-escape-road-save-v1';

const TWO_PI = Math.PI * 2;

const DEFAULT_SETTINGS = {
    quality: 'medium',
    traffic: 1,
    peds: 1,
    dayLength: 180,
    hitboxes: false,
};

class RNG {
    constructor(seed = Math.floor(Math.random() * 1_000_000_000)) {
        this.seed = seed >>> 0;
    }
    next() {
        // Linear congruential generator (Numerical Recipes)
        this.seed = (1664525 * this.seed + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }
    range(min, max) {
        return min + (max - min) * this.next();
    }
    pick(list) {
        return list[Math.floor(this.next() * list.length) % list.length];
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function aabbIntersect(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

class Bullet {
    constructor({ x, y, angle, speed, damage, owner }) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.owner = owner;
        this.life = 0.7;
        this.radius = 4;
    }

    update(dt) {
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this.life -= dt;
    }
}

class Vehicle {
    constructor({ x, y, spriteKey, type, police = false, maxSpeed = 280, acceleration = 420, turnRate = 2.4 }) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 0;
        this.spriteKey = spriteKey;
        this.type = type;
        this.police = police;
        this.maxSpeed = maxSpeed;
        this.acceleration = acceleration;
        this.turnRate = turnRate;
        this.width = 120;
        this.height = 56;
        this.occupant = null;
        this.autonomous = !police;
        this.patrolTarget = { x, y };
        this.cooldown = 0;
        this.label = police ? 'NCPD Pursuit Unit' : this.getVehicleLabel(type);
    }

    getVehicleLabel(type) {
        switch (type) {
            case 'sports':
                return 'Sports Coupe';
            case 'muscle':
                return 'Muscle Classic';
            case 'truck':
                return 'Utility Truck';
            case 'bike':
                return 'Street Bike';
            case 'swat':
                return 'SWAT Van';
            case 'police':
                return 'Police Cruiser';
            default:
                return 'City Sedan';
        }
    }

    update(dt, world, target) {
        if (this.occupant?.isPlayer) {
            return; // player-controlled, handled separately
        }
        if (this.police && target) {
            this.chaseTarget(dt, target);
        } else if (this.autonomous) {
            this.cruise(dt, world);
        }
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this.speed = clamp(this.speed * 0.993, -this.maxSpeed * 0.6, this.maxSpeed);
        this.keepInside(world);
    }

    cruise(dt, world) {
        if (this.cooldown <= 0) {
            if (Math.random() < 0.01) {
                this.patrolTarget = {
                    x: world.center.x + (Math.random() - 0.5) * world.size.width * 0.8,
                    y: world.center.y + (Math.random() - 0.5) * world.size.height * 0.8,
                };
            }
            const angleToTarget = Math.atan2(this.patrolTarget.y - this.y, this.patrolTarget.x - this.x);
            const angleDiff = Math.atan2(Math.sin(angleToTarget - this.angle), Math.cos(angleToTarget - this.angle));
            this.angle += clamp(angleDiff, -this.turnRate * dt, this.turnRate * dt);
            this.speed = clamp(this.speed + this.acceleration * 0.3 * dt, -this.maxSpeed * 0.3, this.maxSpeed * 0.6);
        } else {
            this.cooldown -= dt;
        }
    }

    chaseTarget(dt, target) {
        const desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const angleDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
        this.angle += clamp(angleDiff, -this.turnRate * 1.5 * dt, this.turnRate * 1.5 * dt);
        const dist = Math.sqrt(distanceSquared(this, target));
        const speedTarget = clamp((this.maxSpeed * 0.6 * 2000) / Math.max(dist, 150), this.maxSpeed * 0.3, this.maxSpeed);
        this.speed = clamp(this.speed + this.acceleration * dt, 0, speedTarget);
    }

    keepInside(world) {
        const margin = 120;
        if (this.x < margin || this.x > world.size.width - margin || this.y < margin || this.y > world.size.height - margin) {
            const angleToCenter = Math.atan2(world.center.y - this.y, world.center.x - this.x);
            this.angle = angleToCenter;
            this.speed = clamp(this.speed + this.acceleration * 0.6 * (Math.random() + 0.4), 0, this.maxSpeed);
        }
    }
}

class Pedestrian {
    constructor({ x, y, type }) {
        this.x = x;
        this.y = y;
        this.width = 36;
        this.height = 36;
        this.type = type;
        this.health = 60;
        this.state = 'wander';
        this.timer = Math.random() * 4;
        this.target = { x, y };
    }

    update(dt, world) {
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = 2 + Math.random() * 4;
            this.target = {
                x: clamp(this.x + (Math.random() - 0.5) * 600, 0, world.size.width),
                y: clamp(this.y + (Math.random() - 0.5) * 600, 0, world.size.height),
            };
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
            const speed = 80;
            this.x += (dx / dist) * speed * dt;
            this.y += (dy / dist) * speed * dt;
        }
    }
}

class Player {
    constructor({ x, y, spriteKey, name, cash, weapon }) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 220;
        this.spriteKey = spriteKey;
        this.name = name;
        this.cash = cash;
        this.health = 100;
        this.armor = 0;
        this.weapon = weapon;
        this.weaponAmmo = 60;
        this.weaponCooldown = 0;
        this.vehicle = null;
        this.isPlayer = true;
        this.hitFlash = 0;
    }

    get center() {
        return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }

    updateOnFoot(dt, input, world) {
        const speed = this.speed;
        let vx = 0;
        let vy = 0;
        if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) vy -= 1;
        if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) vy += 1;
        if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) vx -= 1;
        if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) vx += 1;
        if (vx !== 0 || vy !== 0) {
            const length = Math.hypot(vx, vy) || 1;
            this.x += (vx / length) * speed * dt;
            this.y += (vy / length) * speed * dt;
        }
        this.clampToWorld(world);
    }

    clampToWorld(world) {
        this.x = clamp(this.x, 0, world.size.width - this.width);
        this.y = clamp(this.y, 0, world.size.height - this.height);
    }

    updateInVehicle(dt, input) {
        if (!this.vehicle) return;
        const vehicle = this.vehicle;
        let throttle = 0;
        if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) throttle += 1;
        if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) throttle -= 1;
        if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) {
            vehicle.angle -= vehicle.turnRate * dt * clamp(vehicle.speed / vehicle.maxSpeed, 0.15, 1.2);
        }
        if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) {
            vehicle.angle += vehicle.turnRate * dt * clamp(vehicle.speed / vehicle.maxSpeed, 0.15, 1.2);
        }
        const accel = throttle * vehicle.acceleration;
        vehicle.speed = clamp(vehicle.speed + accel * dt, -vehicle.maxSpeed * 0.4, vehicle.maxSpeed);
        vehicle.speed *= 0.992;
        vehicle.x += Math.cos(vehicle.angle) * vehicle.speed * dt;
        vehicle.y += Math.sin(vehicle.angle) * vehicle.speed * dt;
    }
}

export class GameWorld {
    constructor(ui, assets) {
        this.ui = ui;
        this.assets = assets;
        this.canvas = ui.getCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.minimap = ui.getMinimap();
        this.miniCtx = this.minimap.getContext('2d');
        this.input = new InputManager(this.canvas);
        this.input.attach();
        this.input.onPrimaryDown(() => this.handlePrimaryAction());
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Escape' && this.state === 'playing') {
                this.togglePause(!this.paused);
            }
        });

        this.settings = { ...DEFAULT_SETTINGS };
        this.reset();
    }

    reset() {
        this.state = 'menu';
        this.world = null;
        this.player = null;
        this.vehicles = [];
        this.pedestrians = [];
        this.cops = [];
        this.bullets = [];
        this.pois = [];
        this.buildings = [];
        this.weather = { label: 'Clear Skies', intensity: 0 };
        this.timeOfDay = 0;
        this.paused = false;
        this.wantedLevel = 0;
        this.wantedTimer = 0;
        this.mission = { title: 'Free Roam', detail: 'Explore, earn cash, and survive the city.' };
        this.seed = Math.floor(Math.random() * 1_000_000_000);
        this.rng = new RNG(this.seed);
        this.interactLatch = false;
        this.weatherTimer = 0;
    }

    configure(settings) {
        this.settings = { ...this.settings, ...settings };
        if (this.world) {
            this.world.dayLength = this.settings.dayLength;
            this.world.showHitboxes = this.settings.hitboxes;
        }
    }

    startNewGame(options) {
        this.reset();
        this.state = 'playing';
        this.seed = options.seed ?? Math.floor(Math.random() * 1_000_000_000);
        this.rng = new RNG(this.seed);
        this.generateWorld();
        const spriteKey = options.gender === 'female' ? 'heroFemale' : 'heroMale';
        const startPos = { x: this.world.center.x + 30, y: this.world.center.y + 30 };
        this.player = new Player({
            x: startPos.x,
            y: startPos.y,
            spriteKey,
            name: options.name,
            cash: options.cash,
            weapon: options.weapon,
        });
        this.player.weaponAmmo = options.weapon === 'shotgun' ? 24 : options.weapon === 'rifle' ? 45 : 60;
        this.timeOfDay = 0.25;
        this.weather = { label: 'Clear Skies', intensity: 0 };
        this.ui.setScreen('game');
        this.ui.showToast('Dropping you into Static City. Stay sharp.');
        this.updateHud();
    }

    loadFromSave() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) {
            this.ui.showToast('No previous save found.');
            return false;
        }
        try {
            const data = JSON.parse(raw);
            this.reset();
            this.state = 'playing';
            this.seed = data.seed;
            this.rng = new RNG(this.seed);
            this.generateWorld();
            this.player = new Player({
                x: data.player.x,
                y: data.player.y,
                spriteKey: data.player.gender === 'female' ? 'heroFemale' : 'heroMale',
                name: data.player.name,
                cash: data.player.cash,
                weapon: data.player.weapon,
            });
            this.player.weaponAmmo = data.player.weaponAmmo;
            this.player.health = data.player.health;
            this.player.armor = data.player.armor;
            this.timeOfDay = data.timeOfDay;
            this.weather = data.weather;
            this.wantedLevel = data.wantedLevel;
            this.mission = data.mission;
            this.configure(data.settings ?? DEFAULT_SETTINGS);
            this.ui.setSettings(this.settings);
            this.ui.setScreen('game');
            this.paused = false;
            this.ui.showPause(false);
            this.ui.showSettings(false);
            this.ui.showGallery(false);
            this.ui.showToast('Loaded your previous escape attempt.');
            this.updateHud();
            return true;
        } catch (error) {
            console.error(error);
            this.ui.showToast('Save corrupted. Starting fresh.');
            return false;
        }
    }

    saveGame() {
        if (!this.player || !this.world) return;
        const payload = {
            seed: this.seed,
            player: {
                x: this.player.x,
                y: this.player.y,
                name: this.player.name,
                cash: this.player.cash,
                weapon: this.player.weapon,
                weaponAmmo: this.player.weaponAmmo,
                health: this.player.health,
                armor: this.player.armor,
                gender: this.player.spriteKey === 'heroFemale' ? 'female' : 'male',
            },
            timeOfDay: this.timeOfDay,
            weather: this.weather,
            wantedLevel: this.wantedLevel,
            mission: this.mission,
            settings: this.settings,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        this.ui.showToast('Save stored locally.');
    }

    togglePause(value) {
        this.paused = value;
        this.ui.showPause(this.paused);
        if (this.paused) {
            this.ui.showToast('Simulation paused');
        }
    }

    generateWorld() {
        const size = { width: 3600, height: 3600 };
        this.world = {
            size,
            center: { x: size.width / 2, y: size.height / 2 },
            dayLength: this.settings.dayLength,
            showHitboxes: this.settings.hitboxes,
        };
        this.buildings = [];
        this.pois = [];
        const cols = 6;
        const rows = 4;
        const cellW = size.width / cols;
        const cellH = size.height / rows;
        let buildingIndex = 0;
        const buildingSprites = this.assets.getByCategory('buildings');
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const sprite = buildingSprites[buildingIndex % buildingSprites.length];
                buildingIndex++;
                const marginX = cellW * 0.15;
                const marginY = cellH * 0.15;
                const width = cellW - marginX * 2;
                const height = cellH - marginY * 2;
                const x = col * cellW + marginX;
                const y = row * cellH + marginY;
                this.buildings.push({ x, y, width, height, spriteKey: sprite.key, district: `District ${row + 1}-${col + 1}` });
            }
        }

        const poiSprites = this.assets.getByCategory('poi');
        for (let i = 0; i < 7; i++) {
            const sprite = poiSprites[i % poiSprites.length];
            this.pois.push({
                x: this.world.center.x + Math.cos((TWO_PI / 7) * i) * 800,
                y: this.world.center.y + Math.sin((TWO_PI / 7) * i) * 800,
                spriteKey: sprite.key,
                label: sprite.label,
            });
        }

        this.vehicles = [];
        const vehicleSprites = this.assets.getByCategory('vehicles');
        const civilianCount = Math.floor(12 * this.settings.traffic);
        for (let i = 0; i < civilianCount; i++) {
            const sprite = vehicleSprites[i % vehicleSprites.length];
            if (sprite.key === 'heli' || sprite.key === 'boat' || sprite.key === 'swat' || sprite.key === 'police') continue;
            this.vehicles.push(
                new Vehicle({
                    x: this.world.center.x + (Math.random() - 0.5) * size.width * 0.8,
                    y: this.world.center.y + (Math.random() - 0.5) * size.height * 0.8,
                    spriteKey: sprite.key,
                    type: sprite.key,
                }),
            );
        }
        // Pre-deploy one tutorial vehicle near spawn
        this.vehicles.push(
            new Vehicle({
                x: this.world.center.x + 180,
                y: this.world.center.y,
                spriteKey: 'sports',
                type: 'sports',
            }),
        );

        this.pedestrians = [];
        const pedCount = Math.floor(30 * this.settings.peds);
        for (let i = 0; i < pedCount; i++) {
            this.pedestrians.push(
                new Pedestrian({
                    x: this.world.center.x + (Math.random() - 0.5) * size.width * 0.9,
                    y: this.world.center.y + (Math.random() - 0.5) * size.height * 0.9,
                    type: i % 5 === 0 ? 'npcGang' : 'npcCivilian',
                }),
            );
        }
        // Cop foot patrols
        for (let i = 0; i < 6; i++) {
            this.pedestrians.push(
                new Pedestrian({
                    x: this.world.center.x + Math.cos((TWO_PI / 6) * i) * 500,
                    y: this.world.center.y + Math.sin((TWO_PI / 6) * i) * 500,
                    type: 'npcCop',
                }),
            );
        }

        this.cops = [];
        this.bullets = [];
    }

    handlePrimaryAction() {
        if (this.state !== 'playing' || this.paused) return;
        if (this.player.vehicle) {
            this.fireVehicleWeapons();
        } else {
            this.fireWeapon();
        }
    }

    fireVehicleWeapons() {
        const vehicle = this.player.vehicle;
        if (!vehicle || vehicle.cooldown > 0) return;
        vehicle.cooldown = 0.6;
        this.spawnBullet({
            x: vehicle.x + Math.cos(vehicle.angle) * 60,
            y: vehicle.y + Math.sin(vehicle.angle) * 60,
            angle: vehicle.angle,
            speed: 700,
            damage: 30,
        });
        this.increaseWanted(0.6);
    }

    fireWeapon() {
        if (this.player.weaponCooldown > 0 || this.player.weaponAmmo <= 0) {
            return;
        }
        const pointer = this.input.pointer;
        const playerCenter = this.player.center;
        const aimAngle = Math.atan2(pointer.y - playerCenter.y, pointer.x - playerCenter.x);
        const muzzleDistance = 28;
        this.spawnBullet({
            x: playerCenter.x + Math.cos(aimAngle) * muzzleDistance,
            y: playerCenter.y + Math.sin(aimAngle) * muzzleDistance,
            angle: aimAngle,
            speed: this.player.weapon === 'shotgun' ? 900 : 1200,
            damage: this.player.weapon === 'shotgun' ? 40 : 25,
        });
        if (this.player.weapon === 'shotgun') {
            // add pellet spread
            this.spawnBullet({
                x: playerCenter.x + Math.cos(aimAngle) * muzzleDistance,
                y: playerCenter.y + Math.sin(aimAngle) * muzzleDistance,
                angle: aimAngle + 0.05,
                speed: 900,
                damage: 25,
            });
            this.spawnBullet({
                x: playerCenter.x + Math.cos(aimAngle) * muzzleDistance,
                y: playerCenter.y + Math.sin(aimAngle) * muzzleDistance,
                angle: aimAngle - 0.05,
                speed: 900,
                damage: 25,
            });
        }
        this.player.weaponAmmo = Math.max(0, this.player.weaponAmmo - 1);
        this.player.weaponCooldown = this.player.weapon === 'rifle' ? 0.09 : this.player.weapon === 'smg' ? 0.06 : 0.18;
        this.increaseWanted(0.5);
    }

    spawnBullet({ x, y, angle, speed, damage }) {
        this.bullets.push(new Bullet({ x, y, angle, speed, damage, owner: 'player' }));
    }

    attemptVehicleInteraction() {
        if (!this.player) return;
        if (this.player.vehicle) {
            // exit vehicle
            const vehicle = this.player.vehicle;
            this.player.vehicle = null;
            vehicle.occupant = null;
            this.player.x = vehicle.x + Math.cos(vehicle.angle + Math.PI / 2) * 40;
            this.player.y = vehicle.y + Math.sin(vehicle.angle + Math.PI / 2) * 40;
            this.ui.showToast('Returned to foot.');
            return;
        }
        const playerCenter = this.player.center;
        let nearest = null;
        let nearestDist = Infinity;
        this.vehicles.forEach((vehicle) => {
            if (vehicle.occupant) return;
            const dist = distanceSquared(vehicle, playerCenter);
            if (dist < nearestDist && dist < 140 * 140) {
                nearest = vehicle;
                nearestDist = dist;
            }
        });
        if (nearest) {
            this.player.vehicle = nearest;
            nearest.occupant = this.player;
            this.ui.showToast(`Hijacked ${nearest.label}.`);
            this.increaseWanted(0.4);
        }
    }

    update(dt) {
        if (this.state !== 'playing' || this.paused) return;
        if (!this.player || !this.world) return;

        this.timeOfDay = (this.timeOfDay + dt / this.world.dayLength) % 1;
        this.updateWeather(dt);

        if (this.player.weaponCooldown > 0) {
            this.player.weaponCooldown = Math.max(0, this.player.weaponCooldown - dt);
        }

        const eDown = this.input.isKeyDown('KeyE');
        if (eDown && !this.interactLatch) {
            this.attemptVehicleInteraction();
        }
        this.interactLatch = eDown;

        if (this.player.vehicle) {
            this.player.updateInVehicle(dt, this.input);
            this.player.x = this.player.vehicle.x;
            this.player.y = this.player.vehicle.y;
            this.resolveVehicleCollisions(this.player.vehicle);
        } else {
            this.player.updateOnFoot(dt, this.input, this.world);
            this.resolveBuildingCollisions(this.player);
        }

        this.vehicles.forEach((vehicle) => {
            if (vehicle.occupant?.isPlayer) {
                vehicle.keepInside(this.world);
                this.resolveVehicleCollisions(vehicle);
                return;
            }
            vehicle.update(dt, this.world, this.player);
            this.resolveVehicleCollisions(vehicle);
        });

        this.pedestrians.forEach((ped) => {
            ped.update(dt, this.world);
            if (ped.health <= 0) return;
            if (ped.type === 'npcCop' && this.wantedLevel >= 1.5) {
                const dx = this.player.x - ped.x;
                const dy = this.player.y - ped.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 340) {
                    ped.target = { x: this.player.x, y: this.player.y };
                }
            }
        });

        this.updatePolice(dt);
        this.updateBullets(dt);
        this.updateWanted(dt);
        this.resolveInteractions();
        this.updateHud();
    }

    resolveInteractions() {
        if (this.player.vehicle) {
            this.ui.showInteraction('Exit vehicle');
            return;
        }
        let nearest = null;
        let nearestDist = Infinity;
        this.vehicles.forEach((vehicle) => {
            if (vehicle.occupant) return;
            const dist = Math.sqrt(distanceSquared(vehicle, this.player.center));
            if (dist < nearestDist) {
                nearest = vehicle;
                nearestDist = dist;
            }
        });
        if (nearest && nearestDist < 120) {
            this.ui.showInteraction(`Enter ${nearest.label}`);
        } else {
            this.ui.hideInteraction();
        }
    }

    updateWeather(dt) {
        if (!this.weatherTimer) this.weatherTimer = 30 + Math.random() * 40;
        this.weatherTimer -= dt;
        if (this.weatherTimer <= 0) {
            this.weatherTimer = 45 + Math.random() * 60;
            const states = [
                { label: 'Clear Skies', intensity: 0 },
                { label: 'Light Rain', intensity: 0.35 },
                { label: 'Heavy Rain', intensity: 0.65 },
                { label: 'Storm Front', intensity: 0.85 },
                { label: 'Dense Fog', intensity: 0.5 },
            ];
            this.weather = states[Math.floor(Math.random() * states.length)];
        }
    }

    updateWanted(dt) {
        if (this.wantedLevel > 0) {
            this.wantedTimer += dt;
            if (this.wantedTimer > 12) {
                this.wantedLevel = Math.max(0, this.wantedLevel - dt * 0.2);
            }
        } else {
            this.wantedTimer = 0;
        }
        this.managePolicePresence();
    }

    increaseWanted(amount) {
        this.wantedLevel = clamp(this.wantedLevel + amount, 0, 5);
        this.wantedTimer = 0;
    }

    managePolicePresence() {
        const targetUnits = Math.ceil(this.wantedLevel);
        while (this.cops.length < targetUnits) {
            this.spawnPoliceUnit();
        }
        while (this.cops.length > targetUnits) {
            this.cops.pop();
        }
    }

    spawnPoliceUnit() {
        const angle = Math.random() * TWO_PI;
        const distance = this.world.size.width * 0.45;
        const x = this.world.center.x + Math.cos(angle) * distance;
        const y = this.world.center.y + Math.sin(angle) * distance;
        const vehicle = new Vehicle({
            x,
            y,
            spriteKey: this.wantedLevel >= 4 ? 'swat' : 'police',
            type: this.wantedLevel >= 4 ? 'swat' : 'police',
            police: true,
            maxSpeed: this.wantedLevel >= 4 ? 340 : 300,
            acceleration: 520,
            turnRate: 2.8,
        });
        vehicle.angle = Math.atan2(this.player.y - y, this.player.x - x);
        this.cops.push(vehicle);
    }

    updatePolice(dt) {
        this.cops.forEach((vehicle) => {
            vehicle.update(dt, this.world, this.player);
            this.resolveVehicleCollisions(vehicle);
            const dist = Math.hypot(vehicle.x - this.player.x, vehicle.y - this.player.y);
            if (dist < 120 && this.player.vehicle) {
                this.player.vehicle.speed *= 0.95;
                this.increaseWanted(0.1);
            }
        });
    }

    updateBullets(dt) {
        this.bullets.forEach((bullet) => bullet.update(dt));
        this.bullets = this.bullets.filter((bullet) => {
            if (bullet.life <= 0) return false;
            if (!this.world) return false;
            if (bullet.x < 0 || bullet.y < 0 || bullet.x > this.world.size.width || bullet.y > this.world.size.height) {
                return false;
            }
            let hit = false;
            const targetGroups = [...this.pedestrians, ...this.cops];
            for (const target of targetGroups) {
                if (target.health !== undefined && target.health <= 0) continue;
                const rect = { x: target.x - 18, y: target.y - 18, width: 36, height: 36 };
                if (bullet.x > rect.x && bullet.x < rect.x + rect.width && bullet.y > rect.y && bullet.y < rect.y + rect.height) {
                    target.health = (target.health ?? 80) - bullet.damage;
                    hit = true;
                    if (target.type === 'npcCop') {
                        this.increaseWanted(0.8);
                    }
                    if (target.health <= 0) {
                        if (target.type === 'npcGang') {
                            this.player.cash += 120;
                        } else if (target.type === 'npcCop') {
                            this.player.cash += 40;
                        }
                    }
                    break;
                }
            }
            return !hit;
        });
    }

    resolveBuildingCollisions(entity) {
        const rect = { x: entity.x, y: entity.y, width: entity.width, height: entity.height };
        for (const building of this.buildings) {
            if (aabbIntersect(rect, building)) {
                const overlapX1 = rect.x + rect.width - building.x;
                const overlapX2 = building.x + building.width - rect.x;
                const overlapY1 = rect.y + rect.height - building.y;
                const overlapY2 = building.y + building.height - rect.y;
                const minOverlapX = Math.min(overlapX1, overlapX2);
                const minOverlapY = Math.min(overlapY1, overlapY2);
                if (minOverlapX < minOverlapY) {
                    if (overlapX1 < overlapX2) {
                        entity.x = building.x - rect.width - 1;
                    } else {
                        entity.x = building.x + building.width + 1;
                    }
                } else {
                    if (overlapY1 < overlapY2) {
                        entity.y = building.y - rect.height - 1;
                    } else {
                        entity.y = building.y + building.height + 1;
                    }
                }
                rect.x = entity.x;
                rect.y = entity.y;
            }
        }
    }

    resolveVehicleCollisions(vehicle) {
        const rect = {
            x: vehicle.x - vehicle.width / 2,
            y: vehicle.y - vehicle.height / 2,
            width: vehicle.width,
            height: vehicle.height,
        };
        for (const building of this.buildings) {
            if (!aabbIntersect(rect, building)) continue;
            const overlapX1 = rect.x + rect.width - building.x;
            const overlapX2 = building.x + building.width - rect.x;
            const overlapY1 = rect.y + rect.height - building.y;
            const overlapY2 = building.y + building.height - rect.y;
            if (Math.min(overlapX1, overlapX2) < Math.min(overlapY1, overlapY2)) {
                if (overlapX1 < overlapX2) {
                    rect.x = building.x - rect.width - 2;
                } else {
                    rect.x = building.x + building.width + 2;
                }
                vehicle.speed *= 0.4;
            } else {
                if (overlapY1 < overlapY2) {
                    rect.y = building.y - rect.height - 2;
                } else {
                    rect.y = building.y + building.height + 2;
                }
                vehicle.speed *= 0.4;
            }
            vehicle.x = rect.x + rect.width / 2;
            vehicle.y = rect.y + rect.height / 2;
        }
    }

    draw() {
        if (!this.world || this.state !== 'playing') return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const scale = 1;
        const cameraX = clamp(this.player.x - this.canvas.width / (2 * scale), 0, this.world.size.width - this.canvas.width / scale);
        const cameraY = clamp(this.player.y - this.canvas.height / (2 * scale), 0, this.world.size.height - this.canvas.height / scale);
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-cameraX, -cameraY);

        this.drawGround(ctx);
        this.drawBuildings(ctx);
        this.drawPois(ctx);
        this.drawVehicles(ctx);
        this.drawPedestrians(ctx);
        this.drawPlayer(ctx);
        this.drawBullets(ctx);
        if (this.settings.hitboxes) {
            this.debugHitboxes(ctx);
        }
        ctx.restore();
        this.drawWeatherOverlay();
        this.drawMinimap(cameraX, cameraY);
    }

    drawGround(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, this.world.size.width, this.world.size.height);
        gradient.addColorStop(0, '#20263c');
        gradient.addColorStop(0.5, '#1b1f31');
        gradient.addColorStop(1, '#151725');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.world.size.width, this.world.size.height);
        ctx.strokeStyle = 'rgba(120,160,220,0.2)';
        ctx.lineWidth = 4;
        const spacing = 200;
        ctx.beginPath();
        for (let x = spacing; x < this.world.size.width; x += spacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.world.size.height);
        }
        for (let y = spacing; y < this.world.size.height; y += spacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.world.size.width, y);
        }
        ctx.stroke();
    }

    drawBuildings(ctx) {
        this.buildings.forEach((building) => {
            ctx.save();
            ctx.fillStyle = 'rgba(18,24,40,0.95)';
            ctx.strokeStyle = 'rgba(100,140,200,0.4)';
            ctx.lineWidth = 3;
            ctx.fillRect(building.x, building.y, building.width, building.height);
            ctx.strokeRect(building.x, building.y, building.width, building.height);
            const sprite = this.assets.get(building.spriteKey);
            if (sprite) {
                ctx.globalAlpha = 0.9;
                ctx.drawImage(sprite, building.x, building.y, building.width, building.height);
            }
            ctx.restore();
        });
    }

    drawPois(ctx) {
        this.pois.forEach((poi) => {
            ctx.save();
            ctx.translate(poi.x, poi.y);
            ctx.beginPath();
            ctx.fillStyle = 'rgba(120,200,255,0.35)';
            ctx.arc(0, 0, 36, 0, TWO_PI);
            ctx.fill();
            const sprite = this.assets.get(poi.spriteKey);
            if (sprite) {
                ctx.drawImage(sprite, -28, -28, 56, 56);
            }
            ctx.restore();
        });
    }

    drawVehicles(ctx) {
        const drawVehicle = (vehicle) => {
            ctx.save();
            ctx.translate(vehicle.x, vehicle.y);
            ctx.rotate(vehicle.angle);
            const sprite = this.assets.get(vehicle.spriteKey);
            if (sprite) {
                ctx.drawImage(sprite, -vehicle.width / 2, -vehicle.height / 2, vehicle.width, vehicle.height);
            } else {
                ctx.fillStyle = vehicle.police ? '#1f6aff' : '#999';
                ctx.fillRect(-vehicle.width / 2, -vehicle.height / 2, vehicle.width, vehicle.height);
            }
            ctx.restore();
        };
        this.vehicles.forEach(drawVehicle);
        this.cops.forEach(drawVehicle);
    }

    drawPedestrians(ctx) {
        this.pedestrians.forEach((ped) => {
            if (ped.health !== undefined && ped.health <= 0) return;
            ctx.save();
            ctx.translate(ped.x, ped.y);
            ctx.fillStyle = ped.type === 'npcCop' ? '#3f8bff' : ped.type === 'npcGang' ? '#ff6b6b' : '#d9d9d9';
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, TWO_PI);
            ctx.fill();
            const sprite = this.assets.get(ped.type);
            if (sprite) {
                ctx.drawImage(sprite, -22, -22, 44, 44);
            }
            ctx.restore();
        });
    }

    drawPlayer(ctx) {
        if (this.player.vehicle) {
            return;
        }
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        const sprite = this.assets.get(this.player.spriteKey);
        if (sprite) {
            ctx.drawImage(sprite, -20, -20, 40, 40);
        } else {
            ctx.fillStyle = '#4dabff';
            ctx.fillRect(-20, -20, 40, 40);
        }
        if (this.player.hitFlash > 0) {
            ctx.strokeStyle = 'rgba(255,100,100,0.9)';
            ctx.lineWidth = 4;
            ctx.strokeRect(-22, -22, 44, 44);
        }
        ctx.restore();
    }

    drawBullets(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffed7a';
        this.bullets.forEach((bullet) => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TWO_PI);
            ctx.fill();
        });
        ctx.restore();
    }

    drawWeatherOverlay() {
        const ctx = this.ctx;
        ctx.save();
        if (this.weather.intensity > 0) {
            ctx.fillStyle = `rgba(90, 120, 170, ${0.1 + this.weather.intensity * 0.35})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.weather.label.includes('Rain')) {
                ctx.strokeStyle = 'rgba(180, 200, 255, 0.35)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < 80 * this.weather.intensity; i++) {
                    const x = Math.random() * this.canvas.width;
                    const y = Math.random() * this.canvas.height;
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + 6, y + 18);
                }
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    drawMinimap(cameraX, cameraY) {
        const ctx = this.miniCtx;
        const mapSize = this.minimap.width;
        ctx.clearRect(0, 0, mapSize, mapSize);
        ctx.fillStyle = 'rgba(20,24,36,0.94)';
        ctx.fillRect(0, 0, mapSize, mapSize);
        ctx.strokeStyle = 'rgba(120,160,255,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, mapSize - 4, mapSize - 4);
        const scaleX = mapSize / this.world.size.width;
        const scaleY = mapSize / this.world.size.height;
        const drawPoint = (x, y, color, size = 4) => {
            ctx.fillStyle = color;
            ctx.fillRect(x * scaleX - size / 2, y * scaleY - size / 2, size, size);
        };
        this.buildings.forEach((building) => {
            ctx.fillStyle = 'rgba(60,80,120,0.8)';
            ctx.fillRect(building.x * scaleX, building.y * scaleY, building.width * scaleX, building.height * scaleY);
        });
        this.pois.forEach((poi) => drawPoint(poi.x, poi.y, '#82f2ff', 6));
        this.vehicles.forEach((vehicle) => drawPoint(vehicle.x, vehicle.y, '#f2d16b'));
        this.cops.forEach((vehicle) => drawPoint(vehicle.x, vehicle.y, '#ff6b6b', 6));
        drawPoint(this.player.x, this.player.y, '#82f2ff', 8);
        // camera rectangle
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cameraX * scaleX, cameraY * scaleY, (this.canvas.width / 1) * scaleX, (this.canvas.height / 1) * scaleY);
    }

    debugHitboxes(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        this.buildings.forEach((building) => {
            ctx.strokeRect(building.x, building.y, building.width, building.height);
        });
        if (this.player) {
            ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }
        ctx.restore();
    }

    updateHud() {
        const phases = ['Night', 'Dawn', 'Day', 'Dusk'];
        const phase = phases[Math.floor((this.timeOfDay * phases.length) % phases.length)];
        const wantedStars = '★'.repeat(Math.round(this.wantedLevel)) || '—';
        this.ui.updateHud({
            stats: {
                name: `${this.player.name} · StaticQuasar931 Crew`,
                cash: `$${this.player.cash.toLocaleString()}`,
                health: this.player.health,
                armor: this.player.armor,
                timeOfDay: phase,
                weather: this.weather.label,
                wanted: `${wantedStars} (${this.wantedLevel.toFixed(1)})`,
            },
            mission: this.mission,
            vehicle: this.player.vehicle
                ? {
                      name: this.player.vehicle.label,
                      speed: Math.abs(this.player.vehicle.speed) * 3.6,
                      status: this.player.vehicle.police ? 'Police response' : 'On the move',
                  }
                : {
                      name: 'On Foot',
                      speed: 0,
                      status: 'Ready to commandeer',
                  },
            weapon: {
                name: this.getWeaponName(this.player.weapon),
                ammo: this.player.weaponAmmo > 0 ? `${this.player.weaponAmmo} rounds` : 'Reload soon',
                icon: this.getWeaponIcon(this.player.weapon),
            },
        });
    }

    getWeaponName(weapon) {
        switch (weapon) {
            case 'rifle':
                return 'Marksman Rifle';
            case 'smg':
                return 'Street SMG';
            case 'shotgun':
                return 'Combat Shotgun';
            default:
                return '9mm Pistol';
        }
    }

    getWeaponIcon(weapon) {
        const map = {
            pistol: 'assets/images/weapons/pistol.svg',
            smg: 'assets/images/weapons/smg.svg',
            rifle: 'assets/images/weapons/rifle.svg',
            shotgun: 'assets/images/weapons/shotgun.svg',
        };
        return map[weapon] ?? map.pistol;
    }
}
