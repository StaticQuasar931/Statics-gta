const LOAD_TIMEOUT = 12000;

export class AssetLibrary {
  constructor(manifest = {}) {
    this.manifest = manifest;
    this.images = new Map();
  }

  async load(onProgress = () => {}) {
    const entries = Object.entries(this.manifest);
    let loaded = 0;
    const increment = () => {
      loaded += 1;
      onProgress(loaded / entries.length);
    };

    await Promise.all(
      entries.map(([key, url]) => this._loadImage(key, url).then(increment))
    );
  }

  async _loadImage(key, url) {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    const source = `${url}?v=${Date.now().toString(36)}`;

    const loadPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout loading ${source}`)), LOAD_TIMEOUT);
      image.onload = () => {
        clearTimeout(timer);
        resolve(image);
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(new Error(`Failed loading ${source}`));
      };
    });

    image.src = source;

    try {
      await loadPromise;
      this.images.set(key, image);
    } catch (error) {
      console.warn(error.message);
      const fallback = this._fallbackTexture(key);
      this.images.set(key, fallback);
    }
  }

  get(name) {
    return this.images.get(name);
  }

  _fallbackTexture(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 96, 96);
    gradient.addColorStop(0, '#1d2b64');
    gradient.addColorStop(1, '#f8cdda');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 96, 96);
    ctx.fillStyle = '#0b1020aa';
    ctx.fillRect(8, 8, 80, 80);
    ctx.fillStyle = '#f0f6ff';
    ctx.font = 'bold 18px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 6).toUpperCase(), 48, 48);
    return canvas;
  }
}
