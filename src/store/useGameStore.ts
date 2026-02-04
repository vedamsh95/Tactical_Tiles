
import { create } from 'zustand';
import { UNIT_STATS, TERRAIN_DEFENSE, CP_SYSTEM, TERRAIN_COSTS, GOLD_SETTINGS, RESPAWN_TIMERS, UNIT_COSTS, BUILDING_STATS, SHOP_ITEMS, BASE_STATS, BANK_STATS, MAX_RESPAWNS, DOOMSDAY_SETTINGS, DEFAULT_GRID_SIZE, BARRIER_STATS, TILE_SIZE } from '../core/constants/Config';
import { useEffectStore } from './useEffectStore';
import { Tile, Unit, TerrainType, UnitType, PlayerState, DeadUnit, BankReward, PendingDrop, WeatherState, WeatherType, GameSettings, LogEntry, SavedMap } from '../core/types';
import { getValidMoves, getManhattanDistance, hasLineOfSight, calculateVisibility } from '../core/grid/Pathfinding';
import { assignVoronoiZones } from '../core/grid/ZoneGeneration';
import { getBestAIAction, AIAction } from '../core/ai/AIBrain';
import { updateDoomsdayState } from '../core/grid/DoomsdayManager';

interface GameStore {
  mapData: Tile[];
  gridSize: number; // Dynamic size
  units: Unit[];
  graveyard: DeadUnit[];
  
  // Game State
  currentScreen: 'SETUP' | 'GAME' | 'EDITOR' | 'TUTORIAL';
  settings: GameSettings;
  currentPlayer: number;
  totalTurns: number; // For Doomsday (Rounds)
  turnCounter: number; // For Weather (Individual Turns)
  
  // Player Data maps
  playerCp: Record<number, number>; 
  playerGold: Record<number, number>;
  playerRespawns: Record<number, number>; 
  playerStatus: Record<number, 'ACTIVE' | 'ELIMINATED'>;
  playerInventory: Record<number, ('AMMO' | 'MEDKIT')[]>; // NEW

  winner: number | null;
  bankRewardPending: BankReward | null; 
  pendingDrops: PendingDrop[];
  
  // Shop Placement
  placementMode: { active: boolean, itemKey: string, cost: number, variant?: string } | null;

  // Weather (Per Player Zone)
  weather: WeatherState;
  
  // Phase 4: Active Global Weather (visuals)
  weatherStatus: WeatherType;

  // Visibility (Fog of War)
  visibleTiles: Set<string>; 

  // Selection
  selectedUnitId: string | null;
  selectedTileId: string | null;
  hoveredTileId: string | null;
  selectedGraveyardUnitId: string | null;
  selectedInventoryItemIndex: number | null; // NEW
  
  // Valid Moves/Targets
  validMoveCosts: Map<string, number>; 
  validMoveTiles: string[]; 
  validAttackTargets: string[]; 
  validSpawnTiles: string[]; 
  validSecureTile: string | null;
  validHeistTile: string | null;
  validSiegeTile: string | null; 
  validLootTile: string | null;
  validDemolishTile: string | null; // NEW

  // AI State
  isAiTurn: boolean;
  
  // Log
  gameLog: LogEntry[];

  // Editor State
  mapToEdit: SavedMap | null;

  // Setup Actions
  setGameSettings: (settings: Partial<GameSettings>) => void;
  startGame: () => void;
  openEditor: () => void;
  exitEditor: () => void;
  openTutorial: () => void;
  exitTutorial: () => void;
  loadMapAndStart: (customMap: Tile[]) => void;
  loadMapIntoEditor: (map: SavedMap) => void;

  // Game Actions
  initializeMap: () => void;
  getTileAt: (gridX: number, gridY: number) => Tile | undefined;
  handleTileClick: (x: number, y: number) => void;
  setHoveredTile: (tileId: string | null) => void;
  handleGraveyardSelect: (deadUnitId: string) => void;
  selectInventoryItem: (index: number | null) => void; // NEW
  endTurn: () => void;
  resetGame: () => void;
  
  secureBuilding: () => void;
  heistBank: () => void;
  siegeBase: () => void;
  demolishBarrier: () => void; // NEW
  lootSupply: () => void;
  resolveBankReward: (choice: 'GOLD' | 'CP') => void;
  buyShopItem: (itemKey: string, variant?: string) => void;
  cancelPlacement: () => void;

  // AI Internal Actions
  runAiLoop: () => void;
  executeAiAction: (action: AIAction) => void;
}

const WEATHER_TYPES: WeatherType[] = ['CLEAR', 'SCORCHED', 'MONSOON', 'FOG', 'TAILWIND', 'SANDSTORM'];

const rollWeather = (): WeatherType => {
    return WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
};

const createLog = (round: number, playerId: number, message: string, type: LogEntry['type'] = 'INFO'): LogEntry => ({
    id: Math.random().toString(36).substr(2, 9),
    round,
    playerId,
    message,
    type,
    timestamp: Date.now()
});

