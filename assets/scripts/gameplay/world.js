import { Renderer } from '../engine/renderer.js';
import { InputManager } from '../core/input.js';
import { createBoxMesh, createPrismMesh } from '../engine/meshes.js';
import { Player } from './player.js';
import { Vehicle } from './vehicle.js';
import { NPC } from './npc.js';
import { Loot } from './loot.js';
import { EconomySystem } from './economy.js';
import { MissionSystem } from './missions.js';
import { PoliceSystem } from './police.js';
import { clamp, mixColors } from '../engine/math.js';

const WORLD_SIZE = 1600;
const BLOCK_SIZE = 140;
const CITY_RADIUS = 620;

const BULLET_SPEED = 220;
const BULLET_LIFETIME = 2.4;

const DISTRICTS = [
  {
    name: 'Neon Square',
    center: { x: 0, z: 0 },
    palette: {
      base: '#1e2a4f',
      roof: '#101626',
      glass: '#6bf2ff',
      accent: '#ff4f8b',
      plaza: '#2b3447',
      foliage: '#1d3e2f',
    },
  },
  {
    name: 'Harborline District',
    center: { x: -320, z: -280 },
    palette: {
      base: '#1a2f3c',
      roof: '#101d24',
      glass: '#7ae0ff',
      accent: '#48b6ff',
      plaza: '#26323a',
      foliage: '#163c3d',
    },
  },
  {
    name: 'Mirage Heights',
    center: { x: 320, z: 240 },
    palette: {
      base: '#2f2344',
      roof: '#160f26',
      glass: '#f2a0ff',
      accent: '#ff7c4d',
      plaza: '#37263e',
      foliage: '#2f3d1f',
    },
  },
  {
    name: 'Aurora Gardens',
    center: { x: -200, z: 300 },
    palette: {
      base: '#20362b',
      roof: '#142419',
      glass: '#9fffb5',
      accent: '#5dffb7',
      plaza: '#2d3f33',
      foliage: '#225039',
    },
  },
];

const VEHICLE_PALETTES = [
  { body: '#ff8f4a', roof: '#2a1c19', glass: '#6de1ff', accent: '#ffd166' },
  { body: '#3f6bff', roof: '#1a2039', glass: '#9ee7ff', accent: '#ffffff' },
  { body: '#2ec4b6', roof: '#142a28', glass: '#c6fff2', accent: '#ffe066' },
  { body: '#f94144', roof: '#351012', glass: '#ffd6d9', accent: '#ffb703' },
  { body: '#8d4bff', roof: '#1f1636', glass: '#d5caff', accent: '#ff7bff' },
];

const VEHICLE_NAMES = ['Pulse Runner', 'Aurora GT', 'Metro Glide', 'Skyline Van', 'Veloce XR'];

const POLICE_PALETTE = { body: '#243b74', roof: '#0f1f3b', glass: '#bfe4ff', accent: '#7dc0ff' };

const CRIME_SEVERITY = {
  minor: 6,
  witness: 4,
  major: 12,
  critical: 22,
};

const MAX_CRIME_LOG = 6;

const lighten = (color, amount) => mixColors(color, '#ffffff', amount);
const darken = (color, amount) => mixColors(color, '#000000', amount);

export class GameWorld {
  constructor(container, ui, settings = {}) {
    this.container = container;
    this.ui = ui;
    this.settings = { fidelity: 1, density: 1, theme: 'neon', comfort: 'normal', ...settings };

    this.renderer = new Renderer(container);
    this.input = new InputManager(window);
    this.sceneObjects = [];
    this.blockers = [];
    this.vehicles = [];
    this.npcs = [];
    this.loot = [];
    this.bullets = [];
    this.dayTime = 8 * 60; // minutes
    this.clock = 0;

    this.economy = new EconomySystem(ui);
    this.missions = new MissionSystem(ui);
    this.police = new PoliceSystem(this);
    this.districts = DISTRICTS;
    this.crimeLog = [];

    this.playerNode = this._createPlayerNode();
    this.player = new Player(this.playerNode);
    this.player.setPosition(0, 0, 0);

    this.scene = { objects: this.sceneObjects, debugOverlay: [] };
    this.renderer.setScene(this.scene);
  }

