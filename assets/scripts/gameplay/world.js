import { Renderer } from '../engine/renderer.js';
import { InputManager } from '../core/input.js';
import { AssetLibrary } from '../engine/assets.js';
import { Player } from './player.js';
import { Vehicle } from './vehicle.js';
import { Pedestrian } from './npc.js';
import { Loot } from './loot.js';
import { EconomySystem } from './economy.js';
import { MissionSystem } from './missions.js';
import { PoliceSystem } from './police.js';

const WORLD_SIZE = 2400;
const TILE_SIZE = 60;
const ROAD_WIDTH = 36;
const DISTRICT_COLORS = [
  { road: '#2d3548', building: '#1e2440', accent: '#3bd0ff' },
  { road: '#303a2f', building: '#1f2d20', accent: '#84ff75' },
  { road: '#422c2c', building: '#281618', accent: '#ff9b6b' },
  { road: '#343042', building: '#1f1b2b', accent: '#c99bff' },
];

const ASSET_MANIFEST = {
  player: 'assets/images/characters/player-main.svg',
  ped: 'assets/images/characters/npc-civilian.svg',
  gang: 'assets/images/characters/npc-gang.svg',
  cop: 'assets/images/characters/npc-cop.svg',
  car: 'assets/images/vehicles/sedan.svg',
  sport: 'assets/images/vehicles/sports-car.svg',
  police: 'assets/images/vehicles/police-cruiser.svg',
  swat: 'assets/images/vehicles/swat-van.svg',
  bike: 'assets/images/vehicles/motorcycle.svg',
  money: 'assets/images/loot/cash.svg',
  weapon: 'assets/images/weapons/rifle.svg',
  hudMap: 'assets/images/ui/city-map.svg',
};

const CRIME_CAP = {
  gunfire: 240,
  homicide: 680,
  theft: 360,
  collision: 320,
  robbery: 420,
};

const CRIME_DECAY = {
  gunfire: 28,
  homicide: 18,
  theft: 20,
  collision: 22,
  robbery: 16,
};

const MAX_WANTED_POINTS = 1500;

export class GameWorld {
  constructor(container, ui, settings = {}) {
    this.container = container;
    this.ui = ui;
    this.settings = { fidelity: 1, density: 1, theme: 'neon', comfort: 'normal', ...settings };

    this.renderer = new Renderer(container);
    this.input = new InputManager(window);
    this.assets = new AssetLibrary(ASSET_MANIFEST);

    this.dayTime = 8 * 60;
    this.camera = { x: 0, y: 0 };
    this.player = null;
    this.vehicles = [];
    this.pedestrians = [];
    this.loot = [];
    this.bullets = [];
    this.shops = [];
    this.wanted = 0;
    this.crimeBuckets = {
      gunfire: 0,
      homicide: 0,
      theft: 0,
      collision: 0,
      robbery: 0,
    };

    this.map = [];
    this.roads = [];
    this.buildings = [];
    this.paused = false;

    this._wantedCleared = true;
    this._respawnTimer = -1;

    this.economy = new EconomySystem(ui);
    this.missions = new MissionSystem(ui);
    this.police = new PoliceSystem(this);

    this._hudTimer = 0;
  }

  async init() {
    this.ui.showLoader('Fetching assets for Neon Grandline...');
    await this.assets.load((progress) => {
      const percent = Math.round(progress * 100);
      this.ui.updateLoader?.(`${percent}% ready`, progress);
    });

    this._generateCity();
    this._spawnPlayer();
    this._spawnTraffic();
    this._spawnPedestrians();
    this._setupShops();

    this.ui.hideLoader();
    this.ui.showToast('Simulation ready. Hit Launch City to begin!', 'success');
    this.ui.showMission('Free Roam', 'Explore, earn money, or start a mission.');
    this.applySettings(this.settings);
  }

  destroy() {
    this.renderer.destroy();
    this.input.destroy();
  }

  togglePause() {
    this.paused = !this.paused;
    this.ui.togglePause?.(this.paused);
  }

