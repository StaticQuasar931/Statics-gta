import { RESOLUTION_TARGETS } from '../gameplay/constants.js';

export class UIManager {
  constructor(root) {
    this.root = root;
    this.root.classList.add('ui-root');
    this.hud = null;
    this.lobby = null;
    this.settingsPanel = null;
    this.toastStack = null;
    this.featureList = null;
    this._createLayout();
  }

  _createLayout() {
    this._createLobby();
    this._createHUD();
    this._createSettings();
    this.toastStack = document.createElement('div');
    this.toastStack.className = 'toast-stack';
    this.root.appendChild(this.toastStack);
  }

  _createLobby() {
    const lobby = document.createElement('section');
    lobby.className = 'lobby-screen visible';

    const title = document.createElement('h1');
    title.innerHTML = 'StaticQuasar931 Presents<br><span>Neon Grandline</span>';
    lobby.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'lobby-tagline';
    subtitle.textContent = 'A fully WebGL-powered sandbox with heists, horsepower, and high stakes.';
    lobby.appendChild(subtitle);

    const actions = document.createElement('div');
    actions.className = 'lobby-actions';

    const startBtn = document.createElement('button');
    startBtn.className = 'primary';
    startBtn.textContent = 'Launch City';
    startBtn.dataset.action = 'start';

    const missionBtn = document.createElement('button');
    missionBtn.textContent = 'Random Mission';
    missionBtn.dataset.action = 'mission';

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'Settings';
    settingsBtn.dataset.action = 'settings';

    actions.append(startBtn, missionBtn, settingsBtn);
    lobby.appendChild(actions);

    const features = document.createElement('div');
    features.className = 'lobby-features';
    const featureHeader = document.createElement('h2');
    featureHeader.textContent = 'Feature Highlights';
    this.featureList = document.createElement('ul');
    this.featureList.className = 'feature-list';
    features.append(featureHeader, this.featureList);
    lobby.appendChild(features);

    const resolutionNote = document.createElement('div');
    resolutionNote.className = 'resolution-note';
    resolutionNote.innerHTML = `Optimized for ${RESOLUTION_TARGETS.map((r) => `${r.width}×${r.height}`).join(', ')}`;
    lobby.appendChild(resolutionNote);

    this.root.appendChild(lobby);
    this.lobby = lobby;
  }

