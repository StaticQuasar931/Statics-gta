import { WorldGenerator } from './systems/worldGenerator.js';
import { VehicleManager } from './systems/vehicleManager.js';
import { WeaponSystem } from './systems/weaponSystem.js';
import { PoliceSystem } from './systems/policeSystem.js';
import { EconomySystem } from './systems/economySystem.js';
import { PlayerController } from './systems/playerController.js';
import { MissionSystem } from './systems/missionSystem.js';
import { SaveLoadManager } from './systems/saveLoadManager.js';
import { NPCManager } from './systems/npcManager.js';
import { UIManager } from './systems/uiManager.js';
import { AssetLibrary } from './systems/assetLibrary.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const overlay = document.getElementById('overlay');
const loadingToast = document.getElementById('loading-toast');

const modals = {
    settings: document.getElementById('settings-modal'),
};

const screens = {
    startup: document.getElementById('startup-screen'),
    character: document.getElementById('character-creation'),
    game: document.getElementById('game-container'),
    pause: document.getElementById('pause-menu'),
    art: document.getElementById('concept-art'),
};

const hudElements = {
    money: document.getElementById('hud-money'),
    health: document.getElementById('hud-health'),
    armor: document.getElementById('hud-armor'),
    stamina: document.getElementById('hud-stamina'),
    wanted: document.getElementById('hud-wanted'),
    weapon: document.getElementById('hud-weapon'),
    ammo: document.getElementById('hud-ammo'),
    mission: document.getElementById('mission-panel'),
    weaponIcon: document.getElementById('hud-weapon-icon'),
    vehiclePanel: document.getElementById('hud-vehicle-panel'),
    vehicleName: document.getElementById('hud-vehicle-name'),
    vehicleSpeed: document.getElementById('hud-vehicle-speed'),
    clock: document.getElementById('hud-clock'),
    interaction: document.getElementById('interaction-hint'),
};

const buttons = {
    newGame: document.getElementById('new-game-btn'),
    loadGame: document.getElementById('load-game-btn'),
    settings: document.getElementById('settings-btn'),
    startGame: document.getElementById('start-game-btn'),
    resume: document.getElementById('resume-btn'),
    save: document.getElementById('save-btn'),
    quit: document.getElementById('quit-btn'),
    gallery: document.getElementById('gallery-btn'),
    pauseSettings: document.getElementById('pause-settings-btn'),
    pauseGallery: document.getElementById('pause-gallery-btn'),
    closeGallery: document.getElementById('close-gallery-btn'),
    applySettings: document.getElementById('apply-settings-btn'),
    settingsClose: document.getElementById('settings-close-btn'),
};

const inputs = {
    gender: document.getElementById('char-gender'),
    outfit: document.getElementById('char-outfit'),
    background: document.getElementById('char-background'),
};

const settingsInputs = {
    quality: document.getElementById('graphics-quality'),
    weatherIntensity: document.getElementById('weather-intensity'),
    dayNightDuration: document.getElementById('day-night-duration'),
    pedestrianDensity: document.getElementById('pedestrian-density'),
    trafficDensity: document.getElementById('traffic-density'),
    showHitboxes: document.getElementById('show-hitboxes'),
    reducedMotion: document.getElementById('reduced-motion'),
};

const defaultSettings = {
    quality: 'medium',
    weatherIntensity: 1,
    dayNightDuration: 120,
    pedestrianDensity: 1,
    trafficDensity: 0.8,
    showHitboxes: false,
    reducedMotion: false,
};

let settings = { ...defaultSettings };

const worldGenerator = new WorldGenerator();
const saveLoadManager = new SaveLoadManager();
const ui = new UIManager({ hudElements, screens });
const assets = new AssetLibrary();
let assetsReady = false;
if (loadingToast) {
    loadingToast.classList.remove('hidden');
}
assets
    .preloadAll()
    .then(() => {
        assetsReady = true;
        loadingToast?.classList.add('hidden');
    })
    .catch(() => {
        assetsReady = false;
        if (loadingToast) {
            loadingToast.textContent = 'Some assets failed to load. Fallback visuals in use.';
            loadingToast.classList.remove('hidden');
        }
    });