  applySettings(settings) {
    this.settings = { ...this.settings, ...settings };
    const fidelity = this.settings.fidelity;
    const density = this.settings.density;
    this.renderer.setScale(1.8 * fidelity);
    this._targetPedCount = Math.round(28 * density);
    this._targetVehicleCount = Math.round(18 * density);
  }

  update(delta) {
    if (this.paused) {
      this.ui.updateHUD({
        time: this._formatTime(this.dayTime),
        mission: this.missions.activeMission?.label ?? 'Paused',
        wantedLevel: this.police.level,
        awl: this.wanted,
        money: this.player?.money ?? 0,
        health: this.player?.health ?? 0,
        armor: this.player?.armor ?? 0,
        stamina: this.player?.stamina ?? 0,
        vehicle: this.player?.vehicle ?? null,
        hint: 'Paused – press ESC to resume',
      });
      this.input.resetFrame();
      return;
    }

    this.dayTime = (this.dayTime + delta * 14) % (24 * 60);
    this._updateSky();

    this.pointerWorld = this._screenToWorld(this.input.pointer.x, this.input.pointer.y);

    this.player.update(delta, this);

    for (const vehicle of this.vehicles) {
      vehicle.update(delta, this);
    }

    for (const ped of this.pedestrians) {
      ped.update(delta, this);
    }

    this.missions.update(delta, this);
    this._updateBullets(delta);
    this._updateLoot(delta);
    this.police.update(delta);
    this._updatePlayerDown(delta);

    this._decayWanted(delta);
    this._maintainPopulation();

    const cameraTarget = this.player.cameraTarget();
    this.camera.x += (cameraTarget.x - this.camera.x) * Math.min(1, delta * 6);
    this.camera.y += (cameraTarget.y - this.camera.y) * Math.min(1, delta * 6);

    this.renderer.renderFrame(this.camera, (ctx) => this._draw(ctx));

    this.ui.updateHUD({
      time: this._formatTime(this.dayTime),
      mission: this.missions.activeMission?.label ?? 'Free Roam',
      wantedLevel: this.police.level,
      awl: this.wanted,
      money: this.player.money,
      health: this.player.health,
      armor: this.player.armor,
      stamina: this.player.stamina,
      vehicle: this.player.vehicle,
      hint: this.player.hint,
    });
  }

  spawnBullet({ x, y, direction, speed, owner, damage = 40 }) {
    this.bullets.push({ x, y, direction, speed, owner, damage, ttl: 1.2 });
  }

  spawnLoot(x, y, amount) {
    const loot = new Loot(x, y, amount, this.assets.get('money'));
    this.loot.push(loot);
    return loot;
  }

  spawnOwnedVehicle(config, player) {
    const heading = player.heading;
    const distance = 90;
    const x = player.x + Math.cos(heading) * distance;
    const y = player.y + Math.sin(heading) * distance;
    const image = this.assets.get('sport');
    const vehicle = new Vehicle(x, y, heading, image);
    vehicle.name = config.label;
    vehicle.maxSpeed = config.maxSpeed;
    vehicle.owner = 'player';
    vehicle.ai = null;
    this.addVehicle(vehicle);
    return vehicle;
  }

  collectLoot(loot, collector) {
    const index = this.loot.indexOf(loot);
    if (index >= 0) {
      this.loot.splice(index, 1);
    }
    collector.money += loot.amount;
    this.ui.showToast(`Picked up $${loot.amount}`, 'success');
  }

  reportCrime(type, value, bucket) {
    const key = bucket ?? 'gunfire';
    const cap = CRIME_CAP[key] ?? CRIME_CAP.gunfire;
    this.crimeBuckets[key] = Math.min(cap, this.crimeBuckets[key] + value);
    this.wanted = Math.min(MAX_WANTED_POINTS, this._recalculateWanted());
    this.police.setWanted(this.wanted);
    this.ui.logCrime({ type, severity: this._severityForValue(value), wanted: this.wanted });
    this._wantedCleared = false;
  }

  clearCrimeBuckets() {
    for (const key of Object.keys(this.crimeBuckets)) {
      this.crimeBuckets[key] = 0;
    }
    this.wanted = 0;
    this.police.setWanted(this.wanted);
    this._wantedCleared = true;
  }

