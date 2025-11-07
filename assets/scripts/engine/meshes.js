export function createBoxMesh({ width = 1, height = 1, depth = 1, colors = {} } = {}) {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  const vertices = [
    { x: -hw, y: -hh, z: -hd },
    { x: hw, y: -hh, z: -hd },
    { x: hw, y: hh, z: -hd },
    { x: -hw, y: hh, z: -hd },
    { x: -hw, y: -hh, z: hd },
    { x: hw, y: -hh, z: hd },
    { x: hw, y: hh, z: hd },
    { x: -hw, y: hh, z: hd },
  ];

  const faceColor = (key, fallback) => colors[key] ?? fallback;

  const faces = [
    { indices: [0, 1, 2, 3], color: faceColor('back', '#1f2231') },
    { indices: [4, 5, 6, 7], color: faceColor('front', '#252a3c') },
    { indices: [0, 4, 7, 3], color: faceColor('left', '#1c1f2b') },
    { indices: [1, 5, 6, 2], color: faceColor('right', '#1a1c27') },
    { indices: [3, 2, 6, 7], color: faceColor('top', '#2f3d5b') },
    { indices: [0, 1, 5, 4], color: faceColor('bottom', '#141723') },
  ];

  return { vertices, faces };
}

export function createPrismMesh({ radius = 1, height = 1, sides = 6, colors = {} } = {}) {
  const vertices = [];
  const faces = [];
  const top = [];
  const bottom = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push({ x, y: height / 2, z });
    vertices.push({ x, y: -height / 2, z });
    top.push(i * 2);
    bottom.push(i * 2 + 1);
  }

  for (let i = 0; i < sides; i += 1) {
    const next = (i + 1) % sides;
    faces.push({
      indices: [i * 2 + 1, next * 2 + 1, next * 2, i * 2],
      color: colors.side ?? '#2c3142',
    });
  }

  faces.push({ indices: [...top].reverse(), color: colors.top ?? '#404d6d' });
  faces.push({ indices: bottom, color: colors.bottom ?? '#121620' });

  return { vertices, faces };
}

export function extrudePolygon(points, { height = 1, colors = {} } = {}) {
  const vertices = [];
  const faces = [];
  const top = [];
  const bottom = [];

  points.forEach(([x, z], index) => {
    vertices.push({ x, y: height / 2, z });
    vertices.push({ x, y: -height / 2, z });
    top.push(index * 2);
    bottom.push(index * 2 + 1);
  });

  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length;
    faces.push({
      indices: [i * 2 + 1, next * 2 + 1, next * 2, i * 2],
      color: colors.side ?? '#1e2436',
    });
  }

  faces.push({ indices: [...top].reverse(), color: colors.top ?? '#303c56' });
  faces.push({ indices: bottom, color: colors.bottom ?? '#0f121d' });

  return { vertices, faces };
}