let world;
let npcManager;
let vehicleManager;
let weaponSystem;
let economySystem;
let playerController;
let policeSystem;
let missionSystem;
let running = false;
let lastTime = 0;
let paused = false;
let aimDirection = 0;
let timeOfDay = Math.random();
let weather = { type: 'clear', intensity: 0 };
let weatherTimer = 0;
let dayNightDuration = settings.dayNightDuration;
let galleryReturn = { screen: 'startup', paused: false };
let settingsReturn = { paused: false };
const weatherTypes = [
    { type: 'clear', intensity: 0 },
    { type: 'fog', intensity: 0.35 },
    { type: 'rain', intensity: 0.6 },
    { type: 'storm', intensity: 0.85 },
];
let nearestVehicle = null;
let hudContext = { clockLabel: 'Dawn' };

function syncSettingsInputs() {
    settingsInputs.quality.value = settings.quality;
    settingsInputs.weatherIntensity.value = settings.weatherIntensity;
    settingsInputs.dayNightDuration.value = settings.dayNightDuration;
    settingsInputs.pedestrianDensity.value = settings.pedestrianDensity;
    settingsInputs.trafficDensity.value = settings.trafficDensity;
    settingsInputs.showHitboxes.checked = settings.showHitboxes;
    settingsInputs.reducedMotion.checked = settings.reducedMotion;
}

function readSettingsFromInputs() {
    return {
        quality: settingsInputs.quality.value,
        weatherIntensity: Number(settingsInputs.weatherIntensity.value),
        dayNightDuration: Number(settingsInputs.dayNightDuration.value),
        pedestrianDensity: Number(settingsInputs.pedestrianDensity.value),
        trafficDensity: Number(settingsInputs.trafficDensity.value),
        showHitboxes: settingsInputs.showHitboxes.checked,
        reducedMotion: settingsInputs.reducedMotion.checked,
    };
}

function applySettingsToSystems() {
    dayNightDuration = Math.max(30, settings.dayNightDuration);
    if (npcManager) {
        npcManager.setDensity(settings.pedestrianDensity);
    }
    if (vehicleManager) {
        vehicleManager.setTrafficDensity(settings.trafficDensity, {
            width: canvas.width,
            height: canvas.height,
        });
    }
    playerController?.setHitboxScale(1);
}

function openSettingsModal() {
    syncSettingsInputs();
    settingsReturn = { paused };
    overlay.classList.remove('hidden');
    modals.settings.classList.remove('hidden');
    if (running && !paused) togglePause(true);
}

function closeSettingsModal(restorePause = true) {
    modals.settings.classList.add('hidden');
    overlay.classList.add('hidden');
    if (restorePause && running && !settingsReturn.paused) {
        togglePause(false);
    }
}

function openGallery() {
    galleryReturn = {
        screen: ui.getCurrentScreen ? ui.getCurrentScreen() : 'startup',
        paused,
    };
    if (running && !paused) togglePause(true);
    ui.showScreen('art');
}

function closeGallery() {
    const target = galleryReturn.screen || 'startup';
    ui.showScreen(target);
    if (target === 'game' && running) {
        if (galleryReturn.paused) {
            togglePause(true);
        } else {
            togglePause(false);
        }
    }
}

function isInputBlocked() {
    return !modals.settings.classList.contains('hidden');
}

function setupNewGame() {
    world = worldGenerator.generate();
    inputs.background.innerHTML = world.pointsOfInterest.backgrounds
        .map((story) => `<option value="${story}">${story}</option>`)
        .join('');
    ui.showScreen('character');
}

