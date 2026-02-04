
import { Tile, HazardState } from '../types';
import { DOOMSDAY_SETTINGS } from '../constants/Config';

export const getRingIndex = (x: number, y: number, gridSize: number): number => {
    // Calculate distance from the nearest edge
    // Ring 0 is the outermost edge
    return Math.min(x, gridSize - 1 - x, y, gridSize - 1 - y);
};

export const updateDoomsdayState = (mapData: Tile[], currentTurn: number, gridSize: number): Tile[] => {
    return mapData.map(tile => {
        const ring = getRingIndex(tile.x, tile.y, gridSize);
        
        // Calculate the turn when this ring becomes lava
        const lavaTurn = DOOMSDAY_SETTINGS.START_TURN + (ring * DOOMSDAY_SETTINGS.SHRINK_INTERVAL);
        
        let hazard: HazardState = 'SAFE';
        
        if (currentTurn >= lavaTurn) {
            hazard = 'LAVA';
        } else if (currentTurn >= lavaTurn - 1) {
            // One turn warning
            hazard = 'WARNING';
        }

        // Optimization: Don't create new object if state hasn't changed
        if (tile.hazardState === hazard) return tile;

        return { ...tile, hazardState: hazard };
    });
};
