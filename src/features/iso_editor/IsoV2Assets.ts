export interface IsoV2File {
  filename: string;
  path: string;
}

export type IsoV2Folder = string;

// Configuration for correcting asset alignment
export interface IsoAssetConfig {
    baseWidth?: number; // Target width to scale to (default 64)
    anchor?: { x: number, y: number }; // Override anchor
    offset?: { x: number, y: number }; // Pixel offset correction
}

// Map specific filenames (or folders) to correction configs
export const ASSET_CONFIG: Record<string, IsoAssetConfig> = {
    // Plains seems to include a diagonal offset in the source images (NE variant logic?)
    // User reported a click on (17,8) places it visually at (18,8).
    // The difference is exactly (+32, +16) pixels.
    // We apply the inverse offset to correct it.
    'plains': {
        anchor: { x: 0.5, y: 0.5 },
        baseWidth: 256,
        offset: { x: -0, y: -60 } 
    }
};

export const ASSET_FOLDERS: Record<string, string[]> = {
  "bank": [
    "bank.png",
    "bank_empty.png"
  ],
  "base": [
    "p0_base.png",
    "p1_base.png",
    "tent_detailedOpen_NE.png",
    "tent_detailedOpen_NW.png",
    "tent_detailedOpen_SE.png",
    "tent_detailedOpen_SW.png"
  ],
  "bridge": [
    "bridge_wood_NE.png",
    "bridge_wood_NW.png",
    "bridge_wood_SE.png",
    "bridge_wood_SW.png"
  ],
  "mountain": [
    "rock_tallA_NE.png",
    "rock_tallA_NW.png",
    "rock_tallA_SE.png",
    "rock_tallA_SW.png"
  ],
  "plains": [
    "ground_grass_NE.png",
    "ground_grass_NW.png",
    "ground_grass_SE.png",
    "ground_grass_SW.png"
  ],
  "river": [
    "ground_riverBendBank_NE.png",
    "ground_riverBendBank_NW.png",
    "ground_riverBendBank_SE.png",
    "ground_riverBendBank_SW.png",
    "ground_riverBend_NE.png",
    "ground_riverBend_NW.png",
    "ground_riverBend_SE.png",
    "ground_riverBend_SW.png",
    "ground_riverCornerSmall_NE.png",
    "ground_riverCornerSmall_NW.png",
    "ground_riverCornerSmall_SE.png",
    "ground_riverCornerSmall_SW.png",
    "ground_riverCorner_NE.png",
    "ground_riverCorner_NW.png",
    "ground_riverCorner_SE.png",
    "ground_riverCorner_SW.png",
    "ground_riverCross_NE.png",
    "ground_riverCross_NW.png",
    "ground_riverCross_SE.png",
    "ground_riverCross_SW.png",
    "ground_riverEndClosed_NE.png",
    "ground_riverEndClosed_NW.png",
    "ground_riverEndClosed_SE.png",
    "ground_riverEndClosed_SW.png",
    "ground_riverEnd_NE.png",
    "ground_riverEnd_NW.png",
    "ground_riverEnd_SE.png",
    "ground_riverEnd_SW.png",
    "ground_riverOpen_NE.png",
    "ground_riverOpen_NW.png",
    "ground_riverOpen_SE.png",
    "ground_riverOpen_SW.png",
    "ground_riverRocks_NE.png",
    "ground_riverRocks_NW.png",
    "ground_riverRocks_SE.png",
    "ground_riverRocks_SW.png",
    "ground_riverSideOpen_NE.png",
    "ground_riverSideOpen_NW.png",
    "ground_riverSideOpen_SE.png",
    "ground_riverSideOpen_SW.png",
    "ground_riverSide_NE.png",
    "ground_riverSide_NW.png",
    "ground_riverSide_SE.png",
    "ground_riverSide_SW.png",
    "ground_riverSplit_NE.png",
    "ground_riverSplit_NW.png",
    "ground_riverSplit_SE.png",
    "ground_riverSplit_SW.png",
    "ground_riverStraight_NE.png",
    "ground_riverStraight_NW.png",
    "ground_riverStraight_SE.png",
    "ground_riverStraight_SW.png"
  ],
  "road": [
    "ground_pathBendBank_NE.png",
    "ground_pathBendBank_NW.png",
    "ground_pathBendBank_SE.png",
    "ground_pathBendBank_SW.png",
    "ground_pathBend_NE.png",
    "ground_pathBend_NW.png",
    "ground_pathBend_SE.png",
    "ground_pathBend_SW.png",
    "ground_pathCornerSmall_NE.png",
    "ground_pathCornerSmall_NW.png",
    "ground_pathCornerSmall_SE.png",
    "ground_pathCornerSmall_SW.png",
    "ground_pathCorner_NE.png",
    "ground_pathCorner_NW.png",
    "ground_pathCorner_SE.png",
    "ground_pathCorner_SW.png",
    "ground_pathCross_NE.png",
    "ground_pathCross_NW.png",
    "ground_pathCross_SE.png",
    "ground_pathCross_SW.png",
    "ground_pathEndClosed_NE.png",
    "ground_pathEndClosed_NW.png",
    "ground_pathEndClosed_SE.png",
    "ground_pathEndClosed_SW.png",
    "ground_pathEnd_NE.png",
    "ground_pathEnd_NW.png",
    "ground_pathEnd_SE.png",
    "ground_pathEnd_SW.png",
    "ground_pathOpen_NE.png",
    "ground_pathOpen_NW.png",
    "ground_pathOpen_SE.png",
    "ground_pathOpen_SW.png",
    "ground_pathRocks_NE.png",
    "ground_pathRocks_NW.png",
    "ground_pathRocks_SE.png",
    "ground_pathRocks_SW.png",
    "ground_pathSideOpen_NE.png",
    "ground_pathSideOpen_NW.png",
    "ground_pathSideOpen_SE.png",
    "ground_pathSideOpen_SW.png",
    "ground_pathSide_NE.png",
    "ground_pathSide_NW.png",
    "ground_pathSide_SE.png",
    "ground_pathSide_SW.png",
    "ground_pathSplit_NE.png",
    "ground_pathSplit_NW.png",
    "ground_pathSplit_SE.png",
    "ground_pathSplit_SW.png",
    "ground_pathStraight_NE.png",
    "ground_pathStraight_NW.png",
    "ground_pathStraight_SE.png",
    "ground_pathStraight_SW.png"
  ],
  "trees": [
    "tree_plateau_NW.png",
    "tree_plateau_SE.png",
    "tree_plateau_fall_SW.png",
    "tree_simple_dark_NE.png",
    "tree_small_fall_NE.png",
    "tree_tall_dark_NE.png",
    "tree_tall_fall_SW.png",
    "tree_thin_dark_SW.png",
    "tree_thin_fall_NE.png"
  ],
  "units": [
    "p0_breacher.png",
    "p0_scout.png",
    "p0_sniper.png",
    "p1_scout.png",
    "p1_sniper.png",
    "p1_tank.png"
  ]
};

export const getAssetPath = (folder: string, filename: string) => {
  if (folder === 'units') return `/assets_v2/units/${filename}`;
  return `/assets_v2/terrain/${folder}/${filename}`;
};