async function startGame() {
    if (!assetsReady) {
        loadingToast?.classList.remove('hidden');
        await assets.preloadAll();
        assetsReady = assets.isReady();
        if (assetsReady) {
            loadingToast?.classList.add('hidden');
        }
    }
    const selectedBackground =
        inputs.background.value || world.pointsOfInterest.backgrounds[0];
    weaponSystem = new WeaponSystem();
    const startingWeapon = weaponSystem.equip(0);
    economySystem = new EconomySystem(world.pointsOfInterest);
    playerController = new PlayerController(weaponSystem, economySystem);
    playerController.setBackground(selectedBackground);
    playerController.customize({
        gender: inputs.gender.value,
        outfitColor: inputs.outfit.value,
    });
    playerController.setHitboxScale(1);
    npcManager = new NPCManager(world, { pedestrianDensity: settings.pedestrianDensity });
    vehicleManager = new VehicleManager({ trafficDensity: settings.trafficDensity });
    policeSystem = new PoliceSystem(vehicleManager, npcManager);
    missionSystem = new MissionSystem(economySystem, policeSystem);
    missionSystem.startMission('tutorial');

    vehicleManager.setTrafficDensity(settings.trafficDensity, {
        width: canvas.width,
        height: canvas.height,
    });

    vehicleManager.spawnVehicle({
        type: 'sports',
        color: '#ff7675',
        position: { x: 700, y: 400 },
        maxSpeed: 3.5,
        acceleration: 0.2,
        handling: 0.1,
        ai: 'parked',
        length: 34,
        width: 18,
        spriteId: 'sports',
        displayName: 'Sports Coupe',
    });

    applySettingsToSystems();

    running = true;
    paused = false;
    lastTime = performance.now();
    ui.showScreen('game');
    handleInteractionPrompts();
    hudContext = {
        weaponIcon: assets.getWeaponPath(startingWeapon.icon),
        vehicle: null,
        clockLabel: computeClockLabel(timeOfDay),
    };
    ui.updateHUD(playerController, startingWeapon, 0, null, economySystem, hudContext);
    requestAnimationFrame(loop);
}

function loop(timestamp) {
    if (!running) return;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (!paused) {
        update(dt);
        render();
    }
    requestAnimationFrame(loop);
}

function update(dt) {
    timeOfDay = (timeOfDay + dt / dayNightDuration) % 1;
    weatherTimer += dt;
    const weatherIntervalMap = { low: 55, medium: 45, high: 35 };
    const weatherInterval = weatherIntervalMap[settings.quality] ?? 45;
    if (weatherTimer > weatherInterval) {
        weatherTimer = 0;
        weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    }

    hudContext.clockLabel = computeClockLabel(timeOfDay);

    playerController.update(dt);
    npcManager.update(dt, playerController.position);
    weaponSystem.update(dt, npcManager, policeSystem);
    vehicleManager.update(dt, {
        minX: 0,
        minY: 0,
        maxX: canvas.width,
        maxY: canvas.height,
    }, playerController.position);
    const currentWeapon = weaponSystem.currentWeapon;
    hudContext.weaponIcon = currentWeapon?.icon ? assets.getWeaponPath(currentWeapon.icon) : null;
    for (const vehicle of vehicleManager.vehicles) {
        const combinedRadius = (vehicle.collisionRadius ?? 18) + playerController.radius;
        const dx = vehicle.position.x - playerController.position.x;
        const dy = vehicle.position.y - playerController.position.y;
        const distance = Math.hypot(dx, dy);
        if (distance < combinedRadius && distance > 0) {
            playerController.health = Math.max(0, playerController.health - dt * 12);
            const overlap = combinedRadius - distance;
            playerController.position.x -= (dx / distance) * overlap * 0.5;
            playerController.position.y -= (dy / distance) * overlap * 0.5;
        }
    }
    policeSystem.update(dt, playerController.position);

    if (playerController.inVehicle) {
        const veh = playerController.inVehicle;
        const speed = Math.round(Math.hypot(veh.velocity.x, veh.velocity.y) * 14);
        hudContext.vehicle = { name: getVehicleName(veh), speed };
    } else {
        hudContext.vehicle = null;
    }

    handleInteractionPrompts();

    if (playerController.input.shoot) {
        const projectile = weaponSystem.fire(
            playerController.position,
            aimDirection,
            playerController.radius,
        );
        if (projectile) {
            policeSystem.reportGunshot(playerController.position);
        }
    }

    ui.updateHUD(
        playerController,
        weaponSystem.currentWeapon,
        policeSystem.wantedLevel,
        missionSystem.activeMission,
        economySystem,
        hudContext,
    );
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSky();
    drawWilderness();
    drawWorld();
    drawPointsOfInterest();
    drawVehicles();
    drawNPCs();
    drawPlayer();
    drawProjectiles();
    if (settings.showHitboxes) {
        drawHitboxes();
    }
    drawMinimap();
    applyWeatherOverlay();
}