  _createHUD() {
    const hud = document.createElement('section');
    hud.className = 'hud hidden';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-clock">
          <span class="time">00:00</span>
          <span class="weather">Clear</span>
        </div>
        <div class="hud-mission">
          <span class="label">Mission:</span>
          <span class="value">None</span>
        </div>
        <div class="hud-wanted" data-level="0">
          <span class="stars">☆ ☆ ☆ ☆ ☆</span>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="hud-stats">
          <label>HP</label>
          <div class="bar health"><span></span></div>
          <label>Armor</label>
          <div class="bar armor"><span></span></div>
          <label>Stamina</label>
          <div class="bar stamina"><span></span></div>
        </div>
        <div class="hud-weapon">
          <span class="weapon-name">Pistol</span>
        </div>
        <div class="hud-money">
          <span class="value">$0</span>
        </div>
        <div class="hud-vehicle">
          <span class="speed">0 km/h</span>
          <span class="fuel">Fuel 100%</span>
        </div>
      </div>
      <div class="hud-prompts">
        <span>Press <kbd>E</kbd> to interact · <kbd>Left Click / Tap</kbd> to fire · <kbd>Shift</kbd> to sprint · Hold <kbd>Shift</kbd> + <kbd>E</kbd> in garages to sell</span>
      </div>
    `;
    this.root.appendChild(hud);
    this.hud = hud;
  }

  _createSettings() {
    const panel = document.createElement('section');
    panel.className = 'settings hidden';
    panel.innerHTML = `
      <div class="settings-card">
        <header>
          <h2>Display & Performance</h2>
          <button data-action="close-settings" aria-label="Close">×</button>
        </header>
        <div class="settings-body">
          <label>Visual Fidelity
            <input type="range" min="0.5" max="1.5" value="1" step="0.1" data-setting="fidelity" />
          </label>
          <label>NPC Density
            <input type="range" min="0.4" max="1.6" value="1" step="0.1" data-setting="density" />
          </label>
          <label>Color Theme
            <select data-setting="theme">
              <option value="neon">Neon Noir</option>
              <option value="sunset">Sunset Gold</option>
              <option value="ice">Arctic Blue</option>
            </select>
          </label>
          <label>Motion Comfort
            <select data-setting="comfort">
              <option value="normal">Normal</option>
              <option value="steady">Steady (reduced shake)</option>
              <option value="cinematic">Cinematic (adds tilt)</option>
            </select>
          </label>
          <div class="settings-grid">
            ${RESOLUTION_TARGETS.map((r) => `<button data-resolution="${r.width}x${r.height}">${r.width}×${r.height}</button>`).join('')}
          </div>
        </div>
      </div>
    `;
    this.root.appendChild(panel);
    this.settingsPanel = panel;
  }

  on(event, callback) {
    this.root.addEventListener(event, (ev) => {
      if (ev.target instanceof HTMLElement && ev.target.dataset && ev.target.dataset.action === event) {
        callback(ev);
      }
    });
  }

  bindActions(handler) {
    this.root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      if (!action) return;
      handler(action, target);
    });
  }

  bindResolution(handler) {
    this.settingsPanel.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const resolution = target.dataset.resolution;
      if (!resolution) return;
      event.preventDefault();
      handler(resolution);
    });
  }

  showLobby() {
    this.lobby.classList.add('visible');
    this.lobby.classList.remove('hidden');
  }

  hideLobby() {
    this.lobby.classList.add('hidden');
    this.lobby.classList.remove('visible');
  }

  showHUD() {
    this.hud.classList.remove('hidden');
  }

  hideHUD() {
    this.hud.classList.add('hidden');
  }

  toggleSettings(force) {
    const shouldShow = force ?? this.settingsPanel.classList.contains('hidden');
    this.settingsPanel.classList.toggle('hidden', !shouldShow);
  }

  populateFeatureList(features) {
    if (!this.featureList) return;
    this.featureList.innerHTML = '';
    features.slice(0, 32).forEach((feature) => {
      const item = document.createElement('li');
      item.textContent = feature;
      this.featureList.appendChild(item);
    });
  }

  updateHUD({ time, money, health, armor, stamina, weapon, vehicle, wantedLevel }) {
    const timeElem = this.hud.querySelector('.hud-clock .time');
    const hours = Math.floor(time / 60) % 24;
    const minutes = Math.floor(time % 60);
    timeElem.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    this.hud.querySelector('.hud-money .value').textContent = `$${Math.floor(money).toLocaleString()}`;
    this._updateBar('.bar.health span', health / 150);
    this._updateBar('.bar.armor span', armor / 100);
    this._updateBar('.bar.stamina span', stamina / 100);
    this.hud.querySelector('.hud-weapon .weapon-name').textContent = weapon?.toUpperCase?.() ?? 'NONE';
    const speedElem = this.hud.querySelector('.hud-vehicle .speed');
    const fuelElem = this.hud.querySelector('.hud-vehicle .fuel');
    if (vehicle) {
      speedElem.textContent = `${Math.round(vehicle.speed)} km/h`;
      fuelElem.textContent = `Fuel ${Math.round(vehicle.fuel)}%`;
    } else {
      speedElem.textContent = 'On Foot';
      fuelElem.textContent = 'Fuel —';
    }
    this.updateWantedLevel(wantedLevel);
  }

  updateMission(mission) {
    const label = this.hud.querySelector('.hud-mission .value');
    label.textContent = mission ? mission.label : 'None';
  }

  updateWeather(weather) {
    const weatherElem = this.hud.querySelector('.hud-clock .weather');
    weatherElem.textContent = weather;
  }

  updateWantedLevel(level) {
    const wanted = this.hud.querySelector('.hud-wanted');
    wanted.dataset.level = level;
    const stars = Array.from({ length: 5 })
      .map((_, idx) => (idx < level ? '★' : '☆'))
      .join(' ');
    wanted.querySelector('.stars').textContent = stars;
  }

  updatePOIList(poi) {
    const list = this.lobby.querySelector('.feature-list');
    if (!list) return;
    poi.slice(0, 8).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = `${item.label} · ${item.id}`;
      list.appendChild(li);
    });
  }

  showToast(message, tone = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    this.toastStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  _updateBar(selector, ratio) {
    const bar = this.hud.querySelector(selector);
    if (!bar) return;
    bar.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }
}
