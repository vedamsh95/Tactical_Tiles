import React, { useEffect, useRef, useMemo } from 'react';
import { Stage, Container, Sprite, Graphics, useTick, useApp, TilingSprite } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useArcadeStore } from '../stores/useArcadeStore';
import { useArcadeInput } from '../hooks/useArcadeInput';
import { useGameStore } from '../../../store/useGameStore';
import { TERRAIN_COLORS, TILE_SIZE } from '../../../core/constants/Config';
import { Tile } from '../../../core/types';

// --- VISUAL HELPERS ---

// Map Objects (Upright Sprites)
const TileObject = React.memo(({ tile }: { tile: Tile }) => {
    // Determine Color based on Type
    const colorStr = TERRAIN_COLORS[tile.type] || '#FF00FF';
    
    return (
        <Container>
            <Graphics
                draw={g => {
                    g.clear();
                    // Origin is (x, y+TILE_SIZE) which is the "feet".
                    // So we draw UP from 0. 
                    // Rect: (0, -TILE_SIZE) to (TILE_SIZE, 0)
                    
                    if (tile.type === 'FOREST') {
                        // Trunk
                        g.beginFill(0x5D4037);
                        g.drawRect(26, -20, 12, 20);
                        g.endFill();
                        
                        // Leaves (Circles)
                        g.beginFill(0x1B5E20);
                        g.drawCircle(32, -40, 20);
                        g.drawCircle(20, -25, 15);
                        g.drawCircle(44, -25, 15);
                        g.endFill();
                        
                    } else if (tile.type === 'MOUNTAIN') {
                        // Peak
                        g.beginFill(0x5D4037); 
                        g.moveTo(0, 0); // Bottom Left ( Feet )
                        g.lineTo(TILE_SIZE/2, -TILE_SIZE * 1.5); // Peak (Tall)
                        g.lineTo(TILE_SIZE, 0); // Bottom Right
                        g.endFill();
                        
                        // Cap
                        g.beginFill(0xFFFFFF);
                        g.moveTo(TILE_SIZE/2 - 10, -TILE_SIZE * 1.5 + 30);
                        g.lineTo(TILE_SIZE/2, -TILE_SIZE * 1.5);
                        g.lineTo(TILE_SIZE/2 + 10, -TILE_SIZE * 1.5 + 30);
                        g.endFill();
                        
                    } else if (tile.type === 'BUILDING') {
                        // Box
                        g.beginFill(0x37474F);
                        g.drawRect(4, -TILE_SIZE + 4, TILE_SIZE-8, TILE_SIZE-8);
                        g.endFill();
                        // Roof Top (3D effect?)
                        g.beginFill(0x455A64);
                        g.drawRect(8, -TILE_SIZE + 8, TILE_SIZE-16, TILE_SIZE-16);
                        g.endFill();
                        
                   } else if (tile.type === 'BARRIER') {
                         g.beginFill(0x9E9E9E);
                         g.drawRect(0, -40, TILE_SIZE, 40); // Half height wall
                         g.endFill();
                         g.lineStyle(2, 0x616161);
                         g.moveTo(0, -40); g.lineTo(TILE_SIZE, -40);
                         g.moveTo(0, 0); g.lineTo(TILE_SIZE, 0);
                    }
                }}
            />
        </Container>
    );
});

// Flat Ground Tile
const GroundTile = React.memo(({ tile }: { tile: Tile }) => {
    let color = 0x2E7D32; // Default Grass
    if (tile.type === 'SAND' || tile.type === 'DUNES') color = 0xFDD835; // Sand
    else if (tile.type === 'ROAD' || tile.type === 'ROAD_H') color = 0x424242; // Road
    else if (tile.type === 'WATER') color = 0x0288D1;
    else if (tile.type === 'BRIDGE') color = 0x795548;
    else if (tile.type === 'CANYON') color = 0x3E2723;
    
    // Forest/Mountain base is Grass
    if (tile.type === 'FOREST' || tile.type === 'MOUNTAIN' || tile.type === 'BUILDING' || tile.type === 'BARRIER') {
        color = 0x2E7D32; // Grass
    }

    return (
        <Graphics
            x={0} y={0}
            draw={g => {
                g.clear();
                g.beginFill(color);
                g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
                g.endFill();
                
                // Details
                if (tile.type === 'ROAD') {
                    g.beginFill(0xFFFFFF);
                    g.drawRect(TILE_SIZE/2 - 2, 4, 4, 12);
                    g.drawRect(TILE_SIZE/2 - 2, 24, 4, 12);
                    g.drawRect(TILE_SIZE/2 - 2, 44, 4, 12);
                    g.endFill();
                }
                if (tile.type === 'WATER') {
                    g.lineStyle(2, 0xFFFFFF, 0.2);
                    g.moveTo(5, 20); g.lineTo(20, 20);
                }
            }}
        />
    );
});


