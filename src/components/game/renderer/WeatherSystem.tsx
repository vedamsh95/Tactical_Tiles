import React, { useEffect, useRef } from 'react';
import { Container, useApp, TilingSprite } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { AdjustmentFilter, GodrayFilter } from 'pixi-filters';
import { Emitter, EmitterConfigV3 } from '@pixi/particle-emitter';
import { useGameStore } from '../../../store/useGameStore';
import { useViewportContext } from '../../../context/ViewportContext';
import { TextureManager } from '../../../core/graphics/TextureManager';

// Configuration for Emitters based on Weather Type
const getEmitterConfig = (type: string, width: number, height: number): EmitterConfigV3 | null => {
    // Shared basics
    const base = {
        lifetime: { min: 2, max: 4 },
        frequency: 0.005,
        emitterLifetime: -1,
        maxParticles: 1000,
        addAtBack: false,
        pos: { x: 0, y: 0 },
    };

    switch (type) {
        case 'MONSOON':
            return {
                ...base,
                lifetime: { min: 0.6, max: 1.0 },
                frequency: 0.002, 
                spawnChance: 1,
                particlesPerWave: 2,
                behaviors: [
                    {
                        type: 'alpha',
                        config: { 
                            alpha: { 
                                list: [
                                    { value: 1.0, time: 0 }, 
                                    { value: 0.0, time: 1 }
                                ],
                                isStepped: false
                            } 
                        }
                    },
                    {
                        type: 'scale',
                        config: { 
                            scale: { 
                                list: [
                                    { value: 1.0, time: 0 }, 
                                    { value: 0.5, time: 1 }
                                ],
                                isStepped: false
                            } 
                        }
                    },
                    {
                        type: 'color', 
                        config: { 
                            color: { 
                                list: [
                                    { value: "#00ffff", time: 0 }, 
                                    { value: "#aaddff", time: 1 }
                                ],
                                isStepped: false
                            } 
                        }
                    },
                    {
                        type: 'moveSpeed',
                        config: { 
                            speed: { 
                                list: [
                                    { value: 900, time: 0 }, 
                                    { value: 900, time: 1 }
                                ],
                                isStepped: false
                            } 
                        }
                    },
                    {
                        type: 'rotation',
                        config: { 
                             accel: 0,
                             minSpeed: 0,
                             maxSpeed: 0,
                             minStart: 85,
                             maxStart: 95
                        }
                    },
                    {
                        type: 'spawnShape', 
                        config: {
                            type: 'rect',
                            data: { x: -1000, y: -1000, w: 4000, h: 2000 }
                        }
                    },
                    {
                        type: 'textureSingle',
                        config: { texture: TextureManager.get('PARTICLE_RAIN') || PIXI.Texture.WHITE }
                    }
                ]
            } as any;
        
        case 'SANDSTORM':
            return {
                ...base,
                frequency: 0.004,
                behaviors: [
                     {
                        type: 'alpha',
                        config: { alpha: { list: [{ value: 0, time: 0 }, { value: 0.8, time: 0.2 }, { value: 0, time: 1 }] } }
                    },
                    {
                        type: 'scale',
                        config: { scale: { list: [{ value: 0.5, time: 0 }, { value: 0.2, time: 1 }] } }
                    },
                    {
                        type: 'color',
                        config: { color: { list: [{ value: "ccaa88", time: 0 }, { value: "aa8866", time: 1 }] } }
                    },
                    {
                        type: 'moveSpeed',
                        config: { speed: { list: [{ value: 800, time: 0 }, { value: 600, time: 1 }] } }
                    },
                    {
                        type: 'rotationStatic',
                        config: { min: 0, max: 0 } // Horizontal
                    },
                    {
                        type: 'spawnShape',
                        config: {
                             type: 'rect',
                             data: { x: -1000, y: -1000, w: 2000, h: 4000 }
                        }
                    },
                    {
                        type: 'textureSingle',
                        config: { texture: TextureManager.get('PARTICLE_DUST') || PIXI.Texture.WHITE }
                    }
                ]
            } as any;

        default:
            return null;
    }
};

