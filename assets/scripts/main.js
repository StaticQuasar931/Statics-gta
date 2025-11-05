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

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');

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
};

const buttons = {
    newGame: document.getElementById('new-game-btn'),
    loadGame: document.getElementById('load-game-btn'),
    settings: document.getElementById('settings-btn'),
    startGame: document.getElementById('start-game-btn'),
    resume: document.getElementById('resume-btn'),
    save: document.getElementById('save-btn'),
    quit: document.getElementById('quit-btn'),
};

const inputs = {
    gender: document.getElementById('char-gender'),
    outfit: document.getElementById('char-outfit'),
    background: document.getElementById('char-background'),
};

const worldGenerator = new WorldGenerator();
const saveLoadManager = new SaveLoadManager();
const ui = new UIManager({ hudElements, screens });

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
const weatherTypes = [
    { type: 'clear', intensity: 0 },
    { type: 'fog', intensity: 0.35 },
    { type: 'rain', intensity: 0.6 },
    { type: 'storm', intensity: 0.85 },
];

function setupNewGame() {
    world = worldGenerator.generate();
    inputs.background.innerHTML = world.pointsOfInterest.backgrounds
        .map((story) => `<option value="${story}">${story}</option>`)
        .join('');
    ui.showScreen('character');
}

function startGame() {
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
    npcManager = new NPCManager(world);
    vehicleManager = new VehicleManager();
    policeSystem = new PoliceSystem(vehicleManager, npcManager);
    missionSystem = new MissionSystem(economySystem, policeSystem);
    missionSystem.startMission('tutorial');

    vehicleManager.spawnVehicle({
        type: 'sports',
        color: '#ff7675',
        position: { x: 700, y: 400 },
        maxSpeed: 3.5,
        acceleration: 0.2,
        handling: 0.1,
    });

    running = true;
    paused = false;
    lastTime = performance.now();
    ui.showScreen('game');
    ui.updateHUD(playerController, startingWeapon, 0, null, economySystem);
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
    timeOfDay = (timeOfDay + dt / 120) % 1; // full cycle every 2 minutes
    weatherTimer += dt;
    if (weatherTimer > 45) {
        weatherTimer = 0;
        weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    }

    playerController.update(dt);
    npcManager.update(dt, playerController.position);
    weaponSystem.update(dt, npcManager, policeSystem);
    vehicleManager.update(dt, {
        minX: 0,
        minY: 0,
        maxX: canvas.width,
        maxY: canvas.height,
    }, playerController.position);
    policeSystem.update(dt, playerController.position);

    if (playerController.input.shoot) {
        weaponSystem.fire(playerController.position, aimDirection);
    }

    ui.updateHUD(
        playerController,
        weaponSystem.currentWeapon,
        policeSystem.wantedLevel,
        missionSystem.activeMission,
        economySystem,
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
    ctx.fillStyle = '#ffeaa7';
    world.pointsOfInterest.safehouses.forEach((poi) => {
        ctx.fillRect(
            offsetX + poi.x * blockSize + blockSize / 2 - 4,
            offsetY + poi.y * blockSize + blockSize / 2 - 4,
            8,
            8,
        );
    });
    ctx.fillStyle = '#fdcb6e';
    world.pointsOfInterest.garages.forEach((poi) => {
        ctx.fillRect(
            offsetX + poi.x * blockSize + blockSize / 2 - 3,
            offsetY + poi.y * blockSize + blockSize / 2 - 3,
            6,
            6,
        );
    });
    ctx.fillStyle = '#00cec9';
    world.pointsOfInterest.shops.forEach((poi) => {
        ctx.fillRect(
            offsetX + poi.x * blockSize + blockSize / 2 - 3,
            offsetY + poi.y * blockSize + blockSize / 2 - 3,
            6,
            6,
        );
    });
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
    const overlay = {
        fog: 'rgba(241, 245, 249, 0.25)',
        rain: 'rgba(96, 165, 250, 0.25)',
        storm: 'rgba(15, 23, 42, 0.4)',
    }[weather.type];
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (weather.type === 'rain' || weather.type === 'storm') {
        ctx.strokeStyle = 'rgba(148, 197, 253, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 80 * weather.intensity; i++) {
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
        ctx.fillStyle = vehicle.color;
        ctx.fillRect(-16, -8, 32, 16);
        ctx.restore();
    }
}

function drawNPCs() {
    const drawGroup = (group, color) => {
        ctx.fillStyle = color;
        for (const npc of group) {
            ctx.beginPath();
            ctx.arc(npc.position.x, npc.position.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    drawGroup(npcManager.civilians, '#2ecc71');
    drawGroup(npcManager.gangs, '#e74c3c');
    drawGroup(npcManager.police, '#74b9ff');
}

function drawPlayer() {
    ctx.fillStyle = playerController.outfitColor;
    ctx.beginPath();
    ctx.arc(playerController.position.x, playerController.position.y, 8, 0, Math.PI * 2);
    ctx.fill();
}

function drawProjectiles() {
    ctx.fillStyle = '#f5f5f5';
    for (const projectile of weaponSystem.projectiles) {
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
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

// Input handling
window.addEventListener('keydown', (ev) => {
    const { key } = ev;
    if (key === 'w' || key === 'ArrowUp') playerController?.input.up = true;
    if (key === 's' || key === 'ArrowDown') playerController?.input.down = true;
    if (key === 'a' || key === 'ArrowLeft') playerController?.input.left = true;
    if (key === 'd' || key === 'ArrowRight') playerController?.input.right = true;
    if (key === 'Shift') playerController && (playerController.input.sprint = true);
    if (key === ' ') playerController && (playerController.input.shoot = true);
    if (key === 'Escape') togglePause();
});

window.addEventListener('keyup', (ev) => {
    const { key } = ev;
    if (key === 'w' || key === 'ArrowUp') playerController?.input.up = false;
    if (key === 's' || key === 'ArrowDown') playerController?.input.down = false;
    if (key === 'a' || key === 'ArrowLeft') playerController?.input.left = false;
    if (key === 'd' || key === 'ArrowRight') playerController?.input.right = false;
    if (key === 'Shift') playerController && (playerController.input.sprint = false);
    if (key === ' ') playerController && (playerController.input.shoot = false);
});

canvas.addEventListener('mousemove', (ev) => {
    if (!playerController) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ev.clientX - rect.left;
    const mouseY = ev.clientY - rect.top;
    aimDirection = Math.atan2(mouseY - playerController.position.y, mouseX - playerController.position.x);
});

canvas.addEventListener('mousedown', () => {
    if (playerController) {
        playerController.input.shoot = true;
    }
});

canvas.addEventListener('mouseup', () => {
    if (playerController) {
        playerController.input.shoot = false;
    }
});

buttons.newGame.addEventListener('click', () => {
    setupNewGame();
});

buttons.loadGame.addEventListener('click', () => {
    const saves = saveLoadManager.loadSaves();
    if (!saves.length) {
        alert('No saves available yet. Start a new game!');
        return;
    }
    const latest = saves[saves.length - 1];
    worldGenerator.setSeed(latest.world.seed);
    world = worldGenerator.generate();
    startGame();
    Object.assign(playerController.position, latest.player.position);
    playerController.health = latest.player.health;
    playerController.armor = latest.player.armor;
    playerController.stamina = latest.player.stamina;
    playerController.background = latest.player.background;
    playerController.gender = latest.player.gender;
    playerController.outfitColor = latest.player.outfitColor;
    economySystem.balance = latest.economy.balance;
    economySystem.inventory = latest.economy.inventory;
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
    ui.showScreen('startup');
});

function togglePause(force) {
    if (!running) return;
    paused = typeof force === 'boolean' ? force : !paused;
    ui.togglePause(paused);
}

// Show concept art screen from settings as placeholder to demonstrate UI flow
buttons.settings.addEventListener('click', () => {
    screens.art.classList.toggle('hidden');
});
