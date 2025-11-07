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
import { clamp } from '../engine/math.js';

const WORLD_SIZE = 1600;
const BLOCK_SIZE = 140;
const CITY_RADIUS = 620;

const BULLET_SPEED = 220;
const BULLET_LIFETIME = 2.4;

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
    this.scene.debugOverlay = [
      `FPS ${fps}`,
      `Wanted ${this.police.wanted.toFixed(0)} (${this.police.getLevel()}★)`,
      `Vehicles ${this.vehicles.length}`,
      `NPCs ${this.npcs.length}`,
    ];

    this.input.resetFrame();
  }

  notify(message) {
    this.ui.showToast(message, 'info');
  }

  raiseWanted(amount) {
    this.player.wanted = clamp(this.player.wanted + amount, 0, 160);
    this.police.addWanted(amount);
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

  spawnOwnedVehicle(vehicleConfig, player) {
    const mesh = createBoxMesh({ width: 8, height: 3.5, depth: 14, colors: { top: '#3f4cc3', front: '#263076' } });
    const node = { mesh, position: { x: player.position.x + 6, y: 2, z: player.position.z + 6 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
    this.sceneObjects.push(node);
    const vehicle = new Vehicle(node, { name: vehicleConfig.label, maxSpeed: vehicleConfig.maxSpeed, grip: 1.1 });
    vehicle.setPosition(node.position.x, node.position.y, node.position.z);
    vehicle.setHeading(this.player.heading);
    this.vehicles.push(vehicle);
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
  }

  countActivePolice() {
    return this.vehicles.filter((vehicle) => vehicle.faction === 'police').length;
  }

  spawnPolicePatrol(level) {
    const mesh = createBoxMesh({ width: 8, height: 3.5, depth: 14, colors: { top: '#334b7b', front: '#22304a' } });
    const spawnAngle = Math.random() * Math.PI * 2;
    const radius = CITY_RADIUS * 0.8;
    const position = { x: Math.cos(spawnAngle) * radius, y: 2, z: Math.sin(spawnAngle) * radius };
    const node = { mesh, position, rotation: { x: 0, y: spawnAngle, z: 0 }, scale: 1 };
    this.sceneObjects.push(node);
    const vehicle = new Vehicle(node, { name: 'Metro Patrol', maxSpeed: 110, grip: 1.4, faction: 'police' });
    vehicle.setPosition(position.x, position.y, position.z);
    vehicle.setHeading(spawnAngle);
    vehicle.ai = { type: 'police', target: this.player };
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
          npc.takeDamage(bullet.damage);
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
    const groundMesh = createBoxMesh({ width: WORLD_SIZE, height: 2, depth: WORLD_SIZE, colors: { top: '#101822', front: '#0a111a' } });
    this.sceneObjects.push({ mesh: groundMesh, position: { x: 0, y: -1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });

    const roadMesh = createBoxMesh({ width: WORLD_SIZE * 0.7, height: 0.2, depth: WORLD_SIZE * 0.7, colors: { top: '#1f2937', front: '#131922' } });
    this.sceneObjects.push({ mesh: roadMesh, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });

    const halfBlocks = Math.floor((WORLD_SIZE * 0.6) / BLOCK_SIZE);
    for (let x = -halfBlocks; x <= halfBlocks; x += 1) {
      for (let z = -halfBlocks; z <= halfBlocks; z += 1) {
        if (Math.hypot(x * BLOCK_SIZE, z * BLOCK_SIZE) > CITY_RADIUS) continue;
        if (Math.abs(x) < 1 && Math.abs(z) < 1) continue;
        const width = BLOCK_SIZE * (0.6 + Math.random() * 0.3);
        const depth = BLOCK_SIZE * (0.6 + Math.random() * 0.3);
        const height = 30 + Math.random() * 120;
        const mesh = createBoxMesh({ width, height, depth, colors: { top: '#203357', front: '#1a2238', left: '#1b2a45' } });
        const position = { x: x * BLOCK_SIZE, y: height / 2, z: z * BLOCK_SIZE };
        this.sceneObjects.push({ mesh, position, rotation: { x: 0, y: 0, z: 0 }, scale: 1 });
        this.blockers.push({
          minX: position.x - width / 2,
          maxX: position.x + width / 2,
          minZ: position.z - depth / 2,
          maxZ: position.z + depth / 2,
        });
      }
    }
  }

  _spawnTraffic() {
    const count = Math.round(8 * this.settings.density);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 180 + Math.random() * (CITY_RADIUS - 200);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const mesh = createBoxMesh({ width: 8, height: 3, depth: 12, colors: { top: '#ffae4a', front: '#ff924a' } });
      const node = { mesh, position: { x, y: 2, z }, rotation: { x: 0, y: angle, z: 0 }, scale: 1 };
      this.sceneObjects.push(node);
      const vehicle = new Vehicle(node, { name: 'City Cruiser', maxSpeed: 85, grip: 0.9 });
      vehicle.setPosition(x, 2, z);
      vehicle.setHeading(angle);
      vehicle.ai = { type: 'traffic', target: this.pickTrafficDestination() };
      this.vehicles.push(vehicle);
    }
  }

  _spawnNPCs() {
    const count = Math.round(24 * this.settings.density);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 120 + Math.random() * (CITY_RADIUS - 120);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.isBlocked(x, z, 4)) continue;
      const mesh = createPrismMesh({ radius: 1, height: 5.6, sides: 6, colors: { side: '#7f91ff', top: '#ffffff' } });
      const node = { mesh, position: { x, y: 0, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 };
      this.sceneObjects.push(node);
      const npc = new NPC(node, { faction: Math.random() > 0.8 ? 'gang' : 'civilian' });
      npc.setPosition(x, 0, z);
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
    shops.forEach((shop) => this.economy.addShop(shop));
  }

  _formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = Math.floor(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
