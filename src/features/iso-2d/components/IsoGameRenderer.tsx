import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Stage, Container, Sprite, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../store/useGameStore';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT, ISO_V2_UNITS_PATH } from '../config/IsoAssetRegistry';
import { Tile } from '../../../core/types';
import { TextureManager } from '../../../core/graphics/TextureManager';
import { getIsoTileSprite } from '../logic/IsoTileAutoTiler';

// -- COMPONENT: IsoTile --
interface IsoTileProps {
    tile: Tile;
    mapData: Tile[];
    screenX: number;
    screenY: number;
}

const IsoTile = React.memo(({ tile, mapData, screenX, screenY }: IsoTileProps) => {
    // Determine texture path using Logic
    const texturePath = useMemo(() => getIsoTileSprite(tile, mapData), [tile, mapData]);
    
    // Determine Anchor based on type
    // Tall objects (Mountain, Base, Bank) need bottom anchor (y=1 or close)
    // Flat objects (Road, Plains, Sand) need appropriate iso anchor (usually center of block)
    
    // If assets are 64x64 blocks with 32px height surface.
    // Center of "Bottom Footprint" is (32, 48).
    // Anchor ~0.75.
    
    // However, if the user says "Facing me", they might be "Front facing" sprites.
    // If they are walls/mountains, 0.75 is correct (bottom of image sits on tile).
    
    // Scale Logic
    let scale = 1;
    if (tile.type === 'BANK' || tile.type === 'BUILDING') {
        scale = 0.1; // Reduced by 90% as requested
    }

    return (
        <Sprite
            image={texturePath}
            x={screenX}
            y={screenY}
            anchor={{ x: 0.5, y: 0.75 }} 
            scale={scale}
        />
    );
});

// -- COMPONENT: IsoMap --
const IsoMap = () => {
    const mapData = useGameStore(state => state.mapData);
    const units = useGameStore(state => state.units);
    
    // 1. Convert Map Data to Renderable List with Depth sorting
    // Order: (x + y) ascending.
    
    const renderableItems = useMemo(() => {
        const items: { 
            id: string; 
            x: number; 
            y: number; 
            depth: number; 
            type: 'TILE' | 'UNIT'; 
            data: any 
        }[] = [];

        // Add Tiles
        mapData.forEach(tile => {
            const [gx, gy] = tile.id.split(',').map(Number);
            items.push({
                id: `tile-${tile.id}`,
                x: gx,
                y: gy,
                depth: gx + gy, // Basic depth
                type: 'TILE',
                data: tile
            });
        });

        // Add Units
        units.forEach(unit => {
             const [gx, gy] = unit.tileId.split(',').map(Number);
             items.push({
                 id: `unit-${unit.id}`,
                 x: gx,
                 y: gy,
                 depth: gx + gy + 0.1, 
                 type: 'UNIT',
                 data: unit
             });
        });

        // Sort by depth
        return items.sort((a, b) => a.depth - b.depth);
    }, [mapData, units]);
    
    // Helper to calculate screen position
    const getScreenPos = useCallback((gx: number, gy: number) => {
        const sx = (gx - gy) * (ISO_TILE_WIDTH / 2);
        const sy = (gx + gy) * (ISO_TILE_HEIGHT / 2);
        return { x: sx, y: sy };
    }, []);

    // Centering offset
    const [offsetX, setOffsetX] = useState(window.innerWidth / 2);
    const offsetY = 100;

    return (
        <Container x={offsetX} y={offsetY}>
            {renderableItems.map(item => {
                const pos = getScreenPos(item.x, item.y);
                
                if (item.type === 'TILE') {
                    return (
                        <IsoTile 
                            key={item.id} 
                            tile={item.data} 
                            mapData={mapData}
                            screenX={pos.x} 
                            screenY={pos.y} 
                        />
                    );
                } 
                
                if (item.type === 'UNIT') {
                    // New V2 Unit Assets: p{Owner}_{Type}.png
                    const u = item.data;
                    const path = `${ISO_V2_UNITS_PATH}/p${u.owner}_${u.type.toLowerCase()}.png`;
                    
                    return (
                        <Sprite
                           key={item.id}
                           image={path}
                           x={pos.x}
                           y={pos.y - 16} // Lift unit up to stand on top face. If tile top is at Y-16.
                           anchor={{ x: 0.5, y: 0.8 }} // Anchoring unit feet
                           scale={0.5} // Initial scale guess
                        />
                    );
                }
                
                return null;
            })}
        </Container>
    );
};

export const IsoGameRenderer = () => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
             await TextureManager.preloadTextures();
             setLoaded(true);
        };
        load();
    }, []);

    if (!loaded) return <div style={{color: 'white', padding: 20}}>Loading Assets...</div>;

    return (
        <Stage width={window.innerWidth} height={window.innerHeight} options={{ backgroundAlpha: 0, backgroundColor: 0x1a1a1a }}>
            <IsoMap />
        </Stage>
    );
};
