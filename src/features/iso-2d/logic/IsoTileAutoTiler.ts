import { Tile, TerrainType } from '../../../core/types';
import { ISO_V2_BASE_PATH, TERRAIN_FOLDER_MAP, IsoDirection } from '../config/IsoAssetRegistry';

// Helper to check neighbor type
const getNeighbor = (map: Tile[], x: number, y: number): Tile | undefined => {
    return map.find(t => t.x === x && t.y === y);
};

const isSameType = (center: Tile, check: Tile | undefined, typeGroup: TerrainType[]): boolean => {
    if (!check) return false;
    // Roads connect to roads, bridges
    if (typeGroup.includes('ROAD') || typeGroup.includes('ROAD_H')) {
        return ['ROAD', 'ROAD_H', 'BRIDGE', 'BRIDGE_V', 'BASE'].includes(check.type);
    }
    // Water connects to Water, Bridge
    if (typeGroup.includes('WATER')) {
        return ['WATER', 'BRIDGE', 'BRIDGE_V'].includes(check.type);
    }
    // Bridges connect to Roads
    if (typeGroup.includes('BRIDGE')) {
        return ['ROAD', 'ROAD_H', 'BRIDGE', 'BRIDGE_V'].includes(check.type);
    }
    return check.type === center.type;
};

export const getIsoTileSprite = (tile: Tile, allTiles: Tile[]): string => {
    // 0. Manual Asset Override (from Map Editor)
    if (tile.v2Asset) {
        return `${ISO_V2_BASE_PATH}/${tile.v2Asset}.png`;
    }

    const folder = TERRAIN_FOLDER_MAP[tile.type] || 'plains';
    const basePath = `${ISO_V2_BASE_PATH}/${folder}`;

    // 1. SIMPLE BLOCKS (No connectivity logic yet or simple rotation)
    // Mountain, Base, Plains usually assume a random or fixed rotation if not adaptive
    // For now, we fix them to 'SE' or random.
    const defaultDir: IsoDirection = 'SE';
    const variant = (tile.x + tile.y) % 2 === 0 ? 'SE' : 'NW'; // Simple variation

    switch (tile.type) {
        case 'PLAINS':
        case 'FOREST':
        case 'SAND':
        case 'DUNES':
            // public/assets_v2/terrain/plains/ground_grass_SE.png
            return `${basePath}/ground_grass_${variant}.png`;
        
        case 'MOUNTAIN':
        case 'BARRIER':
            // public/assets_v2/terrain/mountain/rock_tallA_SE.png
            return `${basePath}/rock_tallA_${variant}.png`;

        case 'BASE':
            // public/assets_v2/terrain/base/tent_detailedOpen_SE.png
            // Base tents opening direction. Let's make it face center or SE.
            return `${basePath}/tent_detailedOpen_SE.png`;

        case 'BANK':
        case 'BUILDING':
             // public/assets_v2/terrain/bank/bank.png (No direction suffix in list?)
             // Checked list: bank.png, bank_empty.png
             // If bank is captured or empty:
             if (tile.owner !== undefined && tile.owner !== null) return `${basePath}/bank.png`;
             return `${basePath}/bank.png`; // or bank_empty

        case 'BRIDGE':
        case 'BRIDGE_V':
             // Bridge usually follows orientation.
             // BRIDGE (Horizontal) -> X-Axis?
             // BRIDGE_V (Vertical) -> Y-Axis?
             // In Iso:
             // X-Axis road is SE-NW. (Straight_SE)
             // Y-Axis road is SW-NE. (Straight_SW)
             // Check assets: bridge_wood_NE, NW, SE, SW.
             // If BRIDGE_V (Vertical, usually N-S in 2D grid), this connects Y neighbors.
             // Y neighbors are NE and SW direction.
             // So use bridge_wood_SW (or NE).
             if (tile.type === 'BRIDGE_V') return `${basePath}/bridge_wood_SW.png`;
             return `${basePath}/bridge_wood_SE.png`;
    }

    // 2. CONNECTIVITY LOGIC (Roads, River)
    if (['ROAD', 'ROAD_H', 'WATER', 'QUICKSAND', 'CANYON'].includes(tile.type)) {
        // Neighbors
        // X+1 (SE), X-1 (NW), Y+1 (SW), Y-1 (NE) in Iso Visuals
        const nNE = getNeighbor(allTiles, tile.x, tile.y - 1);
        const nSW = getNeighbor(allTiles, tile.x, tile.y + 1);
        const nNW = getNeighbor(allTiles, tile.x - 1, tile.y);
        const nSE = getNeighbor(allTiles, tile.x + 1, tile.y);

        const group = tile.type === 'WATER' ? ['WATER'] : ['ROAD', 'ROAD_H'];
        const hasNE = isSameType(tile, nNE, group);
        const hasSW = isSameType(tile, nSW, group);
        const hasNW = isSameType(tile, nNW, group);
        const hasSE = isSameType(tile, nSE, group);

        // Determine Prefix
        // Road: ground_path...
        // River: ground_river...
        const prefix = tile.type === 'WATER' ? 'ground_river' : 'ground_path';

        // Count connections
        const count = [hasNE, hasSW, hasNW, hasSE].filter(Boolean).length;

        // Logic
        if (count === 4) {
            return `${basePath}/${prefix}Cross_SE.png`; 
        }

        if (count === 3) {
            // Split. Exclude the one NOT present.
            // ground_pathSplit_NE.png means the "Point" or the "Stem"?
            // Usually Split_N means "T" shape pointing N. (Connects E, W, S? or E, W, N?)
            // Let's assume Suffix is the "Stem" (Single side) or the "Opening".
            // Let's try:
            if (!hasNE) return `${basePath}/${prefix}Split_SW.png`; // Opposite
            if (!hasSW) return `${basePath}/${prefix}Split_NE.png`;
            if (!hasNW) return `${basePath}/${prefix}Split_SE.png`;
            if (!hasSE) return `${basePath}/${prefix}Split_NW.png`;
        }

        if (count === 2) {
            // Straight or Bend
            if (hasNE && hasSW) return `${basePath}/${prefix}Straight_SW.png`;
            if (hasNW && hasSE) return `${basePath}/${prefix}Straight_SE.png`;

            // Bends
            // NE+SE -> East Corner.
            // Suffix? Corner_NE?
            // "Corner_NE" usually means the bend "points" NE or is "at" NE.
            // If Road goes NE and SE. The corner geometric is West? No.
            // Let's use visually descriptive logic if possible, or Trial & Error.
            // Guess: Bend_SE means curve from SW to NE? No.
            // Let's map strict pairs:
            if (hasNE && hasSE) return `${basePath}/${prefix}Bend_SE.png`; // East-ish
            if (hasSE && hasSW) return `${basePath}/${prefix}Bend_SW.png`; // South-ish
            if (hasSW && hasNW) return `${basePath}/${prefix}Bend_NW.png`; // West-ish
            if (hasNW && hasNE) return `${basePath}/${prefix}Bend_NE.png`; // North-ish
        }

        if (count === 1) {
            // End
            if (hasNE) return `${basePath}/${prefix}End_NE.png`; // Connects to NE
            if (hasSW) return `${basePath}/${prefix}End_SW.png`;
            if (hasNW) return `${basePath}/${prefix}End_NW.png`;
            if (hasSE) return `${basePath}/${prefix}End_SE.png`;
        }

        // Isolated
        return `${basePath}/${prefix}Open_SE.png`; // or Straight
        // Note: 'Open' tiles exist in list: ground_pathOpen_SE.png
    }

    return `${basePath}/ground_grass_SE.png`; // Fallback
};
