export class UIManager {
    constructor(root, assets) {
        this.root = root;
        this.assets = assets;
        this.screens = new Map();
        this.buttons = {};
        this.inputs = {};
        this.hud = {};
        this.currentScreen = 'startup';
        this.toastTimeout = null;
    }

    init() {
        this.root.innerHTML = `
            <div class="screen screen--centered" data-screen="startup">
                <div class="brand-tagline">Featuring StaticQuasar931</div>
                <h1>Static's Escape Road</h1>
                <p class="lead">
                    Launch into a living sandbox metropolis with handcrafted districts, reactive police forces,
                    and fully illustrated assets built for the browser.
                </p>
                <div class="selector-group">
                    <button class="primary" data-action="new-game">Launch New Game</button>
                    <button class="ghost" data-action="load-game">Load Last Save</button>
                    <button data-action="open-gallery">Concept Art</button>
                    <button data-action="open-settings">Settings</button>
                </div>
            </div>
            <div class="screen" data-screen="character">
                <h2>Create Your Runner</h2>
                <p class="lead">Tuned backstories change your starting cash, contacts, and weapon proficiency.</p>
                <div class="form-grid">
                    <label>
                        Codename
                        <input type="text" id="char-name" value="Rogue" maxlength="16" />
                    </label>
                    <label>
                        Gender
                        <select id="char-gender">
                            <option value="random">Random</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </label>
                    <label>
                        Outfit Accent
                        <input type="color" id="char-accent" value="#1e90ff" />
                    </label>
                    <label>
                        Background
                        <select id="char-background"></select>
                    </label>
                </div>
                <div class="selector-group">
                    <button class="ghost" data-action="back-to-menu">Back</button>
                    <button class="primary" data-action="confirm-character">Drop Into City</button>
                </div>
            </div>
            <div class="screen" data-screen="game">
                <div id="game-wrapper">
                    <canvas id="game-canvas" width="1280" height="720"></canvas>
                    <div class="hud" aria-live="polite">
                        <div class="hud-panel stack top-left" id="hud-stats"></div>
                        <div class="hud-panel stack top-right" id="hud-mission"></div>
                        <div class="hud-panel stack bottom-left" id="hud-vehicle"></div>
                        <div class="hud-panel stack bottom-right" id="hud-weapon"></div>
                    </div>
                    <div class="minimap-wrapper">
                        <canvas id="minimap" width="200" height="200" aria-hidden="true"></canvas>
                    </div>
                    <div id="interaction-hint"></div>
                    <div class="toast" id="game-toast"></div>
                    <div class="pause-menu" id="pause-layer">
                        <div class="modal-card">
                            <h2>Game Paused</h2>
                            <section>
                                <div class="selector-group">
                                    <button class="primary" data-action="resume-game">Resume</button>
                                    <button data-action="save-game">Save Game</button>
                                    <button data-action="quit-to-menu">Quit to Menu</button>
                                </div>
                            </section>
                            <section>
                                <div class="selector-group">
                                    <button data-action="pause-settings">Settings</button>
                                    <button data-action="pause-gallery">Concept Art</button>
                                </div>
                            </section>
                            <section>
                                <p class="lead">Tip: Police drones mark you instantly at wanted level 4+. Break sightlines to cool down.</p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
            <div class="settings-modal" id="settings-layer">
                <div class="modal-card">
                    <h2>Simulation Settings</h2>
                    <section>
                        <div class="option-row">
                            <span>Graphics Fidelity</span>
                            <select id="opt-quality">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div class="option-row">
                            <span>Traffic Density</span>
                            <input type="range" id="opt-traffic" min="0" max="2" step="0.1" value="1" />
                        </div>
                        <div class="option-row">
                            <span>Pedestrian Density</span>
                            <input type="range" id="opt-peds" min="0" max="2" step="0.1" value="1" />
                        </div>
                        <div class="option-row">
                            <span>Day/Night Cycle (seconds)</span>
                            <input type="number" id="opt-daylength" min="45" max="600" value="180" />
                        </div>
                        <div class="option-row">
                            <span>Show Hitboxes</span>
                            <input type="checkbox" id="opt-hitboxes" />
                        </div>
                    </section>
                    <section>
                        <div class="selector-group">
                            <button class="primary" data-action="apply-settings">Apply</button>
                            <button data-action="close-settings">Close</button>
                        </div>
                    </section>
                </div>
            </div>
            <div class="gallery-modal" id="gallery-layer">
                <div class="modal-card">
                    <h2>Concept Art & Sprites</h2>
                    <section>
                        <div class="gallery-grid" id="gallery-grid"></div>
                    </section>
                    <section>
                        <button data-action="close-gallery" class="primary">Back</button>
                    </section>
                </div>
            </div>
        `;

        this.root.querySelectorAll('[data-screen]').forEach((node) => {
            const screenName = node.getAttribute('data-screen');
            this.screens.set(screenName, node);
        });
        this.setScreen('startup');

        const buttonSelectors = [
            'new-game',
            'load-game',
            'open-gallery',
            'open-settings',
            'back-to-menu',
            'confirm-character',
            'resume-game',
            'save-game',
            'quit-to-menu',
            'pause-settings',
            'pause-gallery',
            'apply-settings',
            'close-settings',
            'close-gallery',
        ];
        buttonSelectors.forEach((name) => {
            this.buttons[name] = this.root.querySelector(`[data-action="${name}"]`);
        });

        this.inputs = {
            name: this.root.querySelector('#char-name'),
            gender: this.root.querySelector('#char-gender'),
            accent: this.root.querySelector('#char-accent'),
            background: this.root.querySelector('#char-background'),
            quality: this.root.querySelector('#opt-quality'),
            traffic: this.root.querySelector('#opt-traffic'),
            peds: this.root.querySelector('#opt-peds'),
            dayLength: this.root.querySelector('#opt-daylength'),
            hitboxes: this.root.querySelector('#opt-hitboxes'),
        };

        this.hud = {
            stats: this.root.querySelector('#hud-stats'),
            mission: this.root.querySelector('#hud-mission'),
            vehicle: this.root.querySelector('#hud-vehicle'),
            weapon: this.root.querySelector('#hud-weapon'),
            interaction: this.root.querySelector('#interaction-hint'),
            toast: this.root.querySelector('#game-toast'),
        };

        this.canvas = this.root.querySelector('#game-canvas');
        this.minimap = this.root.querySelector('#minimap');
        this.pauseLayer = this.root.querySelector('#pause-layer');
        this.settingsLayer = this.root.querySelector('#settings-layer');
        this.galleryLayer = this.root.querySelector('#gallery-layer');
        this.galleryGrid = this.root.querySelector('#gallery-grid');

        this.populateBackgrounds();
        this.populateGallery();
    }

