import React, { useMemo, useState, useEffect } from 'react';
import { Sprite } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { isoToScreen, TILE_WIDTH } from '../IsoMath';
import { ISO_ASSETS, IsoAssetDef } from '../IsoAssets';
import { getAssetPath } from '../IsoV2Assets';

interface IsoSpriteProps {
    assetId: string;
    gridX: number;
    gridY: number;
    // Optional override if we know the type (e.g. from layer context)
    // and the asset provided doesn't have a config yet.
    typeOverride?: 'GROUND' | 'OBJECT'; 
}

export const IsoSprite: React.FC<IsoSpriteProps> = ({ assetId, gridX, gridY, typeOverride }) => {
    // 1. Resolve Config
    const config: Partial<IsoAssetDef> | null = useMemo(() => {
        // A. Check strict registry match
        if (ISO_ASSETS[assetId]) {
            return ISO_ASSETS[assetId];
        }

        // B. Fallback: Parse "folder/filename" (V2 format)
        const parts = assetId.split('/');
        if (parts.length === 2) {
            const [folder, filename] = parts;
            return {
                id: assetId,
                type: typeOverride || 'OBJECT', // Default to Object if unknown, safest anchor
                src: getAssetPath(folder, filename),
                baseWidth: undefined // No scaling override by default
            };
        }
        
        return null;
    }, [assetId, typeOverride]);

    // 2. Load Texture
    const texture = useMemo(() => {
        if (!config || !config.src) return PIXI.Texture.EMPTY;
        return PIXI.Texture.from(config.src);
    }, [config]);

    // 3. Handle Texture Loading (for proper dimensions)
    const [loaded, setLoaded] = useState(texture.valid && texture.width > 1);

    useEffect(() => {
        if (texture.valid && texture.width > 1) {
            setLoaded(true);
            return;
        }
        
        const onUpdate = () => {
             setLoaded(true);
        };
        
        texture.once('update', onUpdate);
        return () => {
            texture.off('update', onUpdate);
        };
    }, [texture]);

    // 4. Smart Anchor Logic (MOVED UP before early return to fix Hook Rules)
    const assetType = config?.type || typeOverride;
    
    const isBlock = useMemo(() => {
        if (!assetType && !assetId) return false;
        if (assetType === 'GROUND') return true;
        
        // Heuristic based on V2 naming conventions
        const idLower = assetId.toLowerCase();
        if (idLower.includes('bank')) return true;
        if (idLower.includes('bridge')) return true;
        if (idLower.includes('water')) return true;
        if (idLower.includes('road')) return true;
        if (idLower.includes('path')) return true; // Path is often road
        
        return false;
    }, [assetType, assetId]);

    const anchor = useMemo(() => {
        if (!loaded) return { x: 0.5, y: 0.5 }; // Default while loading

        if (isBlock) {
            // BLOCK ANCHOR FORMULA:
            // For isometric blocks, the "visual ground center" (grid wireframe match)
            // is the center of the top diamond face.
            const ratio = texture.width / texture.height;
            return { x: 0.5, y: 0.25 * ratio };
        } else {
            // PROP ANCHOR:
            // Objects like trees or tents stand ON the tile.
            return { x: 0.5, y: 1.0 };
        }
    }, [isBlock, texture.width, texture.height, loaded]);

    if (!config || !loaded) return null;

    // 5. Calculate Position & Scale
    const screenPos = isoToScreen(gridX, gridY);
    const targetWidth = config.baseWidth || TILE_WIDTH;
    const scale = targetWidth / texture.width;

    return (
        <Sprite 
            texture={texture}
            x={screenPos.x}
            y={screenPos.y}
            anchor={anchor}
            scale={scale}
            // Sort by Y for depth (simple painter's algorithm)
            // Ideally parent Container has sortableChildren={true}
            zIndex={screenPos.y} 
        />
    );
};
