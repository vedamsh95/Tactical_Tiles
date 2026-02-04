
import { Tile, Unit, GameSettings, WeatherState, AIDifficulty, VictoryMode } from '../types';
import { UNIT_STATS, TERRAIN_DEFENSE, UNIT_COSTS, CP_SYSTEM, SHOP_ITEMS, DOOMSDAY_SETTINGS } from '../constants/Config';
import { getValidMoves, hasLineOfSight, getManhattanDistance, calculateVisibility } from '../grid/Pathfinding';
import { findBestTarget } from './TargetingLogic';
import { getRingIndex } from '../grid/DoomsdayManager';

// AI Action Types
export type AIAction = 
  | { type: 'END_TURN' }
  | { type: 'MOVE'; unitId: string; targetTileId: string; cost: number }
  | { type: 'ATTACK'; attackerId: string; targetUnitId: string; cost: number }
  | { type: 'SECURE'; unitId: string; tileId: string; cost: number }
  | { type: 'HEIST'; unitId: string; tileId: string; cost: number }
  | { type: 'SIEGE'; unitId: string; tileId: string; cost: number }
  | { type: 'DEMOLISH'; unitId: string; tileId: string; cost: number }
  | { type: 'LOOT'; unitId: string; tileId: string; cost: number }
  | { type: 'BUY_DROP'; itemKey: string; tileId: string; cost: number; goldCost: number }
  | { type: 'USE_ITEM'; unitId: string; itemIndex: number; cost: number }
  | { type: 'SPAWN'; unitType: any; tileId: string; cost: number; goldCost: number; deadUnitId?: string };

interface GameStateProxy {
  mapData: Tile[];
  units: Unit[];
  currentPlayer: number;
  playerCp: number;
  playerGold: number;
  playerInventory: ('AMMO' | 'MEDKIT')[]; 
  weather: WeatherState;
  difficulty: AIDifficulty;
  graveyard: any[];
  victoryMode?: VictoryMode;
  gridSize: number;
  settings: GameSettings; 
  totalTurns: number; 
}

// --- 1. MOVEMENT EVALUATION (Tactical Positions) ---

