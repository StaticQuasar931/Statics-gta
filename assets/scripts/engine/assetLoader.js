import THREE from './three.js';

const TEXTURE_MANIFEST = {
  buildings: Array.from({ length: 10 }).map((_, index) => `building-0${index + 1}`),
  vehicles: [
    'sedan',
    'sports-car',
    'muscle-car',
    'truck',
    'motorcycle',
    'police-cruiser',
    'swat-van',
    'helicopter',
    'boat',
  ],
  characters: [
    'protagonist-male',
    'protagonist-female',
    'npc-civilian',
    'npc-cop',
    'npc-gang',
  ],
  weapons: ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'grenade'],
  poi: [
    'poi-safehouse',
    'poi-garage',
    'poi-shop-bank',
    'poi-shop-cars',
    'poi-shop-clothing',
    'poi-shop-gas',
    'poi-shop-generic',
    'poi-shop-weapons',
  ],
  ui: ['hud-layout', 'city-map', 'vehicle-concepts', 'weapon-concepts', 'police-units'],
};

const ROOT = 'assets/images';
const FOLDER_LOOKUP = {
  buildings: 'buildings',
  vehicles: 'vehicles',
  characters: 'characters',
  weapons: 'weapons',
  poi: 'poi',
  ui: 'ui',
};

function buildPath(namespace, id) {
  const folder = FOLDER_LOOKUP[namespace] ?? namespace;
  return `${ROOT}/${folder}/${id}.svg`;
}

export class AssetLoader {
  constructor() {
    this.textures = new Map();
    this.loading = null;
  }

  async loadAll() {
    if (this.loading) return this.loading;
    const loader = new THREE.TextureLoader();
    const promises = [];
    Object.entries(TEXTURE_MANIFEST).forEach(([namespace, ids]) => {
      ids.forEach((id) => {
        const key = `${namespace}/${id}`;
        const url = buildPath(namespace, id);
        const promise = new Promise((resolve, reject) => {
          loader.load(
            url,
            (texture) => {
              texture.encoding = THREE.sRGBEncoding;
              texture.wrapS = THREE.RepeatWrapping;
              texture.wrapT = THREE.RepeatWrapping;
              this.textures.set(key, texture);
              resolve({ key, texture });
            },
            undefined,
            reject,
          );
        });
        promises.push(promise);
      });
    });

    this.loading = Promise.all(promises);
    return this.loading;
  }

  getTexture(namespace, id) {
    const key = `${namespace}/${id}`;
    return this.textures.get(key);
  }

  getSet(namespace) {
    const prefix = `${namespace}/`;
    return Array.from(this.textures.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, texture]) => ({ key: key.replace(prefix, ''), texture }));
  }
}

export const assetLoader = new AssetLoader();