// --- COMPONENTS ---

const ArcadePlayer = () => {
    const { rotation, turretRotation, class: pClass, hp, maxHp } = useArcadeStore(state => state.player);
    // Position/Z handled by parent container now
    
    return (
        <Container> 
            {/* Health Bar (Player) */}
            <Graphics
                y={-40}
                draw={g => {
                    g.beginFill(0x000000);
                    g.drawRect(-25, 0, 50, 6);
                    const pct = Math.max(0, hp / maxHp);
                    g.beginFill(pct > 0.3 ? 0x00FF00 : 0xFF0000);
                    g.drawRect(-24, 1, 48 * pct, 4);
                    g.endFill();
                }}
            />

            {/* SHADOW */}
            <Graphics
                y={5}
                rotation={rotation}
                draw={g => {
                    g.beginFill(0x000000, 0.3);
                    if (pClass === 'BREACHER') g.drawRect(-22, -22, 44, 44);
                    else g.drawCircle(0, 0, 18);
                    g.endFill();
                }}
            />

            {pClass === 'BREACHER' ? (
                <>
                    {/* HULL */}
                    <Graphics
                        rotation={rotation}
                        draw={g => {
                            g.beginFill(0x1a1a1a);
                            g.drawRect(-24, -22, 48, 8);
                            g.drawRect(-24, 14, 48, 8);
                            g.endFill();
                            g.lineStyle(2, 0x1b5e20);
                            g.beginFill(0x2e7d32);
                            g.drawRect(-20, -15, 40, 30);
                            g.endFill();
                        }}
                    />
                    {/* TURRET */}
                    <Container rotation={turretRotation}>
                        <Graphics
                            draw={g => {
                                g.beginFill(0x1b5e20);
                                g.drawRect(0, -6, 35, 12);
                                g.endFill();
                                g.lineStyle(2, 0x1b5e20);
                                g.beginFill(0x388e3c); 
                                g.drawRect(-12, -12, 24, 24);
                                g.endFill();
                            }}
                        />
                    </Container>
                </>
            ) : (
                <>
                    {/* SCOUT */}
                    <Graphics
                        rotation={rotation}
                        draw={g => {
                            g.lineStyle(2, 0x0d47a1);
                            g.beginFill(0x1976d2);
                            g.drawCircle(0, 0, 15);
                            g.endFill();
                            g.beginFill(0xffffff, 0.5);
                            g.drawRect(5, -2, 10, 4);
                            g.endFill();
                        }}
                    />
                    <Container rotation={turretRotation}>
                        <Graphics
                            draw={g => {
                                g.beginFill(0x111111);
                                g.drawRect(0, -2, 25, 4);
                                g.endFill();
                            }}
                        />
                    </Container>
                </>
            )}
        </Container>
    );
};

const BulletsView = () => {
    const bullets = useArcadeStore(state => state.bullets);
    return (
        <Container>
            {bullets.map(b => (
                <Graphics
                    key={b.id}
                    x={b.x}
                    y={b.y}
                    rotation={b.rotation}
                    draw={(g) => {
                        g.clear();
                        if (b.type === 'BREACHER') {
                             g.beginFill(0x000000);
                             g.drawCircle(0, 0, 6);
                             g.endFill();
                        } else {
                             g.lineStyle(2, 0xFFEB3B);
                             g.moveTo(0, 0);
                             g.lineTo(10, 0);
                        }
                    }}
                />
            ))}
        </Container>
    );
};

const EnemiesView = () => {
    const enemies = useArcadeStore(state => state.enemies);
    // Note: Enemies should ideally be in the sorted container too. 
    // But for simplicity (if we only have a few), the user prompt focused on Map Objects.
    // However, for true depth, enemies need to be in the shared sortable container.
    // We will render them separately here to pass props to the new shared logic if needed.
    // But standard React pattern makes mixing lists hard.
    // Solution: GameWorld maps everything in one list? Or purely managed components?
    
    // For now, let's keep Enemies separate but z-sorted?
    // No, if they are separate, they will either be all above or all below trees.
    // Let's rely on GameWorld to unify them.
    return null; // Logic moved to GameWorld
};

