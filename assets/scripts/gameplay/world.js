import THREE from '../engine/three.js';
import { Renderer } from '../engine/renderer.js';
import { assetLoader } from '../engine/assetLoader.js';
import { InputManager } from '../core/input.js';
import { Player } from './player.js';
import { Vehicle } from './vehicle.js';
import { NPC } from './npc.js';
import { Loot } from './loot.js';
import { EconomySystem } from './economy.js';
import { WeatherSystem } from './weather.js';
import { MissionSystem } from './missions.js';
import { PoliceSystem } from './police.js';
import {
  TARGET_FPS,
  WORLD_SIZE,
  BLOCK_SIZE,
  BUILDING_HEIGHT_RANGE,
  SHOP_TYPES,
  FEATURE_UNLOCKS,
} from './constants.js';
import { randomChoice, randomRange, seededRandom } from '../util/random.js';

const BULLET_SPEED = 380;
const BULLET_LIFETIME = 2.5;

export class GameWorld {
  constructor(container, uiManager, settings = {}) {
    this.container = container;
    this.ui = uiManager;
    this.renderer = new Renderer(container, { enableShadows: true });
    this.input = new InputManager(window);
    this.clock = 0;
    this.seed = Date.now();
    this.random = seededRandom(this.seed);
    this.settings = {
      fidelity: settings.fidelity ?? 1,
      density: settings.density ?? 1,
      theme: settings.theme ?? 'neon',
      comfort: settings.comfort ?? 'normal',
    };

    this.player = null;
    this.vehicles = [];
    this.npcs = [];
    this.loot = [];
    this.bullets = [];
    this.poi = [];

    this.economy = null;
    this.weather = null;
    this.missions = null;
    this.police = null;
    this.cameraSmoothing = 0.12;

    this.dayTime = 9 * 60; // minutes
    this.timeScale = 24; // minutes per minute real-time

  }

  async init(seed = Date.now()) {
    this.seed = seed;
    this.random = seededRandom(seed);
    await assetLoader.loadAll();
    this.applySettings(this.settings);
    this._buildWorld();
    this._spawnPlayer();
    this._spawnTraffic();
    this._spawnNPCs();
    this._setupSystems();
    this.ui.populateFeatureList(FEATURE_UNLOCKS);
    this._populatePOI();
  }

  destroy() {
    this.input.destroy();
  }

  _buildWorld() {
    this._buildGroundPlane();
    this._buildRoadGrid();
    this._buildCityBlocks();
  }

