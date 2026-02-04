
import { Tile, ZoneType } from '../types';

/**
 * Assigns Voronoi zones based on base proximity.
 * Each tile is owned by the player whose base is closest (Euclidean).
 */
export const assignVoronoiZones = (tiles: Tile[], baseLocations: {x: number, y: number, owner: number}[]): Tile[] => {
  if (baseLocations.length === 0) return tiles;

  return tiles.map(tile => {
      let minDistance = Infinity;
      let closestOwner = 0;

      baseLocations.forEach(base => {
          const dist = Math.sqrt(Math.pow(tile.x - base.x, 2) + Math.pow(tile.y - base.y, 2));
          if (dist < minDistance) {
              minDistance = dist;
              closestOwner = base.owner;
          }
      });

      return { ...tile, zone: closestOwner };
  });
};