// ... (Map Generation Helpers - Same as before) ...
const generateDynamicMap = (numPlayers: number): { map: Tile[], size: number, baseLocations: {x:number, y:number, owner:number}[] } => {
    let size = 20;
    if (numPlayers >= 4) size = 25;
    if (numPlayers >= 6) size = 30;
    
    const tiles: Tile[] = [];
    const baseLocations: {x: number, y: number, owner: number}[] = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            tiles.push({
                id: `${x},${y}`, x, y,
                type: 'PLAINS', height: 1, loot: null, hazardState: 'SAFE'
            });
        }
    }

    const getTile = (x: number, y: number) => {
        if (x < 0 || x >= size || y < 0 || y >= size) return null;
        return tiles[y * size + x];
    };

    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);

    const lakeRadius = numPlayers > 2 ? 2 : 1;
    for (let y = centerY - lakeRadius; y <= centerY + lakeRadius; y++) {
        for (let x = centerX - lakeRadius; x <= centerX + lakeRadius; x++) {
             if (Math.sqrt(Math.pow(x-centerX,2) + Math.pow(y-centerY,2)) <= lakeRadius) {
                 const t = getTile(x, y);
                 if (t) { t.type = 'WATER'; t.height = 0; }
             }
        }
    }

    const startAngle = numPlayers === 2 ? (-Math.PI / 4) : (-Math.PI / 2);
    
    for (let i = 0; i < numPlayers; i++) {
        const riverAngle = startAngle + (i * 2 * Math.PI / numPlayers);
        
        let cx = centerX;
        let cy = centerY;
        const dx = Math.cos(riverAngle);
        const dy = Math.sin(riverAngle);
        const px = -Math.sin(riverAngle);
        const py = Math.cos(riverAngle);

        let dist = 0;
        const maxDist = size * 1.0; 

        while (dist < maxDist) {
            const wiggle = (Math.random() - 0.5) * 1.5; 
            const wx = px * wiggle;
            const wy = py * wiggle;

            cx += dx + wx;
            cy += dy + wy;
            dist += 1;

            const isWide = Math.random() < 0.3;
            let width = isWide ? 3 : (Math.random() < 0.5 ? 2 : 1);
            
            for (let w = -Math.floor(width/2); w <= Math.floor(width/2); w++) {
                const rx = Math.round(cx + px * w);
                const ry = Math.round(cy + py * w);
                const t = getTile(rx, ry);
                if (t) { t.type = 'WATER'; t.height = 0; }
            }
        }
    }

    const padding = 3;
    const baseDist = (size / 2) - padding; 

    for (let i = 0; i < numPlayers; i++) {
        const riverAngle = startAngle + (i * 2 * Math.PI / numPlayers);
        const sectorAngle = riverAngle + (Math.PI / numPlayers);

        const bx = Math.round(centerX + Math.cos(sectorAngle) * baseDist);
        const by = Math.round(centerY + Math.sin(sectorAngle) * baseDist);

        const t = getTile(bx, by);
        if (t) {
            t.type = 'BASE';
            t.owner = i;
            t.height = 1;
            baseLocations.push({ x: bx, y: by, owner: i });
        }
    }

    for (let i = 0; i < Math.max(4, numPlayers * 2); i++) {
         const mx = Math.floor(Math.random() * size);
         const my = Math.floor(Math.random() * size);
         let cx = mx, cy = my;
         for(let s=0; s<4; s++) {
             const t = getTile(cx, cy);
             if (t && t.type === 'PLAINS') {
                 t.type = 'MOUNTAIN';
                 t.height = 2;
             }
             cx += Math.floor(Math.random()*3 - 1);
             cy += Math.floor(Math.random()*3 - 1);
         }
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const t = getTile(x, y);
            if (!t || t.type !== 'PLAINS') continue;
            const rand = Math.random();
            if (rand < 0.12) {
                t.type = 'FOREST';
            } else if (rand > 0.88) { 
                t.type = 'MOUNTAIN'; 
                t.height = 2; 
            }
        }
    }

    const bridgeCandidatesH: Tile[] = [];
    const bridgeCandidatesV: Tile[] = [];

    tiles.forEach(t => {
        if (t.type === 'WATER') {
            const left = getTile(t.x - 1, t.y);
            const right = getTile(t.x + 1, t.y);
            const top = getTile(t.x, t.y - 1);
            const bottom = getTile(t.x, t.y + 1);

            const isLand = (n: Tile | null) => n && n.type !== 'WATER' && n.type !== 'BRIDGE' && n.type !== 'BRIDGE_V' && n.type !== 'CANYON';

            if (isLand(left) && isLand(right)) bridgeCandidatesH.push(t);
            if (isLand(top) && isLand(bottom)) bridgeCandidatesV.push(t);
        }
    });

    const neededBridges = numPlayers * 3; 
    const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);
    shuffle(bridgeCandidatesH);
    shuffle(bridgeCandidatesV);

    for(let i=0; i<Math.min(neededBridges, bridgeCandidatesH.length); i++) {
        const t = bridgeCandidatesH[i];
        if (t.type === 'WATER') {
            t.type = 'BRIDGE';
            t.height = 1;
        }
    }
    for(let i=0; i<Math.min(neededBridges, bridgeCandidatesV.length); i++) {
        const t = bridgeCandidatesV[i];
        if (t.type === 'WATER') {
            t.type = 'BRIDGE_V';
            t.height = 1;
        }
    }

    const dist = (t1: Tile, t2: Tile | {x:number, y:number}) => Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y);
    const zoneTiles: Tile[][] = Array.from({ length: numPlayers }, () => []);
    
    tiles.forEach(t => {
        if (t.type !== 'PLAINS' && t.type !== 'FOREST') return;
        let closestOwner = -1;
        let minD = Infinity;
        baseLocations.forEach(base => {
            const d = dist(t, base);
            if (d < minD) {
                minD = d;
                closestOwner = base.owner;
            }
        });
        if (closestOwner !== -1) zoneTiles[closestOwner].push(t);
    });

    const placedBanks: Tile[] = [];
    const placedBuildings: Tile[] = [];
    const mapCenter = { x: centerX, y: centerY };

    for (let i = 0; i < numPlayers; i++) {
        const candidates = zoneTiles[i];
        const base = baseLocations[i];
        const scored = candidates.map(t => {
            const dBase = dist(t, base);
            const dCenter = dist(t, mapCenter);
            const score = (dBase * 2) - dCenter;
            return { tile: t, score, dBase };
        }).sort((a, b) => b.score - a.score);

        let placed = false;
        const constraints = [15, 10, 5];
        
        for (const minBankDist of constraints) {
            if (placed) break;
            for (const cand of scored) {
                if (cand.dBase < 8) continue;
                const conflict = placedBanks.some(b => dist(cand.tile, b) < minBankDist);
                if (!conflict) {
                    cand.tile.type = 'BANK';
                    cand.tile.hackProgress = 0;
                    cand.tile.height = 1;
                    placedBanks.push(cand.tile);
                    placed = true;
                    break;
                }
            }
        }
    }

    const bridges = tiles.filter(t => t.type === 'BRIDGE' || t.type === 'BRIDGE_V');

    for (let i = 0; i < numPlayers; i++) {
        const validTiles = zoneTiles[i].filter(t => t.type === 'PLAINS' || t.type === 'FOREST'); 
        const base = baseLocations[i];

        const outpostCandidates = validTiles.map(t => {
            let minBridgeDist = Infinity;
            bridges.forEach(b => {
                const d = dist(t, b);
                if (d < minBridgeDist) minBridgeDist = d;
            });
            return { tile: t, score: -minBridgeDist + Math.random() }; 
        }).sort((a, b) => b.score - a.score);

        const allAssets = [...placedBanks, ...placedBuildings];

        for (const cand of outpostCandidates) {
            const t = cand.tile;
            if (dist(t, base) < 4) continue;
            if (allAssets.some(a => dist(t, a) < 3)) continue;

            t.type = 'BUILDING';
            t.subType = 'WATCHTOWER';
            t.height = 1;
            placedBuildings.push(t);
            allAssets.push(t); 
            break; 
        }

        const midX = Math.round((base.x + centerX) / 2);
        const midY = Math.round((base.y + centerY) / 2);
        const midPoint = { x: midX, y: midY };

        const bunkerCandidates = zoneTiles[i]
            .filter(t => t.type === 'PLAINS' || t.type === 'FOREST')
            .map(t => {
                const dMid = dist(t, midPoint);
                return { tile: t, score: -dMid + Math.random() };
            }).sort((a, b) => b.score - a.score);

        for (const cand of bunkerCandidates) {
            const t = cand.tile;
            if (allAssets.some(a => dist(t, a) < 3)) continue;
            if (dist(t, base) < 3) continue;

            t.type = 'BUILDING';
            t.subType = 'BUNKER';
            t.height = 1;
            placedBuildings.push(t);
            break;
        }
    }

    return { map: tiles, size, baseLocations };
};

// ... (Spawn/Units Logic/Range/Visibility Helpers remain same) ...
const spawnUnitsForPlayers = (mapTiles: Tile[], counts: GameSettings['unitCounts'], baseLocations: {x:number, y:number, owner:number}[], gridSize: number): Unit[] => {
    const units: Unit[] = [];
    let idCounter = 0;

    const createUnit = (type: UnitType, tileId: string, owner: number) => {
        units.push({
            id: `unit_${idCounter++}`,
            type,
            tileId,
            hp: UNIT_STATS[type].hp,
            ammo: UNIT_STATS[type].ammo,
            maxAmmo: UNIT_STATS[type].maxAmmo,
            owner,
            hasMoved: false,
            completed: false,
        });
    };

    baseLocations.forEach(base => {
        const candidates = mapTiles
            .filter(t => t.type !== 'WATER' && t.type !== 'MOUNTAIN' && t.type !== 'BASE' && t.type !== 'CANYON')
            .sort((a, b) => {
                const d1 = getManhattanDistance(a, {x: base.x, y: base.y} as Tile);
                const d2 = getManhattanDistance(b, {x: base.x, y: base.y} as Tile);
                return d1 - d2;
            });
        
        let idx = 0;
        const spawnList = [
            ...Array(counts.SOLDIER).fill('SOLDIER'),
            ...Array(counts.ASSAULTER).fill('ASSAULTER'),
            ...Array(counts.SNIPER).fill('SNIPER'),
        ];
        spawnList.forEach(type => {
            if (idx < candidates.length) {
                createUnit(type as UnitType, candidates[idx].id, base.owner);
                idx++;
            }
        });
    });

    return units;
};

const getUnitRange = (unit: Unit, mapData: Tile[], weather: WeatherState) => {
    let range = UNIT_STATS[unit.type].range;
    const tile = mapData.find(t => t.id === unit.tileId);
    if (tile?.type === 'BUILDING' && tile.owner === unit.owner) {
        if (tile.subType === 'WATCHTOWER') range += BUILDING_STATS.WATCHTOWER.rangeBonus;
        if (tile.subType === 'BUNKER') range += BUILDING_STATS.BUNKER.rangeBonus;
    }
    if (tile?.zone !== undefined) {
        const wType = weather.playerZones[tile.zone] || 'CLEAR';
        if (wType === 'TAILWIND') range += 1;
        if (wType === 'FOG' && unit.type === 'SNIPER') range = Math.min(range, 3);
        if (wType === 'SANDSTORM') range = Math.min(range, 3); // Capped by Sandstorm
    }
    return range;
};

