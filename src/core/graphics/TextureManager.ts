
import * as PIXI from 'pixi.js';
import { Assets } from 'pixi.js';
import { SPRITES } from '../assets/SpriteAssets';

export const TextureManager = {
  get: (key: string): PIXI.Texture => {
    if (!key) return PIXI.Texture.WHITE;

    // 1. Try to get straight from Pixi's Assets cache
    if (Assets.cache.has(key)) {
        return Assets.get(key);
    }
    
    // 2. Legacy/Data URI Cache Check (Backward Compatibility)
    // We maintain a local cache for the old system until migration is done
    const legacyKey = key.toUpperCase(); 
    // @ts-ignore
    if (window.LegacyTextureCache && window.LegacyTextureCache[legacyKey]) {
        // @ts-ignore
        return window.LegacyTextureCache[legacyKey];
    }
    
    // 3. Fallback: If still not found, try to force-load from legacy if available or return white
    // This handles cases where validTexture might be requested before asynchronous Assets.get finishes (though that should be synchronous if cached)
    
    // console.warn(`⚠️ MISSING TEXTURE: "${key}". Returning placeholder.`);
    return PIXI.Texture.WHITE;
  },

  preloadTextures: async () => {
      // Legacy preload that puts textures into a global cache
      console.log("Using Legacy Preloader alongside AssetLoader...");
      // @ts-ignore
      window.LegacyTextureCache = window.LegacyTextureCache || {};
      
      const loadLegacy = (k: string, src: string) => {
         // @ts-ignore
         window.LegacyTextureCache[k] = PIXI.Texture.from(src);
      }

      if (SPRITES.TERRAIN) Object.entries(SPRITES.TERRAIN).forEach(([k, s]) => loadLegacy(`TERRAIN_${k}`, s));
      if (SPRITES.UNITS) Object.entries(SPRITES.UNITS).forEach(([k, s]) => loadLegacy(`UNIT_${k}`, s));
  }
};

export const getTexture = TextureManager.get;
export const preloadTextures = TextureManager.preloadTextures;