const ExplosionsView = () => {
    const explosions = useArcadeStore(state => state.explosions);
    return (
        <Container>
            {explosions.map(e => {
                const life = e.age / 30;
                const invLife = 1 - life;
                return (
                    <Container key={e.id} x={e.x} y={e.y}>
                        <Graphics
                            draw={g => {
                                g.clear();
                                g.beginFill(0xFF5722, invLife * 0.7);
                                g.drawCircle(0, 0, 20 + (e.age * 2));
                                g.endFill();
                                g.beginFill(0xFFEB3B, invLife);
                                g.drawCircle(0, 0, 10 + (e.age)); 
                                g.endFill();
                            }}
                        />
                    </Container>
                );
            })}
        </Container>
    );
};

// --- GAME WORLD ---

const SORTABLE_TYPES = new Set(['FOREST', 'MOUNTAIN', 'BUILDING', 'BARRIER', 'BASE', 'BANK']);

const GameWorld = () => {
    const app = useApp();
    const mapData = useGameStore(state => state.mapData);
    const updatePlayer = useArcadeStore(state => state.updatePlayer);
    const fireBullet = useArcadeStore(state => state.fireBullet);
    const player = useArcadeStore(state => state.player);
    const enemies = useArcadeStore(state => state.enemies); // Get Enemies
    const lastFired = useArcadeStore(state => state.lastFired);
    const shakeRequest = useArcadeStore(state => state.shakeRequest); // Get Shake
    const clearShake = useArcadeStore(state => state.clearShake);
    
    const initializeLevel = useArcadeStore(state => state.initializeLevel);
    const containerRef = useRef<PIXI.Container>(null);
    const sortableLayerRef = useRef<PIXI.Container>(null);
    
    useEffect(() => {
        useArcadeStore.setState(prev => ({
            player: { ...prev.player, x: 100, y: 100 }
        }));
    }, []);
    
    const cameraMode = useArcadeStore(state => state.cameraMode);
    
    // ... initializeLevel ...
    
    const shakeOffset = useRef({ x: 0, y: 0 });
    const shakeTrauma = useRef(0);

    useEffect(() => {
        initializeLevel();
    }, [initializeLevel]);

    useTick((delta) => {
        // A. Physics
        updatePlayer(delta);
        
        // B. Shake Logic
        if (shakeRequest > 0) {
            shakeTrauma.current += shakeRequest;
            clearShake();
        }
        
        if (shakeTrauma.current > 0) {
            shakeTrauma.current = Math.max(0, shakeTrauma.current - 0.1 * delta);
            const shake = shakeTrauma.current * shakeTrauma.current;
            shakeOffset.current = {
                x: (Math.random() * 2 - 1) * shake * 5,
                y: (Math.random() * 2 - 1) * shake * 5
            };
        } else {
            shakeOffset.current = { x: 0, y: 0 };
        }
        
        // C. Camera
        if (containerRef.current) {
             const world = containerRef.current;
             world.pivot.set(player.x, player.y);
             world.position.set(
                 (app.screen.width / 2) + shakeOffset.current.x, 
                 (app.screen.height / 2) + shakeOffset.current.y
             );
             
             if (cameraMode === 'DRIVING') {
                 // Rotate world opposite to player rotation so Player is always UP (-PI/2)
                 // Player angle 0 = Facing Right (0 deg).
                 // To make Facing Right correspond to UP ( -90 deg), we subtract PI/2.
                 // Actually, if Player is at 0 (Right), we want World to reduce angle by 90 (PI/2) so Player points Up?
                 // No, we rotate canvas. 
                 // targetRotation = -player.rotation + Math.PI / 2;
                 const targetRotation = -player.rotation + Math.PI / 2; // Test this
                 
                 // Smooth camera rotation
                 // Lerp angle
                 let diff = targetRotation - world.rotation;
                 // Normalize angle
                 while (diff < -Math.PI) diff += Math.PI * 2;
                 while (diff > Math.PI) diff -= Math.PI * 2;
                 
                 world.rotation += diff * 0.1; // Smooth factor
             } else {
                 // Rotate back to 0
                 let diff = 0 - world.rotation;
                 while (diff < -Math.PI) diff += Math.PI * 2;
                 while (diff > Math.PI) diff -= Math.PI * 2;
                 world.rotation += diff * 0.1;
             }
        }
    });

    const customViewport = useMemo(() => ({
        toWorld: (mx: number, my: number) => {
             // 1. Center Relative
             let dx = mx - (app.screen.width / 2) - shakeOffset.current.x;
             let dy = my - (app.screen.height / 2) - shakeOffset.current.y;
             
             // 2. Un-Rotate if needed
             // We can't access container.rotation easily here reliably without Ref which is mutable.
             // But we have access to cameraMode and somewhat player.rotation.
             // Wait, useMemo depends on player.rotation? That updates every frame?
             // No, player moves every frame. useMemo would re-run.
             // BUT player from store (useArcadeStore) might not trigger re-render if we use shallow selector?
             // In GameWorld we subscribe to player.x/y. 
             // We need to un-rotate using the ACTUAL projected world rotation.
             // Since we use Lerp, the exact rotation is in containerRef.current.rotation.
             
             const rot = containerRef.current ? containerRef.current.rotation : 0;
             if (rot !== 0) {
                 const cos = Math.cos(-rot);
                 const sin = Math.sin(-rot);
                 const rx = dx * cos - dy * sin;
                 const ry = dx * sin + dy * cos;
                 dx = rx;
                 dy = ry;
             }
             
             // 3. Add Pivot
             return {
                 x: dx + player.x,
                 y: dy + player.y
             };
        }
    }), [app.screen.width, app.screen.height, player.x, player.y, cameraMode]); // Re-calc when player moves


    useArcadeInput(customViewport);
    
    // Segregate Map
    const groundTiles = useMemo(() => mapData, [mapData]); // We render all as ground
    const objectTiles = useMemo(() => mapData.filter(t => SORTABLE_TYPES.has(t.type)), [mapData]);

    return (
        <Container ref={containerRef}>
            {/* LAYER 1: GROUND (Flat, No Sorting) */}
            <Container zIndex={-1000}>
                {groundTiles.map(tile => (
                    <Container key={`g_${tile.id}`} x={tile.x * TILE_SIZE} y={tile.y * TILE_SIZE}>
                        <GroundTile tile={tile} />
                    </Container>
                ))}
            </Container>

            {/* LAYER 2: OBJECTS & ENTITIES (Sorted) */}
            <Container ref={sortableLayerRef} sortableChildren={true}>
                {/* 2a. Map Props */}
                {objectTiles.map(tile => {
                    const feetY = (tile.y + 1) * TILE_SIZE;
                    return (
                        <Container key={`obj_${tile.id}`} x={tile.x * TILE_SIZE} y={feetY} zIndex={feetY}>
                            <TileObject tile={tile} />
                        </Container>
                    );
                })}

                {/* 2b. Player */}
                <Container x={player.x} y={player.y} zIndex={player.y}>
                    <ArcadePlayer />
                </Container>

                {/* 2c. Enemies */}
                {enemies.map(e => (
                    <Container key={e.id} x={e.x} y={e.y} zIndex={e.y}>
                        {/* Inline Enemy Graphic for now to access props */}
                        <Graphics
                            y={0} 
                            draw={g => {
                                // Shadow
                                g.beginFill(0x000000, 0.3);
                                g.drawCircle(0, 5, 18);
                                g.endFill();
                                // Body
                                if (e.flash > 0) g.beginFill(0xFFFFFF);
                                else if (e.class === 'BREACHER') g.beginFill(0x5D4037);
                                else g.beginFill(0xD84315);
                                
                                if (e.class === 'BREACHER') g.drawRect(-20, -20, 40, 40);
                                else g.drawCircle(0, 0, 15);
                                g.endFill();
                                
                                // HP
                                if (e.hp < e.maxHp) {
                                    g.beginFill(0x000000); g.drawRect(-15, -30, 30, 4);
                                    g.beginFill(0xFF0000); g.drawRect(-14, -29, 28 * (e.hp/e.maxHp), 2);
                                }
                            }}
                        />
                    </Container>
                ))}
            </Container>

            {/* LAYER 3: AIR (Bullets, Explosions) */}
            <Container zIndex={1000}>
                 <ExplosionsView />
                 <BulletsView />
            </Container>
        </Container>
    );
};

