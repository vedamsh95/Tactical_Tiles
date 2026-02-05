import { resolveMapCollision } from './ArcadeCollision';
import { Tile } from '../../../core/types';

export interface PlayerState {
    x: number;
    y: number;
    rotation: number;
    turretRotation: number;
    velocity: { x: number; y: number };
    class: 'BREACHER' | 'SCOUT';
}

export interface InputState {
    keys: {
        w: boolean;
        a: boolean;
        s: boolean;
        d: boolean;
    };
    mouse: {
        x: number;
        y: number;
        down: boolean;
    };
}

export interface PhysicsResult {
    newState: PlayerState;
    destroyedTile?: { gridX: number; gridY: number };
}

export const ARCADE_CONFIG = {
  BREACHER: { // The Tank
    maxSpeed: 4.0,       // Top speed (pixels per frame)
    acceleration: 0.15,  // How fast it speeds up
    friction: 0.96,      // Drift factor
    turnSpeed: 0.05,     // How fast the hull rotates
    radius: 24           // 1.5 Tile Width approx (Wait, Tile is 64. 24 is < 0.5 tile. Let's adjust.)
                         // User said: "Radius 24px (Approx 1.5 tiles wide)". 
                         // Scale check: 24 radius = 48 diameter. 48/64 = 0.75 tile width.
                         // User might mean 1.5 TILES RADIUS? No, 24px is reasonable for object size.
  },
  SCOUT: { // The Soldier
    maxSpeed: 6.0,       
    acceleration: 0.8,   
    friction: 0.80,      
    turnSpeed: 0.2,      
    radius: 8            // Tiny
  }
};

export const updateTankPhysics = (
    player: PlayerState,
    input: InputState,
    delta: number,
    mapData: Tile[],
    gridSize: number
): PhysicsResult => {
    const newState = { ...player, velocity: { ...player.velocity } };
    const dt = delta || 1;
    const config = ARCADE_CONFIG[player.class]; 

    // 1. ROTATION (Hull)
    if (input.keys.a) newState.rotation -= config.turnSpeed * dt;
    if (input.keys.d) newState.rotation += config.turnSpeed * dt;

    // 2. ACCELERATION (Gas Pedal)
    if (input.keys.w) {
        const accelX = Math.cos(newState.rotation) * config.acceleration;
        const accelY = Math.sin(newState.rotation) * config.acceleration;
        newState.velocity.x += accelX * dt;
        newState.velocity.y += accelY * dt;
    }
    if (input.keys.s) {
        newState.velocity.x -= (Math.cos(newState.rotation) * config.acceleration * 0.5) * dt;
        newState.velocity.y -= (Math.sin(newState.rotation) * config.acceleration * 0.5) * dt;
    }

    // 3. FRICTION (Base Drift)
    const frictionFactor = Math.pow(config.friction, dt); 
    newState.velocity.x *= frictionFactor;
    newState.velocity.y *= frictionFactor;

    // 4. CAP MAX SPEED
    const currentSpeed = Math.sqrt(newState.velocity.x ** 2 + newState.velocity.y ** 2);
    if (currentSpeed > config.maxSpeed) {
        const scale = config.maxSpeed / currentSpeed;
        newState.velocity.x *= scale;
        newState.velocity.y *= scale;
    }

    // 5. MAP COLLISION RESOLUTION (Standard movement applied internally)
    // We apply velocity tentatively, then verify against map
    const potentialNextX = newState.x + newState.velocity.x * dt;
    const potentialNextY = newState.y + newState.velocity.y * dt;
    
    // Check Collision on the FUTURE position
    // We pass the current velocity to calculation for sliding
    const simPlayer = {
        x: potentialNextX,
        y: potentialNextY,
        velocity: newState.velocity,
        radius: config.radius,
        class: newState.class
    };

    const result = resolveMapCollision(simPlayer, mapData, gridSize);
    
    // Apply resolved position and velocity
    newState.x = result.position.x;
    newState.y = result.position.y;
    newState.velocity = result.velocity;

    // 6. TURRET ROTATION
    const dx = input.mouse.x - newState.x;
    const dy = input.mouse.y - newState.y;
    newState.turretRotation = Math.atan2(dy, dx);

    return { 
        newState,
        destroyedTile: result.destroyedTile 
    };
};

// --- COLLISION LOGIC ---

export const checkCollisions = (bullets: any[], enemies: any[]) => {
    // We will return lists of bulletsToRemove and damageEvents
    const hits: { bulletId: number, enemyId: string, damage: number }[] = [];
    
    // Config for HITBOXES (Radius)
    const ENEMY_RADIUS = 20; // Avg size
    const BULLET_RADIUS = 5; // Avg size
    const COLLISION_DIST = (ENEMY_RADIUS + BULLET_RADIUS) ** 2; // Squared for performance

    // Damage Config
    const DAMAGE = {
        'BREACHER': 50,
        'SCOUT': 10
    };

    // Optimization: In a real game, use a QuadTree. Here, O(N*M) is fine for distinct lists.
    for (const bullet of bullets) {
        for (const enemy of enemies) {
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distSq = dx*dx + dy*dy;
            
            if (distSq < COLLISION_DIST) {
                hits.push({
                    bulletId: bullet.id,
                    enemyId: enemy.id,
                    damage: DAMAGE[bullet.type as 'BREACHER' | 'SCOUT'] || 10
                });
                // Bullet can only hit one enemy (unless penetrating, but let's say 1:1)
                break; 
            }
        }
    }
    
    return hits;
};

export const checkPlayerCollision = (bullets: any[], player: PlayerState): { bulletId: number } | null => {
    const PLAYER_RADIUS = 20; // Avg size
    const BULLET_RADIUS = 5;
    const COLLISION_DIST = (PLAYER_RADIUS + BULLET_RADIUS) ** 2;

    for (const bullet of bullets) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        if (dx*dx + dy*dy < COLLISION_DIST) {
            return { bulletId: bullet.id };
        }
    }
    return null;
};