  async init() {
    this.ui.showLoader('Streaming Neon Grandline assets...');
    await new Promise((resolve) => setTimeout(resolve, 300));
    this._buildWorld();
    this._spawnTraffic();
    this._spawnNPCs();
    this._buildEconomy();
    this.ui.hideLoader();
    this.ui.showToast('World ready. Welcome to Neon Grandline!', 'success');
    this.ui.showMission('Free Roam', 'Explore, earn cash, or launch a mission.');
  }

  destroy() {
    this.renderer.destroy();
    this.input.destroy();
  }

  applySettings(settings) {
    this.settings = { ...this.settings, ...settings };
    const distance = clamp(90 / this.settings.fidelity, 60, 140);
    const height = clamp(70 * this.settings.fidelity, 50, 120);
    this.renderer.setCameraPosition(this.player.position.x - Math.sin(this.player.heading) * distance, height, this.player.position.z - Math.cos(this.player.heading) * distance);
  }

  update(delta) {
    this.clock += delta;
    this.dayTime = (this.dayTime + delta * 16) % (24 * 60);

    const hours = Math.floor(this.dayTime / 60);
    if (hours >= 20 || hours < 5) {
      this.renderer.setSky('night');
      this.renderer.setAmbient(0.25);
    } else if (hours >= 17) {
      this.renderer.setSky('dusk');
      this.renderer.setAmbient(0.35);
    } else {
      this.renderer.setSky('day');
      this.renderer.setAmbient(0.48);
    }

    this.police.update(delta);
    this.player.wanted = this.police.wanted;
    this.player.update(delta, this.input, this);

    for (const vehicle of this.vehicles) {
      if (vehicle.driver !== this.player) {
        vehicle.updateAI(delta, this);
      }
    }

    for (const npc of this.npcs) {
      npc.update(delta, this);
    }

    for (const loot of this.loot) {
      loot.update(delta);
    }

    this._updateBullets(delta);
    this._updateCamera(delta);
    this._cleanup();

    if (this.missions.activeMission) {
      this.missions.progress += delta;
      if (this.missions.progress > 90) {
        this.missions.completeMission(this.player);
      }
    }

    this.ui.updateHUD({
      time: this._formatTime(this.dayTime),
      mission: this.missions.activeMission?.label ?? 'Free Roam',
      wantedLevel: this.police.getLevel(),
      money: this.player.money,
      health: this.player.health,
      armor: this.player.armor,
      stamina: this.player.stamina,
      vehicle: this.player.vehicle,
      hint: this.player.interactHint,
    });

    const fps = Math.round(1 / Math.max(delta, 0.001));
    const district = this._districtForPosition(this.player.position.x, this.player.position.z).name;
    this.scene.debugOverlay = [
      `FPS ${fps}`,
      `Wanted ${this.police.wanted.toFixed(0)} (${this.police.getLevel()}★)`,
      `Vehicles ${this.vehicles.length}`,
      `NPCs ${this.npcs.length}`,
      district ? `District ${district}` : null,
    ].filter(Boolean);

    this.input.resetFrame();
  }

  notify(message) {
    this.ui.showToast(message, 'info');
  }

