import React, { useEffect, useRef } from 'react';
import { Container, useApp } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../store/useGameStore';
import { TILE_SIZE } from '../../../core/constants/Config';
import { Tile, WeatherType, WeatherState } from '../../../core/types';

// --- ZONE-AWARE WEATHER ENGINE ---

enum ParticleType {
    RAIN = 'RAIN',
    DUST = 'DUST',
    WIND_STREAK = 'WIND_STREAK',
    FOG = 'FOG',
    HEAT = 'HEAT',
}

interface Particle {
    type: ParticleType;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: number;
    alpha: number;
    scale?: number;
    vs?: number;
    thickness?: number;
    zone?: number;
}

interface ZoneBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    tiles: Array<{ x: number; y: number }>;
    tileSet: Set<string>; // For fast lookup: "x,y" -> true
}

class ZoneWeatherEngine {
    private particles: Particle[] = [];
    private graphics: PIXI.Graphics;
    private container: PIXI.Container;
    private viewportRef: any = null;
    private zoneBounds: Map<number, ZoneBounds> = new Map();
    private zoneWeather: Record<number, WeatherType> = {};

    constructor(container: PIXI.Container) {
        this.container = container;
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
    }

    public setViewport(viewport: any) {
        this.viewportRef = viewport;
    }
    
    // Check if a pixel position is inside a zone's actual tiles
    private isInsideZone(px: number, py: number, zoneId: number): boolean {
        const bounds = this.zoneBounds.get(zoneId);
        if (!bounds) return false;
        
        // Convert pixel to tile coordinates
        const tileX = Math.floor(px / TILE_SIZE) * TILE_SIZE;
        const tileY = Math.floor(py / TILE_SIZE) * TILE_SIZE;
        
        return bounds.tileSet.has(`${tileX},${tileY}`);
    }
    
    // Get a random position inside the actual zone tiles
    private getRandomZonePosition(zoneId: number): { x: number; y: number } | null {
        const bounds = this.zoneBounds.get(zoneId);
        if (!bounds || bounds.tiles.length === 0) return null;
        
        // Pick a random tile from the zone
        const tile = bounds.tiles[Math.floor(Math.random() * bounds.tiles.length)];
        
        // Return random position within that tile
        return {
            x: tile.x + Math.random() * TILE_SIZE,
            y: tile.y + Math.random() * TILE_SIZE
        };
    }

    public setZoneData(tiles: Tile[], weather: WeatherState) {
        // Build zone bounds from tiles
        this.zoneBounds.clear();
        
        for (const tile of tiles) {
            if (tile.zone === undefined || tile.zone < 0) continue;
            
            const zone = tile.zone;
            if (!this.zoneBounds.has(zone)) {
                this.zoneBounds.set(zone, {
                    minX: Infinity, maxX: -Infinity,
                    minY: Infinity, maxY: -Infinity,
                    tiles: [],
                    tileSet: new Set()
                });
            }
            
            const bounds = this.zoneBounds.get(zone)!;
            const px = tile.x * TILE_SIZE;
            const py = tile.y * TILE_SIZE;
            
            bounds.minX = Math.min(bounds.minX, px);
            bounds.maxX = Math.max(bounds.maxX, px + TILE_SIZE);
            bounds.minY = Math.min(bounds.minY, py);
            bounds.maxY = Math.max(bounds.maxY, py + TILE_SIZE);
            bounds.tiles.push({ x: px, y: py });
            bounds.tileSet.add(`${px},${py}`);
        }
        
        // Store weather per zone
        this.zoneWeather = weather.playerZones || {};
    }

