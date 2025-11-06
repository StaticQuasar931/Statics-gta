import THREE from './three.js';
import { createFallbackTexture } from './textureFactory.js';

const ROOT = 'assets/images';

const TEXTURE_MANIFEST = {
  buildings: {
    folder: 'buildings',
    items: Array.from({ length: 10 }, (_, index) => ({
      id: `building-${String(index + 1).padStart(2, '0')}`,
    })),
  },
  vehicles: {
    folder: 'vehicles',
    items: [
      { id: 'sedan' },
      { id: 'sports-car' },
      { id: 'muscle-car' },
      { id: 'truck' },
      { id: 'motorcycle' },
      { id: 'police-cruiser' },
      { id: 'swat-van' },
      { id: 'helicopter' },
      { id: 'boat' },
    ],
  },
  characters: {
    folder: 'characters',
    items: [
      { id: 'protagonist-male' },
      { id: 'protagonist-female' },
      { id: 'npc-civilian' },
      { id: 'npc-cop' },
      { id: 'npc-gang' },
    ],
  },
  weapons: {
    folder: 'weapons',
    items: [
      { id: 'pistol' },
      { id: 'smg' },
      { id: 'rifle' },
      { id: 'shotgun' },
      { id: 'sniper' },
      { id: 'grenade' },
    ],
  },
  poi: {
    folder: 'poi',
    items: [
      { id: 'poi-safehouse' },
      { id: 'poi-garage' },
      { id: 'poi-shop-bank' },
      { id: 'poi-shop-cars' },
      { id: 'poi-shop-clothing' },
      { id: 'poi-shop-gas' },
      { id: 'poi-shop-generic' },
      { id: 'poi-shop-weapons' },
    ],
  },
  ui: {
    folder: 'ui',
    items: [
      { id: 'hud-layout' },
      { id: 'city-map' },
      { id: 'vehicle-concepts' },
      { id: 'weapon-concepts' },
      { id: 'police-units' },
    ],
  },
  police: {
    folder: 'police',
    items: [{ id: 'riot-officer' }],
    optional: true,
  },
};

function resolveEntries() {
  const entries = [];
  Object.entries(TEXTURE_MANIFEST).forEach(([namespace, config]) => {
    const { folder, items, optional = false } = config;
    items.forEach((item) => {
      const descriptor = typeof item === 'string' ? { id: item } : item;
      const extension = descriptor.extension ?? 'svg';
      const subFolder = descriptor.folder ?? folder ?? namespace;
      const path = subFolder ? `${ROOT}/${subFolder}/${descriptor.id}.${extension}` : `${ROOT}/${descriptor.id}.${extension}`;
      entries.push({
        namespace,
        id: descriptor.id,
        key: `${namespace}/${descriptor.id}`,
        url: path,
        optional: descriptor.optional ?? optional,
      });
    });
  });
  return entries;
}

export class AssetLoader {
  constructor() {
    this.textures = new Map();
    this.loading = null;
  }

  async loadAll() {
    if (this.loading) return this.loading;
    const loader = new THREE.TextureLoader();
    const entries = resolveEntries();
    const promises = entries.map((entry) =>
      new Promise((resolve) => {
        loader.load(
          entry.url,
          (texture) => {
            if ('colorSpace' in texture) {
              texture.colorSpace = THREE.SRGBColorSpace;
            }
            texture.encoding = THREE.sRGBEncoding;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = 8;
            this.textures.set(entry.key, texture);
            resolve({ entry, texture, fallback: false });
          },
          undefined,
          (error) => {
            if (!entry.optional) {
              console.warn(`Texture load failed for ${entry.url}`, error);
            }
            const fallback = createFallbackTexture(entry.namespace, entry.id);
            this.textures.set(entry.key, fallback);
            resolve({ entry, texture: fallback, fallback: true, error });
          },
        );
      }),
    );

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