  reportCrime(type, severity = 'minor', position = { ...this.player.position }, meta = {}) {
    const amount = typeof severity === 'number' ? severity : CRIME_SEVERITY[severity] ?? CRIME_SEVERITY.minor;
    this.police.reportCrime(type, amount);
    this.player.wanted = this.police.wanted;

    const entry = {
      id: Date.now() + Math.random(),
      type,
      severity: typeof severity === 'string' ? severity : 'custom',
      wanted: this.police.wanted,
      position,
      meta,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.crimeLog.push(entry);
    if (this.crimeLog.length > MAX_CRIME_LOG) {
      this.crimeLog.splice(0, this.crimeLog.length - MAX_CRIME_LOG);
    }
    this.ui.logCrime(entry);

    if (!meta.silent) {
      const tone = amount >= CRIME_SEVERITY.critical ? 'error' : amount >= CRIME_SEVERITY.major ? 'warning' : 'info';
      this.ui.showToast(`${type} · +${amount.toFixed(0)} wanted`, tone);
    }
  }

  spawnBullet({ origin, direction, owner, damage }) {
    const node = {
      mesh: createBoxMesh({ width: 0.6, height: 0.6, depth: 2, colors: { front: '#ff8c66', back: '#ff8c66', top: '#ffd166' } }),
      position: { ...origin },
      rotation: { x: 0, y: owner.heading, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(node);
    this.bullets.push({ node, direction, lifetime: 0, owner, damage });
  }

  findNearestVehicle(position, radius, predicate = () => true) {
    let closest = null;
    let best = radius;
    for (const vehicle of this.vehicles) {
      if (!predicate(vehicle)) continue;
      const distance = Math.hypot(position.x - vehicle.position.x, position.z - vehicle.position.z);
      if (distance < best) {
        best = distance;
        closest = vehicle;
      }
    }
    return closest;
  }

  findNearestLoot(position, radius) {
    return this.loot.find((item) => Math.hypot(position.x - item.position.x, position.z - item.position.z) < radius);
  }

  collectLoot(loot, player) {
    const index = this.loot.indexOf(loot);
    if (index >= 0) {
      this.loot.splice(index, 1);
    }
    if (loot.node) {
      loot.node.hidden = true;
      loot.node.remove = true;
    }
    player.money += loot.amount;
    this.ui.showToast(`Collected $${loot.amount}`, 'success');
  }

  findNearbyShop(position, radius) {
    return this.economy.findNearby(position, radius);
  }

  openShop(shop, player) {
    this.economy.openShop(shop, player, this);
  }

  handleVehicleCollisions(vehicle) {
    let collided = false;
    for (const npc of this.npcs) {
      if (npc.dead) continue;
      const distance = Math.hypot(npc.position.x - vehicle.position.x, npc.position.z - vehicle.position.z);
      if (distance > 3.6) continue;
      const outcome = npc.registerImpact?.(Math.abs(vehicle.speed) * 1.4);
      if (!outcome) continue;
      collided = true;
      if (vehicle.driver === this.player) {
        const severity = outcome === 'fatal' ? 'critical' : 'major';
        const crime = outcome === 'fatal' ? 'Vehicular manslaughter' : 'Vehicular assault';
        this.reportCrime(crime, severity, { ...npc.position }, { vehicle: vehicle.name });
      }
      if (npc.dead) {
        this.spawnLoot(npc.position, 200 + Math.round(Math.random() * 240));
      }
    }
    return collided;
  }

  spawnOwnedVehicle(vehicleConfig, player) {
    const spawnDistance = 10;
    const x = player.position.x + Math.sin(player.heading) * spawnDistance;
    const z = player.position.z + Math.cos(player.heading) * spawnDistance;
    const heading = player.heading;
    const palette = { body: '#3f4cc3', roof: '#242f7a', glass: '#9fb7ff', accent: '#fce96a' };
    const { node, attachments } = this._createVehicleActor({ x, y: 1.6, z }, heading, palette);
    const vehicle = new Vehicle(node, { name: vehicleConfig.label, maxSpeed: vehicleConfig.maxSpeed, grip: 1.15 }, attachments);
    vehicle.setPosition(x, 1.6, z);
    vehicle.setHeading(heading);
    vehicle.owner = 'player';
    this.vehicles.push(vehicle);
    return vehicle;
  }

  removeVehicle(vehicle) {
    const index = this.vehicles.indexOf(vehicle);
    if (index >= 0) {
      this.vehicles.splice(index, 1);
    }
    if (vehicle.node) {
      vehicle.node.hidden = true;
      vehicle.node.remove = true;
    }
    for (const attachment of vehicle.attachments ?? []) {
      if (attachment.node) {
        attachment.node.hidden = true;
        attachment.node.remove = true;
      }
    }
  }

  countActivePolice() {
    return this.vehicles.filter((vehicle) => vehicle.faction === 'police').length;
  }

  spawnPolicePatrol(level) {
    const spawnAngle = Math.random() * Math.PI * 2;
    const radius = CITY_RADIUS * 0.8;
    const position = { x: Math.cos(spawnAngle) * radius, y: 1.6, z: Math.sin(spawnAngle) * radius };
    const { node, attachments } = this._createVehicleActor(position, spawnAngle, POLICE_PALETTE);
    const vehicle = new Vehicle(node, { name: 'Metro Patrol', maxSpeed: 110 + level * 6, grip: 1.4, faction: 'police' }, attachments);
    vehicle.setPosition(position.x, position.y, position.z);
    vehicle.setHeading(spawnAngle);
    vehicle.ai = { type: 'police', target: this.player };
    vehicle.owner = 'metro';
    this.vehicles.push(vehicle);
    this.ui.showToast('Metro patrol dispatched!', 'warning');
  }

  pickTrafficDestination() {
    const radius = CITY_RADIUS * 0.7;
    const angle = Math.random() * Math.PI * 2;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  isBlocked(x, z, radius = 2) {
    for (const block of this.blockers) {
      if (x + radius > block.minX && x - radius < block.maxX && z + radius > block.minZ && z - radius < block.maxZ) {
        return true;
      }
    }
    return false;
  }

  sampleHeight() {
    return 0;
  }

  _updateBullets(delta) {
    this.bullets = this.bullets.filter((bullet) => {
      bullet.lifetime += delta;
      if (bullet.lifetime > BULLET_LIFETIME) {
        bullet.node.hidden = true;
        bullet.node.remove = true;
        return false;
      }
      bullet.node.position.x += bullet.direction.x * BULLET_SPEED * delta;
      bullet.node.position.y += bullet.direction.y * BULLET_SPEED * delta;
      bullet.node.position.z += bullet.direction.z * BULLET_SPEED * delta;

      for (const npc of this.npcs) {
        if (npc.dead) continue;
        const distance = Math.hypot(npc.position.x - bullet.node.position.x, npc.position.z - bullet.node.position.z);
        if (distance < 4) {
          const wasDead = npc.dead;
          npc.takeDamage(bullet.damage);
          if (bullet.owner === this.player && !wasDead) {
            const severity = npc.dead ? 'critical' : 'major';
            const crime = npc.dead ? 'Fatal shooting' : 'Assault with firearm';
            this.reportCrime(crime, severity, { ...npc.position }, { weapon: this.player.activeWeapon });
          }
          if (npc.dead) {
            this.spawnLoot(npc.position, 200 + Math.round(Math.random() * 180));
            this.ui.showToast('Loot dropped!', 'success');
          }
          bullet.node.hidden = true;
          bullet.node.remove = true;
          return false;
        }
      }

      for (const vehicle of this.vehicles) {
        const distance = Math.hypot(vehicle.position.x - bullet.node.position.x, vehicle.position.z - bullet.node.position.z);
        if (distance < 6) {
          const destroyed = vehicle.takeDamage(bullet.damage * 0.4);
          if (destroyed) {
            this.spawnLoot(vehicle.position, 400);
            this.ui.showToast(`${vehicle.name} disabled!`, 'warning');
            if (bullet.owner === this.player) {
              this.reportCrime('Vehicle destruction', 'major', { ...vehicle.position }, { vehicle: vehicle.name });
            }
            this.removeVehicle(vehicle);
          }
          bullet.node.hidden = true;
          bullet.node.remove = true;
          return false;
        }
      }

      return true;
    });
  }

  spawnLoot(position, amount) {
    const mesh = createPrismMesh({ radius: 1.4, height: 2.2, sides: 6, colors: { side: '#4df0ff', top: '#82ffe7' } });
    const node = { mesh, position: { ...position }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
    this.sceneObjects.push(node);
    const loot = new Loot(node, amount);
    loot.setPosition(position.x, 0, position.z);
    this.loot.push(loot);
  }

  _updateCamera(delta) {
    const distance = clamp(110 / this.settings.fidelity, 70, 150);
    const target = {
      x: this.player.position.x - Math.sin(this.player.heading) * distance,
      y: 70,
      z: this.player.position.z - Math.cos(this.player.heading) * distance,
    };
    this.renderer.setCameraPosition(target.x, target.y, target.z);
    this.renderer.setCameraRotation(-0.38, this.player.heading);
  }

  _cleanup() {
    const filtered = this.sceneObjects.filter((object) => !object.remove);
    if (filtered.length !== this.sceneObjects.length) {
      this.sceneObjects = filtered;
      this.scene.objects = this.sceneObjects;
    }
  }

  _createPlayerNode() {
    const mesh = createPrismMesh({ radius: 1.2, height: 6, sides: 6, colors: { side: '#ff6b9c', top: '#ffd8ef' } });
    const node = { mesh, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
    this.sceneObjects.push(node);
    return node;
  }

  _buildWorld() {
    const groundMesh = createBoxMesh({ width: WORLD_SIZE, height: 2, depth: WORLD_SIZE, colors: { top: '#0f1823', front: '#0a111a', left: '#0a111a' } });
    this.sceneObjects.push({ mesh: groundMesh, position: { x: 0, y: -1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });

    this._spawnWaterfront();
    this._spawnRoadNetwork();
    this._spawnDistrictBuildings();
    this._scatterTrees();
  }

  _spawnWaterfront() {
    const waterMesh = createBoxMesh({
      width: WORLD_SIZE * 0.9,
      height: 1,
      depth: WORLD_SIZE * 0.32,
      colors: { top: '#0d2835', front: '#07151c', left: '#07151c' },
    });
    this.sceneObjects.push({
      mesh: waterMesh,
      position: { x: 0, y: -1.4, z: -CITY_RADIUS - 120 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    });

    const boardwalk = createBoxMesh({ width: WORLD_SIZE * 0.6, height: 0.5, depth: 26, colors: { top: '#20252d', front: '#11161f' } });
    this.sceneObjects.push({
      mesh: boardwalk,
      position: { x: 0, y: 0.2, z: -CITY_RADIUS - 70 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    });
  }

  _spawnRoadNetwork() {
    const span = CITY_RADIUS * 2 + 220;
    const arterialWidth = 22;
    this._spawnRoad({ x: 0, z: 0, length: span, width: arterialWidth, orientation: 'horizontal', lanes: 3 });
    this._spawnRoad({ x: 0, z: 0, length: span, width: arterialWidth, orientation: 'vertical', lanes: 3 });

    const gridOffsets = [-240, -160, -80, 80, 160, 240];
    gridOffsets.forEach((offset) => {
      if (Math.abs(offset) < 40) return;
      this._spawnRoad({ x: offset, z: 0, length: span * 0.92, width: 16, orientation: 'vertical', lanes: 2 });
      this._spawnRoad({ x: 0, z: offset, length: span * 0.92, width: 16, orientation: 'horizontal', lanes: 2 });
    });

    const diagonal = createBoxMesh({ width: span * 0.74, height: 0.35, depth: 14, colors: { top: '#1c232d', front: '#12161d' } });
    this.sceneObjects.push({ mesh: diagonal, position: { x: 0, y: 0.12, z: 0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, scale: 1 });
    this.sceneObjects.push({ mesh: diagonal, position: { x: 0, y: 0.12, z: 0 }, rotation: { x: 0, y: -Math.PI / 4, z: 0 }, scale: 1 });

    const centralPlaza = createBoxMesh({ width: 120, height: 0.6, depth: 120, colors: { top: '#283445', front: '#18202d' } });
    this.sceneObjects.push({ mesh: centralPlaza, position: { x: 0, y: 0.3, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });
  }

  _spawnRoad({ x, z, length, width, orientation, lanes = 2 }) {
    const isHorizontal = orientation === 'horizontal';
    const roadMesh = createBoxMesh({
      width: isHorizontal ? length : width,
      height: 0.35,
      depth: isHorizontal ? width : length,
      colors: { top: '#171f29', front: '#0f141b', left: '#0f141b' },
    });
    this.sceneObjects.push({ mesh: roadMesh, position: { x, y: 0.15, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });

    if (lanes >= 2) {
      const lineMesh = createBoxMesh({
        width: isHorizontal ? length * 0.9 : 0.8,
        height: 0.38,
        depth: isHorizontal ? 0.8 : length * 0.9,
        colors: { top: '#f5d05b', front: '#b38a2d' },
      });
      this.sceneObjects.push({ mesh: lineMesh, position: { x, y: 0.2, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });
    }

    const sidewalk = createBoxMesh({
      width: isHorizontal ? length : width + 6,
      height: 0.4,
      depth: isHorizontal ? width + 6 : length,
      colors: { top: '#2b3342', front: '#1b2330' },
    });
    this.sceneObjects.push({ mesh: sidewalk, position: { x, y: 0.22, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1, hidden: false });
  }

  _spawnDistrictBuildings() {
    const halfBlocks = Math.floor((WORLD_SIZE * 0.6) / BLOCK_SIZE);
    for (let gx = -halfBlocks; gx <= halfBlocks; gx += 1) {
      for (let gz = -halfBlocks; gz <= halfBlocks; gz += 1) {
        const wx = gx * BLOCK_SIZE;
        const wz = gz * BLOCK_SIZE;
        if (Math.hypot(wx, wz) > CITY_RADIUS) continue;
        if (Math.abs(gx) < 1 && Math.abs(gz) < 1) continue;

        const palette = this._paletteForPosition(wx, wz);
        const width = BLOCK_SIZE * (0.58 + Math.random() * 0.28);
        const depth = BLOCK_SIZE * (0.58 + Math.random() * 0.28);
        const height = 40 + Math.random() * 150;
        const baseMesh = createBoxMesh({
          width,
          height,
          depth,
          colors: {
            front: palette.base,
            back: darken(palette.base, 0.12),
            left: darken(palette.base, 0.2),
            right: lighten(palette.base, 0.16),
            top: palette.roof,
          },
        });
        baseMesh.faces[1].emissive = 0.24;
        baseMesh.faces[2].emissive = 0.18;
        const position = { x: wx, y: height / 2, z: wz };
        this.sceneObjects.push({ mesh: baseMesh, position, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });

        const plazaMesh = createBoxMesh({ width: width * 1.08, height: 0.5, depth: depth * 1.08, colors: { top: palette.plaza, front: darken(palette.plaza, 0.2) } });
        this.sceneObjects.push({ mesh: plazaMesh, position: { x: wx, y: 0.2, z: wz }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });

        if (Math.random() > 0.55) {
          const glassMesh = createBoxMesh({ width: width * 0.8, height: height * 0.7, depth: 0.6, colors: { front: palette.glass, top: palette.glass } });
          glassMesh.faces[1].emissive = 0.5;
          this.sceneObjects.push({
            mesh: glassMesh,
            position: { x: wx, y: height / 2, z: wz + depth / 2 - 0.35 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1,
          });
        }

        if (Math.random() > 0.7) {
          const signMesh = createBoxMesh({ width: width * 0.36, height: 4, depth: 0.6, colors: { front: palette.accent, left: darken(palette.accent, 0.25), right: darken(palette.accent, 0.25), top: palette.accent } });
          const node = {
            mesh: signMesh,
            position: { x: wx - width / 2 + width * 0.22, y: height * 0.65, z: wz + depth / 2 + 0.3 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1,
          };
          signMesh.faces[1].emissive = 0.7;
          this.sceneObjects.push(node);
        }

        if (Math.random() > 0.6) {
          const offsetX = wx + (Math.random() - 0.5) * width * 0.7;
          const offsetZ = wz + (Math.random() - 0.5) * depth * 0.7;
          this._spawnTree(offsetX, offsetZ + depth / 2 + 10, palette);
        }

        this.blockers.push({
          minX: wx - width / 2,
          maxX: wx + width / 2,
          minZ: wz - depth / 2,
          maxZ: wz + depth / 2,
        });
      }
    }
  }

  _scatterTrees() {
    for (let i = 0; i < 140; i += 1) {
      const radius = 180 + Math.random() * (CITY_RADIUS - 120);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.isBlocked(x, z, 5)) continue;
      const palette = this._paletteForPosition(x, z);
      this._spawnTree(x, z, palette);
    }
  }

  _spawnTree(x, z, palette) {
    const trunkMesh = createBoxMesh({ width: 1.2, height: 6.5, depth: 1.2, colors: { front: '#3b2b1f', top: '#4b3626' } });
    const trunkNode = { mesh: trunkMesh, position: { x, y: 3.2, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
    this.sceneObjects.push(trunkNode);

    const leavesMesh = createPrismMesh({ radius: 3 + Math.random() * 1.2, height: 4.4, sides: 6, colors: { side: palette.foliage ?? '#285238', top: lighten(palette.foliage ?? '#285238', 0.25) } });
    const leavesNode = { mesh: leavesMesh, position: { x, y: 7.2, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
    leavesMesh.faces[0].emissive = 0.08;
    this.sceneObjects.push(leavesNode);
  }

  _districtForPosition(x, z) {
    let closest = this.districts[0];
    let best = Infinity;
    for (const district of this.districts) {
      const dist = Math.hypot(x - district.center.x, z - district.center.z);
      if (dist < best) {
        best = dist;
        closest = district;
      }
    }
    return closest;
  }

  _paletteForPosition(x, z) {
    return this._districtForPosition(x, z).palette;
  }

  _spawnShopMarker(shop) {
    const palette = {
      dealership: { side: '#ff9f1c', top: '#ffd166' },
      garage: { side: '#2ec4b6', top: '#cbf3f0' },
      weapons: { side: '#ef233c', top: '#ff7c7c' },
      bank: { side: '#4361ee', top: '#9fb4ff' },
      default: { side: '#adb5bd', top: '#dee2e6' },
    }[shop.type] ?? { side: '#adb5bd', top: '#dee2e6' };

    const pillarMesh = createPrismMesh({ radius: 2.4, height: 6.6, sides: 6, colors: { side: palette.side, top: palette.top } });
    pillarMesh.faces.forEach((face, index) => {
      if (index < pillarMesh.faces.length - 2) {
        face.emissive = 0.4;
      }
    });
    const pillarNode = {
      mesh: pillarMesh,
      position: { x: shop.position.x, y: 3.4, z: shop.position.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(pillarNode);

    const signMesh = createBoxMesh({ width: 4.6, height: 0.7, depth: 0.4, colors: { front: '#ffffff', top: '#ffffff', left: palette.side, right: palette.side } });
    signMesh.faces[1].emissive = 0.7;
    const signNode = {
      mesh: signMesh,
      position: { x: shop.position.x, y: 6.2, z: shop.position.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(signNode);
  }

  _randomVehiclePalette() {
    return VEHICLE_PALETTES[Math.floor(Math.random() * VEHICLE_PALETTES.length)];
  }

  _randomNPCPalette(faction, palette) {
    const skinTones = ['#f5d0c5', '#e4b59d', '#c4876a', '#8d5a3c'];
    const skin = skinTones[Math.floor(Math.random() * skinTones.length)];
    let body = lighten(palette.base, 0.18);
    let accent = palette.accent;
    if (faction === 'police') {
      body = '#1f3558';
      accent = '#5cc8ff';
    } else if (faction === 'gang') {
      body = '#4a1f2c';
      accent = '#ff5f71';
    }
    return { skin, body, accent };
  }

  _createVehicleActor(position, heading, palette) {
    const baseMesh = createBoxMesh({
      width: 7.2,
      height: 2.8,
      depth: 13.6,
      colors: {
        front: palette.body,
        back: darken(palette.body, 0.2),
        left: darken(palette.body, 0.15),
        right: lighten(palette.body, 0.12),
        top: palette.body,
      },
    });
    const node = {
      mesh: baseMesh,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: 0, y: heading, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(node);

    const roofMesh = createBoxMesh({ width: 5.2, height: 1.4, depth: 6.4, colors: { front: palette.roof, back: palette.roof, left: palette.roof, right: palette.roof, top: palette.roof } });
    const roofNode = {
      mesh: roofMesh,
      position: { x: position.x, y: position.y + 2.2, z: position.z },
      rotation: { x: 0, y: heading, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(roofNode);

    const glassMesh = createBoxMesh({ width: 4.6, height: 1.2, depth: 5.8, colors: { front: palette.glass, back: palette.glass, left: palette.glass, right: palette.glass, top: palette.glass } });
    glassMesh.faces[1].emissive = 0.45;
    glassMesh.faces[0].emissive = 0.3;
    const glassNode = {
      mesh: glassMesh,
      position: { x: position.x, y: position.y + 1.9, z: position.z },
      rotation: { x: 0, y: heading, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(glassNode);

    const headlightMesh = createBoxMesh({ width: 2, height: 0.6, depth: 0.5, colors: { front: palette.accent, top: palette.accent } });
    headlightMesh.faces[1].emissive = 0.9;
    const headlightNode = {
      mesh: headlightMesh,
      position: { x: position.x, y: position.y + 0.6, z: position.z + 6.2 },
      rotation: { x: 0, y: heading, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(headlightNode);

    const taillightMesh = createBoxMesh({ width: 2, height: 0.6, depth: 0.5, colors: { back: '#ff5050', front: '#ff5050', top: '#ff5050' } });
    taillightMesh.faces[1].emissive = 0.85;
    const taillightNode = {
      mesh: taillightMesh,
      position: { x: position.x, y: position.y + 0.6, z: position.z - 6.2 },
      rotation: { x: 0, y: heading, z: 0 },
      scale: 1,
    };
    this.sceneObjects.push(taillightNode);

    const wheelMesh = createPrismMesh({ radius: 1.2, height: 0.8, sides: 12, colors: { side: '#121212', top: '#1f1f1f' } });
    const wheelOffsets = [
      { x: -2.6, y: -1.5, z: 4.4 },
      { x: 2.6, y: -1.5, z: 4.4 },
      { x: -2.6, y: -1.5, z: -4.4 },
      { x: 2.6, y: -1.5, z: -4.4 },
    ];
    const wheelNodes = wheelOffsets.map((offset) => {
      const wheelNode = {
        mesh: wheelMesh,
        position: { x: position.x + offset.x, y: position.y + offset.y, z: position.z + offset.z },
        rotation: { x: 0, y: heading, z: 0 },
        scale: 1,
      };
      this.sceneObjects.push(wheelNode);
      return { node: wheelNode, offset };
    });

    const attachments = [
      { node: roofNode, offset: { x: 0, y: 2.2, z: 0 } },
      { node: glassNode, offset: { x: 0, y: 1.9, z: 0 } },
      { node: headlightNode, offset: { x: 0, y: 0.6, z: 6.2 } },
      { node: taillightNode, offset: { x: 0, y: 0.6, z: -6.2 } },
      ...wheelNodes,
    ];

    return { node, attachments };
  }

  _spawnTraffic() {
    const count = Math.round(14 * this.settings.density);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 220 + Math.random() * (CITY_RADIUS - 240);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.isBlocked(x, z, 6)) continue;
      const palette = this._randomVehiclePalette();
      const heading = angle + Math.PI / 2;
      const { node, attachments } = this._createVehicleActor({ x, y: 1.6, z }, heading, palette);
      const name = VEHICLE_NAMES[i % VEHICLE_NAMES.length];
      const vehicle = new Vehicle(node, { name, maxSpeed: 82 + Math.random() * 28, grip: 0.95 }, attachments);
      vehicle.setPosition(x, 1.6, z);
      vehicle.setHeading(heading);
      vehicle.ai = { type: 'traffic', target: this.pickTrafficDestination() };
      vehicle.owner = 'civilian';
      this.vehicles.push(vehicle);
    }
  }

  _spawnNPCs() {
    const count = Math.round(36 * this.settings.density);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 140 + Math.random() * (CITY_RADIUS - 140);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.isBlocked(x, z, 3.5)) continue;
      const factionRoll = Math.random();
      const faction = factionRoll > 0.9 ? 'police' : factionRoll > 0.75 ? 'gang' : 'civilian';
      const districtPalette = this._paletteForPosition(x, z);
      const outfit = this._randomNPCPalette(faction, districtPalette);

      const bodyMesh = createBoxMesh({
        width: 2,
        height: 4.6,
        depth: 1.4,
        colors: {
          front: outfit.body,
          back: darken(outfit.body, 0.22),
          left: darken(outfit.body, 0.18),
          right: lighten(outfit.body, 0.18),
          top: outfit.body,
        },
      });
      const bodyNode = { mesh: bodyMesh, position: { x, y: 2.3, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
      this.sceneObjects.push(bodyNode);

      const headMesh = createBoxMesh({ width: 1.3, height: 1.3, depth: 1.2, colors: { front: outfit.skin, back: outfit.skin, left: outfit.skin, right: outfit.skin, top: lighten(outfit.skin, 0.18) } });
      const headNode = { mesh: headMesh, position: { x, y: 4.7, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
      this.sceneObjects.push(headNode);

      const accentMesh = createBoxMesh({ width: 1.4, height: 1.1, depth: 0.4, colors: { front: outfit.accent, left: outfit.accent, right: outfit.accent, top: outfit.accent } });
      accentMesh.faces[1].emissive = faction === 'police' ? 0.6 : 0.3;
      const accentNode = { mesh: accentMesh, position: { x, y: 3.2, z: z + 0.7 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
      this.sceneObjects.push(accentNode);

      const attachments = [
        { node: headNode, offset: { x: 0, y: 2.4, z: 0 } },
        { node: accentNode, offset: { x: 0, y: 0.9, z: 0.7 } },
      ];

      const npc = new NPC(bodyNode, { faction }, attachments);
      npc.setPosition(x, 0, z);
      if (faction === 'police') {
        npc.speed *= 1.2;
      } else if (faction === 'gang') {
        npc.speed *= 1.05;
      }
      this.npcs.push(npc);
    }
  }

  _buildEconomy() {
    const shops = [
      { type: 'dealership', label: 'Velocity Autos', position: { x: 60, z: -140 } },
      { type: 'garage', label: 'StaticQuasar Garage', position: { x: -220, z: 80 } },
      { type: 'weapons', label: 'Hightower Arms', position: { x: 140, z: 180 } },
      { type: 'bank', label: 'Skyline Bank', position: { x: -80, z: -220 } },
    ];
    shops.forEach((shop) => {
      this.economy.addShop(shop);
      this._spawnShopMarker(shop);
    });
  }

  _formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = Math.floor(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
