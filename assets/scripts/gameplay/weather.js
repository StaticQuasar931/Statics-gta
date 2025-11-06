import { WEATHER_PRESETS } from './constants.js';
import { randomChoice } from '../util/random.js';

export class WeatherSystem {
  constructor(renderer, ui) {
    this.renderer = renderer;
    this.ui = ui;
    this.current = 'clear';
    this.timer = 0;
    this.duration = 120;
  }

  update(delta) {
    this.timer += delta;
    if (this.timer >= this.duration) {
      this.timer = 0;
      this.duration = 90 + Math.random() * 120;
      this.setPreset(randomChoice(Object.keys(WEATHER_PRESETS)));
    }
  }

  setPreset(name) {
    this.current = name;
    const preset = WEATHER_PRESETS[name];
    if (!preset) return;
    this.renderer.skyLight.intensity = preset.sunIntensity;
    this.renderer.setFog({ color: preset.skyColor, density: preset.fogDensity });
    this.renderer.setBackgroundColor(preset.skyColor);
    this.ui.updateWeather(name);
  }
}
