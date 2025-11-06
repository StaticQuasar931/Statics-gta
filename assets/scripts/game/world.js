import { InputManager } from '../core/input.js';

const SAVE_KEY = 'static-escape-save-v2';

const DEFAULT_SETTINGS = {
    quality: 'medium',
    traffic: 1,
    peds: 1,
    dayLength: 180,
    hitboxes: false,
};

const WEATHER_PATTERNS = [
    { label: 'Clear Skies', tint: 'rgba(0, 0, 0, 0)' },
    { label: 'Golden Hour', tint: 'rgba(255, 153, 0, 0.08)' },
    { label: 'Midnight Haze', tint: 'rgba(16, 32, 64, 0.25)' },
    { label: 'Rain Front', tint: 'rgba(30, 60, 110, 0.28)' },
];

const VEHICLE_TYPES = [
    { key: 'sedan', label: 'City Sedan', speed: 120 },
    { key: 'sports', label: 'Street Sportster', speed: 180 },
    { key: 'muscle', label: 'Muscle Classic', speed: 150 },
    { key: 'truck', label: 'Utility Truck', speed: 110 },
    { key: 'bike', label: 'Street Bike', speed: 160 },
    { key: 'police', label: 'Police Cruiser', speed: 150 },
    { key: 'swat', label: 'SWAT Van', speed: 130 },
    { key: 'heli', label: 'Police Helicopter', speed: 220 },
    { key: 'boat', label: 'Patrol Boat', speed: 90 },
];

const WEAPONS = {
    pistol: { name: '9mm Pistol', icon: 'pistol', ammo: 48, fireRate: 0.35, bulletSpeed: 540 },
    smg: { name: 'Street SMG', icon: 'smg', ammo: 90, fireRate: 0.2, bulletSpeed: 600 },
    rifle: { name: 'Marksman Rifle', icon: 'rifle', ammo: 60, fireRate: 0.5, bulletSpeed: 720 },
    shotgun: { name: 'Combat Shotgun', icon: 'shotgun', ammo: 40, fireRate: 0.7, bulletSpeed: 520 },
};