const evaluatePosition = (
    tile: Tile, 
    unit: Unit, 
    map: Tile[], 
    enemies: Unit[], 
    difficulty: AIDifficulty, 
    victoryMode: VictoryMode | undefined,
    targetBase: Tile | undefined,
    doomsdayEnabled: boolean,
    totalTurns: number,
    gridSize: number,
    fogEnabled: boolean
): number => {
  let score = 0;
  const unitStats = UNIT_STATS[unit.type];

  // A. DOOMSDAY SURVIVAL (Priority #1)
  if (doomsdayEnabled) {
      const ring = getRingIndex(tile.x, tile.y, gridSize);
      const lavaTurn = DOOMSDAY_SETTINGS.START_TURN + (ring * DOOMSDAY_SETTINGS.SHRINK_INTERVAL);
      const turnsUntilDoom = lavaTurn - totalTurns;

      if (turnsUntilDoom <= 1) {
          score -= 5000; // RUN FOR YOUR LIFE
      } else if (turnsUntilDoom <= 5) {
          score -= 500; // Unsafe, move inward
      } else {
          // Slight preference for center even when safe
          score += ring * 2;
      }
  }

  // B. Terrain Defense & Bonuses
  // TERRAIN_DEFENSE contains negative values for Sand (-0.1).
  // score += -0.1 * 20 = -2. Correct penalty.
  const defense = TERRAIN_DEFENSE[tile.type] || 0;
  score += defense * 20;

  // Specific Avoidance
  if (tile.type === 'QUICKSAND') score -= 100; // Avoid rooting unless absolutely necessary
  if (tile.type === 'DUNES') score += 10; // Extra bonus for Dunes

  // C. Unit Specific Preferences
  if (unit.type === 'SNIPER') {
      if (tile.type === 'MOUNTAIN' || tile.type === 'DUNES') score += 60; // Snipers love high ground
      if (tile.type === 'BUILDING' && tile.owner === unit.owner) score += 40; 
  } else if (unit.type === 'ASSAULTER') {
      if (tile.type === 'FOREST') score += 20; // Assaulters use cover
  }

  // D. Threat & Range Assessment
  let minEnemyDist = 999;
  
  enemies.forEach(e => {
    const eTile = map.find(t => t.id === e.tileId)!;
    const d = getManhattanDistance(tile, eTile);
    if (d < minEnemyDist) {
        minEnemyDist = d;
    }
  });

  // Scouting Behavior (If no enemies visible in Fog)
  if (fogEnabled && enemies.length === 0) {
      // Conquer Mode: Scout towards enemy base
      if (victoryMode === 'CONQUER' && targetBase) {
          const distToBase = getManhattanDistance(tile, targetBase);
          score -= distToBase * 4; // Heavily weight moving to base
      } else {
          // Deathmatch: Move to center/patrol
          const centerDist = Math.abs(tile.x - gridSize/2) + Math.abs(tile.y - gridSize/2);
          score -= centerDist * 2;
          
          // Visit POIs to find enemies
          if (tile.type === 'BUILDING' || tile.type === 'BANK') score += 20;
      }
  } else if (enemies.length > 0) {
      // Default Combat Logic
      if (difficulty === 'EASY') {
          score += Math.random() * 20;
          if (minEnemyDist === 1) score += 10;
      } else {
          const optimalRange = unitStats.range;

          if (unit.type === 'SNIPER') {
              if (minEnemyDist < 3) score -= 60; // DANGER
              else if (minEnemyDist <= optimalRange) score += 40; 
              else score -= (minEnemyDist - optimalRange) * 5; 
          } else if (unit.type === 'ASSAULTER') {
              if (minEnemyDist <= 2) score += 40;
              else score -= minEnemyDist * 3; 
          } else {
              if (minEnemyDist <= optimalRange) score += 25;
              else score -= minEnemyDist * 2;
          }
      }
  }

  // E. Objectives
  // 1. Capture Buildings (Secure)
  if (tile.type === 'BUILDING' && tile.owner !== unit.owner) {
      score += 70;
  }
  
  // 2. Heist Banks (Money)
  if (tile.type === 'BANK' && (tile.hackProgress || 0) < 100) {
      score += 60; 
  }

  // 3. Loot Drops (Supplies)
  if (tile.loot) {
      // AI knows loot goes to inventory now, so it's always valuable to pick up
      score += 80;
  }

  // F. Base Siege (Conquer Mode)
  if (victoryMode === 'CONQUER' && targetBase) {
      const distToBase = getManhattanDistance(tile, targetBase);
      // Being in range of base is HUGE priority in Conquer
      if (distToBase <= unitStats.range) score += 80; 
      else score -= distToBase * 2; // Move aggressively to base
  } 

  // G. Survival (Hard Mode)
  if (difficulty === 'HARD' && unit.hp < unitStats.hp * 0.4) {
      if (defense > 0) score += 50; // Seek cover when low
      if (minEnemyDist < 3) score -= 40; // Run away
  }

  return score;
};

// --- 2. SHOP LOGIC (Logistics) ---

