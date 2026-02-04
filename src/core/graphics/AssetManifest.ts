// src/core/graphics/AssetManifest.ts

export const ASSET_MANIFEST = {
    bundles: [
        {
            name: 'game-screen',
            assets: [
                // TERRAIN
                { alias: 'TERRAIN_PLAINS', src: '/assets/terrain/plains.png' },
                { alias: 'TERRAIN_FOREST', src: '/assets/terrain/forest.png' },
                { alias: 'TERRAIN_MOUNTAIN', src: '/assets/terrain/mountain.png' },
                { alias: 'TERRAIN_WATER', src: '/assets/terrain/water.png' },
                { alias: 'TERRAIN_BASE', src: '/assets/terrain/base.png' },
                { alias: 'TERRAIN_ROAD', src: '/assets/terrain/road.png' },
                { alias: 'TERRAIN_ROAD_H', src: '/assets/terrain/road_h.png' },
                { alias: 'TERRAIN_BRIDGE', src: '/assets/terrain/bridge.png' },
                { alias: 'TERRAIN_BRIDGE_V', src: '/assets/terrain/bridge_v.png' },
                { alias: 'TERRAIN_BANK', src: '/assets/terrain/bank.png' },
                { alias: 'TERRAIN_BANK_EMPTY', src: '/assets/terrain/bank_empty.png' },
                { alias: 'TERRAIN_BUILDING', src: '/assets/terrain/building.png' },
                { alias: 'TERRAIN_BARRIER', src: '/assets/terrain/barrier.png' },
                { alias: 'TERRAIN_SAND', src: '/assets/terrain/sand.png' },
                { alias: 'TERRAIN_DUNES', src: '/assets/terrain/dunes.png' },
                { alias: 'TERRAIN_QUICKSAND', src: '/assets/terrain/quicksand.png' },
                { alias: 'TERRAIN_CANYON', src: '/assets/terrain/canyon.png' },

                // UNITS
                // Player 0 (Red)
                { alias: 'UNIT_P0_SOLDIER', src: '/assets/units/p0_soldier.png' },
                { alias: 'UNIT_P0_ASSAULTER', src: '/assets/units/p0_assaulter.png' },
                { alias: 'UNIT_P0_SNIPER', src: '/assets/units/p0_sniper.png' },
                
                // Player 1 (Blue)
                { alias: 'UNIT_P1_SOLDIER', src: '/assets/units/p1_soldier.png' },
                { alias: 'UNIT_P1_ASSAULTER', src: '/assets/units/p1_assaulter.png' },
                { alias: 'UNIT_P1_SNIPER', src: '/assets/units/p1_sniper.png' },

                // Player 2 (Green)
                { alias: 'UNIT_P2_SOLDIER', src: '/assets/units/p2_soldier.png' },
                { alias: 'UNIT_P2_ASSAULTER', src: '/assets/units/p2_assaulter.png' },
                { alias: 'UNIT_P2_SNIPER', src: '/assets/units/p2_sniper.png' },

                // Player 3 (Yellow)
                { alias: 'UNIT_P3_SOLDIER', src: '/assets/units/p3_soldier.png' },
                { alias: 'UNIT_P3_ASSAULTER', src: '/assets/units/p3_assaulter.png' },
                { alias: 'UNIT_P3_SNIPER', src: '/assets/units/p3_sniper.png' },

                // Player 4 (Purple)
                { alias: 'UNIT_P4_SOLDIER', src: '/assets/units/p4_soldier.png' },
                { alias: 'UNIT_P4_ASSAULTER', src: '/assets/units/p4_assaulter.png' },
                { alias: 'UNIT_P4_SNIPER', src: '/assets/units/p4_sniper.png' },

                // Player 5 (Cyan)
                { alias: 'UNIT_P5_SOLDIER', src: '/assets/units/p5_soldier.png' },
                { alias: 'UNIT_P5_ASSAULTER', src: '/assets/units/p5_assaulter.png' },
                { alias: 'UNIT_P5_SNIPER', src: '/assets/units/p5_sniper.png' },
            ],
        },
    ],
};