class RNG {
    constructor(seed = Date.now()) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) {
            this.seed += 2147483646;
        }
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return this.seed;
    }

    float() {
        return (this.next() - 1) / 2147483646;
    }

    range(min, max) {
        return min + this.float() * (max - min);
    }

    pick(list) {
        return list[Math.floor(this.float() * list.length) % list.length];
    }
}

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export class GameWorld {
    constructor(ui, assets) {
        this.ui = ui;
        this.assets = assets;
        this.canvas = this.ui.getCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.minimapCtx = this.ui.getMinimap().getContext('2d');
        this.input = new InputManager(this.canvas);
        this.input.attach();
        this.input.onPrimaryDown(() => this.fireWeapon());

        this.state = 'idle';
        this.paused = false;
        this.settings = { ...DEFAULT_SETTINGS };

        this.timeOfDay = 0.1;
        this.weather = WEATHER_PATTERNS[0];
        this.wantedLevel = 0;
        this.wantedTimer = 0;

        this.player = null;
        this.world = null;
        this.vehicles = [];
        this.peds = [];
        this.police = [];
        this.bullets = [];
        this.pointsOfInterest = [];
        this.buildings = [];

        this.rng = new RNG();
    }

    configure(settings) {
        this.settings = { ...this.settings, ...settings };
    }

    reset() {
        this.state = 'idle';
        this.paused = false;
        this.player = null;
        this.world = null;
        this.vehicles = [];
        this.peds = [];
        this.police = [];
        this.bullets = [];
        this.pointsOfInterest = [];
        this.buildings = [];
        this.wantedLevel = 0;
        this.wantedTimer = 0;
        this.ui.hideInteraction();
    }

    startNewGame(options) {
        this.reset();
        this.state = 'playing';
        this.seed = Math.floor(Math.random() * 1_000_000);
        this.rng = new RNG(this.seed);
        this.generateWorld();
        this.spawnTraffic();
        this.spawnPedestrians();
        this.timeOfDay = 0.2;
        this.weather = this.rng.pick(WEATHER_PATTERNS);

        const spriteKey = options.gender === 'female' ? 'heroFemale' : 'heroMale';
        const weaponData = WEAPONS[options.weapon] ?? WEAPONS.pistol;

        this.player = {
            x: this.world.center.x,
            y: this.world.center.y,
            width: 38,
            height: 52,
            spriteKey,
            name: options.name,
            cash: options.cash,
            weapon: options.weapon,
            ammo: weaponData.ammo,
            health: 100,
            armor: 40,
            vehicle: null,
            mode: 'foot',
            fireCooldown: 0,
            lastMove: { x: 1, y: 0 },
        };

        this.ui.setScreen('game');
        this.ui.showPause(false);
        this.ui.showSettings(false);
        this.ui.showGallery(false);
        this.ui.showToast('Static City is live. Good luck, StaticQuasar931!');
        this.updateHud();
    }

    saveGame() {
        if (!this.player || !this.world) return;
        const payload = {
            seed: this.seed,
            settings: this.settings,
            player: {
                name: this.player.name,
                gender: this.player.spriteKey === 'heroFemale' ? 'female' : 'male',
                x: this.player.x,
                y: this.player.y,
                cash: this.player.cash,
                weapon: this.player.weapon,
                ammo: this.player.ammo,
                health: this.player.health,
                armor: this.player.armor,
                inVehicle: this.player.mode === 'vehicle' ? this.player.vehicle?.id ?? null : null,
            },
            timeOfDay: this.timeOfDay,
            weatherIndex: WEATHER_PATTERNS.indexOf(this.weather),
            wantedLevel: this.wantedLevel,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        this.ui.showToast('Progress saved locally.');
    }

    loadFromSave() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) {
            this.ui.showToast('No save data found.');
            return false;
        }
        try {
            const data = JSON.parse(raw);
            this.reset();
            this.state = 'playing';
            this.seed = data.seed;
            this.rng = new RNG(this.seed);
            this.configure(data.settings ?? DEFAULT_SETTINGS);
            this.generateWorld();
            this.spawnTraffic();
            this.spawnPedestrians();
            this.timeOfDay = data.timeOfDay ?? 0.2;
            this.weather = WEATHER_PATTERNS[data.weatherIndex ?? 0] ?? WEATHER_PATTERNS[0];
            this.wantedLevel = data.wantedLevel ?? 0;

            const weaponData = WEAPONS[data.player.weapon] ?? WEAPONS.pistol;
            this.player = {
                x: data.player.x,
                y: data.player.y,
                width: 38,
                height: 52,
                spriteKey: data.player.gender === 'female' ? 'heroFemale' : 'heroMale',
                name: data.player.name,
                cash: data.player.cash,
                weapon: data.player.weapon,
                ammo: data.player.ammo ?? weaponData.ammo,
                health: data.player.health ?? 100,
                armor: data.player.armor ?? 40,
                vehicle: null,
                mode: 'foot',
                fireCooldown: 0,
                lastMove: { x: 1, y: 0 },
            };

            if (data.player.inVehicle) {
                const target = this.vehicles.find((veh) => veh.id === data.player.inVehicle);
                if (target) {
                    this.enterVehicle(target);
                }
            }

            this.ui.setScreen('game');
            this.ui.showPause(false);
            this.ui.showSettings(false);
            this.ui.showGallery(false);
            this.ui.showToast('Loaded your last escape run.');
            this.updateHud();
            return true;
        } catch (error) {
            console.error(error);
            this.ui.showToast('Save data corrupted.');
            return false;
        }
    }

    togglePause(force) {
        if (this.state !== 'playing') return;
        this.paused = typeof force === 'boolean' ? force : !this.paused;
        this.ui.showPause(this.paused);
        if (this.paused) {
            this.ui.showToast('Simulation paused.');
        } else {
            this.ui.showToast('Back to the streets.');
        }
    }

    update(delta) {
        if (this.state !== 'playing' || this.paused || !this.player) return;

        this.timeOfDay = (this.timeOfDay + delta / this.settings.dayLength) % 1;
        if (this.rng.float() < delta * 0.02) {
            this.weather = this.rng.pick(WEATHER_PATTERNS);
        }

        this.updatePlayer(delta);
        this.updateVehicles(delta);
        this.updatePedestrians(delta);
        this.updatePolice(delta);
        this.updateBullets(delta);
        this.updateWanted(delta);
        this.updateInteractionHint();
        this.updateHud();
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground(ctx);
        this.drawDistricts(ctx);
        this.drawBuildings(ctx);
        this.drawTraffic(ctx);
        this.drawPedestrians(ctx);
        this.drawPlayer(ctx);
        this.drawBullets(ctx);
        this.drawWeather(ctx);

        if (this.settings.hitboxes) {
            this.drawHitboxes(ctx);
        }

        this.drawMinimap();
    }

    drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0e18');
        gradient.addColorStop(1, '#04050a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawDistricts(ctx) {
        if (!this.world) return;
        ctx.save();
        ctx.translate(this.canvas.width / 2 - this.world.center.x, this.canvas.height / 2 - this.world.center.y);
        this.world.districts.forEach((district) => {
            ctx.fillStyle = district.color;
            ctx.fillRect(district.x, district.y, district.width, district.height);
        });
        ctx.restore();
    }

    drawBuildings(ctx) {
        if (!this.world) return;
        ctx.save();
        ctx.translate(this.canvas.width / 2 - this.world.center.x, this.canvas.height / 2 - this.world.center.y);
        this.buildings.forEach((building) => {
            const sprite = this.assets.get(building.spriteKey);
            if (sprite) {
                ctx.drawImage(sprite, building.x, building.y, building.width, building.height);
            }
        });
        ctx.restore();
    }

    drawTraffic(ctx) {
        if (!this.world) return;
        ctx.save();
        ctx.translate(this.canvas.width / 2 - this.world.center.x, this.canvas.height / 2 - this.world.center.y);
        this.vehicles.forEach((vehicle) => {
            const sprite = this.assets.get(vehicle.spriteKey);
            if (sprite) {
                ctx.save();
                ctx.translate(vehicle.x, vehicle.y);
                ctx.rotate(vehicle.heading);
                ctx.drawImage(sprite, -vehicle.width / 2, -vehicle.height / 2, vehicle.width, vehicle.height);
                ctx.restore();
            }
        });
        ctx.restore();
    }

    drawPedestrians(ctx) {
        if (!this.world) return;
        ctx.save();
        ctx.translate(this.canvas.width / 2 - this.world.center.x, this.canvas.height / 2 - this.world.center.y);
        this.peds.forEach((ped) => {
            const sprite = this.assets.get(ped.spriteKey);
            if (sprite) {
                ctx.drawImage(sprite, ped.x - ped.width / 2, ped.y - ped.height / 2, ped.width, ped.height);
            }
        });
        this.police.forEach((cop) => {
            const sprite = this.assets.get(cop.spriteKey);
            if (sprite) {
                ctx.drawImage(sprite, cop.x - cop.width / 2, cop.y - cop.height / 2, cop.width, cop.height);
            }
        });
        ctx.restore();
    }

    drawPlayer(ctx) {
        if (!this.player || !this.world) return;
        ctx.save();
        ctx.translate(this.canvas.width / 2 - this.world.center.x, this.canvas.height / 2 - this.world.center.y);
        if (this.player.mode === 'vehicle' && this.player.vehicle) {
            const vehicle = this.player.vehicle;
            const sprite = this.assets.get(vehicle.spriteKey);
            if (sprite) {
                ctx.save();
                ctx.translate(vehicle.x, vehicle.y);
                ctx.rotate(vehicle.heading);
                ctx.drawImage(sprite, -vehicle.width / 2, -vehicle.height / 2, vehicle.width, vehicle.height);
                ctx.restore();
            }
        } else {
            const sprite = this.assets.get(this.player.spriteKey);
            if (sprite) {
                ctx.drawImage(
                    sprite,
                    this.player.x - this.player.width / 2,
                    this.player.y - this.player.height / 2,
                    this.player.width,
                    this.player.height,
                );
            }
        }
        ctx.restore();
    }

    drawBullets(ctx) {
        if (!this.world) return;
        ctx.save();
        ctx.translate(this.canvas.width / 2 - this.world.center.x, this.canvas.height / 2 - this.world.center.y);
        ctx.fillStyle = '#ffdf6b';
        this.bullets.forEach((bullet) => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    drawWeather(ctx) {
        ctx.fillStyle = this.weather.tint;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const cycle = Math.abs(Math.sin(this.timeOfDay * Math.PI));
        ctx.fillStyle = `rgba(255, 200, 120, ${0.15 * cycle})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawHitboxes(ctx) {
        if (!this.world) return;
        ctx.save();
        ctx.translate(this.canvas.width / 2 - this.world.center.x, this.canvas.height / 2 - this.world.center.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        this.buildings.forEach((building) => {
            ctx.strokeRect(building.x, building.y, building.width, building.height);
        });
        const drawRect = (entity) => {
            ctx.strokeRect(
                entity.x - entity.width / 2,
                entity.y - entity.height / 2,
                entity.width,
                entity.height,
            );
        };
        this.peds.forEach(drawRect);
        this.police.forEach(drawRect);
        this.vehicles.forEach((vehicle) => {
            ctx.strokeRect(vehicle.x - vehicle.width / 2, vehicle.y - vehicle.height / 2, vehicle.width, vehicle.height);
        });
        if (this.player) {
            drawRect(this.player.mode === 'vehicle' && this.player.vehicle ? this.player.vehicle : this.player);
        }
        ctx.restore();
    }

    drawMinimap() {
        if (!this.world) return;
        const ctx = this.minimapCtx;
        const scaleX = this.minimapCtx.canvas.width / this.world.size.width;
        const scaleY = this.minimapCtx.canvas.height / this.world.size.height;
        ctx.clearRect(0, 0, this.minimapCtx.canvas.width, this.minimapCtx.canvas.height);
        ctx.fillStyle = '#05070d';
        ctx.fillRect(0, 0, this.minimapCtx.canvas.width, this.minimapCtx.canvas.height);

        ctx.fillStyle = '#1d2844';
        this.world.districts.forEach((district) => {
            ctx.fillRect(district.x * scaleX, district.y * scaleY, district.width * scaleX, district.height * scaleY);
        });

        ctx.fillStyle = '#4dabff';
        this.buildings.forEach((building) => {
            ctx.fillRect(building.x * scaleX, building.y * scaleY, building.width * scaleX, building.height * scaleY);
        });

        ctx.fillStyle = '#ff4f4f';
        this.police.forEach((cop) => {
            ctx.fillRect(
                (cop.x - cop.width / 2) * scaleX,
                (cop.y - cop.height / 2) * scaleY,
                cop.width * scaleX,
                cop.height * scaleY,
            );
        });

        if (this.player) {
            ctx.fillStyle = '#7bff95';
            ctx.fillRect(
                (this.player.x - this.player.width / 2) * scaleX,
                (this.player.y - this.player.height / 2) * scaleY,
                this.player.width * scaleX,
                this.player.height * scaleY,
            );
        }
    }

    updatePlayer(delta) {
        const player = this.player;
        if (!player) return;

        if (player.mode === 'vehicle' && player.vehicle) {
            this.driveVehicle(player.vehicle, delta);
        } else {
            this.moveOnFoot(player, delta);
        }

        player.fireCooldown = Math.max(0, player.fireCooldown - delta);
        if (this.input.consume('Space')) {
            this.fireWeapon();
        }
        if (this.input.consume('KeyE')) {
            this.toggleVehicle();
        }
    }

    moveOnFoot(player, delta) {
        const speed = this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight') ? 240 : 160;
        const velocity = { x: 0, y: 0 };
        if (this.input.isKeyDown('KeyW') || this.input.isKeyDown('ArrowUp')) velocity.y -= 1;
        if (this.input.isKeyDown('KeyS') || this.input.isKeyDown('ArrowDown')) velocity.y += 1;
        if (this.input.isKeyDown('KeyA') || this.input.isKeyDown('ArrowLeft')) velocity.x -= 1;
        if (this.input.isKeyDown('KeyD') || this.input.isKeyDown('ArrowRight')) velocity.x += 1;

        const magnitude = Math.hypot(velocity.x, velocity.y);
        if (magnitude > 0) {
            velocity.x /= magnitude;
            velocity.y /= magnitude;
            player.lastMove = { ...velocity };
        }

        const newPos = {
            x: player.x + velocity.x * speed * delta,
            y: player.y + velocity.y * speed * delta,
        };

        if (!this.collidesWithBuildings(newPos, player.width, player.height)) {
            player.x = clamp(newPos.x, this.world.bounds.minX, this.world.bounds.maxX);
            player.y = clamp(newPos.y, this.world.bounds.minY, this.world.bounds.maxY);
        }
    }

    driveVehicle(vehicle, delta) {
        const accel = this.input.isKeyDown('KeyW') || this.input.isKeyDown('ArrowUp') ? 1 : 0;
        const brake = this.input.isKeyDown('KeyS') || this.input.isKeyDown('ArrowDown') ? 1 : 0;
        const turnLeft = this.input.isKeyDown('KeyA') || this.input.isKeyDown('ArrowLeft');
        const turnRight = this.input.isKeyDown('KeyD') || this.input.isKeyDown('ArrowRight');

        vehicle.speed += (accel - brake) * vehicle.acceleration * delta;
        vehicle.speed = clamp(vehicle.speed, -vehicle.maxReverse, vehicle.maxSpeed);

        if (vehicle.speed !== 0) {
            const steer = (turnLeft ? -1 : 0) + (turnRight ? 1 : 0);
            vehicle.heading += steer * vehicle.turnRate * delta * Math.sign(vehicle.speed);
        }

        vehicle.x += Math.cos(vehicle.heading) * vehicle.speed * delta;
        vehicle.y += Math.sin(vehicle.heading) * vehicle.speed * delta;

        vehicle.x = clamp(vehicle.x, this.world.bounds.minX, this.world.bounds.maxX);
        vehicle.y = clamp(vehicle.y, this.world.bounds.minY, this.world.bounds.maxY);

        if (this.collidesWithBuildings(vehicle, vehicle.width, vehicle.height)) {
            vehicle.speed *= -0.4;
        }

        this.player.x = vehicle.x;
        this.player.y = vehicle.y;
    }

    updateVehicles(delta) {
        if (!this.world) return;
        this.vehicles.forEach((vehicle) => {
            if (this.player && this.player.vehicle === vehicle) return;
            vehicle.x += Math.cos(vehicle.heading) * vehicle.speed * delta;
            vehicle.y += Math.sin(vehicle.heading) * vehicle.speed * delta;
            vehicle.travelled += Math.abs(vehicle.speed) * delta;
            vehicle.speed = clamp(vehicle.speed, -vehicle.maxSpeed, vehicle.maxSpeed);

            if (vehicle.travelled > vehicle.pathLength) {
                vehicle.heading += Math.PI / 2;
                vehicle.travelled = 0;
            }

            if (this.collidesWithBuildings(vehicle, vehicle.width, vehicle.height)) {
                vehicle.heading += Math.PI / 2;
            }

            vehicle.x = clamp(vehicle.x, this.world.bounds.minX, this.world.bounds.maxX);
            vehicle.y = clamp(vehicle.y, this.world.bounds.minY, this.world.bounds.maxY);
        });
    }

    updatePedestrians(delta) {
        if (!this.world) return;
        this.peds.forEach((ped) => {
            ped.timer -= delta;
            if (ped.timer <= 0) {
                ped.direction = this.rng.range(0, Math.PI * 2);
                ped.speed = this.rng.range(20, 60) * this.settings.peds;
                ped.timer = this.rng.range(1, 4);
            }
            ped.x += Math.cos(ped.direction) * ped.speed * delta;
            ped.y += Math.sin(ped.direction) * ped.speed * delta;
            ped.x = clamp(ped.x, this.world.bounds.minX, this.world.bounds.maxX);
            ped.y = clamp(ped.y, this.world.bounds.minY, this.world.bounds.maxY);
        });
    }

    updatePolice(delta) {
        if (!this.world || !this.player) return;
        if (this.wantedLevel > 0) {
            const targetCount = Math.min(5, this.wantedLevel + 1);
            while (this.police.length < targetCount) {
                this.police.push(this.createCop());
            }
        } else {
            this.police = [];
        }

        this.police.forEach((cop) => {
            const toPlayer = Math.atan2(this.player.y - cop.y, this.player.x - cop.x);
            cop.x += Math.cos(toPlayer) * cop.speed * delta;
            cop.y += Math.sin(toPlayer) * cop.speed * delta;

            if (distance(cop, this.player) < 40) {
                this.player.health = Math.max(0, this.player.health - 20 * delta);
                if (this.player.health <= 0) {
                    this.ui.showToast('You were captured. Reload from the lobby.');
                    this.togglePause(true);
                }
            }
        });
    }

    updateBullets(delta) {
        if (!this.world) return;
        this.bullets = this.bullets.filter((bullet) => {
            bullet.x += bullet.vx * delta;
            bullet.y += bullet.vy * delta;
            bullet.life -= delta;
            if (bullet.life <= 0) return false;

            const target = this.police.find((cop) => distance(cop, bullet) < 24);
            if (target) {
                this.police.splice(this.police.indexOf(target), 1);
                this.player.cash += 120;
                this.wantedLevel = clamp(this.wantedLevel + 1, 0, 5);
                this.wantedTimer = 15;
                return false;
            }

            const ped = this.peds.find((p) => distance(p, bullet) < 22);
            if (ped) {
                this.wantedLevel = clamp(this.wantedLevel + 1, 0, 5);
                this.wantedTimer = 10;
                this.peds.splice(this.peds.indexOf(ped), 1);
                return false;
            }

            return bullet.x > this.world.bounds.minX &&
                bullet.x < this.world.bounds.maxX &&
                bullet.y > this.world.bounds.minY &&
                bullet.y < this.world.bounds.maxY;
        });
    }

    updateWanted(delta) {
        if (this.wantedLevel <= 0) return;
        this.wantedTimer -= delta;
        if (this.wantedTimer <= 0) {
            this.wantedLevel = Math.max(0, this.wantedLevel - 1);
            this.wantedTimer = this.wantedLevel > 0 ? 12 : 0;
            if (this.wantedLevel === 0) {
                this.ui.showToast('Wanted level cleared.');
            }
        }
    }

    updateInteractionHint() {
        if (!this.player) return;
        if (this.player.mode === 'vehicle') {
            this.ui.showInteraction('Exit vehicle');
            return;
        }

        const nearest = this.getNearestVehicle();
        if (nearest && distance(nearest, this.player) < 70) {
            this.ui.showInteraction(`Enter ${nearest.label}`);
        } else {
            this.ui.hideInteraction();
        }
    }

    toggleVehicle() {
        if (this.player.mode === 'vehicle') {
            this.exitVehicle();
        } else {
            const target = this.getNearestVehicle();
            if (target && distance(target, this.player) < 70) {
                this.enterVehicle(target);
            }
        }
    }

    getNearestVehicle() {
        let nearest = null;
        let minDist = Infinity;
        this.vehicles.forEach((vehicle) => {
            const d = distance(vehicle, this.player);
            if (d < minDist) {
                minDist = d;
                nearest = vehicle;
            }
        });
        return nearest;
    }

    enterVehicle(vehicle) {
        this.player.mode = 'vehicle';
        this.player.vehicle = vehicle;
        vehicle.occupant = 'player';
        vehicle.speed = 0;
        this.ui.showToast(`Hotwired the ${vehicle.label}.`);
    }

    exitVehicle() {
        if (!this.player.vehicle) return;
        const vehicle = this.player.vehicle;
        this.player.mode = 'foot';
        this.player.vehicle = null;
        vehicle.occupant = null;
        this.player.x = vehicle.x + Math.cos(vehicle.heading) * (vehicle.height / 2 + 18);
        this.player.y = vehicle.y + Math.sin(vehicle.heading) * (vehicle.height / 2 + 18);
        this.ui.showToast('Back on foot.');
    }

    fireWeapon() {
        if (!this.player || !this.world) return;
        const weaponData = WEAPONS[this.player.weapon] ?? WEAPONS.pistol;
        if (this.player.ammo <= 0) {
            this.ui.showToast('Out of ammo!');
            return;
        }
        if (this.player.fireCooldown > 0) {
            return;
        }

        const pointer = this.input.pointer;
        const worldPointer = {
            x: pointer.x + this.world.center.x - this.canvas.width / 2,
            y: pointer.y + this.world.center.y - this.canvas.height / 2,
        };
        const origin = {
            x: this.player.x,
            y: this.player.y,
        };
        const dx = worldPointer.x - origin.x;
        const dy = worldPointer.y - origin.y;
        const length = Math.hypot(dx, dy) || 1;
        const vx = (dx / length) * weaponData.bulletSpeed;
        const vy = (dy / length) * weaponData.bulletSpeed;

        this.bullets.push({ x: origin.x, y: origin.y, vx, vy, life: 2.5 });
        this.player.ammo -= 1;
        this.player.fireCooldown = weaponData.fireRate;
        this.wantedLevel = clamp(this.wantedLevel + 0.2, 0, 5);
        this.wantedTimer = 12;
    }

    updateHud() {
        if (!this.player) return;
        const stats = {
            name: this.player.name,
            cash: `$${this.player.cash.toLocaleString()}`,
            health: Math.round(this.player.health),
            armor: Math.round(this.player.armor),
            timeOfDay: this.describeTimeOfDay(),
            weather: this.weather.label,
            wanted: '★'.repeat(Math.ceil(this.wantedLevel)) || '—',
        };

        const mission = {
            title: 'Sandbox Freedom',
            detail: 'Earn cash, lay low, and explore the districts.',
        };

        const vehicle = this.player.mode === 'vehicle' && this.player.vehicle
            ? {
                  name: this.player.vehicle.label,
                  speed: Math.abs(this.player.vehicle.speed) * 1.8,
                  status: this.player.vehicle.speed > 0 ? 'Rolling' : 'Idle',
              }
            : {
                  name: 'On Foot',
                  speed: Math.hypot(this.player.lastMove.x, this.player.lastMove.y) * 120,
                  status: 'Ready',
              };

        const weaponInfo = WEAPONS[this.player.weapon] ?? WEAPONS.pistol;
        const weapon = {
            name: weaponInfo.name,
            ammo: `${this.player.ammo} rounds`,
            icon: this.assets.getPath(weaponInfo.icon),
        };

        this.ui.updateHud({ stats, mission, vehicle, weapon });
    }

    describeTimeOfDay() {
        const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const displayHour = ((hours + 11) % 12) + 1;
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
    }

    generateWorld() {
        const size = { width: 2400, height: 2400 };
        this.world = {
            size,
            center: { x: size.width / 2, y: size.height / 2 },
            bounds: {
                minX: 200,
                maxX: size.width - 200,
                minY: 200,
                maxY: size.height - 200,
            },
            districts: [],
        };

        const districtColors = [
            'rgba(36, 58, 92, 0.22)',
            'rgba(76, 42, 82, 0.22)',
            'rgba(46, 80, 66, 0.22)',
            'rgba(90, 70, 40, 0.22)',
            'rgba(26, 66, 102, 0.22)',
            'rgba(92, 44, 52, 0.22)',
        ];

        const grid = 3;
        const cellWidth = size.width / grid;
        const cellHeight = size.height / grid;
        for (let gx = 0; gx < grid; gx++) {
            for (let gy = 0; gy < grid; gy++) {
                const x = gx * cellWidth + 40;
                const y = gy * cellHeight + 40;
                const width = cellWidth - 80;
                const height = cellHeight - 80;
                this.world.districts.push({
                    x,
                    y,
                    width,
                    height,
                    color: this.rng.pick(districtColors),
                });
            }
        }

        this.buildings = [];
        this.world.districts.forEach((district) => {
            const buildingCount = Math.floor(this.rng.range(6, 14));
            for (let i = 0; i < buildingCount; i++) {
                const spriteKey = `building${String(((i + Math.floor(this.rng.range(0, 9))) % 10) + 1).padStart(2, '0')}`;
                const width = this.rng.range(80, 140);
                const height = this.rng.range(80, 160);
                const building = {
                    x: this.rng.range(district.x, district.x + district.width - width),
                    y: this.rng.range(district.y, district.y + district.height - height),
                    width,
                    height,
                    spriteKey,
                };
                this.buildings.push(building);
            }
        });
    }

    spawnTraffic() {
        this.vehicles = [];
        const vehicleCount = Math.floor(10 * this.settings.traffic);
        for (let i = 0; i < vehicleCount; i++) {
            const template = this.rng.pick(VEHICLE_TYPES);
            let width = 110;
            let height = 90;
            if (template.key === 'truck' || template.key === 'swat') {
                width = 150;
                height = 110;
            }
            if (template.key === 'bike') {
                width = 70;
                height = 60;
            }
            if (template.key === 'heli') {
                width = 180;
                height = 140;
            }
            if (template.key === 'boat') {
                width = 200;
                height = 80;
            }
            this.vehicles.push({
                id: `veh-${i}-${Math.floor(this.rng.next())}`,
                x: this.rng.range(300, this.world.size.width - 300),
                y: this.rng.range(300, this.world.size.height - 300),
                width,
                height,
                heading: this.rng.range(0, Math.PI * 2),
                speed: this.rng.range(40, template.speed),
                acceleration: 220,
                maxSpeed: template.speed,
                maxReverse: template.speed / 3,
                turnRate: 1.6,
                travelled: 0,
                pathLength: this.rng.range(200, 480),
                spriteKey: template.key,
                label: template.label,
                occupant: null,
            });
        }
    }

    spawnPedestrians() {
        this.peds = [];
        const pedCount = Math.floor(24 * this.settings.peds);
        for (let i = 0; i < pedCount; i++) {
            const spriteKey = this.rng.pick(['npcCivilian', 'npcGang']);
            this.peds.push({
                x: this.rng.range(260, this.world.size.width - 260),
                y: this.rng.range(260, this.world.size.height - 260),
                width: 32,
                height: 46,
                spriteKey,
                direction: this.rng.range(0, Math.PI * 2),
                speed: this.rng.range(20, 50),
                timer: this.rng.range(1, 4),
            });
        }
    }

    createCop() {
        return {
            x: this.rng.range(280, this.world.size.width - 280),
            y: this.rng.range(280, this.world.size.height - 280),
            width: 34,
            height: 48,
            spriteKey: 'npcCop',
            speed: 130 + this.wantedLevel * 10,
        };
    }

    collidesWithBuildings(entity, width, height) {
        const halfW = width / 2;
        const halfH = height / 2;
        return this.buildings.some((building) => {
            return !(
                entity.x + halfW < building.x ||
                entity.x - halfW > building.x + building.width ||
                entity.y + halfH < building.y ||
                entity.y - halfH > building.y + building.height
            );
        });
    }
}
