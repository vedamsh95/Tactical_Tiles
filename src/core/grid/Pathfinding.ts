
import { Tile, Unit, UnitType, WeatherState, WeatherType } from '../types';
import { TERRAIN_COSTS, UNIT_STATS, BUILDING_STATS } from '../constants/Config';

interface MoveNode {
  x: number;
  y: number;
  cost: number;
}

export const getManhattanDistance = (t1: Tile, t2: Tile): number => {
  return Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y);
};

// Check if a tile is visible under current weather conditions
const isTileVisibleInWeather = (start: Tile, end: Tile, weatherState: WeatherState): boolean => {
  const dist = getManhattanDistance(start, end);
  
  // Determine weather at the *viewer's* location (Start Tile)
  // Use the Voronoi zone of the start tile
  const zoneId = start.zone !== undefined ? start.zone : -1;
  const weather = zoneId >= 0 && weatherState.playerZones[zoneId] ? weatherState.playerZones[zoneId] : 'CLEAR';

  if (weather === 'FOG') {
    // Fog Cap: Max vision 2 tiles
    if (dist > 2) return false;
  }
  
  if (weather === 'SANDSTORM') {
      // Sandstorm Cap: Max vision 3 tiles
      if (dist > 3) return false;
  }
  
  return true;
};

// Bresenham's Line Algorithm to check Line of Sight
export const hasLineOfSight = (start: Tile, end: Tile, mapData: Tile[], unitType: UnitType, weatherState: WeatherState, gridSize: number): boolean => {
  // 1. Check Weather Visibility first
  if (!isTileVisibleInWeather(start, end, weatherState)) return false;

  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  const attackerHeight = start.height;

  while (true) {
    if (x0 === x1 && y0 === y1) break;

    const tileIdx = y0 * gridSize + x0;
    const tile = mapData[tileIdx];

    if (x0 !== start.x || y0 !== start.y) {
       // Buildings always block LOS unless you are on top of one
       if (tile.type === 'BUILDING' && tile.id !== start.id && tile.id !== end.id) {
           return false;
       }

       // Canyon Logic: Canyons are low ground (usually Height 0 or treated specially)
       // but here we just ensure they don't block LOS like Mountains do.
       // Since Canyons are defined as same height as Plains usually, they don't block.
       // Only block if tile.height > attackerHeight.
       
       if (tile.height > attackerHeight) {
           return false;
       }
       
       if (tile.type === 'MOUNTAIN' && attackerHeight < tile.height) {
           return false;
       }
       
       // DUNES block LOS (Height 2)
       if (tile.type === 'DUNES' && attackerHeight < tile.height) {
           return false;
       }
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return true;
};

const getWeatherMoveCost = (tile: Tile, unitType: UnitType, baseCost: number, weatherState: WeatherState): number => {
    // 1. Identify Weather
    const zoneId = tile.zone !== undefined ? tile.zone : -1;
    const weather = zoneId >= 0 && weatherState.playerZones[zoneId] ? weatherState.playerZones[zoneId] : 'CLEAR';
    
    // 2. Apply Effects
    if (tile.type === 'PLAINS') {
        if (weather === 'SCORCHED') return 2;
        if (weather === 'MONSOON' && unitType === 'ASSAULTER') return 2;
        if (weather === 'TAILWIND') return 0.5;
    }
    
    // SCORCHED increases cost on SAND too
    if (tile.type === 'SAND' && weather === 'SCORCHED') {
        return baseCost + 1;
    }

    return baseCost;
};

export const getValidMoves = (
  startTile: Tile,
  currentGlobalCp: number,
  mapData: Tile[],
  units: Unit[],
  unitType: UnitType,
  currentPlayer: number,
  weatherState: WeatherState,
  gridSize: number
): Map<string, number> => {
  const validMoves = new Map<string, number>();
  
  // ROOTED CHECK (From Quicksand)
  const myUnit = units.find(u => u.tileId === startTile.id);
  if (myUnit && myUnit.isRooted) {
      // Unit cannot move
      return validMoves; 
  }

  const visited = new Map<string, number>(); 
  const queue: MoveNode[] = [{ x: startTile.x, y: startTile.y, cost: 0 }];
  
  const occupiedTiles = new Set(units.map(u => u.tileId));
  occupiedTiles.delete(startTile.id);

  // Enemies block movement
  const enemyTiles = new Set(units.filter(u => u.owner !== currentPlayer).map(u => u.tileId));

  visited.set(startTile.id, 0);

  const directions = [{dx:0, dy:-1}, {dx:0, dy:1}, {dx:-1, dy:0}, {dx:1, dy:0}];
  const unitStats = UNIT_STATS[unitType];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) break;

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const nId = `${nx},${ny}`;

      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;

      const tileIndex = ny * gridSize + nx;
      const tile = mapData[tileIndex];
      if (!tile) continue;

      // DOOMSDAY CHECK
      if (tile.hazardState === 'LAVA') continue;

      // RULE: Snipers cannot enter Neutral or Enemy Buildings
      if (unitType === 'SNIPER' && tile.type === 'BUILDING') {
          if (tile.owner !== currentPlayer) continue;
      }

      const terrainBaseCost = TERRAIN_COSTS[tile.type];
      
      // Impassable Check (Water, Canyon, Barrier)
      if (terrainBaseCost >= 90) continue;

      const terrainMod = getWeatherMoveCost(tile, unitType, terrainBaseCost, weatherState);
      
      const moveCost = terrainMod * unitStats.moveCost;
      const newCost = current.cost + moveCost;

      if (newCost > currentGlobalCp) continue;
      if (enemyTiles.has(nId)) continue; 
      if (visited.has(nId) && visited.get(nId)! <= newCost) continue;

      visited.set(nId, newCost);
      if (!occupiedTiles.has(nId)) {
        validMoves.set(nId, newCost); 
      }
      queue.push({ x: nx, y: ny, cost: newCost });
    }
  }

  return validMoves;
};

