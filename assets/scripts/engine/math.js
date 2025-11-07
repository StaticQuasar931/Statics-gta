export function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function addVec3(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subVec3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVec3(v, scalar) {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function dotVec3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossVec3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function lengthVec3(v) {
  return Math.hypot(v.x, v.y, v.z);
}

export function normalizeVec3(v) {
  const len = lengthVec3(v) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function rotateVec3(v, rotation) {
  const sinX = Math.sin(rotation.x);
  const cosX = Math.cos(rotation.x);
  const sinY = Math.sin(rotation.y);
  const cosY = Math.cos(rotation.y);
  const sinZ = Math.sin(rotation.z);
  const cosZ = Math.cos(rotation.z);

  // Rotate around Y
  let x = v.x * cosY - v.z * sinY;
  let z = v.x * sinY + v.z * cosY;
  let y = v.y;

  // Rotate around X
  let y2 = y * cosX - z * sinX;
  let z2 = y * sinX + z * cosX;
  let x2 = x;

  // Rotate around Z
  let x3 = x2 * cosZ - y2 * sinZ;
  let y3 = x2 * sinZ + y2 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function colorToRgb(color) {
  const hex = color.replace('#', '');
  const value = Number.parseInt(hex, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function rgbToStyle({ r, g, b }, alpha = 1) {
  return `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${alpha})`;
}

export function shadeColor(color, factor) {
  const rgb = colorToRgb(color);
  return rgbToStyle({
    r: Math.max(0, Math.min(255, rgb.r * factor)),
    g: Math.max(0, Math.min(255, rgb.g * factor)),
    b: Math.max(0, Math.min(255, rgb.b * factor)),
  });
}

export function mixColors(colorA, colorB, t) {
  const a = colorToRgb(colorA);
  const b = colorToRgb(colorB);
  return rgbToStyle({
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  });
}