  findNearbyVehicle(x, y, radius, predicate = () => true) {
    let nearest = null;
    let bestDistance = radius;
    for (const vehicle of this.vehicles) {
      if (!predicate(vehicle)) continue;
      const distance = Math.hypot(vehicle.x - x, vehicle.y - y);
      if (distance < bestDistance) {
        nearest = vehicle;
        bestDistance = distance;
      }
    }
    return nearest;
  }

  findNearbyLoot(x, y, radius) {
    return this.loot.find((loot) => Math.hypot(loot.x - x, loot.y - y) < radius);
  }

  findNearbyShop(x, y, radius) {
    return this.shops.find((shop) => Math.hypot(shop.x - x, shop.y - y) < radius);
  }

  openShop(shop, player) {
    this.economy.open(shop, player, this);
  }

  addVehicle(vehicle) {
    this.vehicles.push(vehicle);
  }

  removeVehicle(vehicle) {
    const index = this.vehicles.indexOf(vehicle);
    if (index >= 0) {
      this.vehicles.splice(index, 1);
    }
  }

  addPedestrian(ped) {
    this.pedestrians.push(ped);
  }

  removePedestrian(ped) {
    const index = this.pedestrians.indexOf(ped);
    if (index >= 0) {
      this.pedestrians.splice(index, 1);
    }
  }

  _spawnPlayer() {
    const spawn = { x: 0, y: 0 };
    this.player = new Player(spawn.x, spawn.y, this.assets.get('player'));
  }

  _spawnTraffic() {
    const palette = ['car', 'sport', 'bike'];
    for (let i = 0; i < 12; i += 1) {
      const lane = (i % 3) - 1;
      const angle = (Math.PI * i) / 6;
      const distance = 220 + i * 30;
      const x = Math.cos(angle) * distance + lane * 18;
      const y = Math.sin(angle) * distance + lane * 18;
      const vehicle = new Vehicle(x, y, angle + Math.PI / 2, this.assets.get(palette[i % palette.length]));
      vehicle.ai = 'traffic';
      this.vehicles.push(vehicle);
    }
  }

  _spawnPedestrians() {
    for (let i = 0; i < 30; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 400;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const roll = Math.random();
      const role = roll > 0.9 ? 'gang' : roll > 0.8 ? 'cop' : 'civilian';
      const sprite =
        role === 'gang' ? this.assets.get('gang') : role === 'cop' ? this.assets.get('cop') : this.assets.get('ped');
      const ped = new Pedestrian(x, y, sprite, role);
      this.pedestrians.push(ped);
    }
  }

  _setupShops() {
    const categories = [
      { type: 'garage', label: 'Skyline Garage', price: 3500 },
      { type: 'weapons', label: 'Bolt & Barrel', price: 1200 },
      { type: 'clothes', label: 'Neon Threads', price: 600 },
      { type: 'bank', label: 'Aurora Bank', price: 0 },
    ];

    for (let i = 0; i < categories.length; i += 1) {
      const angle = (Math.PI * 2 * i) / categories.length;
      const x = Math.cos(angle) * 260;
      const y = Math.sin(angle) * 260;
      this.shops.push({ ...categories[i], x, y });
    }
  }

  _generateCity() {
    const count = Math.floor(WORLD_SIZE / TILE_SIZE);
    this.map = [];
    this.roads = [];
    this.buildings = [];
    for (let y = -count / 2; y < count / 2; y += 1) {
      for (let x = -count / 2; x < count / 2; x += 1) {
        const district = DISTRICT_COLORS[(Math.abs(x) + Math.abs(y)) % DISTRICT_COLORS.length];
        const isMainRoad = Math.abs(x) % 4 === 0 || Math.abs(y) % 4 === 0;
        const tile = { x: x * TILE_SIZE, y: y * TILE_SIZE, district };
        this.map.push({ ...tile, type: isMainRoad ? 'road' : 'building' });
        if (isMainRoad) {
          this.roads.push(tile);
        } else {
          this.buildings.push(tile);
        }
      }
    }
  }

