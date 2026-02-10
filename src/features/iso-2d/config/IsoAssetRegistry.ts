export const ISO_V2_BASE_PATH = '/assets_v2/terrain';
export const ISO_V2_UNITS_PATH = '/assets_v2/units';

export type IsoDirection = 'NE' | 'NW' | 'SE' | 'SW';

export const DIRECTIONS: IsoDirection[] = ['NE', 'NW', 'SE', 'SW'];

// Map internal TerrainType to Folder Name
export const TERRAIN_FOLDER_MAP: Record<string, string> = {
    PLAINS: 'plains',
    FOREST: 'plains', // Fallback as we lack forest assets in V2, logic will overlay or tint
    MOUNTAIN: 'mountain',
    WATER: 'river',
    BASE: 'base',
    ROAD: 'road',
    ROAD_H: 'road', // Logic handles orientation
    BRIDGE: 'bridge',
    BRIDGE_V: 'bridge',
    BANK: 'bank',
    BUILDING: 'bank', // Fallback or use specific logic
    BARRIER: 'mountain', // Fallback
    SAND: 'plains',       // Fallback
    DUNES: 'plains',      // Fallback
    QUICKSAND: 'river',   // Fallback
    CANYON: 'river',      // Fallback
};

export const ISO_TILE_WIDTH = 64; 
export const ISO_TILE_HEIGHT = 32;