function drawWorld() {
    const blockSize = 40;
    const offsetX = canvas.width / 2 - (world.city.size * blockSize) / 2;
    const offsetY = canvas.height / 2 - (world.city.size * blockSize) / 2;

    for (const block of world.city.blocks) {
        ctx.fillStyle = block.color;
        ctx.fillRect(
            offsetX + block.x * blockSize,
            offsetY + block.y * blockSize,
            blockSize - 2,
            blockSize - 2,
        );
        if (block.type === 'building') {
            const sprite = assets.getBuildingSprite(block.asset);
            const size = blockSize - 6;
            const x = offsetX + block.x * blockSize + 3;
            const y = offsetY + block.y * blockSize + 3;
            if (sprite instanceof HTMLImageElement) {
                ctx.drawImage(sprite, x, y, size, size);
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                const baseX = offsetX + block.x * blockSize + 4;
                const baseY = offsetY + block.y * blockSize + 4;
                for (let wx = 0; wx < 3; wx++) {
                    for (let wy = 0; wy < 3; wy++) {
                        ctx.fillRect(baseX + wx * 10, baseY + wy * 10, 6, 6);
                    }
                }
            }
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.moveTo(offsetX + block.x * blockSize, offsetY + block.y * blockSize + blockSize / 2);
            ctx.lineTo(
                offsetX + block.x * blockSize + blockSize - 4,
                offsetY + block.y * blockSize + blockSize / 2,
            );
            ctx.stroke();
        }
    }
}

function drawWilderness() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    for (const tile of world.wilderness.tiles) {
        const color = {
            forest: '#0b3d0b',
            mountain: '#4a4a4a',
            lake: '#0f4c75',
            rural: '#7f8c3a',
        }[tile.biome];
        ctx.fillStyle = color;
        ctx.fillRect(centerX + tile.x * 6, centerY + tile.y * 6, 5, 5);
    }
}

function drawPointsOfInterest() {
    const blockSize = 40;
    const offsetX = canvas.width / 2 - (world.city.size * blockSize) / 2;
    const offsetY = canvas.height / 2 - (world.city.size * blockSize) / 2;
    const drawIcon = (poi, sprite, fallbackColor, size = 20) => {
        const x = offsetX + poi.x * blockSize + blockSize / 2 - size / 2;
        const y = offsetY + poi.y * blockSize + blockSize / 2 - size / 2;
        if (sprite instanceof HTMLImageElement) {
            ctx.drawImage(sprite, x, y, size, size);
        } else {
            ctx.fillStyle = fallbackColor;
            ctx.fillRect(x, y, size, size);
        }
    };
    const renderGroup = (items, fallbackKey, fallbackColor) => {
        items.forEach((poi) => {
            const desiredKey =
                poi.icon ||
                (fallbackKey.startsWith('shop')
                    ? `shop-${slugify(poi.type || poi.slug || '')}`
                    : slugify(poi.type || '') || fallbackKey);
            const sprite =
                assets.getPOISprite(desiredKey) ||
                assets.getPOISprite(fallbackKey) ||
                null;
            drawIcon(poi, sprite, fallbackColor, poi.size ?? 20);
        });
    };
    renderGroup(world.pointsOfInterest.safehouses ?? [], 'safehouse', '#ffeaa7');
    renderGroup(world.pointsOfInterest.garages ?? [], 'garage', '#fdcb6e');
    renderGroup(world.pointsOfInterest.shops ?? [], 'shop-generic', '#00cec9');
}