  _updateBullets(delta) {
    for (const bullet of this.bullets) {
      bullet.ttl -= delta;
      bullet.x += Math.cos(bullet.direction) * bullet.speed * delta;
      bullet.y += Math.sin(bullet.direction) * bullet.speed * delta;
    }

    this.bullets = this.bullets.filter((bullet) => {
      if (bullet.ttl <= 0) return false;
      if (bullet.owner !== this.player && !this.player.down) {
        const target = this.player.vehicle ?? this.player;
        const radius = (target?.radius ?? 18) + 6;
        const distance = Math.hypot(target.x - bullet.x, target.y - bullet.y);
        if (distance < radius) {
          this.player.takeDamage(bullet.damage, this);
          return false;
        }
      }

      for (const ped of this.pedestrians) {
        if (ped.dead) continue;
        const distance = Math.hypot(ped.x - bullet.x, ped.y - bullet.y);
        if (distance < ped.radius + 4) {
          ped.takeDamage(bullet.damage, this);
          return false;
        }
      }

      if (bullet.owner === this.player) {
        for (const vehicle of this.vehicles) {
          if (vehicle.faction !== 'police') continue;
          const distance = Math.hypot(vehicle.x - bullet.x, vehicle.y - bullet.y);
          if (distance < vehicle.radius + 8) {
            vehicle.applyDamage?.(bullet.damage * 0.9, this);
            return false;
          }
        }
      }

      return bullet.x > -WORLD_SIZE && bullet.x < WORLD_SIZE && bullet.y > -WORLD_SIZE && bullet.y < WORLD_SIZE;
    });
  }

  _updateLoot(delta) {
    for (const item of this.loot) {
      item.update(delta);
      const distance = Math.hypot(item.x - this.player.x, item.y - this.player.y);
      if (distance < 28) {
        this.collectLoot(item, this.player);
      }
    }

    this.loot = this.loot.filter((item) => item.timer > 0);
  }

  _decayWanted(delta) {
    let changed = false;
    for (const key of Object.keys(this.crimeBuckets)) {
      const before = this.crimeBuckets[key];
      if (before <= 0) continue;
      const decay = (CRIME_DECAY[key] ?? 18) * delta;
      const after = Math.max(0, before - decay);
      if (after !== before) {
        this.crimeBuckets[key] = after;
        changed = true;
      }
    }

    const previous = this.wanted;
    const recalculated = this._recalculateWanted();
    this.wanted = recalculated < 0.5 ? 0 : Math.min(MAX_WANTED_POINTS, recalculated);

    if (changed || previous !== this.wanted) {
      this.police.setWanted(this.wanted);
    }

    if (this.wanted === 0 && previous > 0 && !this._wantedCleared) {
      this.clearCrimeBuckets();
      this.ui.showToast('Wanted level lost. Lay low to stay safe.', 'success');
      this._wantedCleared = true;
    }
  }

  _updatePlayerDown(delta) {
    if (!this.player.down) {
      this._respawnTimer = -1;
      return;
    }

    if (this._respawnTimer < 0) {
      this._respawnTimer = 2.5;
    } else {
      this._respawnTimer -= delta;
    }

    if (this._respawnTimer <= 0) {
      this._respawnPlayer();
    }
  }

  onPlayerDown() {
    if (this.player.vehicle) {
      this.player.vehicle.driver = null;
      this.player.vehicle = null;
    }
    this.ui.showToast('You were incapacitated! Emergency crews en route.', 'error');
    this._respawnTimer = 2.5;
  }

  _respawnPlayer() {
    this.player.down = false;
    this.player.health = 120;
    this.player.armor = 40;
    this.player.stamina = 100;
    this.player.x = -60 + Math.random() * 120;
    this.player.y = -40 + Math.random() * 120;
    this.player.hint = 'Recovered at Skyline Safehouse';
    this.player.money = Math.max(0, this.player.money - 350);
    this._respawnTimer = -1;
    this.clearCrimeBuckets();
    this._wantedCleared = true;
    this.ui.showToast('Respawned at Skyline Safehouse. Medical fees paid.', 'info');
  }

  _recalculateWanted() {
    return Object.values(this.crimeBuckets).reduce((sum, amount) => sum + amount, 0);
  }

