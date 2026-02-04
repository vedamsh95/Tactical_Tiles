
export type TerrainType = 'PLAINS' | 'FOREST' | 'MOUNTAIN' | 'WATER' | 'BASE' | 'ROAD' | 'ROAD_H' | 'BRIDGE' | 'BRIDGE_V' | 'BANK' | 'BUILDING' | 'BARRIER' | 'SAND' | 'DUNES' | 'QUICKSAND' | 'CANYON';

export type BuildingSubType = 'WATCHTOWER' | 'BUNKER' | 'NONE';

// Zone ID maps directly to Player ID for Voronoi logic
export type ZoneType = number; 

export type WeatherType = 'CLEAR' | 'SCORCHED' | 'MONSOON' | 'FOG' | 'TAILWIND' | 'SANDSTORM';

export type HazardState = 'SAFE' | 'WARNING' | 'LAVA';

export type GameMode = 'PVP' | 'PVE';
export type VictoryMode = 'CONQUER' | 'DEATHMATCH';
export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface WeatherState {
  playerZones: Record<number, WeatherType>; // Weather for each player's Voronoi zone
  turnsRemaining: number;
}

export interface GameSettings {
  playerCount: number; // 2 to 6
  unitCounts: {
    SOLDIER: number;
    ASSAULTER: number;
    SNIPER: number;
  };
  dynamicWeather: boolean;
  fogOfWar: boolean;
  doomsdayEnabled: boolean;
  gameMode: GameMode; 
  victoryMode?: VictoryMode;
  aiDifficulty: AIDifficulty;
}

export interface Tile {
  id: string; 
  x: number; 
  y: number; 
  type: TerrainType;
  height: number; 
  
  // Voronoi Zone Logic (Owner ID of the zone)
  zone?: ZoneType;
  
  // Doomsday Logic
  hazardState?: HazardState;

  // Building / Bank / Base Logic
  subType?: BuildingSubType; 
  owner?: number | null; // null = Neutral
  hackProgress?: number; // 0-100 for Banks
  
  // Custom Bank Rewards
  bankGoldReward?: number;
  bankCpReward?: number;
  
  hp?: number; // For Base
  maxHp?: number; // For Base
  
  // Drops
  loot?: 'AMMO' | 'MEDKIT' | null;
}

export interface SavedMap {
  id: string;
  name: string;
  author: string;
  createdAt: number;
  width: number;
  height: number;
  data: Tile[];
  isPreset: boolean;
  baseCount: number;
}

export type UnitType = 'SOLDIER' | 'ASSAULTER' | 'SNIPER';

export interface Unit {
  id: string;
  type: UnitType;
  tileId: string; 
  
  // Stats
  hp: number;
  ammo: number;
  maxAmmo: number;
  owner: number;      
  
  // State Flags
  hasMoved: boolean;    
  completed: boolean;
  isRooted?: boolean; // Effect from Quicksand
}

export interface DeadUnit {
  id: string;
  type: UnitType;
  owner: number;
  turnsUntilRespawn: number;
}

export interface PlayerState {
  cp: number;
  gold: number;
  eliminated: boolean;
}

export interface BankReward {
  tileId: string;
  playerId: number;
}

export interface PendingDrop {
  playerId: number;
  tileId: string;
  item: 'AMMO' | 'MEDKIT';
}

export interface LogEntry {
  id: string;
  round: number;
  playerId: number; // -1 for Neutral/Environment
  message: string;
  type?: 'COMBAT' | 'MOVE' | 'ECONOMY' | 'INFO';
  timestamp: number;
}