    public update(delta: number) {
        this.graphics.clear();
        
        if (!this.viewportRef) return;
        
        const dt = delta || 1;
        
        const vp = this.viewportRef;
        const centerX = vp.center.x;
        const centerY = vp.center.y;
        const viewW = vp.screenWidth / vp.scale.x;
        const viewH = vp.screenHeight / vp.scale.y;
        
        // Visible area bounds
        const visLeft = centerX - viewW;
        const visRight = centerX + viewW;
        const visTop = centerY - viewH;
        const visBottom = centerY + viewH;
        
        // Spawn particles for each zone based on its weather
        this.zoneBounds.forEach((bounds, zoneId) => {
            const weather = this.zoneWeather[zoneId] || 'CLEAR';
            
            // Only spawn if zone is at least partially visible
            if (bounds.maxX < visLeft || bounds.minX > visRight ||
                bounds.maxY < visTop || bounds.minY > visBottom) {
                return;
            }
            
            this.spawnZoneParticles(dt, zoneId, bounds, weather);
        });
        
        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Move
            p.x = p.x + p.vx * dt;
            p.y = p.y + p.vy * dt;
            
            // Scale animation
            if (p.vs) {
                p.scale = (p.scale || 1) + p.vs * dt;
            }
            
            // Age
            p.life -= 0.015 * dt;
            
            // Remove dead or invalid
            if (p.life <= 0 || isNaN(p.x) || isNaN(p.y)) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // STRICT ZONE CHECK - particle must be on an actual zone tile
            if (p.zone !== undefined) {
                if (!this.isInsideZone(p.x, p.y, p.zone)) {
                    // Particle left its zone - remove it immediately
                    this.particles.splice(i, 1);
                    continue;
                }
            }
            
            // Cull far out of view
            const padding = 100;
            if (p.x < visLeft - padding || p.x > visRight + padding ||
                p.y < visTop - padding || p.y > visBottom + padding) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Calculate fade
            const lifeRatio = p.life / p.maxLife;
            let fade = 1;
            if (lifeRatio < 0.15) fade = lifeRatio / 0.15;
            else if (lifeRatio > 0.85) fade = (1 - lifeRatio) / 0.15;
            const alpha = p.alpha * fade;
            
            this.drawParticle(p, alpha);
        }
    }

    private spawnZoneParticles(dt: number, zoneId: number, bounds: ZoneBounds, weather: WeatherType) {
        // Scale spawn rate by zone size (number of tiles)
        const areaFactor = Math.min(1, bounds.tiles.length / 50);
        
        // Helper to get random position INSIDE actual zone tiles
        const getPos = () => this.getRandomZonePosition(zoneId);
        
        switch (weather) {
            case 'MONSOON':
                // Heavy rain - spawns at random positions INSIDE zone tiles
                if (Math.random() < 1.0 * areaFactor) {
                    for (let i = 0; i < 8; i++) {
                        const pos = getPos();
                        if (!pos) continue;
                        this.particles.push({
                            type: ParticleType.RAIN,
                            x: pos.x,
                            y: pos.y,
                            vx: 0.5,
                            vy: 5 + Math.random() * 2,
                            life: 0.3,
                            maxLife: 0.3,
                            size: 10 + Math.random() * 6,
                            color: 0x7dd3fc,
                            alpha: 0.5 + Math.random() * 0.3,
                            zone: zoneId
                        });
                    }
                }
                // Mist/splash inside zone
                if (Math.random() < 0.06 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.FOG,
                            x: pos.x,
                            y: pos.y,
                            vx: 0.1,
                            vy: 0.05,
                            life: 1.5,
                            maxLife: 1.5,
                            size: 25 + Math.random() * 20,
                            color: 0x94a3b8,
                            alpha: 0.12,
                            scale: 1,
                            vs: 0.001,
                            zone: zoneId
                        });
                    }
                }
                break;
                
            case 'SANDSTORM':
                // Dust clouds - spawn INSIDE zone tiles
                if (Math.random() < 0.125 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.DUST,
                            x: pos.x,
                            y: pos.y,
                            vx: 1.5 + Math.random() * 1.5,
                            vy: (Math.random() - 0.5) * 0.5,
                            life: 0.8,
                            maxLife: 0.8,
                            size: 35 + Math.random() * 40,
                            color: 0xd4a574,
                            alpha: 0.12 + Math.random() * 0.08,
                            scale: 0.9,
                            vs: 0.003,
                            zone: zoneId
                        });
                    }
                }
                // Small fast particles - spawn INSIDE zone tiles
                if (Math.random() < 0.375 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.DUST,
                            x: pos.x,
                            y: pos.y,
                            vx: 2 + Math.random() * 2,
                            vy: (Math.random() - 0.5) * 0.6,
                            life: 0.5,
                            maxLife: 0.5,
                            size: 3 + Math.random() * 4,
                            color: 0xc4a35a,
                            alpha: 0.45 + Math.random() * 0.2,
                            scale: 1,
                            vs: 0,
                            zone: zoneId
                        });
                    }
                }
                // Wind streaks - spawn INSIDE zone tiles
                if (Math.random() < 0.11 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.WIND_STREAK,
                            x: pos.x,
                            y: pos.y,
                            vx: 5 + Math.random() * 4,
                            vy: 0,
                            life: 0.3,
                            maxLife: 0.3,
                            size: 25 + Math.random() * 30,
                            thickness: 1 + Math.random() * 1,
                            color: 0xe8d5b7,
                            alpha: 0.25,
                            zone: zoneId
                        });
                    }
                }
                break;
                
            case 'TAILWIND':
                // Wind streaks - spawn INSIDE zone tiles
                if (Math.random() < 0.28 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.WIND_STREAK,
                            x: pos.x,
                            y: pos.y,
                            vx: 6 + Math.random() * 5,
                            vy: (Math.random() - 0.5) * 0.2,
                            life: 0.4,
                            maxLife: 0.4,
                            size: 35 + Math.random() * 45,
                            thickness: 0.8 + Math.random() * 1.2,
                            color: 0xf1f5f9,
                            alpha: 0.4 + Math.random() * 0.2,
                            zone: zoneId
                        });
                    }
                }
                // Small particles - spawn INSIDE zone tiles
                if (Math.random() < 0.375 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.DUST,
                            x: pos.x,
                            y: pos.y,
                            vx: 3 + Math.random() * 3,
                            vy: (Math.random() - 0.5) * 0.3,
                            life: 0.4,
                            maxLife: 0.4,
                            size: 2 + Math.random() * 2.5,
                            color: 0xe2e8f0,
                            alpha: 0.4,
                            scale: 1,
                            vs: 0,
                            zone: zoneId
                        });
                    }
                }
                break;
                
            case 'FOG':
                // Dense fog blobs - spawn INSIDE zone tiles
                if (Math.random() < 0.075 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.FOG,
                            x: pos.x,
                            y: pos.y,
                            vx: 0.1 + Math.random() * 0.1,
                            vy: (Math.random() - 0.5) * 0.1,
                            life: 2,
                            maxLife: 2,
                            size: 40 + Math.random() * 40,
                            color: 0xb0b8c4,
                            alpha: 0.2 + Math.random() * 0.1,
                            scale: 0.9,
                            vs: 0.002,
                            zone: zoneId
                        });
                    }
                }
                break;
                
            case 'SCORCHED':
                // Heat shimmer particles - spawn INSIDE zone tiles
                if (Math.random() < 0.15 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.HEAT,
                            x: pos.x,
                            y: pos.y,
                            vx: (Math.random() - 0.5) * 0.2,
                            vy: -0.5 - Math.random() * 0.3,
                            life: 1,
                            maxLife: 1,
                            size: 12 + Math.random() * 15,
                            color: 0xff8844,
                            alpha: 0.12 + Math.random() * 0.08,
                            scale: 1,
                            vs: 0.004,
                            zone: zoneId
                        });
                    }
                }
                break;
                
            case 'CLEAR':
                // Very subtle ambient particles - spawn INSIDE zone tiles
                if (Math.random() < 0.019 * areaFactor) {
                    const pos = getPos();
                    if (pos) {
                        this.particles.push({
                            type: ParticleType.DUST,
                            x: pos.x,
                            y: pos.y,
                            vx: 0.05,
                            vy: -0.03,
                            life: 2,
                            maxLife: 2,
                            size: 1.5 + Math.random() * 1.5,
                            color: 0xffffff,
                            alpha: 0.12,
                            scale: 1,
                            vs: 0,
                            zone: zoneId
                        });
                    }
                }
                break;
        }
    }

    private drawParticle(p: Particle, alpha: number) {
        if (alpha < 0.01) return;
        
        switch (p.type) {
            case ParticleType.RAIN:
                this.graphics.beginFill(p.color, alpha);
                this.graphics.drawRect(p.x, p.y, 2, p.size);
                this.graphics.endFill();
                break;
                
            case ParticleType.DUST:
            case ParticleType.HEAT:
                const sz = p.size * (p.scale || 1);
                this.graphics.beginFill(p.color, alpha * 0.4);
                this.graphics.drawCircle(p.x, p.y, sz * 1.4);
                this.graphics.endFill();
                this.graphics.beginFill(p.color, alpha);
                this.graphics.drawCircle(p.x, p.y, sz);
                this.graphics.endFill();
                break;
                
            case ParticleType.WIND_STREAK:
                const t = p.thickness || 1;
                this.graphics.beginFill(p.color, alpha);
                this.graphics.drawRoundedRect(p.x, p.y, p.size, t, t / 2);
                this.graphics.endFill();
                break;
                
            case ParticleType.FOG:
                const fogSz = p.size * (p.scale || 1);
                this.graphics.beginFill(p.color, alpha * 0.3);
                this.graphics.drawCircle(p.x, p.y, fogSz * 1.5);
                this.graphics.endFill();
                this.graphics.beginFill(p.color, alpha * 0.5);
                this.graphics.drawCircle(p.x, p.y, fogSz);
                this.graphics.endFill();
                break;
        }
    }

    public destroy() {
        this.graphics.destroy();
    }
}

