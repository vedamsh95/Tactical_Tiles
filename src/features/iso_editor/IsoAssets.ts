// Organized V2 Assets structure
export const ISO_CATEGORIES = ['Nature', 'Structure', 'Infrastructure'] as const;

export type IsoCategory = typeof ISO_CATEGORIES[number];

export interface IsoAssetDef {
    id: string;
    name: string;
    type: 'GROUND' | 'OBJECT';
    category: IsoCategory;
    src: string; // Path to asset in public/ folder
    color: number; // Fallback color
    height?: number; // Visual height for objects
    baseWidth?: number; // For scaling logic (normalization)
}

export const ISO_ASSETS: Record<string, IsoAssetDef> = {
    // --- NATURE ---
    'PLAINS': { id: 'PLAINS', name: 'Grass/Plains', type: 'GROUND', category: 'Nature', src: 'assets/terrain/plains.png', color: 0x8BC34A },
    'FOREST': { id: 'FOREST', name: 'Forest', type: 'OBJECT', category: 'Nature', src: 'assets/terrain/forest.png', color: 0x388E3C, height: 40 }, 
    'MOUNTAIN': { id: 'MOUNTAIN', name: 'Mountain', type: 'OBJECT', category: 'Nature', src: 'assets/terrain/mountain.png', color: 0x795548, height: 50 },
    'WATER': { id: 'WATER', name: 'Water', type: 'GROUND', category: 'Nature', src: 'assets/terrain/water.png', color: 0x2196F3 },
    'SAND': { id: 'SAND', name: 'Sand', type: 'GROUND', category: 'Nature', src: 'assets/terrain/sand.png', color: 0xFFC107 },
    'DUNES': { id: 'DUNES', name: 'Dunes', type: 'GROUND', category: 'Nature', src: 'assets/terrain/dunes.png', color: 0xFFB300 },
    'QUICKSAND': { id: 'QUICKSAND', name: 'Quicksand', type: 'GROUND', category: 'Nature', src: 'assets/terrain/quicksand.png', color: 0x795548 },
    'CANYON': { id: 'CANYON', name: 'Canyon', type: 'GROUND', category: 'Nature', src: 'assets/terrain/canyon.png', color: 0x5D4037 },

    // --- STRUCTURE ---
    'BUILDING': { id: 'BUILDING', name: 'Generic Building', type: 'OBJECT', category: 'Structure', src: 'assets/terrain/building.png', color: 0x607D8B, height: 40 },
    'BASE': { id: 'BASE', name: 'Military Base', type: 'OBJECT', category: 'Structure', src: 'assets/terrain/base.png', color: 0x455A64, height: 30 },
    'BANK': { id: 'BANK', name: 'River Bank', type: 'OBJECT', category: 'Structure', src: 'assets/terrain/bank.png', color: 0x8D6E63, height: 20 },
    'BANK_EMPTY': { id: 'BANK_EMPTY', name: 'Empty Bank', type: 'OBJECT', category: 'Structure', src: 'assets/terrain/bank_empty.png', color: 0xA1887F, height: 20 },
    'BARRIER': { id: 'BARRIER', name: 'Barrier/Wall', type: 'OBJECT', category: 'Structure', src: 'assets/terrain/barrier.png', color: 0x9E9E9E, height: 25 },

    // --- INFRASTRUCTURE ---
    'ROAD_V': { id: 'ROAD_V', name: 'Road (Vertical)', type: 'GROUND', category: 'Infrastructure', src: 'assets/terrain/road.png', color: 0x9E9E9E },
    'ROAD_H': { id: 'ROAD_H', name: 'Road (Horizontal)', type: 'GROUND', category: 'Infrastructure', src: 'assets/terrain/road_h.png', color: 0x9E9E9E },
    'BRIDGE_H': { id: 'BRIDGE_H', name: 'Bridge (Horizontal)', type: 'OBJECT', category: 'Infrastructure', src: 'assets/terrain/bridge.png', color: 0x795548, height: 10 },
    'BRIDGE_V': { id: 'BRIDGE_V', name: 'Bridge (Vertical)', type: 'OBJECT', category: 'Infrastructure', src: 'assets/terrain/bridge_v.png', color: 0x795548, height: 10 },
};

export const getAssetsByCategory = (category: IsoCategory) => {
    return Object.values(ISO_ASSETS).filter(asset => asset.category === category);
};
