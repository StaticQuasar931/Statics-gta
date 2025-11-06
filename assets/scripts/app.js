import { AssetLibrary } from './core/assetLibrary.js';
import { UIManager } from './core/uiManager.js';
import { GameWorld } from './game/world.js';

const root = document.getElementById('app');
const assets = new AssetLibrary();
const ui = new UIManager(root, assets);

const startupMessage = 'Loading illustrated city assets…';
const loadingToast = document.createElement('div');
loadingToast.className = 'toast active';
loadingToast.textContent = startupMessage;
root.appendChild(loadingToast);

assets
    .loadAll()
    .then(() => {
        if (loadingToast.parentElement === root) {
            root.removeChild(loadingToast);
        }
        ui.init();
        const game = new GameWorld(ui, assets);
        ui.setSettings(game.settings);
        bindUi(game);
        run(game);
    })
    .catch((error) => {
        console.error(error);
        loadingToast.textContent = 'Failed to load art assets. Reload to try again.';
    });

function bindUi(game) {
    const { buttons, inputs } = ui;

    buttons['new-game']?.addEventListener('click', () => {
        ui.setScreen('character');
    });

    buttons['back-to-menu']?.addEventListener('click', () => {
        ui.setScreen('startup');
    });

    buttons['confirm-character']?.addEventListener('click', () => {
        const name = (inputs.name.value || 'Runner').trim();
        const gender = inputs.gender.value === 'random' ? (Math.random() > 0.5 ? 'male' : 'female') : inputs.gender.value;
        const selectedBackground = inputs.background.selectedOptions[0];
        const weapon = selectedBackground?.value ?? 'pistol';
        const cash = Number(selectedBackground?.dataset.cash ?? 500);
        const accent = inputs.accent.value;
        document.documentElement.style.setProperty('--accent', accent);
        document.documentElement.style.setProperty('--accent-strong', accent);
        const settings = ui.getSettings();
        game.configure(settings);
        game.startNewGame({ name, gender, weapon, cash });
        ui.showSettings(false);
        ui.showGallery(false);
    });

    buttons['load-game']?.addEventListener('click', () => {
        ui.setSettings(game.settings);
        if (game.loadFromSave()) {
            const settings = game.settings;
            ui.setSettings(settings);
        }
    });

    buttons['open-gallery']?.addEventListener('click', () => {
        ui.showGallery(true);
    });

    buttons['pause-gallery']?.addEventListener('click', () => {
        ui.showGallery(true);
    });

    buttons['close-gallery']?.addEventListener('click', () => {
        ui.showGallery(false);
    });

    buttons['open-settings']?.addEventListener('click', () => {
        ui.setSettings(game.settings);
        ui.showSettings(true);
    });

    buttons['pause-settings']?.addEventListener('click', () => {
        ui.setSettings(game.settings);
        ui.showSettings(true);
    });

    buttons['close-settings']?.addEventListener('click', () => {
        ui.showSettings(false);
    });

    buttons['apply-settings']?.addEventListener('click', () => {
        const newSettings = ui.getSettings();
        ui.setSettings(newSettings);
        game.configure(newSettings);
        ui.showToast('Settings applied.');
    });

    buttons['resume-game']?.addEventListener('click', () => {
        game.togglePause(false);
    });

    buttons['save-game']?.addEventListener('click', () => {
        game.saveGame();
    });

    buttons['quit-to-menu']?.addEventListener('click', () => {
        game.togglePause(false);
        game.reset();
        ui.setScreen('startup');
        ui.showSettings(false);
        ui.showGallery(false);
        ui.showPause(false);
        ui.showToast('Returned to lobby.');
    });

    window.addEventListener('keydown', (event) => {
        if (
            game.state === 'playing' &&
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)
        ) {
            event.preventDefault();
        }
        if (event.code === 'KeyP' && game.state === 'playing') {
            game.togglePause(!game.paused);
        }
        if (event.code === 'Escape' && game.state === 'playing') {
            game.togglePause(!game.paused);
        }
        if (event.code === 'KeyM' && game.state === 'playing') {
            ui.showGallery(true);
        }
    });
}

function run(game) {
    let lastTime = performance.now();
    const step = (timestamp) => {
        const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        game.update(delta);
        game.draw();
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