// --- REACT COMPONENT ---

interface WeatherSystemProps {
    width: number;
    height: number;
    viewportInstance?: any;
}

export const WeatherSystem: React.FC<WeatherSystemProps> = ({ width, height, viewportInstance }) => {
    const app = useApp();
    const viewport = viewportInstance;
    
    // Get zone data from game store
    const mapData = useGameStore(state => state.mapData);
    const weather = useGameStore(state => state.weather);
    
    const containerRef = useRef<PIXI.Container>(null);
    const engineRef = useRef<ZoneWeatherEngine | null>(null);

    // Initialize Engine ONCE
    useEffect(() => {
        if (!containerRef.current || engineRef.current) return;
        
        const engine = new ZoneWeatherEngine(containerRef.current);
        engineRef.current = engine;
        
        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, []);

    // Set viewport when available
    useEffect(() => {
        if (engineRef.current && viewport) {
            engineRef.current.setViewport(viewport);
        }
    }, [viewport]);

    // Update zone data when map or weather changes
    useEffect(() => {
        if (engineRef.current && mapData && weather) {
            engineRef.current.setZoneData(mapData, weather);
        }
    }, [mapData, weather]);

    // Attach to ticker
    useEffect(() => {
        if (!app || !engineRef.current) return;
        
        const engine = engineRef.current;
        const update = (ticker: any) => {
            engine.update(ticker.deltaTime);
        };
        
        app.ticker.add(update);
        
        return () => {
            if (app && app.ticker) {
                app.ticker.remove(update);
            }
        };
    }, [app]);

    return (
        <Container ref={containerRef} name="weather-zones" zIndex={9999} />
    );
};