export const useGameStore = create<GameStore>((set, get) => ({
  mapData: [],
  gridSize: DEFAULT_GRID_SIZE,
  units: [],
  graveyard: [],
  currentScreen: 'SETUP',
  settings: {
      playerCount: 2,
      unitCounts: { SOLDIER: 2, ASSAULTER: 1, SNIPER: 1 },
      dynamicWeather: true,
      fogOfWar: false,
      doomsdayEnabled: false,
      gameMode: 'PVP',
      victoryMode: 'CONQUER',
      aiDifficulty: 'MEDIUM'
  },
  currentPlayer: 0,
  totalTurns: 0,
  turnCounter: 0,
  
  playerCp: {},
  playerGold: {},
  playerRespawns: {},
  playerStatus: {},
  playerInventory: {},

  winner: null,
  bankRewardPending: null,
  pendingDrops: [],
  placementMode: null,
  
  weather: { playerZones: {}, turnsRemaining: 5 },
  weatherStatus: 'MONSOON', // Force MONSOON for testing
  visibleTiles: new Set(),

  selectedUnitId: null,
  selectedTileId: null,
  hoveredTileId: null,
  selectedGraveyardUnitId: null,
  selectedInventoryItemIndex: null,
  
  validMoveCosts: new Map(),
  validMoveTiles: [], 
  validAttackTargets: [],
  validSpawnTiles: [],
  validSecureTile: null,
  validHeistTile: null,
  validSiegeTile: null,
  validLootTile: null,
  validDemolishTile: null,
  
  isAiTurn: false,
  
  gameLog: [],

  mapToEdit: null, // Initial State

  setGameSettings: (newSettings) => {
      set(state => ({ settings: { ...state.settings, ...newSettings } }));
  },

  startGame: () => {
      set({ currentScreen: 'GAME' });
      get().initializeMap();
  },

  openEditor: () => set({ currentScreen: 'EDITOR', mapToEdit: null }), // Clear when opening fresh
  exitEditor: () => set({ currentScreen: 'SETUP' }),
  openTutorial: () => set({ currentScreen: 'TUTORIAL' }),
  exitTutorial: () => set({ currentScreen: 'SETUP' }),
  
  loadMapIntoEditor: (map: SavedMap) => set({ currentScreen: 'EDITOR', mapToEdit: map }),

  loadMapAndStart: (customMap: Tile[]) => {
      // 1. Deep Copy the map data to avoid mutating original presets
      const zonedMap = JSON.parse(JSON.stringify(customMap)) as Tile[];
      
      const tileCount = zonedMap.length;
      const mapSize = Math.sqrt(tileCount);
      const gridSize = Math.round(mapSize);
      const { settings } = get();

      // 2. Filter Bases
      const potentialBases = zonedMap.filter(t => t.type === 'BASE');
      let baseLocations: {x:number, y:number, owner:number}[] = [];
      
      if (potentialBases.length > 0) {
          // Sort bases (roughly Top-Left to Bottom-Right)
          potentialBases.sort((a,b) => (a.x + a.y) - (b.x + b.y));

          // Determine which bases to activate based on player count
          let activeIndices: number[] = [];
          
          if (settings.playerCount === 2 && potentialBases.length >= 2) {
             // For 2 players, pick the corners (First and Last) for maximum distance
             activeIndices = [0, potentialBases.length - 1];
          } else {
             // For N players, take the first N bases
             for(let i=0; i<Math.min(settings.playerCount, potentialBases.length); i++) {
                 activeIndices.push(i);
             }
          }

          // 3. Reset ALL potential bases to standard terrain (PLAINS) first
          // This effectively "hides" the unused bases.
          potentialBases.forEach(b => {
              b.type = 'PLAINS';
              delete b.owner;
              delete b.hp;
              delete b.maxHp;
          });

          // 4. Activate ONLY selected bases
          activeIndices.forEach((baseIndex, ownerId) => {
              const b = potentialBases[baseIndex];
              b.type = 'BASE';
              b.owner = ownerId;
              b.height = 1; // Ensure bases are visible
              baseLocations.push({x:b.x, y:b.y, owner:ownerId});
          });

      } else {
          // Fallback if no bases found (Safe default)
          const p1 = zonedMap.find(t => t.x === 1 && t.y === 1);
          const p2 = zonedMap.find(t => t.x === gridSize-2 && t.y === gridSize-2);
          if (p1) { p1.type = 'BASE'; p1.owner = 0; baseLocations.push({x:1, y:1, owner:0}); }
          if (p2) { p2.type = 'BASE'; p2.owner = 1; baseLocations.push({x:gridSize-2, y:gridSize-2, owner:1}); }
      }

      // 5. Recalculate Voronoi Zones based on new active bases
      const finalMap = assignVoronoiZones(zonedMap, baseLocations);
      
      // Initialize Base HP for Conquer Mode AND Barrier HP
      finalMap.forEach(t => {
          if (t.type === 'BASE') {
              if (settings.victoryMode === 'CONQUER') {
                  t.hp = BASE_STATS.HP;
                  t.maxHp = BASE_STATS.HP;
              } else {
                  t.hp = undefined;
                  t.maxHp = undefined;
              }
          }
          if (t.type === 'BARRIER') {
              t.hp = BARRIER_STATS.HP;
              t.maxHp = BARRIER_STATS.HP;
          }
      });

      const units = spawnUnitsForPlayers(finalMap, settings.unitCounts, baseLocations, gridSize);
      
      const initialWeather: WeatherState = {
        playerZones: {},
        turnsRemaining: 5
      };
      if (settings.dynamicWeather) {
          for(let i=0; i<settings.playerCount; i++) {
              initialWeather.playerZones[i] = rollWeather();
          }
      } else {
          for(let i=0; i<settings.playerCount; i++) {
              initialWeather.playerZones[i] = 'CLEAR';
          }
      }
      
      const visible = calculateVisibility(0, units, finalMap, initialWeather, settings.fogOfWar, gridSize);

      const pCp: any = {};
      const pGold: any = {};
      const pResp: any = {};
      const pStat: any = {};
      const pInv: any = {};
      
      for(let i=0; i<settings.playerCount; i++) {
          pCp[i] = CP_SYSTEM.MAX_CP;
          pGold[i] = GOLD_SETTINGS.INITIAL_GOLD;
          pResp[i] = 0;
          pStat[i] = 'ACTIVE';
          pInv[i] = [];
      }

      set({
          mapData: finalMap,
          gridSize,
          units,
          graveyard: [],
          currentPlayer: 0,
          totalTurns: 0,
          turnCounter: 0,
          playerCp: pCp,
          playerGold: pGold,
          playerRespawns: pResp,
          playerStatus: pStat,
          playerInventory: pInv,
          winner: null,
          bankRewardPending: null,
          pendingDrops: [],
          placementMode: null,
          weather: initialWeather,
          visibleTiles: visible,
          isAiTurn: false,
          currentScreen: 'GAME',
          gameLog: []
      });
  },

  initializeMap: () => {
    const { settings } = get();
    const { map, size, baseLocations } = generateDynamicMap(settings.playerCount);
    const zonedMap = assignVoronoiZones(map, baseLocations);
    const units = spawnUnitsForPlayers(zonedMap, settings.unitCounts, baseLocations, size);
    
    const pCp: Record<number, number> = {};
    const pGold: Record<number, number> = {};
    const pResp: Record<number, number> = {};
    const pStat: Record<number, 'ACTIVE' | 'ELIMINATED'> = {};
    const pInv: Record<number, ('AMMO' | 'MEDKIT')[]> = {};
    const wZones: Record<number, WeatherType> = {};

    for (let i = 0; i < settings.playerCount; i++) {
        pCp[i] = CP_SYSTEM.MAX_CP;
        pGold[i] = GOLD_SETTINGS.INITIAL_GOLD;
        pResp[i] = 0;
        pStat[i] = 'ACTIVE';
        pInv[i] = [];
        wZones[i] = settings.dynamicWeather ? rollWeather() : 'CLEAR';
    }

    zonedMap.forEach(t => {
        if (t.type === 'BASE' && settings.victoryMode === 'CONQUER') {
             t.hp = BASE_STATS.HP;
             t.maxHp = BASE_STATS.HP;
        }
        if (t.type === 'BARRIER') {
             t.hp = BARRIER_STATS.HP;
             t.maxHp = BARRIER_STATS.HP;
        }
    });

    const initialWeather: WeatherState = {
        playerZones: wZones,
        turnsRemaining: 5
    };

    const visible = calculateVisibility(0, units, zonedMap, initialWeather, settings.fogOfWar, size);

    set({ 
      mapData: zonedMap,
      gridSize: size,
      units: units,
      graveyard: [],
      currentPlayer: 0,
      totalTurns: 0,
      turnCounter: 0,
      playerCp: pCp,
      playerGold: pGold,
      playerRespawns: pResp,
      playerStatus: pStat,
      playerInventory: pInv,
      winner: null,
      bankRewardPending: null,
      pendingDrops: [],
      placementMode: null,
      weather: initialWeather,
      visibleTiles: visible,
      isAiTurn: false,
      gameLog: []
    });
  },

  resetGame: () => {
    set({ currentScreen: 'SETUP', winner: null, mapData: [], units: [], gameLog: [] });
  },

  getTileAt: (gridX, gridY) => {
    const { mapData, gridSize } = get();
    return mapData[gridY * gridSize + gridX];
  },

  setHoveredTile: (tileId) => {
      const { hoveredTileId } = get();
      if (hoveredTileId !== tileId) {
          set({ hoveredTileId: tileId });
      }
  },

  handleGraveyardSelect: (deadUnitId) => {
      const { graveyard, currentPlayer, units, mapData, playerGold, playerRespawns, gridSize } = get();
      const deadUnit = graveyard.find(u => u.id === deadUnitId);
      if (!deadUnit || deadUnit.owner !== currentPlayer) return;
      if (deadUnit.turnsUntilRespawn > 0) return;
      if (playerGold[currentPlayer] < UNIT_COSTS[deadUnit.type]) return;

      if (playerRespawns[currentPlayer] >= MAX_RESPAWNS) return;

      const occupiedTileIds = new Set(units.map(u => u.tileId));
      const validSpawns: string[] = [];

      const bases = mapData.filter(t => t.type === 'BASE' && t.owner === currentPlayer);
      
      bases.forEach(base => {
          if (!occupiedTileIds.has(base.id)) validSpawns.push(base.id);
          for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = base.x + dx;
                  const ny = base.y + dy;
                  if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                       const t = mapData[ny * gridSize + nx];
                       const isTerrainValid = t.type !== 'WATER' && t.type !== 'BARRIER' && t.type !== 'CANYON' && t.hazardState !== 'LAVA';
                       if (isTerrainValid && !occupiedTileIds.has(t.id) && !validSpawns.includes(t.id)) {
                           validSpawns.push(t.id);
                       }
                  }
              }
          }
      });

      set({
          selectedGraveyardUnitId: deadUnitId,
          selectedUnitId: null,
          selectedInventoryItemIndex: null,
          validMoveTiles: [],
          validMoveCosts: new Map(),
          validAttackTargets: [],
          validSpawnTiles: validSpawns,
          validSecureTile: null,
          validHeistTile: null,
          validSiegeTile: null,
          validLootTile: null,
          validDemolishTile: null
      });
  },

  selectInventoryItem: (index) => {
      set({ 
          selectedInventoryItemIndex: index,
          selectedUnitId: null,
          selectedGraveyardUnitId: null,
          validMoveTiles: [],
          validAttackTargets: []
      });
  },

  handleTileClick: (x, y) => {
    const state = get();
    const { 
        units, currentPlayer, selectedUnitId, selectedGraveyardUnitId, selectedInventoryItemIndex,
        validMoveCosts, mapData, validAttackTargets, winner, playerCp, playerGold, graveyard, validSpawnTiles, weather, settings, isAiTurn, gridSize, placementMode, totalTurns
    } = state;
    
    const currentRound = totalTurns + 1;

    if (winner !== null || state.bankRewardPending || isAiTurn) return;

    const clickedTileId = `${x},${y}`;
    const tile = mapData.find(t => t.id === clickedTileId);
    
    // --- PLACEMENT MODE LOGIC ---
    if (placementMode && placementMode.active && tile) {
        // Validate Placement
        let valid = false;
        
        const isOccupied = units.some(u => u.tileId === clickedTileId);
        const isStructure = tile.type === 'BASE' || tile.type === 'BANK' || tile.type === 'BUILDING' || tile.type === 'BARRIER';
        const isHazard = tile.hazardState === 'LAVA';
        
        if (!isOccupied && !isStructure && !isHazard) {
            if (placementMode.itemKey === 'BARRIER') {
                if (tile.type !== 'WATER' && tile.type !== 'BRIDGE' && tile.type !== 'BRIDGE_V' && tile.type !== 'CANYON') valid = true;
            } else if (placementMode.itemKey === 'BRIDGE') {
                if (tile.type === 'WATER' || tile.type === 'CANYON') valid = true;
            }
        }

        if (valid) {
            // EXECUTE PLACEMENT
            const newGold = playerGold[currentPlayer] - placementMode.cost;
            let newType: TerrainType = tile.type;
            let newHeight = tile.height;
            let newHp: number | undefined;
            let newMaxHp: number | undefined;

            if (placementMode.itemKey === 'BARRIER') {
                newType = 'BARRIER';
                newHeight = 1; 
                newHp = BARRIER_STATS.HP;
                newMaxHp = BARRIER_STATS.HP;
            } else if (placementMode.itemKey === 'BRIDGE') {
                newType = placementMode.variant === 'V' ? 'BRIDGE_V' : 'BRIDGE';
                newHeight = 1;
            }

            const newMap = mapData.map(t => t.id === clickedTileId ? { ...t, type: newType, height: newHeight, hp: newHp, maxHp: newMaxHp } : t);
            
            const logEntry = createLog(currentRound, currentPlayer, `Built ${SHOP_ITEMS[placementMode.itemKey as keyof typeof SHOP_ITEMS].name} at (${x},${y})`, 'ECONOMY');

            set({
                mapData: newMap,
                playerGold: { ...playerGold, [currentPlayer]: newGold },
                placementMode: null,
                gameLog: [logEntry, ...state.gameLog]
            });
        }
        return; // Consume click
    }

    const clickedUnit = units.find(u => u.tileId === clickedTileId);

    if (settings.fogOfWar && clickedUnit && clickedUnit.owner !== currentPlayer) {
        if (!state.visibleTiles.has(clickedTileId)) return;
    }

    // --- INVENTORY USE LOGIC ---
    if (selectedInventoryItemIndex !== null) {
        // Can only use on own units
        if (clickedUnit && clickedUnit.owner === currentPlayer) {
            get().executeAiAction({ 
                type: 'USE_ITEM', 
                unitId: clickedUnit.id, 
                itemIndex: selectedInventoryItemIndex,
                cost: 0 
            });
            set({ selectedInventoryItemIndex: null });
            return;
        } else {
            // Clicking empty space or enemy cancels selection
            set({ selectedInventoryItemIndex: null });
            return;
        }
    }
    
    // ... (Existing Interactions logic)
    const checkInteractions = (unit: Unit, tileId: string, currentCp: number) => {
        const uTile = mapData.find(t => t.id === tileId);
        if (!uTile) return { secure: null, heist: null, siege: null, loot: null };
        const neighbors = [
            mapData.find(t => t.x === uTile.x+1 && t.y === uTile.y),
            mapData.find(t => t.x === uTile.x-1 && t.y === uTile.y),
            mapData.find(t => t.x === uTile.x && t.y === uTile.y+1),
            mapData.find(t => t.x === uTile.x && t.y === uTile.y-1),
        ].filter(t => t !== undefined) as Tile[];

        const interactionTiles = [uTile, ...neighbors];

        let secure = null;
        let heist = null;
        let loot = null;

        const b = interactionTiles.find(t => t.type === 'BUILDING' && t.owner !== currentPlayer);
        if (b && currentCp >= 4) secure = b.id;
        
        const bank = interactionTiles.find(t => t.type === 'BANK' && (t.hackProgress || 0) < 100);
        if (bank && currentCp >= 4) heist = bank.id;

        const lootTile = interactionTiles.find(t => t.loot !== null && t.loot !== undefined);
        if (lootTile && currentCp >= 4) loot = lootTile.id;

        return { secure, heist, loot };
    };

    const currentCp = playerCp[currentPlayer];

    // SPAWN
    if (selectedGraveyardUnitId && validSpawnTiles.includes(clickedTileId)) {
        const deadUnit = graveyard.find(u => u.id === selectedGraveyardUnitId);
        if (deadUnit) {
            get().executeAiAction({ type: 'SPAWN', unitType: deadUnit.type, tileId: clickedTileId, cost: 0, goldCost: UNIT_COSTS[deadUnit.type], deadUnitId: deadUnit.id });
            return;
        }
    }

    // ATTACK UNIT
    if (selectedUnitId && clickedUnit && validAttackTargets.includes(clickedUnit.id)) {
        const attacker = units.find(u => u.id === selectedUnitId);
        if (attacker) {
            get().executeAiAction({ type: 'ATTACK', attackerId: attacker.id, targetUnitId: clickedUnit.id, cost: UNIT_STATS[attacker.type].attackCost });
            return;
        }
    }

    // ATTACK BASE (SIEGE)
    if (selectedUnitId && state.validSiegeTile === clickedTileId) {
         const attacker = units.find(u => u.id === selectedUnitId);
         if (attacker) {
             get().executeAiAction({ type: 'SIEGE', unitId: attacker.id, tileId: clickedTileId, cost: UNIT_STATS[attacker.type].attackCost });
             return;
         }
    }

    // DEMOLISH BARRIER
    if (selectedUnitId && state.validDemolishTile === clickedTileId) {
         const attacker = units.find(u => u.id === selectedUnitId);
         if (attacker) {
             get().executeAiAction({ type: 'DEMOLISH', unitId: attacker.id, tileId: clickedTileId, cost: UNIT_STATS[attacker.type].attackCost });
             return;
         }
    }

    // MOVE
    if (selectedUnitId && validMoveCosts.has(clickedTileId)) {
      get().executeAiAction({ type: 'MOVE', unitId: selectedUnitId, targetTileId: clickedTileId, cost: validMoveCosts.get(clickedTileId) || 0 });
      return;
    }

    // SELECTION
    if (clickedUnit && clickedUnit.owner === currentPlayer && !clickedUnit.completed) {
      if (tile) {
        // UNIT SELECTION LOGIC
        let movesMap = new Map<string, number>();
        
        // Only calculate moves if not rooted
        if (!clickedUnit.hasMoved && currentCp > 0 && !clickedUnit.isRooted) {
            movesMap = getValidMoves(tile, currentCp, mapData, units, clickedUnit.type, currentPlayer, weather, gridSize);
        }
        
        let targets: string[] = [];
        let siegeTarget: string | null = null;
        let demolishTarget: string | null = null;
        
        const effectiveRange = getUnitRange(clickedUnit, mapData, weather);
        const canAttack = currentCp >= UNIT_STATS[clickedUnit.type].attackCost && clickedUnit.ammo > 0;
        
        let sniperPositionValid = true;
        if (clickedUnit.type === 'SNIPER') {
             if (tile.type === 'MOUNTAIN' || tile.type === 'DUNES') {
                 // OK
             } else if (tile.type === 'BUILDING') {
                 if (tile.owner !== currentPlayer) sniperPositionValid = false;
             } else {
                 sniperPositionValid = false;
             }
        }

        if (canAttack && sniperPositionValid) {
             // 1. Enemy Units
             targets = units.filter(u => u.owner !== currentPlayer).filter(u => {
                 if (settings.fogOfWar && !state.visibleTiles.has(u.tileId)) return false;
                 const tTile = mapData.find(t => t.id === u.tileId)!;
                 if (getManhattanDistance(tile, tTile) > effectiveRange) return false;
                 return hasLineOfSight(tile, tTile, mapData, clickedUnit.type, weather, gridSize);
             }).map(u => u.id);

             // 2. Enemy Base
             if (settings.victoryMode === 'CONQUER') {
                 const bases = mapData.filter(t => t.type === 'BASE' && t.owner !== currentPlayer && (t.hp || 0) > 0);
                 const validBase = bases.find(b => {
                     if (getManhattanDistance(tile, b) > effectiveRange) return false;
                     if (settings.fogOfWar && !state.visibleTiles.has(b.id)) return false;
                     return hasLineOfSight(tile, b, mapData, clickedUnit.type, weather, gridSize);
                 });
                 if (validBase) siegeTarget = validBase.id;
             }

             // 3. Barriers (Demolish)
             const barriers = mapData.filter(t => t.type === 'BARRIER' && (t.hp || 0) > 0);
             const validBarrier = barriers.find(b => {
                 if (getManhattanDistance(tile, b) > effectiveRange) return false;
                 if (settings.fogOfWar && !state.visibleTiles.has(b.id)) return false;
                 return hasLineOfSight(tile, b, mapData, clickedUnit.type, weather, gridSize);
             });
             
             if (validBarrier) demolishTarget = validBarrier.id;
        }

        const { secure, heist, loot } = checkInteractions(clickedUnit, clickedTileId, currentCp);

        set({ 
            selectedUnitId: clickedUnit.id, 
            selectedTileId: clickedTileId,
            validMoveCosts: movesMap,
            validMoveTiles: Array.from(movesMap.keys()),
            validAttackTargets: targets,
            validSecureTile: secure,
            validHeistTile: heist,
            validSiegeTile: siegeTarget,
            validLootTile: loot,
            validDemolishTile: demolishTarget,
            selectedGraveyardUnitId: null, 
            validSpawnTiles: [],
            selectedInventoryItemIndex: null
        });
      }
      return;
    }

    // DEFAULT
    set({ 
        selectedUnitId: null, 
        selectedTileId: clickedTileId,
        validMoveCosts: new Map(), 
        validMoveTiles: [], 
        validAttackTargets: [], 
        validSecureTile: null, 
        validHeistTile: null, 
        validSiegeTile: null,
        validLootTile: null,
        validDemolishTile: null,
        selectedGraveyardUnitId: null, 
        validSpawnTiles: [],
        selectedInventoryItemIndex: null
    });
  },

  secureBuilding: () => {
      const { selectedUnitId, validSecureTile } = get();
      if (selectedUnitId && validSecureTile) {
          get().executeAiAction({ type: 'SECURE', unitId: selectedUnitId, tileId: validSecureTile, cost: 4 });
      }
  },

  heistBank: () => {
      const { selectedUnitId, validHeistTile } = get();
      if (selectedUnitId && validHeistTile) {
          get().executeAiAction({ type: 'HEIST', unitId: selectedUnitId, tileId: validHeistTile, cost: 4 });
      }
  },

  siegeBase: () => {
      const { selectedUnitId, validSiegeTile, units } = get();
      const unit = units.find(u => u.id === selectedUnitId);
      if (selectedUnitId && validSiegeTile && unit) {
           get().executeAiAction({ type: 'SIEGE', unitId: selectedUnitId, tileId: validSiegeTile, cost: UNIT_STATS[unit.type].attackCost });
      }
  },

  demolishBarrier: () => {
      const { selectedUnitId, validDemolishTile, units } = get();
      const unit = units.find(u => u.id === selectedUnitId);
      if (selectedUnitId && validDemolishTile && unit) {
           get().executeAiAction({ type: 'DEMOLISH', unitId: selectedUnitId, tileId: validDemolishTile, cost: UNIT_STATS[unit.type].attackCost });
      }
  },

  lootSupply: () => {
      const { selectedUnitId, validLootTile } = get();
      if (selectedUnitId && validLootTile) {
          get().executeAiAction({ type: 'LOOT', unitId: selectedUnitId, tileId: validLootTile, cost: 4 });
      }
  },

  resolveBankReward: (choice) => {
      const { bankRewardPending, playerGold, playerCp, mapData } = get();
      if (!bankRewardPending) return;
      
      const tile = mapData.find(t => t.id === bankRewardPending.tileId);
      const goldReward = tile?.bankGoldReward || GOLD_SETTINGS.HEIST_REWARD_GOLD;
      const cpReward = tile?.bankCpReward || GOLD_SETTINGS.HEIST_REWARD_CP;
      
      const pid = bankRewardPending.playerId;
      if (choice === 'GOLD') {
          set({ 
              playerGold: { ...playerGold, [pid]: playerGold[pid] + goldReward },
              bankRewardPending: null 
          });
      } else {
          set({ 
              playerCp: { ...playerCp, [pid]: playerCp[pid] + cpReward },
              bankRewardPending: null 
          });
      }
  },

  buyShopItem: (itemKey: string, variant?: string) => {
      const { currentPlayer, playerGold, mapData, pendingDrops, gridSize, totalTurns } = get();
      const item = SHOP_ITEMS[itemKey as keyof typeof SHOP_ITEMS];
      if (playerGold[currentPlayer] < item.cost) return;

      const currentRound = totalTurns + 1;

      // Handle Construction Items (Barrier / Bridge)
      if (item.type === 'CONSTRUCT') {
          set({
              placementMode: { active: true, itemKey, cost: item.cost, variant },
              selectedUnitId: null, // Clear selection
              validMoveTiles: []
          });
          return;
      }

      // Handle Consumables (Drops)
      if (item.type === 'CONSUMABLE') {
          const newGold = playerGold[currentPlayer] - item.cost;
          const lootType: 'AMMO' | 'MEDKIT' = itemKey === 'AMMO_REFILL' ? 'AMMO' : 'MEDKIT';
          const base = mapData.find(t => t.type === 'BASE' && t.owner === currentPlayer);
          let targetTileId = base?.id;
          
          if (base) {
              for(let i=0; i<20; i++) {
                  const dist = 3 + Math.floor(Math.random() * 7); 
                  const angle = Math.random() * Math.PI * 2;
                  const rx = Math.round(base.x + Math.cos(angle) * dist);
                  const ry = Math.round(base.y + Math.sin(angle) * dist);

                  if (rx >= 0 && rx < gridSize && ry >= 0 && ry < gridSize) {
                       const t = mapData[ry * gridSize + rx];
                       if (t && !t.loot && 
                           t.type !== 'WATER' && 
                           t.type !== 'BARRIER' && 
                           t.type !== 'BASE' && 
                           t.type !== 'BUILDING' &&
                           t.type !== 'BANK' &&
                           t.hazardState !== 'LAVA' &&
                           t.type !== 'CANYON'
                       ) {
                           targetTileId = t.id;
                           break;
                       }
                  }
              }
          }

          if (targetTileId) {
              const newDrop: PendingDrop = {
                  playerId: currentPlayer,
                  tileId: targetTileId,
                  item: lootType
              };
              
              const logEntry = createLog(currentRound, currentPlayer, `Purchased ${item.name}`, 'ECONOMY');

              set({
                  playerGold: { ...playerGold, [currentPlayer]: newGold },
                  pendingDrops: [...pendingDrops, newDrop],
                  gameLog: [logEntry, ...get().gameLog]
              });
          }
      }
  },

  cancelPlacement: () => {
      set({ placementMode: null });
  },

  endTurn: () => {
    get().executeAiAction({ type: 'END_TURN' });
  },

  // ... (AI Loop remains the same)
  runAiLoop: () => {
      const { isAiTurn, winner, settings } = get();
      if (!isAiTurn || winner !== null || settings.gameMode !== 'PVE') return;

      setTimeout(() => {
          const state = get();
          if (state.winner !== null) return;
          const action = getBestAIAction({
              mapData: state.mapData,
              units: state.units,
              currentPlayer: state.currentPlayer,
              playerCp: state.playerCp[state.currentPlayer],
              playerGold: state.playerGold[state.currentPlayer],
              playerInventory: state.playerInventory[state.currentPlayer],
              weather: state.weather,
              difficulty: state.settings.aiDifficulty,
              graveyard: state.graveyard,
              victoryMode: state.settings.victoryMode, 
              gridSize: state.gridSize,
              settings: state.settings,
              totalTurns: state.totalTurns
          });
          get().executeAiAction(action);
      }, 700);
  },

  executeAiAction: (action) => {
    const state = get();
    const { mapData, units, currentPlayer, playerCp, playerGold, graveyard, settings, weather, playerRespawns, totalTurns, turnCounter, playerStatus, gridSize, bankRewardPending, pendingDrops, playerInventory } = state;
    
    // GUARD CLAUSE: Check CP cost (except for turn end)
    if (action.type !== 'END_TURN' && playerCp[currentPlayer] < (action as any).cost) {
        console.error("Not enough CP for action", action);
        // Force end turn if AI can't afford move to prevent loop hang
        if (state.isAiTurn) {
             console.warn("Forcing AI End Turn due to CP error");
             get().executeAiAction({ type: 'END_TURN' });
        }
        return;
    }

    let newMap = [...mapData];
    let newUnits = [...units];
    let newCp = playerCp[currentPlayer];
    let newGold = playerGold[currentPlayer];
    let newGraveyard = [...graveyard];
    let newWinner = state.winner;
    let newTotalTurns = totalTurns;
    let nextPlayerStatus = { ...playerStatus };
    let newWeather = { ...weather };
    let newBankReward = bankRewardPending;

    let nextPlayerCp = { ...playerCp };
    let nextPlayerGold = { ...playerGold };
    let nextPlayerRespawns = { ...playerRespawns };
    let nextPlayerInventory = { ...playerInventory };

    // Logging Setup
    let logEntry: LogEntry | null = null;
    let extraLogs: LogEntry[] = [];
    
    // Current Round (Total Turns + 1)
    const currentRound = totalTurns + 1;

    if (action.type !== 'END_TURN') {
        newCp -= (action as any).cost;
        nextPlayerCp[currentPlayer] = newCp;
    }

    switch (action.type) {
        case 'MOVE': {
             const mUnit = newUnits.find(u => u.id === action.unitId);
             if (mUnit) {
                 const tile = newMap.find(t => t.id === action.targetTileId);
                 
                 // CHECK FOR QUICKSAND
                 const isQuicksand = tile?.type === 'QUICKSAND';

                 newUnits = newUnits.map(u => u.id === action.unitId ? { 
                     ...u, 
                     tileId: action.targetTileId, 
                     hasMoved: true,
                     isRooted: isQuicksand // Apply root if moving onto Quicksand
                 } : u);
                 
                 logEntry = createLog(currentRound, currentPlayer, `${UNIT_STATS[mUnit.type].name} moved to (${tile?.x},${tile?.y})`, 'MOVE');
                 if (isQuicksand) {
                     extraLogs.push(createLog(currentRound, currentPlayer, `${UNIT_STATS[mUnit.type].name} stuck in Quicksand!`, 'INFO'));
                 }
             }
             break;
        }
        case 'LOOT': {
            const unit = newUnits.find(u => u.id === action.unitId);
            const tile = newMap.find(t => t.id === action.tileId);
            if (unit && tile && tile.loot) {
                // Change: Loot goes to Inventory instead of instant usage
                const lootItem = tile.loot;
                const currentInv = nextPlayerInventory[currentPlayer] || [];
                nextPlayerInventory[currentPlayer] = [...currentInv, lootItem];

                newUnits = newUnits.map(u => u.id === unit.id ? { 
                     ...u, completed: true
                } : u);
                
                newMap = newMap.map(t => t.id === tile.id ? { ...t, loot: null } : t);
                logEntry = createLog(currentRound, currentPlayer, `${UNIT_STATS[unit.type].name} retrieved ${lootItem} to Inventory`, 'ECONOMY');
            }
            break;
        }
        case 'USE_ITEM': {
             const itemIndex = (action as any).itemIndex;
             const inv = nextPlayerInventory[currentPlayer];
             if (inv && inv[itemIndex]) {
                 const item = inv[itemIndex];
                 const unit = newUnits.find(u => u.id === action.unitId);
                 
                 if (unit) {
                     if (item === 'MEDKIT') {
                         newUnits = newUnits.map(u => u.id === unit.id ? { ...u, hp: UNIT_STATS[u.type].hp } : u);
                     } else if (item === 'AMMO') {
                         newUnits = newUnits.map(u => u.id === unit.id ? { ...u, ammo: UNIT_STATS[u.type].maxAmmo } : u);
                     }
                     
                     // Remove from inventory
                     const newInvList = [...inv];
                     newInvList.splice(itemIndex, 1);
                     nextPlayerInventory[currentPlayer] = newInvList;
                     
                     logEntry = createLog(currentRound, currentPlayer, `Used ${item} on ${UNIT_STATS[unit.type].name}`, 'ECONOMY');
                 }
             }
             break;
        }
        case 'SECURE': {
             const unit = newUnits.find(u => u.id === action.unitId);
             if (unit) {
                 newMap = newMap.map(t => t.id === action.tileId ? { ...t, owner: currentPlayer } : t);
                 newUnits = newUnits.map(u => u.id === action.unitId ? { ...u, completed: true } : u);
                 logEntry = createLog(currentRound, currentPlayer, `Secured a Building`, 'ECONOMY');
             }
             break;
        }
        case 'HEIST': {
             const unit = newUnits.find(u => u.id === action.unitId);
             if (unit) {
                 newUnits = newUnits.map(u => u.id === action.unitId ? { ...u, completed: true } : u);
                 newMap = newMap.map(t => {
                     if (t.id === action.tileId) {
                         return { ...t, hackProgress: 100 }; 
                     }
                     return t;
                 });
                 newBankReward = { tileId: action.tileId, playerId: currentPlayer };
                 logEntry = createLog(currentRound, currentPlayer, `Heist Successful! Bank Vault Breached`, 'ECONOMY');
             }
             break;
        }
        case 'ATTACK': {
             const att = newUnits.find(u => u.id === action.attackerId);
             const tar = newUnits.find(u => u.id === action.targetUnitId);
             if (att && tar) {
                const attTile = mapData.find(t => t.id === att.tileId);
                const tarTile = mapData.find(t => t.id === tar.tileId);
                let defense = TERRAIN_DEFENSE[tarTile!.type];
                if (tarTile?.type === 'BUILDING' && tarTile.subType === 'BUNKER' && tarTile.owner === tar.owner) {
                    defense = BUILDING_STATS.BUNKER.defense;
                }
                const dmg = UNIT_STATS[att.type].damage; 
                // Defense calculation handles negatives (Sand) correctly
                const finalDmg = Math.floor(dmg * (1 - defense));
                const remainingHp = tar.hp - finalDmg;

                // FX: Bullet & Impact
                if (attTile && tarTile) {
                    const sx = attTile.x * TILE_SIZE + TILE_SIZE/2;
                    const sy = attTile.y * TILE_SIZE + TILE_SIZE/2;
                    const ex = tarTile.x * TILE_SIZE + TILE_SIZE/2;
                    const ey = tarTile.y * TILE_SIZE + TILE_SIZE/2;
                    
                    useEffectStore.getState().addProjectile(sx, sy, ex, ey, 'BULLET');
                    
                    // Delay damage popup slightly to match bullet travel (optional, but 0ms usually fine for instant feedback)
                    useEffectStore.getState().addDamagePopup(ex, ey - 10, `-${finalDmg}`, '#FF0000');
                    useEffectStore.getState().triggerScreenShake(finalDmg > 5 ? 12 : 4);
                }
                
                newUnits = newUnits.map(u => {
                    if (u.id === tar.id) return { ...u, hp: remainingHp };
                    if (u.id === att.id) return { ...u, completed: true, ammo: u.ammo - 1 };
                    return u;
                });

                let msg = `${UNIT_STATS[att.type].name} hit ${UNIT_STATS[tar.type].name} for ${finalDmg} dmg`;

                if (remainingHp <= 0) {
                    newUnits = newUnits.filter(u => u.id !== tar.id);
                    newGraveyard.push({
                        id: tar.id, type: tar.type, owner: tar.owner,
                        turnsUntilRespawn: RESPAWN_TIMERS[tar.type]
                    });
                    msg += " (KILL)";
                }
                logEntry = createLog(currentRound, currentPlayer, msg, 'COMBAT');
             }
             break;
        }
        case 'SIEGE': {
            const att = newUnits.find(u => u.id === action.unitId);
            const baseTile = newMap.find(t => t.id === action.tileId);
            if (att && baseTile && baseTile.hp !== undefined) {
                 const newHp = Math.max(0, baseTile.hp - 5); 
                 newMap = newMap.map(t => t.id === action.tileId ? { ...t, hp: newHp } : t);
                 newUnits = newUnits.map(u => u.id === att.id ? { ...u, completed: true, ammo: u.ammo - 1 } : u);
                 
                 // FX
                 const attTile = mapData.find(t => t.id === att.tileId);
                 if (attTile) {
                     const sx = attTile.x * TILE_SIZE + TILE_SIZE/2;
                     const sy = attTile.y * TILE_SIZE + TILE_SIZE/2;
                     const ex = baseTile.x * TILE_SIZE + TILE_SIZE/2;
                     const ey = baseTile.y * TILE_SIZE + TILE_SIZE/2;
                     useEffectStore.getState().addProjectile(sx, sy, ex, ey, 'MISSILE'); // Siege uses Missile
                     useEffectStore.getState().addDamagePopup(ex, ey - 20, `-5`, '#FF4500');
                     useEffectStore.getState().triggerScreenShake(8);
                 }

                 let msg = `${UNIT_STATS[att.type].name} sieged Base (-5 HP)`;
                 if (newHp === 0) {
                     const eliminatedId = baseTile.owner!;
                     nextPlayerStatus[eliminatedId] = 'ELIMINATED';
                     newUnits = newUnits.filter(u => u.owner !== eliminatedId);
                     msg += " - BASE DESTROYED";
                 }
                 logEntry = createLog(currentRound, currentPlayer, msg, 'COMBAT');
            }
            break;
        }
        case 'DEMOLISH': {
            const att = newUnits.find(u => u.id === action.unitId);
            const barrierTile = newMap.find(t => t.id === action.tileId);
            if (att && barrierTile && barrierTile.hp !== undefined) {
                 const dmg = UNIT_STATS[att.type].damage; // Use full damage against barrier
                 const newHp = Math.max(0, barrierTile.hp - dmg);
                 
                 // FX
                 const attTile = mapData.find(t => t.id === att.tileId);
                 if (attTile) {
                     const sx = attTile.x * TILE_SIZE + TILE_SIZE/2;
                     const sy = attTile.y * TILE_SIZE + TILE_SIZE/2;
                     const ex = barrierTile.x * TILE_SIZE + TILE_SIZE/2;
                     const ey = barrierTile.y * TILE_SIZE + TILE_SIZE/2;
                     useEffectStore.getState().addProjectile(sx, sy, ex, ey, 'MISSILE'); 
                     useEffectStore.getState().addDamagePopup(ex, ey - 20, `-${dmg}`, '#FFA500');
                     useEffectStore.getState().triggerScreenShake(5);
                 }

                 newMap = newMap.map(t => t.id === action.tileId ? { ...t, hp: newHp } : t);
                 newUnits = newUnits.map(u => u.id === att.id ? { ...u, completed: true, ammo: u.ammo - 1 } : u);
                 
                 let msg = `${UNIT_STATS[att.type].name} attacked Barrier (-${dmg} HP)`;
                 if (newHp === 0) {
                     // Destroy Barrier -> Plains
                     newMap = newMap.map(t => t.id === action.tileId ? { ...t, type: 'PLAINS', hp: undefined, maxHp: undefined, height: 1 } : t);
                     msg = `${UNIT_STATS[att.type].name} destroyed a Barrier!`;
                 }
                 logEntry = createLog(currentRound, currentPlayer, msg, 'COMBAT');
            }
            break;
        }
        case 'SPAWN': {
             const goldCost = (action as any).goldCost || 0; 
             newGold -= goldCost;
             nextPlayerGold[currentPlayer] = newGold;

             if (action.deadUnitId) {
                  newGraveyard = newGraveyard.filter(u => u.id !== action.deadUnitId);
                  nextPlayerRespawns[currentPlayer] += 1;
                  newUnits.push({
                      id: action.deadUnitId, type: action.unitType, owner: currentPlayer,
                      tileId: action.tileId, hp: UNIT_STATS[action.unitType as UnitType].hp,
                      ammo: UNIT_STATS[action.unitType as UnitType].ammo,
                      maxAmmo: UNIT_STATS[action.unitType as UnitType].maxAmmo,
                      hasMoved: true, completed: true
                  });
                  logEntry = createLog(currentRound, currentPlayer, `Redeployed ${UNIT_STATS[action.unitType as UnitType].name}`, 'ECONOMY');
             }
             break;
        }
        case 'BUY_DROP': {
            const goldCost = (action as any).goldCost || 0;
            const itemKey = (action as any).itemKey;
            newGold -= goldCost;
            nextPlayerGold[currentPlayer] = newGold;
            
            // For AI, we can directly modify the tile with loot since it's instant
            // But to keep consistency with the turn structure, we'll spawn the loot on the tile
            const lootItem = itemKey === 'AMMO_REFILL' ? 'AMMO' : 'MEDKIT';
            newMap = newMap.map(t => t.id === action.tileId ? { ...t, loot: lootItem } : t);
            
            logEntry = createLog(currentRound, currentPlayer, `Purchased ${SHOP_ITEMS[itemKey as keyof typeof SHOP_ITEMS].name}`, 'ECONOMY');
            break;
        }
        case 'END_TURN': {
            logEntry = createLog(currentRound, currentPlayer, `Ended Turn`, 'INFO');
            
            if (pendingDrops.length > 0) {
                 pendingDrops.forEach(drop => {
                     newMap = newMap.map(t => {
                         if (t.id === drop.tileId) {
                             return { ...t, loot: drop.item };
                         }
                         return t;
                     });
                 });
            }

            let nextId = (currentPlayer + 1) % settings.playerCount;
            let loopCount = 0;
            while (nextPlayerStatus[nextId] === 'ELIMINATED' && loopCount < settings.playerCount) {
                nextId = (nextId + 1) % settings.playerCount;
                loopCount++;
            }
            
            if (nextId === 0 || nextId < currentPlayer) newTotalTurns += 1;
            const newTurnCounter = turnCounter + 1;

            if (newTurnCounter > 0 && newTurnCounter % 5 === 0 && settings.dynamicWeather) {
                 Object.keys(newWeather.playerZones).forEach(key => {
                     const pid = parseInt(key);
                     newWeather.playerZones[pid] = rollWeather();
                 });
                 newWeather.turnsRemaining = 5;
            } else {
                 newWeather.turnsRemaining = 5 - (newTurnCounter % 5);
            }

            const cp = nextPlayerCp[nextId];
            nextPlayerCp[nextId] = Math.min(CP_SYSTEM.MAX_CP, cp + CP_SYSTEM.REGEN_AMOUNT);
            nextPlayerGold[nextId] += GOLD_SETTINGS.INCOME_PER_TURN;

            newGraveyard = newGraveyard.map(u => {
                if (u.owner === nextId && u.turnsUntilRespawn > 0) return { ...u, turnsUntilRespawn: u.turnsUntilRespawn - 1 };
                return u;
            });

            newUnits = newUnits.map(u => {
                if (u.owner === nextId) {
                    // RESET PHASE
                    // If Rooted, hasMoved becomes true (cannot move), but completed is false (can act)
                    // If not Rooted, fresh turn.
                    return { 
                        ...u, 
                        hasMoved: u.isRooted ? true : false, 
                        completed: false,
                        isRooted: false // Clear root for *next* turn (they are penalized *this* turn by hasMoved=true)
                        // Actually, wait: If they end turn on Quicksand, they get rooted for NEXT turn.
                        // So we should check the TILE they are on now.
                    };
                }
                return u;
            });
            
            // Re-apply Root status based on current tile position for the ACTIVE player
            // This ensures if they stayed in Quicksand, they get rooted again.
            // If they just moved into Quicksand last turn, the 'MOVE' action set isRooted=true.
            // The map above cleared it. We need to preserve it if it was set during the move phase? 
            // Better logic:
            // 1. Move sets isRooted=true if entering Quicksand.
            // 2. End Turn happens.
            // 3. Start Turn (above map): 
            //    If isRooted is true -> hasMoved=true.
            //    Then set isRooted=false (so they can move turn after, unless they stay).
            // But if they stay? The Move action doesn't trigger. 
            // So we need to check tile position here.
            
            newUnits = newUnits.map(u => {
                 if (u.owner === nextId) {
                     const tile = newMap.find(t => t.id === u.tileId);
                     const onQuicksand = tile?.type === 'QUICKSAND';
                     
                     // If they were rooted from previous move, or are standing on quicksand
                     const shouldBeRooted = u.isRooted || onQuicksand;
                     
                     return {
                         ...u,
                         hasMoved: shouldBeRooted ? true : false,
                         completed: false,
                         isRooted: false // Reset flag, the penalty is applied via hasMoved
                     };
                 }
                 return u;
            });

            // --- ENVIRONMENT ACTIONS (DOOMSDAY, TURRETS, ARTILLERY) ---
            
            // 1. DOOMSDAY
            if (settings.victoryMode === 'DEATHMATCH' && settings.doomsdayEnabled) {
                newMap = updateDoomsdayState(newMap, newTotalTurns, gridSize);
                const lavaTiles = new Set(newMap.filter(t => t.hazardState === 'LAVA').map(t => t.id));
                const meltingUnits = newUnits.filter(u => lavaTiles.has(u.tileId));
                
                if (meltingUnits.length > 0) {
                    newUnits = newUnits.filter(u => !lavaTiles.has(u.tileId));
                    meltingUnits.forEach(u => {
                        newGraveyard.push({ id: u.id, type: u.type, owner: u.owner, turnsUntilRespawn: RESPAWN_TIMERS[u.type] });
                        extraLogs.push(createLog(currentRound, -1, `${UNIT_STATS[u.type].name} melted in Lava!`, 'COMBAT'));
                    });
                }
            }

            // 2. BANK TURRETS
            const activeBanks = newMap.filter(t => t.type === 'BANK' && (t.hackProgress || 0) < 100);
            activeBanks.forEach(bank => {
                 const targetsInRange = newUnits.filter(u => {
                     const uTile = newMap.find(t => t.id === u.tileId)!;
                     const dist = Math.abs(uTile.x - bank.x) + Math.abs(uTile.y - bank.y);
                     return dist <= BANK_STATS.RANGE;
                 });
                 
                 if (targetsInRange.length > 0) {
                     targetsInRange.sort((a,b) => a.hp - b.hp);
                     const target = targetsInRange[0];
                     const newHp = target.hp - BANK_STATS.DAMAGE;
                     
                     extraLogs.push(createLog(currentRound, -1, `Bank Turret hit P${target.owner+1} ${UNIT_STATS[target.type].name} (-${BANK_STATS.DAMAGE} HP)`, 'COMBAT'));

                     newUnits = newUnits.map(u => u.id === target.id ? { ...u, hp: newHp } : u);
                     if (newHp <= 0) {
                          newUnits = newUnits.filter(u => u.id !== target.id);
                          newGraveyard.push({ id: target.id, type: target.type, owner: target.owner, turnsUntilRespawn: RESPAWN_TIMERS[target.type] });
                          extraLogs.push(createLog(currentRound, -1, `Bank Turret killed P${target.owner+1} ${UNIT_STATS[target.type].name}`, 'COMBAT'));
                     }
                 }
            });

            // 3. BASE ARTILLERY
            if (settings.victoryMode === 'CONQUER') {
                const myBases = newMap.filter(t => t.type === 'BASE' && t.owner === currentPlayer && (t.hp||0) > 0);
                const enemyUnits = newUnits.filter(u => u.owner !== currentPlayer);
                myBases.forEach(base => {
                    const targetsInRange = enemyUnits.filter(u => {
                        const tTile = newMap.find(t => t.id === u.tileId)!;
                        const dist = Math.abs(tTile.x - base.x) + Math.abs(tTile.y - base.y);
                        return dist <= BASE_STATS.RANGE;
                    });
                    if (targetsInRange.length > 0) {
                        targetsInRange.sort((a,b) => a.hp - b.hp);
                        const target = targetsInRange[0];
                        const dmg = 4;
                        const newHp = target.hp - dmg; 
                        
                        extraLogs.push(createLog(currentRound, -1, `Base Artillery hit P${target.owner+1} ${UNIT_STATS[target.type].name} (-${dmg} HP)`, 'COMBAT'));

                        newUnits = newUnits.map(u => u.id === target.id ? { ...u, hp: newHp } : u);
                        if (newHp <= 0) {
                             newUnits = newUnits.filter(u => u.id !== target.id);
                             newGraveyard.push({ id: target.id, type: target.type, owner: target.owner, turnsUntilRespawn: RESPAWN_TIMERS[target.type] });
                             extraLogs.push(createLog(currentRound, -1, `Base Artillery killed P${target.owner+1} ${UNIT_STATS[target.type].name}`, 'COMBAT'));
                        }
                    }
                });
            }

            const activePlayers = Object.entries(nextPlayerStatus).filter(([pid, status]) => status === 'ACTIVE').map(([pid]) => parseInt(pid));
            if (activePlayers.length === 1) {
                newWinner = activePlayers[0];
            }
            break;
        }
    }

    const nextPlayer = action.type === 'END_TURN' ? (currentPlayer + 1) % settings.playerCount : currentPlayer; 
    
    const actualNextPlayer = action.type === 'END_TURN' ? 
        (() => {
            let nextId = (state.currentPlayer + 1) % settings.playerCount;
            let loopCount = 0;
            while (nextPlayerStatus[nextId] === 'ELIMINATED' && loopCount < settings.playerCount) {
                nextId = (nextId + 1) % settings.playerCount;
                loopCount++;
            }
            return nextId;
        })() : currentPlayer;

    const vis = calculateVisibility(actualNextPlayer, newUnits, newMap, newWeather, settings.fogOfWar, gridSize);
    const updatedTurnCounter = action.type === 'END_TURN' ? (turnCounter + 1) : turnCounter;

    // Combine Logs
    const allNewLogs = [...extraLogs.reverse()];
    if (logEntry) allNewLogs.push(logEntry);

    set({
        mapData: newMap,
        units: newUnits,
        graveyard: newGraveyard,
        playerCp: nextPlayerCp,
        playerGold: nextPlayerGold,
        playerRespawns: nextPlayerRespawns,
        playerStatus: nextPlayerStatus,
        playerInventory: nextPlayerInventory,
        winner: newWinner,
        totalTurns: newTotalTurns,
        turnCounter: updatedTurnCounter,
        visibleTiles: vis,
        weather: newWeather,
        currentPlayer: actualNextPlayer,
        bankRewardPending: newBankReward,
        pendingDrops: action.type === 'END_TURN' ? [] : state.pendingDrops,
        selectedUnitId: null,
        selectedTileId: null,
        hoveredTileId: null,
        validMoveTiles: [],
        validAttackTargets: [],
        validSecureTile: null,
        validHeistTile: null,
        validSiegeTile: null,
        validLootTile: null,
        validDemolishTile: null,
        placementMode: null,
        gameLog: [...allNewLogs, ...state.gameLog],
        isAiTurn: (actualNextPlayer === 1 && settings.gameMode === 'PVE'),
        selectedInventoryItemIndex: null
    });

    if (actualNextPlayer === 1 && settings.gameMode === 'PVE') {
        get().runAiLoop();
    }
  }
}));
