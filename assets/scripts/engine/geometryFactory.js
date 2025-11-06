import THREE from './three.js';

function seededRandom(seed = Math.random()) {
  let value = Math.abs(Math.floor(seed * 1_000_000)) || 1;
  return () => {
    value = (value * 48271) % 0x7fffffff;
    return value / 0x7fffffff;
  };
}

function enableShadows(object, { cast = true, receive = true } = {}) {
  object.traverse?.((child) => {
    if ('castShadow' in child) child.castShadow = cast;
    if ('receiveShadow' in child) child.receiveShadow = receive;
  });
  if ('castShadow' in object) object.castShadow = cast;
  if ('receiveShadow' in object) object.receiveShadow = receive;
}

export function createBuildingMesh({ width, depth, height, texture, themeColor = '#4df0ff', seed = Math.random() }) {
  const rng = seededRandom(seed);
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: texture,
    metalness: 0.35,
    roughness: 0.65,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMaterial);
  body.position.y = height / 2;
  group.add(body);

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: '#11141f',
    metalness: 0.7,
    roughness: 0.35,
    emissive: '#1b2338',
  });
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.32, width * 0.42, width * 0.12, 12), roofMaterial);
  roof.position.y = height + width * 0.06;
  group.add(roof);

  const signageMaterial = new THREE.MeshStandardMaterial({
    color: themeColor,
    emissive: themeColor,
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.9,
  });
  const signage = new THREE.Mesh(new THREE.PlaneGeometry(height * 0.5, width * 0.12), signageMaterial);
  signage.position.set(width * 0.52, height * 0.55, 0);
  signage.rotation.y = Math.PI / 2;
  group.add(signage);

  const ledCount = 6 + Math.floor(rng() * 6);
  for (let i = 0; i < ledCount; i += 1) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.02, width * 0.02, depth * 0.9),
      new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#99ccff', emissiveIntensity: 0.4 }),
    );
    light.position.set(-width / 2 + width * 0.05 + i * width * 0.08, height * (0.1 + rng() * 0.75), depth * 0.48);
    group.add(light);
  }

  enableShadows(group);
  return group;
}

export function createVehicleMesh({ type, texture, themeColor = '#4df0ff', seed = Math.random() }) {
  const rng = seededRandom(seed);
  const group = new THREE.Group();

  const length = 12;
  const width = type === 'motorcycle' ? 2.8 : 5.6;
  const height = type === 'truck' ? 3.6 : 2.6;
  const wheelRadius = Math.max(0.45, height * 0.32);
  const wheelThickness = Math.max(0.4, width * 0.35);

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.7 + rng() * 0.25, 0.7 + rng() * 0.25, 0.7 + rng() * 0.25),
    map: texture,
    metalness: 0.9,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.6, length), bodyMaterial);
  body.position.y = wheelRadius + (height * 0.6) / 2;
  group.add(body);

  const cabinMaterial = new THREE.MeshPhysicalMaterial({
    color: '#1c2235',
    metalness: 0.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.5, length * 0.55), cabinMaterial);
  cabin.position.set(0, wheelRadius + height * 0.8, -length * 0.1);
  group.add(cabin);

  const accentMaterial = new THREE.MeshStandardMaterial({ color: themeColor, emissive: themeColor, emissiveIntensity: 0.4 });
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, height * 0.08, length * 0.12), accentMaterial);
  spoiler.position.set(0, wheelRadius + height * 0.85, length * 0.38);
  group.add(spoiler);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.6, metalness: 0.1 });
  const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 20);
  wheelGeometry.rotateZ(Math.PI / 2);
  const wheelPositions = [
    [-width * 0.45, wheelRadius, length * 0.45],
    [width * 0.45, wheelRadius, length * 0.45],
    [-width * 0.45, wheelRadius, -length * 0.45],
    [width * 0.45, wheelRadius, -length * 0.45],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.5 });
  const headlightGeometry = new THREE.BoxGeometry(width * 0.18, height * 0.12, length * 0.02);
  const headlightLeft = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightLeft.position.set(-width * 0.25, wheelRadius + height * 0.32, -length / 2);
  const headlightRight = headlightLeft.clone();
  headlightRight.position.x = width * 0.25;
  group.add(headlightLeft, headlightRight);

  group.position.y = 0;
  enableShadows(group);
  return group;
}

export function createCharacterMesh({ texture, accentColor = '#4df0ff', scale = 1 }) {
  const group = new THREE.Group();
  const height = 2.1 * scale;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.15,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6 * scale, 1.6 * scale, 12, 18), bodyMaterial);
  body.position.y = height;
  group.add(body);

  const visorMaterial = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.45, transparent: true, opacity: 0.7 });
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.5 * scale, 16, 16, 0, Math.PI), visorMaterial);
  visor.position.set(0, height + 0.6 * scale, 0.35 * scale);
  group.add(visor);

  const baseMaterial = new THREE.MeshStandardMaterial({ color: '#131621', metalness: 0.4, roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * scale, 0.9 * scale, 0.3 * scale, 18), baseMaterial);
  base.position.y = 0.15 * scale;
  group.add(base);

  enableShadows(group);
  return group;
}

export function createStreetLight({ height = 10, color = '#4df0ff', seed = Math.random() }) {
  const group = new THREE.Group();
  const poleMaterial = new THREE.MeshStandardMaterial({ color: '#1b2233', metalness: 0.6, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, height, 10), poleMaterial);
  pole.position.y = height / 2;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2.5), poleMaterial);
  arm.position.set(0, height - 0.8, 1.2);
  group.add(arm);

  const lampMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.6, 12), lampMaterial);
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, height - 0.8, 2.2);
  group.add(lamp);

  enableShadows(group, { cast: false, receive: false });
  return group;
}