  _buildGroundPlane() {
    const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: '#1a1f2c', roughness: 0.9, metalness: 0.02 });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.renderer.add(ground);
  }

  _buildRoadGrid() {
    const roadMaterial = new THREE.MeshStandardMaterial({ color: '#202631', roughness: 0.7 });
    const laneMaterial = new THREE.MeshStandardMaterial({ color: '#30394b', roughness: 0.6 });
    const segments = WORLD_SIZE / BLOCK_SIZE;
    for (let i = -segments / 2; i <= segments / 2; i += 1) {
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD_SIZE, 0.4, 12),
        roadMaterial,
      );
      road.position.set(0, 0.2, i * BLOCK_SIZE);
      road.receiveShadow = true;
      this.renderer.add(road);

      const lane = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.2, WORLD_SIZE),
        laneMaterial,
      );
      lane.position.set(i * BLOCK_SIZE, 0.1, 0);
      lane.receiveShadow = true;
      this.renderer.add(lane);
    }
  }

  _buildCityBlocks() {
    const segments = WORLD_SIZE / BLOCK_SIZE;
    const buildingTextures = assetLoader.getSet('buildings');
    for (let x = -segments / 2; x < segments / 2; x += 1) {
      for (let z = -segments / 2; z < segments / 2; z += 1) {
        const centerX = x * BLOCK_SIZE + BLOCK_SIZE / 2;
        const centerZ = z * BLOCK_SIZE + BLOCK_SIZE / 2;
        const height = randomRange(...BUILDING_HEIGHT_RANGE);
        const texture = randomChoice(buildingTextures).texture;
        const geometry = new THREE.BoxGeometry(BLOCK_SIZE * 0.6, height, BLOCK_SIZE * 0.6);
        const material = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.2, roughness: 0.7 });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(centerX, height / 2, centerZ);
        building.castShadow = true;
        building.receiveShadow = true;
        this.renderer.add(building);
      }
    }
  }

  _spawnPlayer() {
    const geometry = new THREE.CapsuleGeometry(1, 3, 8, 16);
    const material = new THREE.MeshStandardMaterial({ color: '#58c4ff', metalness: 0.1, roughness: 0.6 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.set(0, 3, 0);
    this.renderer.add(mesh);
    this.player = new Player({ mesh, input: this.input });
  }

  _spawnTraffic(count) {
    const vehicleTextures = assetLoader.getSet('vehicles');
    const types = vehicleTextures.map((entry) => entry.key);
    const target = count ?? Math.max(0, Math.floor(24 * this.settings.density) - this.vehicles.length);
    const spawnCount = Math.max(0, target);
    for (let i = 0; i < spawnCount; i += 1) {
      const type = randomChoice(types);
      const geometry = new THREE.BoxGeometry(6, 3, 12);
      const texture = assetLoader.getTexture('vehicles', type);
      const material = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.5, roughness: 0.5 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const vehicle = new Vehicle({ mesh, id: type });
      vehicle.setPosition(randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2), 1.5, randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2));
      this.renderer.add(mesh);
      this.vehicles.push(vehicle);
    }
  }

  _spawnNPCs(count) {
    const characterTextures = assetLoader.getSet('characters');
    const targetCount = count ?? Math.max(0, Math.floor(90 * this.settings.density) - this.npcs.length);
    for (let i = 0; i < targetCount; i += 1) {
      const entry = randomChoice(characterTextures);
      const geometry = new THREE.CapsuleGeometry(0.8, 2.4, 8, 12);
      const material = new THREE.MeshStandardMaterial({ map: entry.texture, roughness: 0.65 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const faction = entry.key.includes('cop') ? 'police' : entry.key.includes('gang') ? 'gang' : 'civilians';
      const npc = new NPC({ mesh, faction });
      npc.setPosition(randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2), 1.5, randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2));
      this.renderer.add(mesh);
      this.npcs.push(npc);
    }
  }

  _setupSystems() {
    this.weather = new WeatherSystem(this.renderer, this.ui);
    this.economy = new EconomySystem(this.player, this.ui);
    this.missions = new MissionSystem(this.economy, this.ui);
    this.police = new PoliceSystem(this, this.ui);
    this.weather.setPreset('clear');
  }

  _populatePOI() {
    const segments = WORLD_SIZE / BLOCK_SIZE;
    SHOP_TYPES.forEach((shop, index) => {
      const geometry = new THREE.PlaneGeometry(12, 12);
      const texture = assetLoader.getTexture('poi', shop.texture);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      const position = new THREE.Vector3(
        ((index % segments) - segments / 2) * BLOCK_SIZE + randomRange(-20, 20),
        0.6,
        (Math.floor(index / segments) - segments / 2) * BLOCK_SIZE + randomRange(-20, 20),
      );
      mesh.position.copy(position);
      this.renderer.add(mesh);
      this.poi.push({ ...shop, mesh, position });
    });
    this.ui.updatePOIList(this.poi);
  }

  update(delta) {
    this.clock += delta;
    this.dayTime = (this.dayTime + this.timeScale * delta) % (24 * 60);
    this._updateSun();
    this._maintainPopulation();

    if (this.player.vehicle) {
      this._updateDriving(delta);
    } else {
      this.player.handleMovement(delta);
    }

    if (this.input.wasPressed('e')) {
      this.tryInteract();
    }

    this.player.update(delta);
    this.player.applyCamera(this.renderer.camera, { smoothing: this.cameraSmoothing });

    this._updateVehicles(delta);
    this._updateNPCs(delta);
    this._updateBullets(delta);
    this._updateLoot(delta);

    this.weather.update(delta);
    this.police.update(delta);

    if (this.input.wasPressed('pointer') || this.input.wasPressed('touch')) {
      this._handleFire();
    }

    this.ui.updateHUD({
      time: this.dayTime,
      money: this.player.money,
      health: this.player.health,
      armor: this.player.armor,
      stamina: this.player.stamina,
      weapon: this.player.activeWeapon,
      vehicle: this.player.vehicle,
      wantedLevel: this.police.activeLevel,
    });

    this.input.resetFrame();
  }

  _updateSun() {
    const dayProgress = this.dayTime / (24 * 60);
    const azimuth = dayProgress * 360;
    const elevation = Math.sin(dayProgress * Math.PI) * 80;
    this.renderer.updateSunPosition({ azimuth, elevation });
    const intensity = THREE.MathUtils.clamp(Math.sin(dayProgress * Math.PI) * 1.4, 0.1, 1.6);
    this.renderer.sunLight.intensity = intensity;
  }

  _updateDriving(delta) {
    const vehicle = this.player.vehicle;
    const throttle = (this.input.isDown('w') ? 1 : 0) - (this.input.isDown('s') ? 0.6 : 0);
    const steer = (this.input.isDown('d') ? 1 : 0) - (this.input.isDown('a') ? 1 : 0);
    const brake = this.input.isDown('space') ? 1 : 0;
    vehicle.applyInputs({ throttle, steer, brake });
    vehicle.update(delta);
    this.player.mesh.position.copy(vehicle.mesh.position).add(new THREE.Vector3(0, 3, 0));
    const driveSmoothing = Math.max(0.04, this.cameraSmoothing - 0.04);
    this.player.applyCamera(this.renderer.camera, { heightOffset: 12, distance: 40, smoothing: driveSmoothing });
  }

  _updateVehicles(delta) {
    for (const vehicle of this.vehicles) {
      if (vehicle === this.player.vehicle) continue;
      vehicle.applyInputs({ throttle: 0.6, steer: Math.sin(this.clock * 0.2) * 0.2 });
      vehicle.update(delta);
    }
  }

  _updateNPCs(delta) {
    for (const npc of this.npcs) {
      npc.update(delta, this);
      if (!npc.isAlive) continue;
      const distance = npc.mesh.position.distanceTo(this.player.mesh.position);
      if (distance < 18 && this.player.weaponCooldown <= 0) {
        if (npc.faction === 'police') {
          this.police.addWanted(10);
        }
      }
    }
  }

  _updateBullets(delta) {
    this.bullets = this.bullets.filter((bullet) => {
      bullet.lifetime += delta;
      if (bullet.lifetime > BULLET_LIFETIME) {
        this.renderer.remove(bullet.mesh);
        return false;
      }
      bullet.mesh.position.addScaledVector(bullet.direction, BULLET_SPEED * delta);
      bullet.hitbox.setFromObject(bullet.mesh);

      for (const npc of this.npcs) {
        if (!npc.isAlive) continue;
        if (bullet.hitbox.intersectsBox(npc.hitbox)) {
          npc.takeDamage(45);
          this.police.addWanted(npc.faction === 'police' ? 25 : 5);
          if (!npc.isAlive) {
            this._handleNPCKill(npc);
          }
          this.renderer.remove(bullet.mesh);
          return false;
        }
      }

      for (const vehicle of this.vehicles) {
        if (!vehicle.isAlive) continue;
        if (bullet.hitbox.intersectsBox(vehicle.hitbox)) {
          vehicle.takeDamage(20);
          this.police.addWanted(5);
          this.renderer.remove(bullet.mesh);
          return false;
        }
      }

      return true;
    });
  }

  _updateLoot(delta) {
    this.loot = this.loot.filter((loot) => {
      loot.update(delta);
      if (loot.hitbox.containsPoint(this.player.mesh.position)) {
        this.economy.earn('loot', loot.amount);
        this.renderer.remove(loot.mesh);
        return false;
      }
      if (loot.isExpired()) {
        this.renderer.remove(loot.mesh);
        return false;
      }
      return true;
    });
  }

  _handleFire() {
    if (!this.player.canFire()) return;
    const geometry = new THREE.SphereGeometry(0.4, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: '#ffdd55', emissive: '#ffaa00' });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.player.mesh.position).add(new THREE.Vector3(0, 6, 0));
    const direction = this.player.direction.clone().normalize();
    const bullet = { mesh, direction, lifetime: 0, hitbox: new THREE.Box3().setFromObject(mesh) };
    this.renderer.add(mesh);
    this.bullets.push(bullet);
    this.player.onWeaponFired();
  }

  _handleNPCKill(npc) {
    this.player.stats.kills += 1;
    const lootGeo = new THREE.TetrahedronGeometry(1.8, 0);
    const lootMat = new THREE.MeshStandardMaterial({ color: '#33ffaa', emissive: '#119966' });
    const mesh = new THREE.Mesh(lootGeo, lootMat);
    mesh.position.copy(npc.mesh.position).add(new THREE.Vector3(0, 2, 0));
    const amount = Math.floor(randomRange(...npc.dropMoneyRange));
    const loot = new Loot({ mesh, amount });
    this.renderer.add(mesh);
    this.loot.push(loot);
    this.police.addWanted(npc.faction === 'police' ? 40 : 12);
    this.renderer.remove(npc.mesh);
  }

  tryInteract() {
    if (this.player.vehicle) {
      this.player.exitVehicle();
      this.ui.showToast('Exited vehicle', 'info');
      return;
    }

    const nearestVehicle = this._findNearest(this.vehicles, 10);
    if (nearestVehicle) {
      this.player.enterVehicle(nearestVehicle);
      this.ui.showToast(`Entered ${nearestVehicle.id}`, 'info');
      if (!this.economy.ownedVehicles.has(nearestVehicle.id)) {
        this.police.addWanted(15);
      }
      return;
    }

    const nearestShop = this._findNearest(this.poi, 14, (poi) => poi.position);
    if (nearestShop) {
      this._handleShopInteraction(nearestShop);
      return;
    }
  }

  _handleShopInteraction(shop) {
    if (shop.id === 'dealership') {
      const price = shop.prices.purchase;
      if (this.economy.purchase('vehicle', price, { shop: shop.id })) {
        const type = randomChoice(['sports-car', 'muscle-car', 'sedan']);
        this.economy.registerOwnedVehicle(type);
        this.ui.showToast(`Unlocked ${type}`, 'success');
      }
      return;
    }
    if (shop.id === 'safehouse') {
      if (this.economy.purchase('safehouse', shop.prices.purchase, { shop: shop.id })) {
        this.economy.registerSafehouse(shop.id);
        this.player.heal(40);
      }
      return;
    }
    if (shop.id === 'weapons') {
      const weapon = randomChoice(['rifle', 'shotgun', 'smg']);
      const price = shop.prices[weapon] ?? 2000;
      if (this.economy.purchase(weapon, price)) {
        this.player.equipWeapon(weapon);
      }
      return;
    }
    this.ui.showToast(`${shop.label} visited`, 'info');
    if (shop.id === 'gas') {
      this.player.vehicle?.refuel(40);
    }
  }

  _findNearest(list, range = 10, positionAccessor = (item) => item.mesh.position) {
    let best = null;
    let bestDistance = range;
    const playerPos = this.player.mesh.position;
    for (const item of list) {
      const position = positionAccessor(item);
      const distance = position.distanceTo(playerPos);
      if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best;
  }

  dispatchPoliceUnits(response) {
    for (let i = 0; i < response.patrols; i += 1) {
      const type = randomChoice(response.vehicles);
      const geometry = new THREE.BoxGeometry(6, 3, 12);
      const texture = assetLoader.getTexture('vehicles', type);
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4, metalness: 0.6 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      const vehicle = new Vehicle({ mesh, id: type });
      vehicle.setPosition(randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2), 1.5, randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2));
      this.renderer.add(mesh);
      this.vehicles.push(vehicle);
    }
    this.ui.showToast(`Police response level ${response.level}`, 'warning');
  }

  spawnPoliceBackup(npc) {
    const type = randomChoice(['police-cruiser', 'swat-van']);
    const geometry = new THREE.BoxGeometry(6, 3, 12);
    const texture = assetLoader.getTexture('vehicles', type);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    const vehicle = new Vehicle({ mesh, id: type });
    vehicle.setPosition(npc.mesh.position.x + randomRange(-40, 40), 1.5, npc.mesh.position.z + randomRange(-40, 40));
    this.renderer.add(mesh);
    this.vehicles.push(vehicle);
    this.ui.showToast('Police backup inbound', 'warning');
  }

  applySettings(partial) {
    Object.assign(this.settings, partial);
    const renderer = this.renderer.renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * this.settings.fidelity);
    this._applyTheme(this.settings.theme);
    this.cameraSmoothing = this._comfortToSmoothing(this.settings.comfort);
    this._maintainPopulation();
  }

  _applyTheme(theme) {
    const colorMap = {
      neon: '#10131a',
      sunset: '#2b1a17',
      ice: '#0e1b2a',
    };
    const fogMap = {
      neon: 0.003,
      sunset: 0.0025,
      ice: 0.0035,
    };
    const color = colorMap[theme] ?? '#10131a';
    this.renderer.setBackgroundColor(color);
    this.renderer.setFog({ color, density: fogMap[theme] ?? 0.003 });
  }

  _comfortToSmoothing(mode) {
    switch (mode) {
      case 'steady':
        return 0.2;
      case 'cinematic':
        return 0.08;
      default:
        return 0.12;
    }
  }

  _maintainPopulation() {
    const targetNPC = Math.floor(90 * this.settings.density);
    if (this.npcs.length < targetNPC) {
      this._spawnNPCs();
    } else if (this.npcs.length > targetNPC) {
      while (this.npcs.length > targetNPC) {
        const npc = this.npcs.pop();
        this.renderer.remove(npc.mesh);
      }
    }

    const targetVehicles = Math.floor(24 * this.settings.density);
    if (this.vehicles.length < targetVehicles) {
      this._spawnTraffic();
    } else if (this.vehicles.length > targetVehicles) {
      while (this.vehicles.length > targetVehicles) {
        const vehicle = this.vehicles.pop();
        this.renderer.remove(vehicle.mesh);
      }
    }
  }
}