const checkShop = (gameState: GameStateProxy, myUnits: Unit[]): AIAction | null => {
    const { playerGold, playerCp, mapData, difficulty, currentPlayer } = gameState;
    
    // AI needs at least 4 CP to LOOT after buying, otherwise it's a waste of a turn/risk
    // Exception: If we are just stocking up for next turn (Advanced logic, maybe later)
    if (playerCp < 4 && difficulty !== 'EASY') return null;

    // Easy AI doesn't use the shop efficiently
    if (difficulty === 'EASY') return null;

    // Check if any unit needs supplies
    for (const unit of myUnits) {
        const stats = UNIT_STATS[unit.type];
        const tile = mapData.find(t => t.id === unit.tileId);
        if (!tile) continue;

        // Needs Health?
        if (unit.hp <= stats.hp * 0.6 && playerGold >= SHOP_ITEMS.MEDKIT.cost) {
            const dropTile = findEmptyAdjacent(tile, mapData);
            if (dropTile) {
                return { 
                    type: 'BUY_DROP', 
                    itemKey: 'MEDKIT', 
                    tileId: dropTile.id, 
                    cost: 0, 
                    goldCost: SHOP_ITEMS.MEDKIT.cost 
                };
            }
        }

        // Needs Ammo?
        if (unit.ammo <= 1 && playerGold >= SHOP_ITEMS.AMMO_REFILL.cost) {
            const dropTile = findEmptyAdjacent(tile, mapData);
            if (dropTile) {
                return { 
                    type: 'BUY_DROP', 
                    itemKey: 'AMMO_REFILL', 
                    tileId: dropTile.id, 
                    cost: 0, 
                    goldCost: SHOP_ITEMS.AMMO_REFILL.cost 
                };
            }
        }
    }
    return null;
};

const checkInventory = (gameState: GameStateProxy, myUnits: Unit[]): AIAction | null => {
    const { playerInventory } = gameState;
    if (playerInventory.length === 0) return null;

    for (const unit of myUnits) {
        const stats = UNIT_STATS[unit.type];
        
        // Check for Medkit needs
        const medIndex = playerInventory.indexOf('MEDKIT');
        if (medIndex !== -1 && unit.hp <= stats.hp * 0.5) {
            return { type: 'USE_ITEM', unitId: unit.id, itemIndex: medIndex, cost: 0 };
        }

        // Check for Ammo needs
        const ammoIndex = playerInventory.indexOf('AMMO');
        if (ammoIndex !== -1 && unit.ammo <= 1) {
            return { type: 'USE_ITEM', unitId: unit.id, itemIndex: ammoIndex, cost: 0 };
        }
    }
    return null;
}

const findEmptyAdjacent = (center: Tile, map: Tile[]): Tile | null => {
    const adj = getNeighbors(center, map);
    // Prioritize tiles that provide cover? No, just valid placement.
    return adj.find(t => 
        t.type !== 'WATER' && 
        t.type !== 'BARRIER' && 
        t.type !== 'BASE' && 
        t.type !== 'BUILDING' && 
        t.type !== 'BANK' &&
        t.type !== 'CANYON' &&
        t.type !== 'QUICKSAND' &&
        !t.loot &&
        t.hazardState !== 'LAVA'
    ) || null;
};

// --- 3. REINFORCEMENTS (Spawning) ---

const checkSpawn = (gameState: GameStateProxy): AIAction | null => {
    const { playerGold, graveyard, mapData, currentPlayer, units, difficulty } = gameState;
    
    const occupied = new Set(units.map(u => u.tileId));
    const bases = mapData.filter(t => t.type === 'BASE' && t.owner === currentPlayer && !occupied.has(t.id));

    if (bases.length === 0) return null;

    const affordable = graveyard.filter(u => u.owner === currentPlayer && u.turnsUntilRespawn === 0 && playerGold >= UNIT_COSTS[u.type]);
    
    if (affordable.length === 0) return null;

    // Selection Logic based on Difficulty
    let choice: any = affordable[0];

    if (difficulty === 'HARD') {
        // Hard AI buys the most expensive unit available (usually strongest)
        affordable.sort((a,b) => UNIT_COSTS[b.type] - UNIT_COSTS[a.type]);
        choice = affordable[0];
    } else if (difficulty === 'MEDIUM') {
        choice = affordable[Math.floor(Math.random() * affordable.length)];
    } else {
        // Easy AI buys cheapest (swarms)
        affordable.sort((a,b) => UNIT_COSTS[a.type] - UNIT_COSTS[b.type]);
        choice = affordable[0];
    }

    return { 
        type: 'SPAWN', 
        unitType: choice.type, 
        tileId: bases[0].id, 
        cost: 0, 
        goldCost: UNIT_COSTS[choice.type], 
        deadUnitId: choice.id 
    };
};