// UI Overlay
const UIOverlay = () => {
    const { class: pClass, velocity, hp, maxHp, score, wave, waveDelay, enemiesEnabled } = useArcadeStore(state => ({
        class: state.player.class,
        velocity: state.player.velocity,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        score: state.score,
        wave: state.wave,
        waveDelay: state.waveDelay,
        enemiesEnabled: state.enemiesEnabled
    }));
    const switchClass = useArcadeStore(state => state.switchClass);
    const toggleEnemies = useArcadeStore(state => state.toggleEnemies);
    const toggleCamera = useArcadeStore(state => state.toggleCamera);
    const exitArcade = useGameStore(state => state.exitArcade);
    const cameraMode = useArcadeStore(state => state.cameraMode);

    const gameOver = useArcadeStore(state => state.gameOver);
    const restartGame = useArcadeStore(state => state.restartGame);
    
    // Calc speed for display
    const speed = Math.hypot(velocity.x, velocity.y).toFixed(1);

    if (gameOver) {
        return (
            <div style={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                background: 'rgba(50,0,0,0.8)', color: 'white',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
                <h1 style={{ fontSize: '64px', margin: 0, color: '#FF5252' }}>MISSION FAILED</h1>
                <p style={{ fontSize: '24px', margin: '20px 0' }}>Your tank was destroyed.</p>
                <div style={{ fontSize: '32px', marginBottom: '30px', color: '#FFEB3B' }}>
                    Final Score: {score} (Wave {wave})
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button 
                        onClick={restartGame}
                        style={{
                            padding: '15px 30px', background: '#333', color: 'white',
                            border: '2px solid #fff', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '20px', fontWeight: 'bold'
                        }}
                    >
                        RESTART MISSION
                    </button>
                    <button 
                         onClick={exitArcade}
                         style={{ 
                             padding: '15px 30px', background: '#D32F2F', 
                             color: 'white', border: '1px solid #B71C1C', 
                             borderRadius: '4px', cursor: 'pointer',
                             fontSize: '20px', fontWeight: 'bold'
                         }}
                     >
                         EXIT
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' }}>
            {/* Top Center: Score & Wave */}
            <div style={{ 
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', 
                textAlign: 'center', color: 'white', textShadow: '0 2px 4px black' 
            }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFEB3B' }}>{score}</div>
                <div style={{ fontSize: '18px', color: '#AAA' }}>WAVE {wave}</div>
                {waveDelay > 0 && (
                    <div style={{ color: '#FF5252', marginTop: '5px', fontWeight: 'bold' }}>
                        NEXT WAVE IN {(3 - (waveDelay / 60)).toFixed(1)}s
                    </div>
                )}
            </div>

            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'monospace' }}>
                <h2>ARCADE MODE</h2>
                <div style={{ marginTop: '10px', fontSize: '18px' }}>
                    Class: <span style={{ color: pClass === 'BREACHER' ? '#4CAF50' : '#2196F3' }}>{pClass}</span>
                </div>
                <div style={{ fontSize: '18px' }}>
                    HP: <span style={{ color: hp < 30 ? '#FF5252' : '#4CAF50' }}>{Math.ceil(hp)}/{maxHp}</span>
                </div>
                <div style={{ fontSize: '18px' }}>
                    Speed: <span style={{ color: '#FFC107' }}>{speed}</span> px/f
                </div>
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
                    WASD to Drive | Mouse to Aim
                </p>
                <div style={{ marginTop: '20px', pointerEvents: 'auto' }}>
                    <button 
                        onClick={switchClass}
                        style={{
                            padding: '10px 20px', background: '#333', color: 'white',
                            border: '1px solid #555', borderRadius: '4px', cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        SWITCH CLASS
                    </button>
                    <button 
                        onClick={toggleEnemies}
                        style={{
                            padding: '10px 20px', background: enemiesEnabled ? '#2E7D32' : '#795548', color: 'white',
                            border: '1px solid #555', borderRadius: '4px', cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        {enemiesEnabled ? 'ENEMIES: ON' : 'ENEMIES: OFF'}
                    </button>
                    <button 
                        onClick={toggleCamera}
                        style={{
                            padding: '10px 20px', background: cameraMode === 'DRIVING' ? '#009688' : '#607D8B', color: 'white',
                            border: '1px solid #555', borderRadius: '4px', cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        {cameraMode === 'DRIVING' ? 'CAM: DRIVING' : 'CAM: FIXED'}
                    </button>
                    <button 
                         onClick={exitArcade}
                         style={{ 
                             padding: '10px 20px', background: '#D32F2F', 
                             color: 'white', border: '1px solid #B71C1C', 
                             borderRadius: '4px', cursor: 'pointer'
                         }}
                     >
                         EXIT
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Export
export const ArcadeScreen = () => {
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', overflow: 'hidden' }}>
            <Stage width={window.innerWidth} height={window.innerHeight} options={{ backgroundColor: 0x101010 }}>
                 <GameWorld />
            </Stage>
            <UIOverlay />
        </div>
    );
};
