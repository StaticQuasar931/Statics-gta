import THREE from './three.js';

const COLOR_PALETTES = {
  buildings: ['#4b6cb7', '#182848', '#29323c', '#485563', '#0f2027', '#2c5364', '#1f1c2c'],
  vehicles: ['#ff4d4d', '#ffb347', '#4de0ff', '#9d4dff', '#2aff7b', '#ffd93d', '#ff758c'],
  characters: ['#f9844a', '#f9c74f', '#90be6d', '#577590', '#ff99c8', '#9b5de5'],
  weapons: ['#b8c1ec', '#232946', '#eebbc3', '#d4d8f0'],
  poi: ['#4df0ff', '#f94144', '#f3722c', '#90be6d', '#577590'],
  ui: ['#0d1320', '#17203b', '#24335b', '#38456a'],
};

function seededRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function rng() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return t / 0xffffffff;
  };
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const num = Number.parseInt(value, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function adjustBrightness(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  const apply = (channel) => Math.max(0, Math.min(255, Math.round(channel * factor)));
  return `rgb(${apply(r)}, ${apply(g)}, ${apply(b)})`;
}

function createCanvas(size) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(size, size);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }
  return null;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBuilding(ctx, size, rng) {
  const palette = COLOR_PALETTES.buildings;
  const base = palette[Math.floor(rng() * palette.length)];
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, adjustBrightness(base, 1.2));
  gradient.addColorStop(1, adjustBrightness(base, 0.7));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const floors = 16;
  const columns = 8;
  const windowWidth = size * 0.08;
  const windowHeight = size * 0.045;
  const offsetX = size * 0.08;
  const offsetY = size * 0.08;

  for (let y = 0; y < floors; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const brightness = 0.4 + rng() * 0.6;
      const windowColor = `rgba(255, 230, 180, ${brightness.toFixed(2)})`;
      const px = offsetX + x * (windowWidth * 1.6);
      const py = offsetY + y * (windowHeight * 1.8);
      ctx.fillStyle = windowColor;
      ctx.fillRect(px, py, windowWidth, windowHeight);
    }
  }

  ctx.fillStyle = adjustBrightness(base, 0.5);
  ctx.fillRect(0, size - size * 0.18, size, size * 0.18);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 6; i += 1) {
    const y = size * 0.18 + (size * 0.1 * i);
    ctx.fillRect(0, y, size, size * 0.008);
  }

  const neon = `rgba(${Math.floor(100 + rng() * 155)}, ${Math.floor(120 + rng() * 110)}, ${Math.floor(255)}, 0.85)`;
  ctx.fillStyle = neon;
  ctx.fillRect(size * 0.82, size * 0.12, size * 0.05, size * 0.76);
}

function drawVehicle(ctx, size, rng) {
  const palette = COLOR_PALETTES.vehicles;
  const body = palette[Math.floor(rng() * palette.length)];
  ctx.fillStyle = adjustBrightness(body, 0.9);
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = adjustBrightness(body, 1.3);
  ctx.fillRect(size * 0.1, size * 0.55, size * 0.8, size * 0.2);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(size * 0.18, size * 0.15, size * 0.64, size * 0.35);

  ctx.fillStyle = '#f4f1de';
  ctx.fillRect(size * 0.1, size * 0.3, size * 0.12, size * 0.12);
  ctx.fillRect(size * 0.78, size * 0.3, size * 0.12, size * 0.12);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  for (let i = 0; i < 5; i += 1) {
    const y = size * 0.1 + i * size * 0.12;
    ctx.fillRect(0, y, size, size * 0.015);
  }

  ctx.fillStyle = adjustBrightness(body, 0.5);
  ctx.fillRect(0, size * 0.8, size, size * 0.2);
}

