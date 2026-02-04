// src/hooks/useAssetLoader.ts
import { useState, useEffect } from 'react';
import { Assets } from 'pixi.js';
import { ASSET_MANIFEST } from '../core/graphics/AssetManifest';

export const useAssetLoader = () => {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadGameAssets = async () => {
      try {
        console.log("[AssetLoader] Initializing...");
        
        // 1. Initialize the manifest
        await Assets.init({ manifest: ASSET_MANIFEST });

        // 2. Load the bundle in the background
        const bundle = await Assets.loadBundle('game-screen', (progressRatio) => {
           if(mounted) setProgress(progressRatio);
        });

        console.log("[AssetLoader] Assets Loaded:", Object.keys(bundle).length);

        if(mounted) setIsLoaded(true);
      } catch (err) {
        console.error("[AssetLoader] Failed to load assets:", err);
      }
    };

    loadGameAssets();
    
    return () => { mounted = false; }
  }, []);

  return { isLoaded, progress };
};
