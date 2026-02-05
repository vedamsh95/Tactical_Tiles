import { create } from 'zustand';
import { updateTankPhysics, checkCollisions, checkPlayerCollision, PlayerState, InputState } from '../logic/TankPhysics';
import { updateEnemiesAI } from '../logic/EnemyAI';
import { WEAPON_CONFIG } from '../logic/WeaponConfig'; 
import { useGameStore } from '../../../store/useGameStore'; // Import Main Store
import { Tile, TerrainType } from '../../../core/types';

// Simple Procedural Map Generator for Arcade Mode
const generateArcadeMap = (size: number): Tile[] => {
    const tiles: Tile[] = [];
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            let type: TerrainType = 'PLAINS';
            
            // Noise-like randomness
            const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1);
            const random = Math.random();

            if (random < 0.02) type = 'MOUNTAIN';
            else if (random < 0.05) type = 'FOREST';
            else if (random < 0.06) type = 'BARRIER';
            else if (random < 0.07) type = 'BUILDING';

            // Clumps
            if (noise > 0.5 && random < 0.3) type = 'FOREST';
            if (noise < -0.5 && random < 0.3) type = 'SAND';

            tiles.push({
                id: `tile_${x}_${y}`,
                x, y,
                type,
                height: 0
            });
        }
    }
    // Clear start area (center)
    const center = Math.floor(size / 2);
    tiles.forEach(t => {
        if (Math.abs(t.x - center) < 5 && Math.abs(t.y - center) < 5) {
            t.type = 'PLAINS';
        }
    });
    return tiles;
};


interface Bullet {
    id: number;
    x: number;
    y: number;
    rotation: number;
    speed: number;
    lifetime: number; 
    type: 'BREACHER' | 'SCOUT'; 
    ownerId: string; 
}

export interface Enemy {
    id: string;
    x: number;
    y: number;
    rotation: number;
    hp: number;
    maxHp: number;
    class: 'BREACHER' | 'SCOUT';
    flash: number; 
    lastFired?: number;
}

export interface Explosion {
    id: number;
    x: number;
    y: number;
    age: number; // in frames/ticks
}

interface ArcadeStore {
    player: PlayerState & { hp: number, maxHp: number };
    bullets: Bullet[];
    enemies: Enemy[];
    explosions: Explosion[];
    input: InputState;
    lastFired: number; 
    shakeRequest: number; // NEW
    gameOver: boolean;
    score: number;
    wave: number;
    waveDelay: number;
    enemiesEnabled: boolean; // Toggle state
    cameraMode: 'STATIC' | 'DRIVING';

    toggleCamera: () => void;
    toggleEnemies: () => void;
    triggerShake: (amount: number) => void;
    clearShake: () => void;
    
    setKey: (key: keyof InputState['keys'], value: boolean) => void;
    setMouse: (x: number, y: number) => void;
    setMouseDown: (down: boolean) => void;
    updatePlayer: (delta: number) => void;
    fireBullet: () => void;
    switchClass: () => void;
    spawnEnemy: (x: number, y: number, pClass: 'BREACHER' | 'SCOUT') => void;
    initializeLevel: () => void;
    damagePlayer: (amount: number) => void;
    restartGame: () => void;
    addExplosion: (x: number, y: number) => void;
    addScore: (points: number) => void;
    nextWave: () => void;
}

