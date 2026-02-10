// src/features/vision3d/config/AssetRegistry.ts

export const ASSET_LIBRARY = {
    // Trees
    TREE_SIMPLE: { url: '/models/tree_simple.glb', scale: 1.0 },
    TREE_PALM: { url: '/models/tree_palm.glb', scale: 1.0 },
    TREE_PALM_BEND: { url: '/models/tree_palmBend.glb', scale: 1.0 },
    TREE_AUTUMN: { url: '/models/tree_plateau_fall.glb', scale: 1.0 },

    // Buildings
    BUILDING_BANK: { url: '/models/bank.glb', scale: 1.0 },
    BUILDING_BASE: { url: '/models/base.glb', scale: 1.0 },
    SKYSCRAPER_A: { url: '/models/building-skyscraper-a.glb', scale: 1.0 },
    SKYSCRAPER_B: { url: '/models/building-skyscraper-b.glb', scale: 1.0 },

    // Terrain / Roads
    MOUNTAIN_A: { url: '/models/mountain.glb', scale: 1.0 },
    MOUNTAIN_B: { url: '/models/mountain2.glb', scale: 1.0 },
    PLAINS: { url: '/models/plains.glb', scale: 1.0 },
    BRIDGE: { url: '/models/bridge_wood.glb', scale: 1.0 },
    RIVER: { url: '/models/ground_riverOpen.glb', scale: 1.0 },
    ROAD_1: { url: '/models/roadTile_001.gltf', scale: 1.0 },
    ROAD_2: { url: '/models/roadTile_002.gltf', scale: 1.0 },
    ROAD_3: { url: '/models/roadTile_003.gltf', scale: 1.0 },
} as const;
  
export type AssetId = keyof typeof ASSET_LIBRARY;
