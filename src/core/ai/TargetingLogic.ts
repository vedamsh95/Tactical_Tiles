
import { Unit, Tile, AIDifficulty, WeatherState } from '../types';
import { UNIT_STATS, TERRAIN_DEFENSE, BUILDING_STATS } from '../constants/Config';
import { getManhattanDistance, hasLineOfSight } from '../grid/Pathfinding';

interface CombatSimulationResult {
    damageDealt: number; 
    potentialDamage: number; 
    isKill: boolean;
    hitChance: number;
}

const simulateCombat = (attacker: Unit, target: Unit, mapData: Tile[]): CombatSimulationResult => {
    const attTile = mapData.find(t => t.id === attacker.tileId);
    const tarTile = mapData.find(t => t.id === target.tileId);
    
    if (!attTile || !tarTile) return { damageDealt: 0, potentialDamage: 0, isKill: false, hitChance: 0 };

    // 1. Defense Calculation
    let defense = TERRAIN_DEFENSE[tarTile.type] || 0;
    if (tarTile.type === 'BUILDING' && tarTile.subType === 'BUNKER' && tarTile.owner === target.owner) {
        defense = BUILDING_STATS.BUNKER.defense;
    }

    // 2. Hit Chance (Simple implementation: Mountains give evasion)
    let hitChance = 1.0;
    // Note: In Config.ts TERRAIN_DEFENSE handles damage reduction, 
    // but typically turn-based games have % hit chance. 
    // This engine seems deterministic on damage, so hitChance acts as a heuristic modifier.

    // 3. Damage Output
    let dmg = UNIT_STATS[attacker.type].damage;
    if (attTile.type === 'BUILDING' && attTile.subType === 'WATCHTOWER' && attTile.owner === attacker.owner) {
        dmg *= BUILDING_STATS.WATCHTOWER.damageBonus;
    }

    const finalDmg = Math.floor(dmg * (1 - defense));
    
    return {
        damageDealt: finalDmg,
        potentialDamage: finalDmg,
        isKill: finalDmg >= target.hp,
        hitChance
    };
};

export const findBestTarget = (
    attacker: Unit,
    allUnits: Unit[],
    mapData: Tile[],
    difficulty: AIDifficulty,
    weather: WeatherState,
    gridSize: number
): { unit: Unit, score: number } | null => {
    const enemies = allUnits.filter(u => u.owner !== attacker.owner);
    const attTile = mapData.find(t => t.id === attacker.tileId);
    if (!attTile) return null;

    const unitStats = UNIT_STATS[attacker.type];

    // Filter valid targets (Range & LOS)
    const validTargets = enemies.filter(enemy => {
        const enemyTile = mapData.find(t => t.id === enemy.tileId);
        if (!enemyTile) return false;
        
        const dist = getManhattanDistance(attTile, enemyTile);
        if (dist > unitStats.range) return false;

        return hasLineOfSight(attTile, enemyTile, mapData, attacker.type, weather, gridSize);
    });

    if (validTargets.length === 0) return null;

    // --- EASY MODE: Just Closest ---
    if (difficulty === 'EASY') {
        const closest = validTargets.sort((a, b) => {
            const ta = mapData.find(t => t.id === a.tileId)!;
            const tb = mapData.find(t => t.id === b.tileId)!;
            return getManhattanDistance(attTile, ta) - getManhattanDistance(attTile, tb);
        })[0];
        return { unit: closest, score: 50 };
    }

    // --- MEDIUM & HARD: KILL MATRIX ---
    let bestTarget: Unit | null = null;
    let highestScore = -Infinity;

    validTargets.forEach(target => {
        let score = 0;
        const sim = simulateCombat(attacker, target, mapData);

        // 1. DAMAGE & KILLS
        if (sim.isKill) {
            score += 150; // MASSIVE bonus for removing a unit
        } else {
            score += sim.damageDealt * 3; // Value damage
        }

        // 2. TARGET PRIORITY (Hard Mode)
        if (difficulty === 'HARD') {
            if (target.type === 'SNIPER') score += 30; // Eliminate heavy hitters
            if (target.type === 'ASSAULTER') score += 20;
            
            // Don't overkill massively
            if (sim.isKill && target.hp < 3 && sim.damageDealt > 10) {
                score -= 10; // "Waste" of high damage
            }
        }

        if (score > highestScore) {
            highestScore = score;
            bestTarget = target;
        }
    });

    return bestTarget ? { unit: bestTarget, score: highestScore } : null;
};
