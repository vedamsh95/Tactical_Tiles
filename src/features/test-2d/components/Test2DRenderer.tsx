import React, { useMemo, useCallback, useState, useRef } from 'react';
import { Stage, Container, Sprite, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../store/useGameStore';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT, ISO_V2_UNITS_PATH } from '../../iso-2d/config/IsoAssetRegistry';
import { getIsoTileSprite } from '../../iso-2d/logic/IsoTileAutoTiler';
import { TextureManager } from '../../../core/graphics/TextureManager';

import { InteractiveIsoTile } from '../../iso-2d/components/InteractiveIsoTile';

// Interaction Constants
const TILE_W_HALF = ISO_TILE_WIDTH / 2;
const TILE_H_HALF = ISO_TILE_HEIGHT / 2;

// -- COMPONENT: Test2DMap --
const Test2DMap = () => {
    const mapData = useGameStore(state => state.mapData);
    const units = useGameStore(state => state.units);
    const handleTileClick = useGameStore(state => state.handleTileClick);
    const setHoveredTile = useGameStore(state => state.setHoveredTile);
    
    // Force loading state if no map data
    if (!mapData || mapData.length === 0) {
        return <Text text="No Map Loaded" style={{ fill: '#fff' }} x={100} y={100} />;
    }

    // Local state for basic highlight feedback in this view
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoverId, setHoverId] = useState<string | null>(null);

    // Sort items
    const renderableItems = useMemo(() => {
        const items: any[] = [];
        
        mapData.forEach(tile => {
            const [gx, gy] = tile.id.split(',').map(Number);
            items.push({
                id: tile.id,
                gx, gy,
                depth: gx + gy,
                type: 'TILE',
                data: tile
            });
        });

        units.forEach(unit => {
             const [gx, gy] = unit.tileId.split(',').map(Number);
             items.push({
                 id: unit.id,
                 gx, gy,
                 depth: gx + gy + 0.1, 
                 type: 'UNIT',
                 data: unit
             });
        });

        return items.sort((a, b) => a.depth - b.depth);
    }, [mapData, units]);

    // Positioning
    const getScreenPos = useCallback((gx: number, gy: number) => {
        const sx = (gx - gy) * TILE_W_HALF;
        const sy = (gx + gy) * TILE_H_HALF;
        return { x: sx, y: sy };
    }, []);

    // Selection Handling
    const onTileClick = useCallback((tile: any) => {
        console.log("Clicked Iso Tile:", tile.id);
        setSelectedId(tile.id);
        handleTileClick(tile.x, tile.y);
    }, [handleTileClick]);

    const onTileHover = useCallback((tile: any) => {
        setHoverId(tile.id);
        setHoveredTile(tile.id);
    }, [setHoveredTile]);

    // Center Map
    const offsetX = window.innerWidth / 2;
    const offsetY = 100;

    return (
        <Container x={offsetX} y={offsetY}>
            {renderableItems.map(item => {
                const pos = getScreenPos(item.gx, item.gy);
                
                if (item.type === 'TILE') {
                    return (
                        <InteractiveIsoTile
                            key={item.id}
                            tile={item.data}
                            mapData={mapData}
                            screenX={pos.x}
                            screenY={pos.y}
                            isSelected={selectedId === item.id}
                            isHovered={hoverId === item.id}
                            onClick={onTileClick}
                            onHover={onTileHover}
                        />
                    );
                }
                
                if (item.type === 'UNIT') {
                    const u = item.data;
                    const path = `${ISO_V2_UNITS_PATH}/p${u.owner}_${u.type.toLowerCase()}.png`;
                    return (
                        <Sprite
                           key={item.id}
                           image={path}
                           x={pos.x}
                           y={pos.y - 12} // Lift
                           anchor={{ x: 0.5, y: 0.8 }}
                           scale={0.5}
                           eventMode="none" // Let clicks pass through unit to tile for now
                        />
                    );
                }
                return null;
            })}
        </Container>
    );
};

export const Test2DRenderer = () => {
    return (
        <Stage width={window.innerWidth} height={window.innerHeight} options={{ backgroundAlpha: 0, backgroundColor: 0x111111 }}>
            <Test2DMap />
        </Stage>
    );
};
