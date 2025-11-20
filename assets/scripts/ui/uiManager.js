export class UIManager {
  constructor(root) {
    this.root = root;
    this.root.classList.add('ui-root');
    this._createLayout();
  }

  _createLayout() {
    this._createLobby();
    this._createLoader();
    this._createHUD();
    this._createModal();
    this.toastStack = document.createElement('div');
    this.toastStack.className = 'toast-stack';
    this.toastStack.setAttribute('aria-live', 'polite');
    this.toastStack.setAttribute('role', 'status');
    this.root.appendChild(this.toastStack);
  }

  _createLobby() {
    const lobby = document.createElement('section');
    lobby.className = 'lobby-screen visible';
    lobby.innerHTML = `
      <div class="lobby-brand">
        <img src="assets/images/ui/city-map.svg" alt="Neon skyline map" loading="lazy" />
        <div>
          <h1>StaticQuasar931 Presents<br><span>Neon Grandline</span></h1>
          <p class="tagline">A hand-crafted neon sandbox built for the browser—steal rides, outrun Metro Patrol, and build your empire.</p>
        </div>
      </div>
      <div class="lobby-actions">
        <button class="primary" data-action="start">Launch City</button>
        <button data-action="mission">Roll Mission</button>
        <button data-action="settings">Settings</button>
      </div>
      <div class="lobby-gallery">
        <img src="assets/images/ui/vehicle-concepts.svg" alt="Vehicle concepts" loading="lazy" />
        <img src="assets/images/ui/weapon-concepts.svg" alt="Weapon concepts" loading="lazy" />
        <img src="assets/images/ui/police-units.svg" alt="Police unit concepts" loading="lazy" />
      </div>
      <footer>
        Optimised for 1300×730 · 1366×768 · 1517×852 · 1536×864 · 1920×1080
      </footer>
    `;
    this.root.appendChild(lobby);
    this.lobby = lobby;
  }

  _createLoader() {
    const loader = document.createElement('section');
    loader.className = 'loader hidden';
    loader.innerHTML = `
      <div class="loader-card">
        <img src="assets/images/ui/hud-layout.svg" alt="HUD blueprint" />
        <div class="loader-text">
          <h2>Loading Neon Grandline…</h2>
          <p class="message">Preparing simulation stack.</p>
          <div class="progress">
            <span></span>
          </div>
        </div>
      </div>
    `;
    this.root.appendChild(loader);
    this.loader = loader;
  }

  _createHUD() {
    const hud = document.createElement('section');
    hud.className = 'hud hidden';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-clock">
          <span class="time">00:00</span>
          <span class="mission">Free Roam</span>
        </div>
        <div class="hud-wanted" data-level="0">
          <span class="label">Wanted</span>
          <span class="stars">☆ ☆ ☆ ☆ ☆</span>
          <span class="awl">0 WP</span>
        </div>
        <div class="hud-speedo">
          <div class="speed-value">0</div>
          <div class="speed-label">MPH</div>
          <div class="speed-gear">N</div>
        </div>
        <div class="hud-money">
          <span class="value">$0</span>
        </div>
      </div>
      <div class="hud-main">
        <div class="hud-bars">
          <div class="bar">
            <label>HP</label>
            <span class="fill health"></span>
          </div>
          <div class="bar">
            <label>Armor</label>
            <span class="fill armor"></span>
          </div>
          <div class="bar">
            <label>Stamina</label>
            <span class="fill stamina"></span>
          </div>
        </div>
        <div class="crime-feed">
          <h3>Crime Tracker</h3>
          <ul></ul>
        </div>
      </div>
      <div class="hud-footer">
        <div class="vehicle">On Foot</div>
        <div class="hint">Press E to interact</div>
      </div>
    `;
    this.root.appendChild(hud);
    this.hud = hud;
    this.crimeList = hud.querySelector('.crime-feed ul');
    const pause = document.createElement('div');
    pause.className = 'pause-overlay hidden';
    pause.innerHTML = `
      <div class="pause-card">
        <h2>Paused</h2>
        <p>Press ESC to resume or open settings for visual tweaks.</p>
        <div class="keybinds">
          <div><span>WASD</span><small>Move / steer</small></div>
          <div><span>Shift</span><small>Run / boost</small></div>
          <div><span>Space</span><small>Brake / handbrake</small></div>
          <div><span>E</span><small>Enter / exit / interact</small></div>
          <div><span>Mouse</span><small>Aim / fire</small></div>
          <div><span>ESC</span><small>Pause / unpause</small></div>
        </div>
        <div class="pause-actions">
          <button data-action="settings">Settings</button>
          <button data-action="restart">Restart</button>
          <button data-action="lobby">Return to Lobby</button>
          <button data-action="close-pause">Resume</button>
        </div>
      </div>
    `;
    hud.appendChild(pause);
    this.pauseOverlay = pause;
  }

  _createModal() {
    const modal = document.createElement('section');
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-card">
        <header>
          <h2></h2>
          <button data-action="close-modal" aria-label="Close">×</button>
        </header>
        <p class="description"></p>
        <div class="options"></div>
      </div>
    `;
    this.root.appendChild(modal);
    this.modal = modal;
  }

  bindActions(handler) {
    this.root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      if (!action) return;
      event.preventDefault();
      if (action === 'close-modal') {
        this.hideModal();
        return;
      }
      handler(action, target);
    });
  }

  bindResolution() {}

  showLobby() {
    this.lobby.classList.remove('hidden');
    this.lobby.classList.add('visible');
  }

  hideLobby() {
    this.lobby.classList.add('hidden');
    this.lobby.classList.remove('visible');
  }

  showLoader(message = 'Loading…') {
    const messageElem = this.loader.querySelector('.loader-text .message');
    if (messageElem) messageElem.textContent = message;
    const bar = this.loader.querySelector('.progress span');
    if (bar) bar.style.width = '0%';
    this.loader.classList.remove('hidden');
  }

  hideLoader() {
    this.loader.classList.add('hidden');
  }

  updateLoader(message, progress) {
    const messageElem = this.loader.querySelector('.loader-text .message');
    if (messageElem) {
      messageElem.textContent = message;
    }
    const bar = this.loader.querySelector('.progress span');
    if (bar) {
      if (typeof progress === 'number') {
        bar.style.width = `${Math.round(progress * 100)}%`;
      } else if (message) {
        const match = message.match(/(\d+)/);
        bar.style.width = match ? `${match[1]}%` : '100%';
      }
    }
  }

  showHUD() {
    this.hud.classList.remove('hidden');
  }

  hideHUD() {
    this.hud.classList.add('hidden');
  }

  toggleSettings() {}

  togglePause(paused) {
    if (!this.pauseOverlay) return;
    if (paused) {
      this.pauseOverlay.classList.remove('hidden');
      this.hud.classList.add('paused');
    } else {
      this.pauseOverlay.classList.add('hidden');
      this.hud.classList.remove('paused');
    }
  }

  updateHUD({ time, mission, wantedLevel, awl, money, health, armor, stamina, vehicle, hint }) {
    const timeElem = this.hud.querySelector('.hud-clock .time');
    if (timeElem) timeElem.textContent = time;
    const missionElem = this.hud.querySelector('.hud-clock .mission');
    if (missionElem) missionElem.textContent = mission;
    const moneyElem = this.hud.querySelector('.hud-money .value');
    if (moneyElem) moneyElem.textContent = `$${Math.floor(money).toLocaleString()}`;
    this._setBar('.fill.health', health / 150);
    this._setBar('.fill.armor', armor / 100);
    this._setBar('.fill.stamina', stamina / 100);
    const wanted = this.hud.querySelector('.hud-wanted');
    if (wanted) {
      wanted.dataset.level = String(wantedLevel);
      if (awl !== undefined) {
        wanted.dataset.awl = String(Math.round(awl));
        wanted.setAttribute('title', `Active Wanted Level: ${Math.round(awl)} WP`);
        const awlElem = wanted.querySelector('.awl');
        if (awlElem) {
          awlElem.textContent = `${Math.round(awl)} WP`;
        }
      }
      const stars = Array.from({ length: 5 })
        .map((_, idx) => (idx < wantedLevel ? '★' : '☆'))
        .join(' ');
      wanted.querySelector('.stars').textContent = stars;
    }
    const speedo = this.hud.querySelector('.hud-speedo');
    if (speedo) {
      const mph = vehicle ? Math.max(0, Math.round(vehicle.speed * 0.62)) : 0;
      const gear = vehicle ? (Math.abs(vehicle.speed) < 4 ? 'N' : vehicle.speed >= 0 ? 'D' : 'R') : '—';
      speedo.querySelector('.speed-value').textContent = mph.toString();
      speedo.querySelector('.speed-gear').textContent = gear;
      speedo.dataset.state = vehicle ? 'vehicle' : 'foot';
    }
    const vehicleElem = this.hud.querySelector('.hud-footer .vehicle');
    if (vehicleElem) {
      if (vehicle) {
        const mph = Math.max(0, Math.round(vehicle.speed * 0.62));
        vehicleElem.textContent = `${vehicle.name} · ${mph} mph`;
      } else {
        vehicleElem.textContent = 'On Foot';
      }
    }
    const hintElem = this.hud.querySelector('.hud-footer .hint');
    if (hintElem && hint) {
      hintElem.textContent = hint;
    }
  }

  showMission(title, description) {
    const missionElem = this.hud.querySelector('.hud-clock .mission');
    if (missionElem) missionElem.textContent = title;
    this.showToast(description, 'info');
  }

  showModal({ title, description, options }) {
    const card = this.modal.querySelector('.modal-card');
    card.querySelector('h2').textContent = title;
    card.querySelector('.description').textContent = description;
    const optionsContainer = card.querySelector('.options');
    optionsContainer.innerHTML = '';
    options.forEach((option) => {
      const button = document.createElement('button');
      button.textContent = option.label;
      button.addEventListener('click', () => option.action?.());
      optionsContainer.appendChild(button);
    });
    this.modal.classList.remove('hidden');
  }

  hideModal() {
    this.modal.classList.add('hidden');
  }

  showToast(message, tone = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    this.toastStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }

  populateFeatureList() {}

  updateWantedLevel() {}

  logCrime(entry) {
    if (!this.crimeList) return;
    const item = document.createElement('li');
    item.dataset.severity = entry.severity ?? 'minor';
    const severityLabel = (entry.severity ?? 'minor').toUpperCase();
    const meta = `${severityLabel} · ${Math.round(entry.wanted)} WP`;
    const time = entry.time ? `<span class="crime-time">${entry.time}</span>` : '';
    item.innerHTML = `
      <span class="crime-type">${entry.type}</span>
      <span class="crime-meta">${time} ${meta}</span>
    `;
    this.crimeList.prepend(item);
    while (this.crimeList.children.length > 5) {
      this.crimeList.removeChild(this.crimeList.lastElementChild);
    }
  }

  _setBar(selector, value) {
    const bar = this.hud.querySelector(selector);
    if (!bar) return;
    const clamped = Math.max(0, Math.min(1, value ?? 0));
    bar.style.width = `${clamped * 100}%`;
  }
}
