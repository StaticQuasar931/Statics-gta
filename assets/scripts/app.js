import { UIManager } from './ui/uiManager.js';
import { GameWorld } from './gameplay/world.js';

export class App {
  constructor(root) {
    this.root = root;
    this.canvasHost = document.createElement('div');
    this.canvasHost.className = 'canvas-host';
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = 'ui-layer';
    this.root.append(this.canvasHost, this.uiLayer);

    this.ui = new UIManager(this.uiLayer);

    this.world = null;
    this.loopHandle = 0;
    this.running = false;
    this.settings = {
      fidelity: 1,
      density: 1,
      theme: 'neon',
      comfort: 'normal',
    };

    this._bindUI();
  }

  async start() {
    if (this.world) {
      this.stop();
    }
    this.world = new GameWorld(this.canvasHost, this.ui, this.settings);
    await this.world.init();
    this.ui.hideLobby();
    this.ui.showHUD();
    this.running = true;
    this._loop();
    this.ui.showToast('Welcome back to Neon Grandline, StaticQuasar931!', 'success');
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.loopHandle);
    this.world?.destroy();
    this.canvasHost.innerHTML = '';
    this.world = null;
  }

  _loop() {
    if (!this.running || !this.world) return;
    this.world.renderer.render((delta) => {
      this.world.update(delta);
    });
    this.loopHandle = requestAnimationFrame(() => this._loop());
  }

  _bindUI() {
    this.ui.bindActions(async (action) => {
      switch (action) {
        case 'start':
          await this.start();
          break;
        case 'mission':
          if (!this.world) {
            await this.start();
          }
          this.world?.missions?.nextMission(this.world.player);
          break;
        case 'settings':
          this._openSettingsModal();
          break;
        default:
          break;
      }
    });
  }

  _applySetting(setting, value) {
    if (setting === 'fidelity') {
      this.settings.fidelity = value;
    } else if (setting === 'density') {
      this.settings.density = value;
    } else if (setting === 'theme') {
      this.settings.theme = value;
    } else if (setting === 'comfort') {
      this.settings.comfort = value;
    }
    if (this.world) {
      this.world.applySettings(this.settings);
      this.ui.showToast(`Applied ${setting} → ${value}`, 'info');
    }
  }

  _openSettingsModal() {
    const applyProfile = (profile, label) => {
      Object.assign(this.settings, profile);
      if (this.world) {
        this.world.applySettings(this.settings);
      }
      this.ui.hideModal();
      this.ui.showToast(`${label} profile applied`, 'info');
    };

    this.ui.showModal({
      title: 'Display & Simulation Profiles',
      description: 'Choose how the city is rendered and how busy it feels.',
      options: [
        {
          label: 'Performance (Low Fidelity, Low Density)',
          action: () => applyProfile({ fidelity: 0.8, density: 0.7 }, 'Performance'),
        },
        {
          label: 'Balanced (Default)',
          action: () => applyProfile({ fidelity: 1, density: 1 }, 'Balanced'),
        },
        {
          label: 'Cinematic (High Fidelity, Dense Streets)',
          action: () => applyProfile({ fidelity: 1.3, density: 1.3 }, 'Cinematic'),
        },
      ],
    });
  }
}

export async function bootstrap() {
  const root = document.getElementById('app');
  const app = new App(root);
  window.gameApp = app;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    app.settings.comfort = 'steady';
  }
  return app;
}