    populateBackgrounds() {
        const options = [
            { label: 'Street Racer', cash: 550, weapon: 'smg' },
            { label: 'Retired Detective', cash: 800, weapon: 'pistol' },
            { label: 'Cyber Courier', cash: 400, weapon: 'pistol' },
            { label: 'Armory Tech', cash: 650, weapon: 'rifle' },
            { label: 'Urban Explorer', cash: 500, weapon: 'shotgun' },
            { label: 'Night Market Broker', cash: 900, weapon: 'smg' },
        ];
        this.inputs.background.innerHTML = options
            .map((item) => `<option value="${item.weapon}" data-cash="${item.cash}">${item.label}</option>`)
            .join('');
    }

    populateGallery() {
        const entries = this.assets.getCatalogEntries();
        this.galleryGrid.innerHTML = entries
            .map(
                (entry) => `
                <figure>
                    <img src="${entry.path}" alt="${entry.label}" />
                    <figcaption>${entry.label}<br /><small>${entry.category}</small></figcaption>
                </figure>
            `,
            )
            .join('');
    }

    setScreen(name) {
        this.screens.forEach((node, key) => {
            if (key === name) {
                node.classList.add('active');
                if (name === 'startup' || name === 'character') {
                    node.classList.add('screen--centered');
                } else {
                    node.classList.remove('screen--centered');
                }
            } else {
                node.classList.remove('active');
            }
        });
        this.currentScreen = name;
    }

    getCurrentScreen() {
        return this.currentScreen;
    }

    getCanvas() {
        return this.canvas;
    }

    getMinimap() {
        return this.minimap;
    }

    updateHud({ stats, mission, vehicle, weapon }) {
        if (stats) {
            this.hud.stats.innerHTML = `
                <div><strong>${stats.name}</strong></div>
                <div>${stats.cash}</div>
                <div>HP ${stats.health} <span class="badge">Armor ${stats.armor}</span></div>
                <div>${stats.timeOfDay} · ${stats.weather}</div>
                <div>Wanted ${stats.wanted}</div>
            `;
        }
        if (mission) {
            this.hud.mission.innerHTML = `
                <div><strong>${mission.title}</strong></div>
                <div>${mission.detail}</div>
            `;
        }
        if (vehicle) {
            this.hud.vehicle.innerHTML = `
                <div><strong>${vehicle.name}</strong></div>
                <div>Speed ${vehicle.speed.toFixed(0)} km/h</div>
                <div>${vehicle.status}</div>
            `;
        }
        if (weapon) {
            this.hud.weapon.innerHTML = `
                <div class="selector-group">
                    <img id="hud-weapon-icon" src="${weapon.icon}" alt="${weapon.name}" />
                    <div>
                        <div><strong>${weapon.name}</strong></div>
                        <div>${weapon.ammo}</div>
                    </div>
                </div>
            `;
        }
    }

    showInteraction(text, key = 'E') {
        this.hud.interaction.innerHTML = `<span class="keycap">${key}</span>${text}`;
        this.hud.interaction.classList.add('active');
    }

    hideInteraction() {
        this.hud.interaction.classList.remove('active');
    }

    showToast(message, duration = 2200) {
        clearTimeout(this.toastTimeout);
        this.hud.toast.textContent = message;
        this.hud.toast.classList.add('active');
        this.toastTimeout = setTimeout(() => this.hud.toast.classList.remove('active'), duration);
    }

    showPause(show) {
        this.pauseLayer.classList.toggle('active', show);
    }

    showSettings(show) {
        this.settingsLayer.classList.toggle('active', show);
    }

    showGallery(show) {
        this.galleryLayer.classList.toggle('active', show);
    }

    getSettings() {
        return {
            quality: this.inputs.quality.value,
            traffic: Number(this.inputs.traffic.value),
            peds: Number(this.inputs.peds.value),
            dayLength: Number(this.inputs.dayLength.value),
            hitboxes: this.inputs.hitboxes.checked,
        };
    }

    setSettings(settings) {
        this.inputs.quality.value = settings.quality;
        this.inputs.traffic.value = settings.traffic;
        this.inputs.peds.value = settings.peds;
        this.inputs.dayLength.value = settings.dayLength;
        this.inputs.hitboxes.checked = settings.hitboxes;
    }
}
