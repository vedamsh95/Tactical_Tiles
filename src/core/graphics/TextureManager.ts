
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
      
      const loadLegacy = (k: string, src: string | PIXI.Texture) => {
         // @ts-ignore
         window.LegacyTextureCache[k] = typeof src === 'string' ? PIXI.Texture.from(src) : src;
      }

      if (SPRITES.TERRAIN) Object.entries(SPRITES.TERRAIN).forEach(([k, s]) => loadLegacy(`TERRAIN_${k}`, s));
      if (SPRITES.UNITS) Object.entries(SPRITES.UNITS).forEach(([k, s]) => loadLegacy(`UNIT_${k}`, s));

      // --- GENERATED PARTICLE ASSETS ---
      
      const createTextureFromCanvas = (drawFn: (ctx: CanvasRenderingContext2D) => void, w: number, h: number) => {
           const c = document.createElement('canvas');
           c.width = w;
           c.height = h;
           const ctx = c.getContext('2d');
           if (ctx) {
               drawFn(ctx);
               return PIXI.Texture.from(c);
           }
           return PIXI.Texture.WHITE;
      };

      // 1. PARTICLE_RAIN: 2x10px white rectangle
      const rainTex = createTextureFromCanvas((ctx) => {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 2, 10);
      }, 2, 10);
      loadLegacy('PARTICLE_RAIN', rainTex);
      if (!Assets.cache.has('PARTICLE_RAIN')) Assets.cache.set('PARTICLE_RAIN', rainTex);

      // 2. PARTICLE_DUST: 4px white circle
      const dustTex = createTextureFromCanvas((ctx) => {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(2, 2, 2, 0, Math.PI * 2);
          ctx.fill();
      }, 4, 4);
      loadLegacy('PARTICLE_DUST', dustTex);
      if (!Assets.cache.has('PARTICLE_DUST')) Assets.cache.set('PARTICLE_DUST', dustTex);

      // 3. NOISE_MAP: Perlin/Random noise for displacement
      const noiseTex = createTextureFromCanvas((ctx) => {
          const idata = ctx.createImageData(512, 512);
          const buffer = new Uint32Array(idata.data.buffer);
          for(let i=0; i<buffer.length; i++) {
               const v = Math.random() * 255;
               buffer[i] = (255 << 24) | (v << 16) | (v << 8) | v;
          }
          ctx.putImageData(idata, 0, 0);
      }, 512, 512);
      loadLegacy('NOISE_MAP', noiseTex);
      if (!Assets.cache.has('NOISE_MAP')) Assets.cache.set('NOISE_MAP', noiseTex);

      // --- CRITICAL FALLBACKS ---
      try {
        // Generate a tiny white rectangle for rain explicitly primarily for fallback
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 4, 16);
        }
        const tex = PIXI.Texture.from(canvas);
        if (!Assets.cache.has('PARTICLE_RAIN')) Assets.cache.set('PARTICLE_RAIN', tex);
        loadLegacy('PARTICLE_RAIN_FALLBACK', tex); 
        console.log("Generated Fallback Rain Texture");
      } catch (e) {
        console.error("Failed to generate rain texture", e);
      }
  }
};


export const getTexture = TextureManager.get;
export const preloadTextures = TextureManager.preloadTextures;

