
import { SavedMap, Tile } from '../types';

// Helper to generate a simple grid for presets
const generateGrid = (size: number, type: 'CANYON' | 'DELTA'): Tile[] => {
    const tiles: Tile[] = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            tiles.push({ 
                id: `${x},${y}`, x, y, 
                type: 'PLAINS', height: 1, loot: null, hazardState: 'SAFE' 
            });
        }
    }
    
    // Add specific features
    if (type === 'CANYON') {
        tiles.forEach(t => {
            // Sand base
            t.type = 'SAND';
            
            // Canyon River
            if (Math.abs(t.x - size/2) < 2) {
                t.type = 'CANYON';
                t.height = 0;
            }
            
            // Bridges
            if (t.type === 'CANYON' && (t.y === 5 || t.y === size-5)) {
                t.type = 'BRIDGE';
                t.height = 1;
            }

            // Dunes
            if (Math.random() < 0.1) {
                t.type = 'DUNES';
                t.height = 2;
            }
        });
    }

    if (type === 'DELTA') {
        tiles.forEach(t => {
            if (Math.random() < 0.15) t.type = 'FOREST';
            
            // Water Cross
            if (Math.abs(t.x - size/2) < 1 || Math.abs(t.y - size/2) < 1) {
                t.type = 'WATER';
                t.height = 0;
            }
            // Central Island
            if (Math.abs(t.x - size/2) < 2 && Math.abs(t.y - size/2) < 2) {
                t.type = 'PLAINS';
                t.height = 1;
            }
        });
    }

    // Add Bases
    const setBase = (x: number, y: number, owner: number) => {
        const t = tiles[y * size + x];
        if (t) { t.type = 'BASE'; t.owner = owner; }
    };

    setBase(2, 2, 0);
    setBase(size-3, size-3, 1);
    if (size > 20) {
        setBase(size-3, 2, 2);
        setBase(2, size-3, 3);
    }

    return tiles;
};

export const PRESET_MAPS: SavedMap[] = [
    {
        id: 'campaign_canyon',
        name: 'Operation: Dust Bowl',
        author: 'Command',
        width: 20,
        height: 20,
        createdAt: 1700000000,
        isPreset: true,
        baseCount: 2,
        data: generateGrid(20, 'CANYON')
    },
    {
        id: 'campaign_delta',
        name: 'River Delta Skirmish',
        author: 'Command',
        width: 25,
        height: 25,
        createdAt: 1700000001,
        isPreset: true,
        baseCount: 4,
        data: generateGrid(25, 'DELTA')
    }
];
