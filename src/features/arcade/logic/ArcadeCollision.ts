import { Tile, TerrainType } from '../../../core/types';

// Standard Tile Size
const TILE_SIZE = 64;

interface Vector2 {
    x: number;
    y: number;
}

interface CollisionResult {
    position: Vector2;
    velocity: Vector2;
    destroyedTile?: { gridX: number; gridY: number };
}

// Helper to get tile from 1D array
const getTileAt = (mapData: Tile[], gridSize: number, x: number, y: number): Tile | undefined => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return undefined;
    const index = y * gridSize + x;
    return mapData[index];
};

// Physics Constants
const FRICTION = {
    ROAD: 0.98,
    SAND: 0.90,
    QUICKSAND: 0.60,
    DEFAULT: 1.0 // Physics engine handles base friction, this is a multiplier
};

// Hard Impassable Walls
const IMPASSABLE = new Set(['MOUNTAIN', 'WATER', 'CANYON', 'BARRIER', 'BASE']); // Base is solid for tanks? Maybe. Let's say yes.

// Destructible for Breacher
const DESTRUCTIBLE = new Set(['FOREST', 'BUILDING', 'BARRIER']); // Breacher smashes forests/buildings

export const resolveMapCollision = (
    player: { x: number; y: number; velocity: { x: number; y: number }; radius: number; class: 'BREACHER' | 'SCOUT' },
    mapData: Tile[],
    gridSize: number
): CollisionResult => {
    let px = player.x;
    let py = player.y;
    let vx = player.velocity.x;
    let vy = player.velocity.y;
    
    // 1. Current Tile Friction
    const gridX = Math.floor(px / TILE_SIZE);
    const gridY = Math.floor(py / TILE_SIZE);
    
    const currentTile = getTileAt(mapData, gridSize, gridX, gridY);
    let surfaceFriction = 1.0;
    
    if (currentTile) {
        if (currentTile.type === 'ROAD' || currentTile.type === 'ROAD_H') surfaceFriction = FRICTION.ROAD;
        else if (currentTile.type === 'SAND' || currentTile.type === 'DUNES') surfaceFriction = FRICTION.SAND;
        else if (currentTile.type === 'QUICKSAND') surfaceFriction = FRICTION.QUICKSAND;
    }

    // Apply Surface Friction immediately (or return it? Let's apply to V)
    vx *= surfaceFriction;
    vy *= surfaceFriction;

    // 2. Wall Collisions (Check 4 corners + center? Or just simple Circle-Box)
    // We check the neighboring tiles for solid objects
    
    const checkRadius = player.radius;
    const speed = Math.sqrt(vx*vx + vy*vy);
    
    // Bounds to check (3x3 grid around player)
    const minGX = Math.floor((px - checkRadius) / TILE_SIZE);
    const maxGX = Math.floor((px + checkRadius) / TILE_SIZE);
    const minGY = Math.floor((py - checkRadius) / TILE_SIZE);
    const maxGY = Math.floor((py + checkRadius) / TILE_SIZE);

    let destroyedTile: { gridX: number; gridY: number } | undefined = undefined;

    for (let gx = minGX; gx <= maxGX; gx++) {
        for (let gy = minGY; gy <= maxGY; gy++) {
            const tile = getTileAt(mapData, gridSize, gx, gy);
            if (!tile) continue; // Boundary of map? Treat as void or solid? Let's skip for infinite map feel or clamp later.

            // Get Tile Bounds
            const tx = gx * TILE_SIZE;
            const ty = gy * TILE_SIZE;
            
            // Check Circle vs AABB (Tile)
            // Find closest point on AABB to Circle Center
            const closestX = Math.max(tx, Math.min(px, tx + TILE_SIZE));
            const closestY = Math.max(ty, Math.min(py, ty + TILE_SIZE));
            
            const dx = px - closestX;
            const dy = py - closestY;
            const distanceSq = dx*dx + dy*dy;

            if (distanceSq < checkRadius * checkRadius) {
                // COLLISION DETECTED
                
                // Is it destructible?
                if (
                    player.class === 'BREACHER' && 
                    speed > 2.5 && 
                    DESTRUCTIBLE.has(tile.type)
                ) {
                    // SMASH
                    destroyedTile = { gridX: gx, gridY: gy };
                    vx *= 0.6; // Impact Friction
                    vy *= 0.6;
                } else if (IMPASSABLE.has(tile.type) || DESTRUCTIBLE.has(tile.type)) {
                    // HARD COLLISION (Bounce/Slide)
                    
                    // Normal Vector (Direction from obstacle to player)
                    // If dx,dy is 0 (center), push out arbitrarily
                    const dist = Math.sqrt(distanceSq);
                    let nx = dx;
                    let ny = dy;
                    
                    if (dist === 0) {
                        nx = 1; ny = 0; 
                    } else {
                        nx /= dist;
                        ny /= dist;
                    }
                    
                    // Penetration depth
                    const pen = checkRadius - dist;
                    
                    // Push out
                    px += nx * pen;
                    py += ny * pen;
                    
                    // Slide Velocity: Project velocity onto tangent
                    // Tangent is (-ny, nx)
                    const dot = vx * nx + vy * ny;
                    
                    // Remove normal component (simple slide)
                    // v_new = v - (v . n) * n
                    vx = vx - dot * nx;
                    vy = vy - dot * ny;
                }
            }
        }
    }

    return {
        position: { x: px, y: py },
        velocity: { x: vx, y: vy },
        destroyedTile
    };
};