export const useArcadeStore = create<ArcadeStore>((set, get) => ({
    player: {
        x: 400,
        y: 300,
        rotation: 0,
        turretRotation: 0,
        velocity: { x: 0, y: 0 },
        class: 'BREACHER',
        hp: 100,
        maxHp: 100
    },
    bullets: [],
    enemies: [],
    explosions: [],
    input: {
        keys: { w: false, a: false, s: false, d: false },
        mouse: { x: 0, y: 0, down: false }
    },
    lastFired: 0,
    shakeRequest: 0,
    gameOver: false,
    score: 0,
    wave: 1,
    waveDelay: 0,
    enemiesEnabled: true,
    cameraMode: 'STATIC', // Default to Static (Top Down) but User can switch

    toggleCamera: () => set(state => ({ 
        cameraMode: state.cameraMode === 'STATIC' ? 'DRIVING' : 'STATIC' 
    })),

    toggleEnemies: () => set(state => { 
        const nextState = !state.enemiesEnabled;
        return { 
            enemiesEnabled: nextState,
            enemies: nextState ? state.enemies : [] // Clear immediately if disabled
        }; 
    }),

    triggerShake: (amount: number) => set(state => ({ shakeRequest: state.shakeRequest + amount })), 
    clearShake: () => set({ shakeRequest: 0 }),

    setKey: (key, value) => set((state) => ({
        input: {
            ...state.input,
            keys: { ...state.input.keys, [key]: value }
        }
    })),

    setMouse: (x, y) => set((state) => ({
        input: {
            ...state.input,
            mouse: { ...state.input.mouse, x, y }
        }
    })),
    
    setMouseDown: (down: boolean) => set((state) => ({
        input: {
            ...state.input,
            mouse: { ...state.input.mouse, down }
        }
    })),

    switchClass: () => set((state) => ({
        player: {
            ...state.player,
            class: state.player.class === 'BREACHER' ? 'SCOUT' : 'BREACHER'
        }
    })),

    damagePlayer: (amount) => set((state) => {
        const newHp = state.player.hp - amount;
        return {
            player: { ...state.player, hp: newHp },
            gameOver: newHp <= 0
        };
    }),
    
    restartGame: () => {
         get().initializeLevel();
         set((state) => ({
             player: { ...state.player, hp: 100, x: 400, y: 300, velocity: {x:0, y:0} },
             gameOver: false,
             bullets: [],
             explosions: [],
             score: 0,
             wave: 1,
             waveDelay: 0
         }));
    },

    spawnEnemy: (x, y, pClass) => set((state) => ({
        enemies: [...state.enemies, {
            id: Math.random().toString(36).substr(2, 9),
            x, y,
            rotation: 0,
            hp: pClass === 'BREACHER' ? 100 : 20,
            maxHp: pClass === 'BREACHER' ? 100 : 20,
            class: pClass,
            flash: 0,
            lastFired: 0
        }]
    })),

    addExplosion: (x, y) => set(state => ({
        explosions: [...state.explosions, { id: Math.random(), x, y, age: 0 }]
    })),

    addScore: (points) => set(state => ({ score: state.score + points })),

    nextWave: () => set(state => {
        const nextWaveNum = state.wave + 1;
        const enemyCount = nextWaveNum * 2 + 3;
        const newEnemies: Enemy[] = [];
        const player = state.player;
        
        for (let i = 0; i < enemyCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * 500;
            
            newEnemies.push({
                id: Math.random().toString(36).substr(2, 9),
                x: player.x + Math.cos(angle) * dist,
                y: player.y + Math.sin(angle) * dist,
                rotation: 0,
                hp: i % 2 === 0 ? 100 : 20,
                maxHp: i % 2 === 0 ? 100 : 20,
                class: i % 2 === 0 ? 'BREACHER' : 'SCOUT',
                flash: 0,
                lastFired: 0
            });
        }
        
        return { 
            wave: nextWaveNum, 
            enemies: [...state.enemies, ...newEnemies], 
            waveDelay: 0,
            score: state.score + 500 
        };
    }),

    initializeLevel: () => set((state) => {
        // GENERATE MAP IF EMPTY or RESTARTING
        const gridSize = 50; // 50x50 = 2500 tiles
        const arcadeMap = generateArcadeMap(gridSize);
        useGameStore.setState({ mapData: arcadeMap, gridSize });

        const newEnemies: Enemy[] = [];
        const player = state.player;
        // Reset player pos to center
        const center = gridSize * 64 / 2;
        
        // Spawn Enemies
        for (let i = 0; i < 5; i++) {
            newEnemies.push({
                id: Math.random().toString(36).substr(2, 9),
                x: Math.random() * (gridSize * 64), 
                y: Math.random() * (gridSize * 64),
                rotation: 0,
                hp: i % 2 === 0 ? 100 : 20,
                maxHp: i % 2 === 0 ? 100 : 20,
                class: i % 2 === 0 ? 'BREACHER' : 'SCOUT',
                flash: 0,
                lastFired: 0
            });
        }
        
        // Return Store Update (Wait, we also need to update player position in the store update)
        // But setState argument is previous state. We return Partial<ArcadeStore>.
        return { 
            enemies: state.enemiesEnabled ? newEnemies : [], 
            wave: 1, 
            score: 0, 
            explosions: [], 
            waveDelay: 0,
            player: { ...player, x: center, y: center, velocity: {x:0, y:0} } 
        };
    }),

    updatePlayer: (delta) => set((state) => {
        if (state.gameOver) return {};

        // 0. Get Main Map Data for Physics
        const { mapData, gridSize, destroyTile } = useGameStore.getState();

        // 1. Player Physics & Map Collision
        const { newState: physicsState, destroyedTile } = updateTankPhysics(state.player, state.input, delta, mapData, gridSize);
        
        let newPlayer = { ...state.player, ...physicsState };

        let newExplosions = state.explosions;

        // Handle Destruction
        if (destroyedTile) {
            destroyTile(destroyedTile.gridX, destroyedTile.gridY);
            // Add Debris Explosion
            // We can just reuse addExplosion or push directly
            // Since we are inside set(), we use state.explosions in next step
            // But we need to update state.explosions effectively.
            // Let's defer explosion add to "Explosions Decay" step or just concat
            // For now, let's treat it as a new explosion
            // NOTE: setState inside setState (destroyTile updates GameStore, this updates ArcadeStore) is fine because distinct stores.
            
            // Push debris explosion with type? For now just standard orange one
            // Ideally we'd add { type: 'DEBRIS' } to Explosion interface
            // But using existing system:
            const debris = { 
                id: Math.random(), 
                x: destroyedTile.gridX * 64 + 32, // Center of tile
                y: destroyedTile.gridY * 64 + 32, 
                age: 0 
            };
            newExplosions = [...state.explosions, debris];
            
            // THE THUMP: Trigger Shake
            return {
                 explosions: newExplosions,
                 shakeRequest: state.shakeRequest + 0.5 // Add small trauma
            };
        } else {
             // Just copy unless explosions decay modifies it
             newExplosions = state.explosions; 
        }

        // 2. Enemy AI & Spawning Bullets (ONLY IF ENABLED)
        let finalEnemies: Enemy[] = [];
        let enemyBullets: Bullet[] = [];

        if (state.enemiesEnabled) {
            const aiResult = updateEnemiesAI(state.enemies, newPlayer, delta);
            finalEnemies = aiResult.updatedEnemies.map(e => ({
                ...e,
                flash: Math.max(0, e.flash - delta)
            }));
            enemyBullets = aiResult.enemyBullets;
        } else {
            // Keep empty if disabled
            finalEnemies = [];
        }
        
        // 3. Bullets Movement
        let newBullets = [...state.bullets, ...enemyBullets]
            .map(b => ({
                ...b,
                x: b.x + Math.cos(b.rotation) * b.speed * delta,
                y: b.y + Math.sin(b.rotation) * b.speed * delta,
                lifetime: b.lifetime - delta 
            }))
            .filter(b => b.lifetime > 0);
            
        // 5. Explosions Decay
        // We use newExplosions (which might have debris) as base
        newExplosions = newExplosions.map(e => ({ ...e, age: e.age + delta }))
            .filter(e => e.age < 30);
            
        let currentScore = state.score;

        // 6. Collision Detection
        // A. Player Bullets vs Enemies
        const playerBullets = newBullets.filter(b => b.ownerId === 'player');
        if (playerBullets.length > 0 && finalEnemies.length > 0) {
            const hits = checkCollisions(playerBullets, finalEnemies);
            if (hits.length > 0) {
                const bulletIdsToRemove = new Set(hits.map(h => h.bulletId));
                newBullets = newBullets.filter(b => !bulletIdsToRemove.has(b.id));

                const survivors: Enemy[] = [];
                
                finalEnemies.forEach(e => {
                    const hit = hits.find(h => h.enemyId === e.id);
                    if (hit) {
                        const newHp = e.hp - hit.damage;
                        if (newHp <= 0) {
                            currentScore += 100;
                            newExplosions.push({ id: Math.random(), x: e.x, y: e.y, age: 0 });
                        } else {
                            survivors.push({ ...e, hp: newHp, flash: 5 });
                        }
                    } else {
                        survivors.push(e);
                    }
                });
                
                finalEnemies = survivors;
            }
        }
        
        // B. Enemy Bullets vs Player
        const hostileBullets = newBullets.filter(b => b.ownerId !== 'player');
        if (hostileBullets.length > 0) {
            const playerHit = checkPlayerCollision(hostileBullets, newPlayer);
            if (playerHit) {
                newBullets = newBullets.filter(b => b.id !== playerHit.bulletId);
                newPlayer.hp -= 10; 
                
                if (newPlayer.hp <= 0) {
                     newExplosions.push({ id: Math.random(), x: newPlayer.x, y: newPlayer.y, age: 0 });
                     return { 
                         player: newPlayer, 
                         gameOver: true, 
                         bullets: newBullets, 
                         enemies: finalEnemies,
                         explosions: newExplosions 
                     };
                }
            }
        }
        
        // 7. Wave Management
        let waveDelay = state.waveDelay;
        let currentWave = state.wave;
        
        if (finalEnemies.length === 0 && state.enemiesEnabled) {
            waveDelay += delta;
            if (waveDelay > 180) {
                currentWave++;
                currentScore += 500;
                waveDelay = 0;
                
                const enemyCount = currentWave * 2 + 3;
                for (let i = 0; i < enemyCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 500 + Math.random() * 500;
                    finalEnemies.push({
                        id: Math.random().toString(36).substr(2, 9),
                        x: newPlayer.x + Math.cos(angle) * dist,
                        y: newPlayer.y + Math.sin(angle) * dist,
                        rotation: 0,
                        hp: i % 2 === 0 ? 100 : 20,
                        maxHp: i % 2 === 0 ? 100 : 20,
                        class: i % 2 === 0 ? 'BREACHER' : 'SCOUT',
                        flash: 0,
                        lastFired: 0
                    });
                }
            }
        } else {
            waveDelay = 0;
        }
        
        // 8. Firing (Auto-Fire Logic)
        let lastFired = state.lastFired;
        if (state.input.mouse.down) {
            const now = Date.now();
            const config = WEAPON_CONFIG[newPlayer.class];
            
            if (now - lastFired >= config.cooldown) {
                 const { x, y, turretRotation } = newPlayer;
                 if (config.recoil > 0) {
                     newPlayer.velocity.x -= Math.cos(turretRotation) * config.recoil;
                     newPlayer.velocity.y -= Math.sin(turretRotation) * config.recoil;
                 }
                 newBullets.push({
                    id: now + Math.random(),
                    x: x + Math.cos(turretRotation) * 40,
                    y: y + Math.sin(turretRotation) * 40,
                    rotation: turretRotation,
                    speed: config.bulletSpeed,
                    lifetime: config.bulletLifetime,
                    type: newPlayer.class,
                    ownerId: 'player'
                });
                lastFired = now;
            }
        }

        return {
            player: newPlayer,
            bullets: newBullets,
            enemies: finalEnemies,
            explosions: newExplosions,
            score: currentScore,
            lastFired,
            wave: currentWave,
            waveDelay
        };
    }),

    fireBullet: () => set((state) => {
        const now = Date.now();
        const pClass = state.player.class;
        const config = WEAPON_CONFIG[pClass];
        
        if (now - state.lastFired < config.cooldown) return {};

        const { x, y, turretRotation, velocity } = state.player;
        let newVelocity = { ...velocity };
        
        if (config.recoil > 0) {
             newVelocity.x -= Math.cos(turretRotation) * config.recoil;
             newVelocity.y -= Math.sin(turretRotation) * config.recoil;
        }

        const newBullet: Bullet = {
            id: now + Math.random(),
            x: x + Math.cos(turretRotation) * 40,
            y: y + Math.sin(turretRotation) * 40,
            rotation: turretRotation,
            speed: config.bulletSpeed,
            lifetime: config.bulletLifetime,
            type: pClass,
            ownerId: 'player'
        };

        return { 
            bullets: [...state.bullets, newBullet],
            lastFired: now,
            player: { ...state.player, velocity: newVelocity }
        };
    })
}));