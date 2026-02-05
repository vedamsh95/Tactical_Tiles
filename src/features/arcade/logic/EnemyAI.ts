import { Enemy } from '../stores/useArcadeStore';
import { PlayerState } from './TankPhysics';

interface EnemyConfig {
    speed: number;
    attackRange: number;
    fireRate: number; // ms
    inaccuracy: number; // angle spread
}

const AI_CONFIG = {
    BREACHER: {
        speed: 1.5,
        attackRange: 400,
        fireRate: 2000,
        inaccuracy: 0.1 // More accurate but slow
    },
    SCOUT: {
        speed: 3.5,
        attackRange: 200,
        fireRate: 800,
        inaccuracy: 0.3 // Sprays and prays
    }
};

export const updateEnemiesAI = (
    enemies: Enemy[], 
    player: PlayerState, 
    delta: number
): { updatedEnemies: Enemy[], enemyBullets: any[] } => {
    
    const now = Date.now();
    const newBullets: any[] = [];
    
    const updatedEnemies = enemies.map(enemy => {
        // Calculate vector to player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        const config = AI_CONFIG[enemy.class];
        const dt = delta || 1;
        
        let newX = enemy.x;
        let newY = enemy.y;
        let lastFired = enemy.lastFired || 0;
        
        // 1. CHASE
        // Only chase if outside attack range (maintain distance)
        // Also don't chase if too far away (passive mode) - e.g. 1000px
        if (dist > config.attackRange && dist < 1200) {
            newX += Math.cos(angle) * config.speed * dt;
            newY += Math.sin(angle) * config.speed * dt;
        } else if (dist < config.attackRange * 0.5) {
            // Keep some distance if too close (optional kiting logic for AI)
            newX -= Math.cos(angle) * (config.speed * 0.5) * dt;
            newY -= Math.sin(angle) * (config.speed * 0.5) * dt;
        }

        // 2. ATTACK
        if (dist < 800) { // If visible on screen roughly
            if (now - lastFired > config.fireRate) {
                // FIRE!
                // Add inaccuracy
                const fireAngle = angle + (Math.random() - 0.5) * config.inaccuracy;
                
                newBullets.push({
                    id: now + Math.random(),
                    x: newX + Math.cos(angle) * 20,
                    y: newY + Math.sin(angle) * 20,
                    rotation: fireAngle,
                    speed: enemy.class === 'SCOUT' ? 10 : 6,
                    lifetime: enemy.class === 'SCOUT' ? 60 : 120,
                    type: enemy.class,
                    ownerId: enemy.id // Enemy ID
                });
                
                lastFired = now;
            }
        }

        return {
            ...enemy,
            x: newX,
            y: newY,
            rotation: angle, // Face player always
            lastFired
        };
    });

    return { updatedEnemies, enemyBullets: newBullets };
};