  _maintainPopulation() {
    if (this.pedestrians.length < this._targetPedCount) {
      const ped = new Pedestrian(
        this.player.x + (Math.random() - 0.5) * 400,
        this.player.y + (Math.random() - 0.5) * 400,
        this.assets.get('ped')
      );
      this.pedestrians.push(ped);
    }
    if (this.vehicles.length < this._targetVehicleCount) {
      const vehicle = new Vehicle(
        this.player.x + 320 - Math.random() * 640,
        this.player.y + 320 - Math.random() * 640,
        Math.random() * Math.PI * 2,
        this.assets.get('car')
      );
      vehicle.ai = 'traffic';
      this.vehicles.push(vehicle);
    }
  }

  _draw(ctx) {
    this._drawGround(ctx);
    this._drawRoadDetails(ctx);

    const drawables = [
      ...this.buildings.map((tile) => ({
        z: tile.y,
        draw: () => this._drawBuilding(ctx, tile),
      })),
      ...this.shops.map((shop) => ({
        z: shop.y,
        draw: () => this._drawShop(ctx, shop),
      })),
      ...this.loot.map((item) => ({
        z: item.y,
        draw: () => item.draw(ctx),
      })),
      ...this.pedestrians.map((ped) => ({
        z: ped.y,
        draw: () => ped.draw(ctx),
      })),
      ...this.vehicles.map((vehicle) => ({
        z: vehicle.y,
        draw: () => vehicle.draw(ctx),
      })),
      { z: this.player.y, draw: () => this.player.draw(ctx) },
      ...this.bullets.map((bullet) => ({
        z: bullet.y,
        draw: () => this._drawBullet(ctx, bullet),
      })),
    ];

    drawables.sort((a, b) => a.z - b.z);
    for (const entry of drawables) {
      entry.draw();
    }
  }

  _drawGround(ctx) {
    for (const road of this.roads) {
      ctx.fillStyle = road.district.road;
      ctx.fillRect(road.x - TILE_SIZE / 2, road.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    }
    for (const building of this.buildings) {
      ctx.fillStyle = building.district.building;
      ctx.fillRect(building.x - TILE_SIZE / 2, building.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    }
  }

  _drawRoadDetails(ctx) {
    ctx.strokeStyle = '#ffd369';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 18]);
    for (const road of this.roads) {
      ctx.beginPath();
      ctx.moveTo(road.x - ROAD_WIDTH / 2, road.y);
      ctx.lineTo(road.x + ROAD_WIDTH / 2, road.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(road.x, road.y - ROAD_WIDTH / 2);
      ctx.lineTo(road.x, road.y + ROAD_WIDTH / 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  _drawBuilding(ctx, tile) {
    const size = TILE_SIZE - 8;
    ctx.fillStyle = tile.district.building;
    ctx.fillRect(tile.x - size / 2, tile.y - size / 2, size, size);
    ctx.fillStyle = tile.district.accent;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(tile.x - size / 2, tile.y - size / 2, size, 6);
    ctx.globalAlpha = 1;
  }

  _drawShop(ctx, shop) {
    ctx.fillStyle = '#10151f';
    ctx.beginPath();
    ctx.arc(shop.x, shop.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4df0ff';
    ctx.font = '10px "Montserrat"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shop.label.split(' ')[0], shop.x, shop.y);
  }

  _drawBullet(ctx, bullet) {
    ctx.fillStyle = '#ff9b6b';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  _screenToWorld(clientX, clientY) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) - this.renderer.width / 2) / this.renderer.scale + this.camera.x;
    const y = ((clientY - rect.top) - this.renderer.height / 2) / this.renderer.scale + this.camera.y;
    return { x, y };
  }

  _formatTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  _severityForValue(value) {
    if (value >= 120) return 'critical';
    if (value >= 60) return 'major';
    if (value >= 25) return 'witness';
    return 'minor';
  }

  _updateSky() {
    const hours = Math.floor(this.dayTime / 60);
    if (hours >= 19 || hours < 5) {
      this.renderer.setSky('night');
    } else if (hours >= 17) {
      this.renderer.setSky('dusk');
    } else {
      this.renderer.setSky('day');
    }
  }
}