function drawCharacter(ctx, size, rng) {
  const palette = COLOR_PALETTES.characters;
  const outfit = palette[Math.floor(rng() * palette.length)];
  ctx.fillStyle = '#1b1b2f';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = outfit;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(size * 0.3, size * 0.25, size * 0.4, size * 0.5, size * 0.08);
  } else {
    drawRoundedRect(ctx, size * 0.3, size * 0.25, size * 0.4, size * 0.5, size * 0.08);
  }
  ctx.fill();

  ctx.fillStyle = '#f6d186';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.22, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = adjustBrightness(outfit, 0.7);
  ctx.fillRect(size * 0.34, size * 0.55, size * 0.12, size * 0.25);
  ctx.fillRect(size * 0.54, size * 0.55, size * 0.12, size * 0.25);

  ctx.fillStyle = adjustBrightness(outfit, 1.2);
  ctx.fillRect(size * 0.45, size * 0.4, size * 0.1, size * 0.25);
}

function drawWeapon(ctx, size, rng) {
  const palette = COLOR_PALETTES.weapons;
  const base = palette[Math.floor(rng() * palette.length)];
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = adjustBrightness(base, 0.85);
  ctx.fillRect(size * 0.18, size * 0.4, size * 0.64, size * 0.2);
  ctx.fillRect(size * 0.58, size * 0.3, size * 0.22, size * 0.1);
  ctx.fillRect(size * 0.3, size * 0.6, size * 0.12, size * 0.2);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(size * 0.2, size * 0.43, size * 0.56, size * 0.04);
}

function drawPoi(ctx, size, rng) {
  ctx.fillStyle = '#05111c';
  ctx.fillRect(0, 0, size, size);
  const palette = COLOR_PALETTES.poi;
  const accent = palette[Math.floor(rng() * palette.length)];
  ctx.strokeStyle = accent;
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.35, size * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.9);
  ctx.lineTo(size * 0.3, size * 0.55);
  ctx.lineTo(size * 0.7, size * 0.55);
  ctx.closePath();
  ctx.fill();
}

function drawUi(ctx, size, rng) {
  const palette = COLOR_PALETTES.ui;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, size, size);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, palette[1]);
  gradient.addColorStop(1, palette[3]);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = `rgba(77, 240, 255, 0.65)`;
  ctx.lineWidth = size * 0.02;
  for (let i = 0; i < 3; i += 1) {
    const inset = size * 0.05 * (i + 1);
    ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
  }

  ctx.fillStyle = 'rgba(77, 240, 255, 0.2)';
  ctx.fillRect(size * 0.12, size * 0.72, size * 0.76, size * 0.12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(size * 0.12, size * 0.52, size * 0.54, size * 0.1);
}

function drawPlaceholder(data, width, height, color) {
  const [r, g, b] = hexToRgb(color);
  for (let i = 0; i < width * height; i += 1) {
    const idx = i * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
  }
}

export function createFallbackTexture(namespace, id) {
  const key = `${namespace}:${id}`;
  const rng = seededRng(key);
  const size = namespace === 'ui' ? 1024 : 512;
  const canvas = createCanvas(size);

  if (canvas) {
    const ctx = canvas.getContext('2d');
    switch (namespace) {
      case 'buildings':
        drawBuilding(ctx, size, rng);
        break;
      case 'vehicles':
        drawVehicle(ctx, size, rng);
        break;
      case 'characters':
        drawCharacter(ctx, size, rng);
        break;
      case 'weapons':
        drawWeapon(ctx, size, rng);
        break;
      case 'poi':
        drawPoi(ctx, size, rng);
        break;
      case 'ui':
        drawUi(ctx, size, rng);
        break;
      default:
        ctx.fillStyle = '#10131a';
        ctx.fillRect(0, 0, size, size);
        break;
    }
    const texture = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }

  const fallbackSize = 64;
  const data = new Uint8Array(fallbackSize * fallbackSize * 4);
  const palette = COLOR_PALETTES[namespace] ?? ['#10131a'];
  const color = palette[Math.floor(rng() * palette.length)];
  drawPlaceholder(data, fallbackSize, fallbackSize, color);
  const texture = new THREE.DataTexture(data, fallbackSize, fallbackSize, THREE.RGBAFormat);
  if ('colorSpace' in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}