function drawSky() {
    const nightColor = [12, 16, 32];
    const dayColor = [135, 206, 250];
    const dawnColor = [255, 160, 122];
    const cycle = Math.sin(timeOfDay * Math.PI * 2) * 0.5 + 0.5;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const mix = (a, b, t) => a + (b - a) * t;
    const lerpColor = (colorA, colorB, t) => {
        const r = Math.round(mix(colorA[0], colorB[0], t));
        const g = Math.round(mix(colorA[1], colorB[1], t));
        const b = Math.round(mix(colorA[2], colorB[2], t));
        return `rgb(${r}, ${g}, ${b})`;
    };
    const top = lerpColor(nightColor, dayColor, cycle);
    const bottom = lerpColor(nightColor, dawnColor, cycle);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function applyWeatherOverlay() {
    if (weather.type === 'clear') return;
    const effectiveIntensity = weather.intensity * settings.weatherIntensity;
    const alphaBase = weather.type === 'storm' ? 0.6 : weather.type === 'rain' ? 0.45 : 0.35;
    const overlayAlpha = Math.min(0.6, effectiveIntensity * alphaBase);
    if (overlayAlpha > 0) {
        const overlay = {
            fog: `rgba(241, 245, 249, ${overlayAlpha})`,
            rain: `rgba(96, 165, 250, ${overlayAlpha})`,
            storm: `rgba(15, 23, 42, ${overlayAlpha})`,
        }[weather.type];
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (settings.reducedMotion) return;

    if (overlayAlpha > 0 && (weather.type === 'rain' || weather.type === 'storm')) {
        ctx.strokeStyle = 'rgba(148, 197, 253, 0.4)';
        ctx.lineWidth = 1;
        const streakBase = { low: 40, medium: 70, high: 110 };
        const streaks = Math.round((streakBase[settings.quality] ?? 70) * effectiveIntensity);
        for (let i = 0; i < streaks; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 4, y + 12);
            ctx.stroke();
        }
    }
}

function drawVehicles() {
    for (const vehicle of vehicleManager.vehicles) {
        ctx.save();
        ctx.translate(vehicle.position.x, vehicle.position.y);
        ctx.rotate(vehicle.heading);
        const sprite = assets.getVehicleSprite(vehicle.spriteId || vehicle.type);
        const length = (vehicle.length || 32) * 1.4;
        const width = (vehicle.width || 16) * 1.6;
        if (sprite instanceof HTMLImageElement) {
            ctx.drawImage(sprite, -length / 2, -width / 2, length, width);
        } else {
            ctx.fillStyle = vehicle.color || '#95a5a6';
            ctx.fillRect(-length / 2, -width / 2, length, width);
        }
        ctx.restore();
    }
}

function drawNPCs() {
    const drawGroup = (group) => {
        for (const npc of group) {
            const sprite = assets.getCharacterSprite(npc.spriteId);
            const size = (npc.radius ?? 6) * 3;
            if (sprite instanceof HTMLImageElement) {
                ctx.drawImage(sprite, npc.position.x - size / 2, npc.position.y - size / 2, size, size);
            } else {
                ctx.fillStyle = '#ecf0f1';
                ctx.beginPath();
                ctx.arc(npc.position.x, npc.position.y, npc.radius ?? 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    };
    drawGroup(npcManager.civilians);
    drawGroup(npcManager.gangs);
    drawGroup(npcManager.police);
}

function drawPlayer() {
    const sprite = assets.getCharacterSprite(playerController.getSpriteId());
    const size = playerController.radius * 3.5;
    if (sprite instanceof HTMLImageElement) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = playerController.outfitColor;
        ctx.beginPath();
        ctx.arc(playerController.position.x, playerController.position.y, playerController.radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.drawImage(
            sprite,
            playerController.position.x - size / 2,
            playerController.position.y - size / 2,
            size,
            size,
        );
    } else {
        ctx.fillStyle = playerController.outfitColor;
        ctx.beginPath();
        ctx.arc(playerController.position.x, playerController.position.y, playerController.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawProjectiles() {
    ctx.fillStyle = '#f5f5f5';
    for (const projectile of weaponSystem.projectiles) {
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawHitboxes() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(playerController.position.x, playerController.position.y, playerController.radius, 0, Math.PI * 2);
    ctx.stroke();
    const drawCircle = (entity, radius, color) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(entity.position.x, entity.position.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    };
    npcManager.civilians.forEach((npc) => drawCircle(npc, npc.radius ?? 6, 'rgba(46, 204, 113, 0.35)'));
    npcManager.gangs.forEach((npc) => drawCircle(npc, npc.radius ?? 6, 'rgba(231, 76, 60, 0.35)'));
    npcManager.police.forEach((npc) => drawCircle(npc, npc.radius ?? 7, 'rgba(116, 185, 255, 0.35)'));
    vehicleManager.vehicles.forEach((veh) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(veh.position.x, veh.position.y, veh.collisionRadius ?? 18, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.restore();
}

function drawMinimap() {
    const ctxMini = getMinimapContext();
    if (!ctxMini) return;
    ctxMini.clearRect(0, 0, 180, 180);
    ctxMini.fillStyle = '#111';
    ctxMini.fillRect(0, 0, 180, 180);

    ctxMini.fillStyle = '#444';
    world.city.blocks.forEach((block) => {
        ctxMini.fillRect(block.x * 4, block.y * 4, 3, 3);
    });

    ctxMini.fillStyle = '#fff';
    ctxMini.fillRect(playerController.position.x / 10, playerController.position.y / 10, 4, 4);
}

let minimapContext;
function getMinimapContext() {
    if (!minimapContext) {
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 180;
        miniCanvas.height = 180;
        minimap.appendChild(miniCanvas);
        minimapContext = miniCanvas.getContext('2d');
    }
    return minimapContext;
}

function computeClockLabel(time) {
    if (time < 0.18) return 'Dawn';
    if (time < 0.38) return 'Morning';
    if (time < 0.62) return 'Afternoon';
    if (time < 0.82) return 'Dusk';
    return 'Night';
}

function getVehicleName(vehicle) {
    if (!vehicle) return 'Vehicle';
    return (
        vehicle.displayName ||
        (typeof vehicleManager._describeVehicle === 'function'
            ? vehicleManager._describeVehicle(vehicle.type)
            : 'Vehicle')
    );
}

function slugify(value = '') {
    return value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .trim();
}

function handleInteractionPrompts() {
    if (
        !vehicleManager ||
        !playerController ||
        !running ||
        paused ||
        isInputBlocked() ||
        ui.getCurrentScreen?.() !== 'game'
    ) {
        ui.showInteractionHint('');
        return;
    }
    if (playerController.inVehicle) {
        nearestVehicle = playerController.inVehicle;
        ui.showInteractionHint(
            `<span class="keycap">E</span><span>Exit ${getVehicleName(playerController.inVehicle)}</span>`,
        );
        return;
    }
    let closest = null;
    let closestDistance = Infinity;
    const threshold = 52;
    for (const vehicle of vehicleManager.vehicles) {
        if (!vehicle) continue;
        if (vehicle.type === 'helicopter' || vehicle.type === 'boat') continue;
        const dx = vehicle.position.x - playerController.position.x;
        const dy = vehicle.position.y - playerController.position.y;
        const distance = Math.hypot(dx, dy);
        if (distance < threshold && distance < closestDistance) {
            closest = vehicle;
            closestDistance = distance;
        }
    }
    nearestVehicle = closest;
    if (closest) {
        ui.showInteractionHint(
            `<span class="keycap">E</span><span>Enter ${getVehicleName(closest)}</span>`,
        );
    } else {
        ui.showInteractionHint('');
    }
}

// Input handling
window.addEventListener('keydown', (ev) => {
    const { key, target } = ev;
    const tag = target?.tagName;
    const normalizedKey = key?.toLowerCase?.();
    if (!modals.settings.classList.contains('hidden')) {
        if (key === 'Escape') closeSettingsModal();
        return;
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    if (key === 'Escape') {
        togglePause();
        return;
    }
    if (!running || ui.getCurrentScreen?.() !== 'game') return;
    if (normalizedKey === 'e') {
        if (playerController?.inVehicle) {
            playerController.exitVehicle();
        } else if (nearestVehicle) {
            playerController?.enterVehicle(nearestVehicle);
        }
        handleInteractionPrompts();
        return;
    }
    if (key === 'w' || key === 'ArrowUp') playerController?.input.up = true;
    if (key === 's' || key === 'ArrowDown') playerController?.input.down = true;
    if (key === 'a' || key === 'ArrowLeft') playerController?.input.left = true;
    if (key === 'd' || key === 'ArrowRight') playerController?.input.right = true;
    if (key === 'Shift') playerController && (playerController.input.sprint = true);
    if (key === ' ') playerController && (playerController.input.shoot = true);
});

window.addEventListener('keyup', (ev) => {
    const { key, target } = ev;
    const tag = target?.tagName;
    if (!running || ui.getCurrentScreen?.() !== 'game') return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    if (key === 'w' || key === 'ArrowUp') playerController?.input.up = false;
    if (key === 's' || key === 'ArrowDown') playerController?.input.down = false;
    if (key === 'a' || key === 'ArrowLeft') playerController?.input.left = false;
    if (key === 'd' || key === 'ArrowRight') playerController?.input.right = false;
    if (key === 'Shift') playerController && (playerController.input.sprint = false);
    if (key === ' ') playerController && (playerController.input.shoot = false);
});

canvas.addEventListener('mousemove', (ev) => {
    if (!playerController || isInputBlocked()) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ev.clientX - rect.left;
    const mouseY = ev.clientY - rect.top;
    aimDirection = Math.atan2(mouseY - playerController.position.y, mouseX - playerController.position.x);
});

canvas.addEventListener('mousedown', () => {
    if (playerController && !isInputBlocked()) {
        playerController.input.shoot = true;
    }
});

canvas.addEventListener('mouseup', () => {
    if (playerController && !isInputBlocked()) {
        playerController.input.shoot = false;
    }
});

buttons.newGame.addEventListener('click', () => {
    setupNewGame();
});

buttons.loadGame.addEventListener('click', async () => {
    const saves = saveLoadManager.loadSaves();
    if (!saves.length) {
        alert('No saves available yet. Start a new game!');
        return;
    }
    const latest = saves[saves.length - 1];
    worldGenerator.setSeed(latest.world.seed);
    world = worldGenerator.generate();
    await startGame();
    Object.assign(playerController.position, latest.player.position);
    playerController.health = latest.player.health;
    playerController.armor = latest.player.armor;
    playerController.stamina = latest.player.stamina;
    playerController.background = latest.player.background;
    playerController.gender = latest.player.gender;
    playerController.outfitColor = latest.player.outfitColor;
    playerController.customize({ gender: playerController.gender, outfitColor: playerController.outfitColor });
    hudContext.weaponIcon = assets.getWeaponPath(weaponSystem.currentWeapon?.icon);
    economySystem.balance = latest.economy.balance;
    economySystem.inventory = latest.economy.inventory;
    handleInteractionPrompts();
});

buttons.startGame.addEventListener('click', () => {
    startGame();
});

buttons.resume.addEventListener('click', () => togglePause(false));
buttons.save.addEventListener('click', () => {
    saveLoadManager.save(0, {
        world,
        player: {
            position: playerController.position,
            health: playerController.health,
            armor: playerController.armor,
            stamina: playerController.stamina,
            background: playerController.background,
            gender: playerController.gender,
            outfitColor: playerController.outfitColor,
        },
        economy: { balance: economySystem.balance, inventory: economySystem.inventory },
    });
    alert('Game saved!');
});
buttons.quit.addEventListener('click', () => {
    running = false;
    paused = false;
    closeSettingsModal(false);
    modals.settings.classList.add('hidden');
    overlay.classList.add('hidden');
    ui.togglePause(false);
    ui.showScreen('startup');
});

function togglePause(force) {
    if (!running) return;
    paused = typeof force === 'boolean' ? force : !paused;
    ui.togglePause(paused);
    if (paused) {
        ui.showInteractionHint('');
    } else {
        handleInteractionPrompts();
    }
}

buttons.settings.addEventListener('click', () => openSettingsModal());
buttons.pauseSettings?.addEventListener('click', () => openSettingsModal());
buttons.applySettings?.addEventListener('click', () => {
    settings = { ...settings, ...readSettingsFromInputs() };
    applySettingsToSystems();
    try {
        localStorage.setItem('ser-settings', JSON.stringify(settings));
    } catch (error) {
        console.warn('Unable to persist settings', error);
    }
    closeSettingsModal();
});
buttons.settingsClose?.addEventListener('click', () => closeSettingsModal());
overlay?.addEventListener('click', () => {
    if (!modals.settings.classList.contains('hidden')) {
        closeSettingsModal();
    }
});

buttons.gallery?.addEventListener('click', () => openGallery());
buttons.pauseGallery?.addEventListener('click', () => openGallery());
buttons.closeGallery?.addEventListener('click', () => closeGallery());

try {
    const stored = localStorage.getItem('ser-settings');
    if (stored) {
        settings = { ...settings, ...JSON.parse(stored) };
        dayNightDuration = settings.dayNightDuration;
    }
} catch (error) {
    console.warn('Unable to restore saved settings', error);
}
syncSettingsInputs();