export const calculateVisibility = (player: number, units: Unit[], mapData: Tile[], weather: WeatherState, fogEnabled: boolean, gridSize: number): Set<string> => {
    const visible = new Set<string>();
    if (!fogEnabled) {
        return visible; 
    }
    
    const myUnits = units.filter(u => u.owner === player);
    
    myUnits.forEach(unit => {
        const uTile = mapData.find(t => t.id === unit.tileId);
        if (!uTile) return;
        let vision = UNIT_STATS[unit.type].vision;
        
        // Sandstorm reduces all vision
        const zoneId = uTile.zone !== undefined ? uTile.zone : -1;
        const wType = zoneId >= 0 ? weather.playerZones[zoneId] : 'CLEAR';
        if (wType === 'SANDSTORM') {
            vision = Math.min(vision, 3);
        }

        const range = vision; 
        visible.add(uTile.id);
        for (let y = -range; y <= range; y++) {
            for (let x = -range; x <= range; x++) {
                if (Math.abs(x) + Math.abs(y) > range) continue; 
                const tx = uTile.x + x;
                const ty = uTile.y + y;
                if (tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize) {
                    const targetTile = mapData[ty * gridSize + tx];
                    if (targetTile) {
                        if (hasLineOfSight(uTile, targetTile, mapData, unit.type, weather, gridSize)) {
                            visible.add(targetTile.id);
                        }
                    }
                }
            }
        }
    });
    
    mapData.filter(t => (t.type === 'BASE' || t.type === 'BUILDING') && t.owner === player).forEach(b => {
        visible.add(b.id);
        const adj = [{x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0},{x:1,y:1}, {x:1,y:-1}, {x:-1,y:1}, {x:-1,y:-1}];
        adj.forEach(d => {
            const tx = b.x + d.x; 
            const ty = b.y + d.y;
            if(tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize) visible.add(`${tx},${ty}`);
        });
    });
    return visible;
};
