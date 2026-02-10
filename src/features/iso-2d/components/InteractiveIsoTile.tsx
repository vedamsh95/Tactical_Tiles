import React, { useMemo } from 'react';
import { Container, Sprite } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../config/IsoAssetRegistry';
import { getIsoTileSprite } from '../logic/IsoTileAutoTiler';

export const InteractiveIsoTile = React.memo(({ tile, mapData, screenX, screenY, isSelected, isHovered, onClick, onHover }: any) => {
    const texturePath = useMemo(() => getIsoTileSprite(tile, mapData), [tile, mapData]);

    // Scale Logic (Same as Iso2D)
    let scale = 1;
    if (tile.type === 'BANK' || tile.type === 'BUILDING') {
        scale = 0.1;
    }

    // Diamond Polygon HitArea
    // (0, 16), (32, 0), (64, 16), (32, 32) (relative to 0,0 top-left of specific sprite?)
    // Sprite anchor is 0.5, 0.75.
    // If w=64, h=32. Center is 32, 16.
    // Anchor 0.5, 0.75 means the sprite's origin is at (32, 24) of the texture (if texture is 64x32).
    // Standard ISO tile is flat diamond.
    // Let's rely on standard Pixi HitArea relative to the Sprite's local space.
    // If we use eventMode="static" on the Sprite, the hitArea is relative to the Sprite.

    return (
        <Container x={screenX} y={screenY}>
            {/* Highlight with Diamond shape */}
            {(isSelected || isHovered) && (
                <Sprite 
                    texture={PIXI.Texture.WHITE}
                    tint={isSelected ? 0x00FF00 : 0xFFFFFF}
                    alpha={0.3}
                    anchor={{ x: 0.5, y: 0.5 }} 
                    width={ISO_TILE_WIDTH}
                    height={ISO_TILE_HEIGHT}
                    rotation={Math.PI / 4} // This rotates a square (white tex). 
                    // 45 deg rotation of a square makes a diamond? Yes.
                    // But we need 2:1 ratio.
                    // Scaling: x=1, y=0.5 after rotation? 
                    // Simpler: Draw a diamond graphic.
                />
            )}
            
            {/* Main Sprite */}
            <Sprite
                image={texturePath}
                anchor={{ x: 0.5, y: 0.75 }} // This moves the texture up so the "feet" are at (0,0) of Container
                scale={scale}
                eventMode="static"
                cursor="pointer"
                onpointerdown={(e) => {
                    // Force capture
                    e.stopPropagation();
                    console.log("InteractiveIsoTile: Clicked", tile.id);
                    if (onClick) onClick(tile);
                }}
                onpointerover={(e) => {
                    if (onHover) onHover(tile);
                }}
                // Hit Area: Make sure we hit the "ground" part of the tile even if texture is transparent or tall
                // Relative to anchor point (0,0 of sprite local space).
                // Width 64, Height 32. 
                // Local coords: Top(0, -16), Right(32, 0), Bottom(0, 16), Left(-32, 0)
                hitArea={new PIXI.Polygon([
                    0, -ISO_TILE_HEIGHT/2,
                    ISO_TILE_WIDTH/2, 0,
                    0, ISO_TILE_HEIGHT/2,
                    -ISO_TILE_WIDTH/2, 0
                ])}
            />
        </Container>
    );
});