// --- MAIN AI LOOP ---

export const getBestAIAction = (gameState: GameStateProxy): AIAction => {
  const { mapData, units, currentPlayer, playerCp, difficulty, weather, victoryMode, gridSize, settings, totalTurns } = gameState;
  const myUnits = units.filter(u => u.owner === currentPlayer && !u.completed && !u.isRooted);
  
  // FOG OF WAR LOGIC: Filter visible enemies
  let enemyUnits = units.filter(u => u.owner !== currentPlayer);
  if (settings.fogOfWar) {
      // Calculate what AI can see
      const aiVisible = calculateVisibility(currentPlayer, units, mapData, weather, true, gridSize);
      enemyUnits = enemyUnits.filter(u => aiVisible.has(u.tileId));
  }

  // 0. Use Inventory (Free action)
  const inventoryAction = checkInventory(gameState, myUnits);
  if (inventoryAction) return inventoryAction;

  // 1. Reinforcements (First Priority if rich)
  const spawnAction = checkSpawn(gameState);
  if (spawnAction) return spawnAction;

  // 2. Logistics (Buy items if needed)
  const shopAction = checkShop(gameState, myUnits);
  if (shopAction) return shopAction;

  if (myUnits.length === 0) return { type: 'END_TURN' };

  let bestAction: AIAction = { type: 'END_TURN' };
  let bestScore = -Infinity;

  // Locate Enemy Base
  const enemyBase = victoryMode === 'CONQUER' ? mapData.find(t => t.type === 'BASE' && t.owner !== currentPlayer && (t.hp||0) > 0) : undefined;

  for (const unit of myUnits) {
    const unitStats = UNIT_STATS[unit.type];
    const uTile = mapData.find(t => t.id === unit.tileId)!;
    const adj = [uTile, ...getNeighbors(uTile, mapData)]; 

    // --- INTERACTION ACTIONS (High Priority) ---
    
    // A. Loot (Drone Supplies)
    if (playerCp >= 4) {
        const lootTile = adj.find(t => t.loot !== null && t.loot !== undefined);
        if (lootTile) {
            // High priority
            let priority = 150; 
            if (priority > bestScore) {
                bestScore = priority;
                bestAction = { type: 'LOOT', unitId: unit.id, tileId: lootTile.id, cost: 4 };
            }
        }
    }

    // B. Secure Buildings / Heist Banks
    if (playerCp >= 4) { 
        const b = adj.find(t => t.type === 'BUILDING' && t.owner !== currentPlayer);
        if (b && bestScore < 100) { 
             bestAction = { type: 'SECURE', unitId: unit.id, tileId: b.id, cost: 4 };
             bestScore = 100; // Securing territory is very important
        }
        
        const bank = adj.find(t => t.type === 'BANK' && (t.hackProgress || 0) < 100);
        if (bank && bestScore < 110) {
             bestAction = { type: 'HEIST', unitId: unit.id, tileId: bank.id, cost: 4 };
             bestScore = 110; // Money is power
        }
    }

    // --- COMBAT ACTIONS (Only against Visible Enemies) ---

    // C. Attack Unit
    if (playerCp >= unitStats.attackCost && unit.ammo > 0) {
        const result = findBestTarget(unit, [...myUnits, ...enemyUnits], mapData, difficulty, weather, gridSize);
        if (result) {
            if (result.score > bestScore) {
                bestScore = result.score;
                bestAction = { type: 'ATTACK', attackerId: unit.id, targetUnitId: result.unit.id, cost: unitStats.attackCost };
            }
        }
    }

    // D. Siege Base (The Winning Move)
    if (enemyBase && playerCp >= unitStats.attackCost && unit.ammo > 0) {
         // In Fog of War, you might know WHERE the base is, but you need LOS to shoot it.
         const dist = getManhattanDistance(uTile, enemyBase);
         if (dist <= unitStats.range) {
             const hasLOS = hasLineOfSight(uTile, enemyBase, mapData, unit.type, weather, gridSize);
             if (hasLOS) {
                 let siegeScore = 120; // Base attack > Unit attack usually
                 if ((enemyBase.hp || 50) <= 5) siegeScore = 9999; // WIN THE GAME NOW
                 else if (unit.type === 'SNIPER') siegeScore += 50; 

                 if (siegeScore > bestScore) {
                     bestScore = siegeScore;
                     bestAction = { type: 'SIEGE', unitId: unit.id, tileId: enemyBase.id, cost: unitStats.attackCost };
                 }
             }
         }
    }

    // E. Demolish Barriers
    if (playerCp >= unitStats.attackCost && unit.ammo > 0) {
        // Check visible barriers in range
        const visibleBarriers = mapData.filter(t => 
            t.type === 'BARRIER' && 
            t.hp !== undefined && t.hp > 0 && 
            getManhattanDistance(uTile, t) <= unitStats.range
        );
        
        for (const barrier of visibleBarriers) {
            const hasLOS = hasLineOfSight(uTile, barrier, mapData, unit.type, weather, gridSize);
            if (hasLOS) {
                let demolishScore = 20; // Low priority
                if (unit.type === 'ASSAULTER') demolishScore += 20; // Breachers like destroying barriers
                
                if (demolishScore > bestScore) {
                    bestScore = demolishScore;
                    bestAction = { type: 'DEMOLISH', unitId: unit.id, tileId: barrier.id, cost: unitStats.attackCost };
                }
            }
        }
    }

    // --- MOVEMENT ACTIONS ---
    if (!unit.hasMoved) {
        const moveMap = getValidMoves(uTile, playerCp, mapData, units, unit.type, currentPlayer, weather, gridSize);
        for (const [tileId, cost] of moveMap) {
            const destTile = mapData.find(t => t.id === tileId)!;
            
            let score = evaluatePosition(
                destTile, unit, mapData, enemyUnits, difficulty, victoryMode, 
                enemyBase, settings.doomsdayEnabled, totalTurns, gridSize, settings.fogOfWar
            );
            
            // Heuristic Adjustments
            score -= cost * 2; // Penalty for using CP
            score += 10; // Bias to move rather than idle

            // Check if move puts us in range of interactions
            const neighbors = getNeighbors(destTile, mapData);
            if (neighbors.some(n => n.type === 'BANK' && (n.hackProgress||0) < 100)) score += 30;
            if (neighbors.some(n => n.type === 'BUILDING' && n.owner !== currentPlayer)) score += 30;

            if (score > bestScore) {
                bestScore = score;
                bestAction = { type: 'MOVE', unitId: unit.id, targetTileId: tileId, cost: cost };
            }
        }
    }
  }

  // Pass Turn Logic
  // If the best action is a move, but the score is low, just end turn to save CP for next round
  if (difficulty === 'HARD' && bestScore < 20 && bestAction.type === 'MOVE') {
      return { type: 'END_TURN' };
  }

  return bestAction;
};

const getNeighbors = (tile: Tile, map: Tile[]) => {
    return [
        map.find(t => t.x === tile.x+1 && t.y === tile.y),
        map.find(t => t.x === tile.x-1 && t.y === tile.y),
        map.find(t => t.x === tile.x && t.y === tile.y+1),
        map.find(t => t.x === tile.x && t.y === tile.y-1),
    ].filter(t => t !== undefined) as Tile[];
};