interface WeatherSystemProps {
    width: number;
    height: number;
}

export const WeatherSystem: React.FC<WeatherSystemProps> = ({ width, height }) => {
    // Animation Loop - DIRECT TICKER ATTACHMENT (Robust)
    const app = useApp();
    const { viewport } = useViewportContext();
    const weatherStatus = useGameStore(state => state.weatherStatus);

    // DEBUG: Log mount and changes
    useEffect(() => {
        console.log(`[WeatherSystem] MOUNTED. Status: ${weatherStatus}, Size: ${width}x${height}`);
    }, [weatherStatus, width, height]);
    
    // Refs
    const containerRef = useRef<PIXI.Container>(null);
    const emitterRef = useRef<Emitter | null>(null);
    
    // Shader Refs (to animate)
    const displacementSpriteRef = useRef<PIXI.Sprite | null>(null);
    const fogSpriteRef = useRef<PIXI.TilingSprite | null>(null);

    // Setup Filters on VIEWPORT
    useEffect(() => {
        if (!viewport) return;

        // Cleanup previous filters on Viewport
        viewport.filters = [];
        if (displacementSpriteRef.current) {
             displacementSpriteRef.current.destroy();
             displacementSpriteRef.current = null;
        }

        const activeFilters: PIXI.Filter[] = [];

        // 1. SCORCHED: Displacement + Orange Tint
        if (weatherStatus === 'SCORCHED') {
             const noiseTex = TextureManager.get('NOISE_MAP');
             if (noiseTex.baseTexture) noiseTex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
             
             const sprite = new PIXI.Sprite(noiseTex);
             sprite.width = width; 
             sprite.height = height; 
             
             // IMPORTANT: Sprite must be in the display tree
             if (containerRef.current) containerRef.current.addChild(sprite); 
             
             displacementSpriteRef.current = sprite;

             const dispFilter = new PIXI.filters.DisplacementFilter(sprite);
             dispFilter.scale.x = 20;
             dispFilter.scale.y = 20;
             activeFilters.push(dispFilter);

             const orangeAdj = new AdjustmentFilter({ red: 1.4, green: 1.1, blue: 0.8, gamma: 1.1 });
             activeFilters.push(orangeAdj as any);
        }

        // 2. MONSOON: Dark Adjustment + Moody Godrays
        if (weatherStatus === 'MONSOON') {
             const darkAdj = new AdjustmentFilter({ red: 0.7, green: 0.8, blue: 1.1, brightness: 0.7 });
             activeFilters.push(darkAdj as any);

             const rays = new GodrayFilter({
                 gain: 0.3,
                 lacunarity: 2.5,
                 alpha: 0.3,
                 angle: 30, // Slanted with rain
             });
             activeFilters.push(rays as any);
        }

        // 3. FOG: Blur Filter
        if (weatherStatus === 'FOG') {
             const blur = new PIXI.filters.BlurFilter(4); 
             activeFilters.push(blur);
             
             const milkAdj = new AdjustmentFilter({ brightness: 1.2, contrast: 0.6, gamma: 1.5 });
             activeFilters.push(milkAdj as any);
        }

        viewport.filters = activeFilters;

        return () => {
             if (viewport) viewport.filters = [];
             if (containerRef.current && displacementSpriteRef.current) {
                 containerRef.current.removeChild(displacementSpriteRef.current);
             }
        };
    }, [weatherStatus, viewport, width, height]);


    // Setup Particles
    useEffect(() => {
        if (!containerRef.current) {
            console.error("[WeatherSystem] Container Ref is NULL");
            return;
        }
        
        // Cleanup old
        if (emitterRef.current) {
            emitterRef.current.destroy();
            emitterRef.current = null;
        }

        console.log(`[WeatherSystem] Configuring particles for: ${weatherStatus}`);

        let config: EmitterConfigV3 | null = null;
        if (weatherStatus === 'MONSOON') {
            config = getEmitterConfig('MONSOON', width, height);
        } else if (weatherStatus === 'SANDSTORM') {
            config = getEmitterConfig('SANDSTORM', width, height);
        }

        if (config && containerRef.current) {
             console.log(`[WeatherSystem] Starting Emitter: ${weatherStatus} with config:`, config);
             /* 
             // EMERGENCY DISABLE: Particle Emitter is crashing the app (TypeError: Cannot read properties of null (reading 'time'))
             // Restoring map visibility by disabling particles for now.
             emitterRef.current = new Emitter(
                 containerRef.current,
                 config as any
             );
             emitterRef.current.emit = true;
             */
             console.warn("[WeatherSystem] PARTICLES DISABLED FOR SAFETY. Check Emitter Config.");
        } else {
            console.log(`[WeatherSystem] No emitter config for status: ${weatherStatus}`);
        }

        return () => {
            emitterRef.current?.destroy();
            emitterRef.current = null;
        };

    }, [weatherStatus, width, height]);

    // THE LOOP (Robust Direct Ticker)
    useEffect(() => {
        if (!app) return;

        const update = (delta: number) => {
            // Emitter needs seconds. Pixi delta is frames.
            const dt = (delta || 1) * 0.01; 

            // 1. Update Particles
            if (emitterRef.current) {
                emitterRef.current.update(dt);
                
                // DEBUG: Check if particles exist
                // console.log("Active Particles:", emitterRef.current.particleCount);
                if (Math.random() < 0.05) console.log(`[WeatherSystem] Active: ${emitterRef.current.particleCount} | Pos: ${emitterRef.current.spawnPos?.x.toFixed(0)},${emitterRef.current.spawnPos?.y.toFixed(0)}`);

                // Camera Follow - Reposition Spawner
                if (viewport) {
                   // Center the emitter on the viewport
                   // Note: 'containerRef' is a child of some container in GameRenderer.
                   // If that container moves with the map, we need to counter-move or just rely on HUGE spawn rect.
                   
                   // With spawnShape: rect w=4000, we simply need to keep the center reasonable.
                   if (!emitterRef.current.spawnPos) emitterRef.current.spawnPos = { x: 0, y: 0 };
                   emitterRef.current.spawnPos.x = viewport.center.x; 
                   emitterRef.current.spawnPos.y = viewport.center.y;
                }
            }

            // 2. Animate Filters
            if (weatherStatus === 'SCORCHED' && displacementSpriteRef.current) {
                displacementSpriteRef.current.y -= 100 * dt;
                if (displacementSpriteRef.current.y <= -512) displacementSpriteRef.current.y = 0;
            }

            if (weatherStatus === 'FOG' && fogSpriteRef.current) {
                fogSpriteRef.current.tilePosition.x += 50 * dt;
                fogSpriteRef.current.tilePosition.y += 20 * dt;
            }

            if (weatherStatus === 'MONSOON' && viewport?.filters) {
                const hasRays = viewport.filters.some(f => f instanceof GodrayFilter);
                if (hasRays) {
                    const rays = viewport.filters.find(f => f instanceof GodrayFilter) as GodrayFilter;
                    rays.time += dt;
                }
            }
        };

        app.ticker.add(update);
        return () => {
            app.ticker.remove(update);
        };
    }, [app, weatherStatus, viewport]);

    return (
        <Container 
            ref={containerRef} 
            name="weather-root" 
            zIndex={9999} 
            sortableChildren={true}
        >
             {/* Fog Overlay */}
            {weatherStatus === 'FOG' && (
                 <TilingSprite 
                    ref={fogSpriteRef} 
                    texture={TextureManager.get('NOISE_MAP') || PIXI.Texture.WHITE} 
                    width={width} 
                    height={height}
                    alpha={0.3}
                    scale={{x: 4, y: 4}} 
                    tint={0xAAFFAA}
                    zIndex={100} 
                 />
            )}
        </Container>
    );
};