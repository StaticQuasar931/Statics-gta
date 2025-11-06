import THREE from '../engine/three.js';
import { Renderer } from '../engine/renderer.js';
import { assetLoader } from '../engine/assetLoader.js';
import { createBuildingMesh, createVehicleMesh, createCharacterMesh, createStreetLight } from '../engine/geometryFactory.js';
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
import { seededRandom } from '../util/random.js';

const BULLET_SPEED = 380;
const BULLET_LIFETIME = 2.5;

const SKY_VERTEX = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SKY_FRAGMENT = `
  varying vec3 vWorldPosition;
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  void main() {
    float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
    float factor = max(pow(max(h, 0.0), exponent), 0.0);
    gl_FragColor = vec4(mix(bottomColor, topColor, factor), 1.0);
  }
`;

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
    this.accentColor = '#4df0ff';

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
    this.sky = null;

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
    this._buildSky();
    this._buildGroundPlane();
    this._buildRoadGrid();
    this._buildCityBlocks();
  }

  _buildSky() {
    const geometry = new THREE.SphereGeometry(WORLD_SIZE * 1.4, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#16315c') },
        bottomColor: { value: new THREE.Color('#05070d') },
        offset: { value: 80 },
        exponent: { value: 0.55 },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(geometry, material);
    sky.position.y = -WORLD_SIZE * 0.12;
    this.renderer.add(sky);
    this.sky = sky;
  }

  _buildGroundPlane() {
    const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: '#1a1f2c', roughness: 0.85, metalness: 0.05 });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.renderer.add(ground);

    const grid = new THREE.GridHelper(WORLD_SIZE, WORLD_SIZE / BLOCK_SIZE, '#1e293b', '#0f172a');
    grid.material.transparent = true;
    grid.material.opacity = 0.14;
    grid.position.y = 0.05;
    this.renderer.add(grid);
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
    const defaultTexture = buildingTextures[0]?.texture;
    for (let x = -segments / 2; x < segments / 2; x += 1) {
      for (let z = -segments / 2; z < segments / 2; z += 1) {
        const centerX = x * BLOCK_SIZE + BLOCK_SIZE / 2;
        const centerZ = z * BLOCK_SIZE + BLOCK_SIZE / 2;
        const width = BLOCK_SIZE * this._randomRange(0.45, 0.68);
        const depth = BLOCK_SIZE * this._randomRange(0.45, 0.68);
        const height = this._randomRange(...BUILDING_HEIGHT_RANGE);
        const textureEntry = this._randomChoice(buildingTextures) ?? { texture: defaultTexture };
        const building = createBuildingMesh({
          width,
          depth,
          height,
          texture: textureEntry?.texture,
          themeColor: this.accentColor,
          seed: this.random(),
        });
        building.position.set(centerX, 0, centerZ);
        building.rotation.y = Math.floor(this.random() * 4) * (Math.PI / 2);
        this.renderer.add(building);

        if (this.random() > 0.85) {
          const lamp = createStreetLight({ height: this._randomRange(8, 14), color: this.accentColor, seed: this.random() });
          lamp.position.set(centerX + width * 0.6, 0, centerZ + depth * 0.6);
          this.renderer.add(lamp);
        }
      }
    }
  }

  _spawnPlayer() {
    const characterSet = assetLoader.getSet('characters');
    const hero = characterSet.find((entry) => entry.key.includes('protagonist')) ?? characterSet[0];
    const mesh = createCharacterMesh({ texture: hero?.texture, accentColor: this.accentColor, scale: 1.05 });
    mesh.position.set(0, 0, 0);
    this.renderer.add(mesh);
    this.player = new Player({ mesh, input: this.input });
  }

  _spawnTraffic(count) {
    const vehicleTextures = assetLoader.getSet('vehicles');
    const types = vehicleTextures.map((entry) => entry.key);
    const defaultTexture = vehicleTextures[0]?.texture;
    const target = count ?? Math.max(0, Math.floor(24 * this.settings.density) - this.vehicles.length);
    const spawnCount = Math.max(0, target);
    for (let i = 0; i < spawnCount; i += 1) {
      const type = this._randomChoice(types);
      const textureEntry = vehicleTextures.find((entry) => entry.key === type) ?? { texture: defaultTexture };
      const mesh = createVehicleMesh({ type, texture: textureEntry?.texture, themeColor: this.accentColor, seed: this.random() });
      const vehicle = new Vehicle({ mesh, id: type });
      const heading = this._randomRange(0, Math.PI * 2);
      vehicle.heading = heading;
      mesh.rotation.y = -heading;
      const spawnX = this._randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2);
      const spawnZ = this._randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2);
      vehicle.setPosition(spawnX, 0, spawnZ);
      this.renderer.add(mesh);
      this.vehicles.push(vehicle);
    }
  }

  _spawnOwnedVehicle(type) {
    const vehicleTextures = assetLoader.getSet('vehicles');
    const entry = vehicleTextures.find((item) => item.key === type) ?? vehicleTextures[0];
    if (!entry) return null;
    const mesh = createVehicleMesh({ type, texture: entry.texture, themeColor: this.accentColor, seed: this.random() });
    const vehicle = new Vehicle({ mesh, id: type });
    const reference = this.player?.mesh?.position ?? new THREE.Vector3();
    const spawnX = reference.x + this._randomRange(-12, 12);
    const spawnZ = reference.z + this._randomRange(-12, 12);
    vehicle.setPosition(spawnX, 0, spawnZ);
    vehicle.heading = this._randomRange(0, Math.PI * 2);
    mesh.rotation.y = -vehicle.heading;
    this.renderer.add(mesh);
    this.vehicles.push(vehicle);
    return vehicle;
  }

  _spawnNPCs(count) {
    const characterTextures = assetLoader.getSet('characters');
    const targetCount = count ?? Math.max(0, Math.floor(90 * this.settings.density) - this.npcs.length);
    for (let i = 0; i < targetCount; i += 1) {
      const entry = this._randomChoice(characterTextures);
      const mesh = createCharacterMesh({ texture: entry?.texture, accentColor: this.accentColor, scale: this._randomRange(0.9, 1.1) });
      const faction = entry?.key?.includes('cop') ? 'police' : entry?.key?.includes('gang') ? 'gang' : 'civilians';
      const npc = new NPC({ mesh, faction });
      npc.setPosition(this._randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2), 0, this._randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2));
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
        ((index % segments) - segments / 2) * BLOCK_SIZE + this._randomRange(-20, 20),
        0.6,
        (Math.floor(index / segments) - segments / 2) * BLOCK_SIZE + this._randomRange(-20, 20),
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
    if (this.sky && this.sky.material && this.sky.material.uniforms) {
      const uniforms = this.sky.material.uniforms;
      uniforms.offset.value = 60 + Math.sin(dayProgress * Math.PI * 2) * 20;
      uniforms.exponent.value = 0.45 + Math.cos(dayProgress * Math.PI * 2) * 0.1;
    }
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
    const amount = Math.floor(this._randomRange(npc.dropMoneyRange[0], npc.dropMoneyRange[1]));
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
        const type = this._randomChoice(['sports-car', 'muscle-car', 'sedan']);
        const vehicle = this._spawnOwnedVehicle(type);
        this.economy.registerOwnedVehicle(type);
        this.ui.showToast(`Unlocked ${type}`, 'success');
        if (vehicle) {
          this.ui.showToast(`${type} delivered to your location`, 'success');
        }
      }
      return;
    }
    if (shop.id === 'garage') {
      const activeVehicle = this.player.vehicle;
      if (!activeVehicle) {
        this.ui.showToast('Bring an owned vehicle into the garage to tune or sell it.', 'info');
        return;
      }
      if (!this.economy.ownedVehicles.has(activeVehicle.id)) {
        this.ui.showToast('Hot rides must be purchased before upgrades.', 'warning');
        return;
      }
      if (this.input.isDown('shift')) {
        const payout = this.economy.sellVehicle(activeVehicle);
        if (payout > 0) {
          this.player.exitVehicle();
          this._removeVehicle(activeVehicle);
        }
        return;
      }
      const upgraded = this.economy.upgradeVehicle(activeVehicle);
      if (!upgraded) {
        this.ui.showToast('Hold shift to sell instead.', 'info');
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
      const weapon = this._randomChoice(['rifle', 'shotgun', 'smg']);
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
      const type = this._randomChoice(response.vehicles);
      const texture = assetLoader.getTexture('vehicles', type);
      const mesh = createVehicleMesh({ type, texture, themeColor: '#4d9bff', seed: this.random() });
      const vehicle = new Vehicle({ mesh, id: type });
      const spawnX = this._randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2);
      const spawnZ = this._randomRange(-WORLD_SIZE / 2, WORLD_SIZE / 2);
      vehicle.setPosition(spawnX, 0, spawnZ);
      vehicle.heading = this._randomRange(0, Math.PI * 2);
      mesh.rotation.y = -vehicle.heading;
      this.renderer.add(mesh);
      this.vehicles.push(vehicle);
    }
    this.ui.showToast(`Police response level ${response.level}`, 'warning');
  }

  spawnPoliceBackup(npc) {
    const type = this._randomChoice(['police-cruiser', 'swat-van']);
    const geometry = new THREE.BoxGeometry(6, 3, 12);
    const texture = assetLoader.getTexture('vehicles', type);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    const vehicle = new Vehicle({ mesh, id: type });
    vehicle.setPosition(
      npc.mesh.position.x + this._randomRange(-40, 40),
      0,
      npc.mesh.position.z + this._randomRange(-40, 40),
    );
    this.renderer.add(mesh);
    this.vehicles.push(vehicle);
    this.ui.showToast('Police backup inbound', 'warning');
  }

  applySettings(partial) {
    Object.assign(this.settings, partial);
    const renderer = this.renderer.renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * this.settings.fidelity);
    this.accentColor = this._themeAccent(this.settings.theme);
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
    const exposureMap = {
      neon: 1.18,
      sunset: 1.05,
      ice: 1.3,
    };
    const skyTopMap = {
      neon: '#1a3c6d',
      sunset: '#702f3d',
      ice: '#3a6b9f',
    };
    const skyBottomMap = {
      neon: '#05070d',
      sunset: '#2a0d14',
      ice: '#0d1d33',
    };
    const color = colorMap[theme] ?? '#10131a';
    this.renderer.setBackgroundColor(color);
    this.renderer.setFog({ color, density: fogMap[theme] ?? 0.003 });
    this.renderer.setExposure(exposureMap[theme] ?? 1.18);
    if (this.sky && this.sky.material && this.sky.material.uniforms) {
      const uniforms = this.sky.material.uniforms;
      uniforms.topColor.value.set(skyTopMap[theme] ?? skyTopMap.neon);
      uniforms.bottomColor.value.set(skyBottomMap[theme] ?? skyBottomMap.neon);
    }
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

  _themeAccent(theme) {
    switch (theme) {
      case 'sunset':
        return '#ff8a5c';
      case 'ice':
        return '#6dcff6';
      default:
        return '#4df0ff';
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

  _removeVehicle(vehicle) {
    if (!vehicle) return;
    const index = this.vehicles.indexOf(vehicle);
    if (index >= 0) {
      this.vehicles.splice(index, 1);
    }
    this.renderer.remove(vehicle.mesh);
  }

  _randomChoice(list) {
    if (!list || list.length === 0) return null;
    const index = Math.floor(this.random() * list.length);
    return list[index];
  }

  _randomRange(min, max) {
    return this.random() * (max - min) + min;
  }
}
