import React, { useMemo, useState, useEffect } from 'react';
import { Sprite } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { isoToScreen, TILE_WIDTH } from '../IsoMath';
import { getAssetPath, ASSET_CONFIG, IsoAssetConfig } from '../IsoV2Assets';
import { useIsoEditorStore } from '../useIsoEditorStore';

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
    const assetInfo = useMemo(() => {
        // Parse "folder/filename" (V2 format)
        const parts = assetId.split('/');
        if (parts.length === 2) {
            const [folder, filename] = parts;
            // Check for specific config match or folder-wide config
            // Priority: Filename -> Folder -> Null
            const config = ASSET_CONFIG[filename] || ASSET_CONFIG[folder] || {};
            
            return {
                src: getAssetPath(folder, filename),
                // Infer type: Ground folders usually start with 'ground_'? 
                // Or just rely on typeOverride. For now, we trust the usage context or heuristic.
                ...config
            };
        }
        return null;
    }, [assetId]);

    // 2. Load Texture
    const texture = useMemo(() => {
        if (!assetInfo || !assetInfo.src) return PIXI.Texture.EMPTY;
        return PIXI.Texture.from(assetInfo.src);
    }, [assetInfo]);

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

    // 4. Smart Anchor Logic
    // We rely on typeOverride (passed by Editor) or filename heuristics to detect "Blocks".
    const isBlock = useMemo(() => {
        if (typeOverride === 'GROUND') return true;
        
        // Heuristic based on V2 naming conventions
        const idLower = assetId.toLowerCase();
        if (idLower.includes('bank')) return true;
        if (idLower.includes('bridge')) return true;
        if (idLower.includes('water')) return true;
        if (idLower.includes('road')) return true;
        if (idLower.includes('path')) return true; 
        
        return false;
    }, [typeOverride, assetId]);

    const anchor = useMemo(() => {
        // If config has an anchor override, use it!
        if (assetInfo?.anchor) return assetInfo.anchor;

        if (!loaded) return { x: 0.5, y: 0.5 }; // Default while loading

        if (isBlock) {
            // Updated Fix: The user confirmed "Plains" works perfectly at (0.5, 0.5).
            // Logic dictates other Block types (Road, River, Bank) should match.
            // The previous 0.25 math was pushing them way off.
            return { x: 0.5, y: 0.5 };
        } else {
            return { x: 0.5, y: 0.5 };
        }
    }, [isBlock, texture?.width, texture?.height, loaded, assetInfo]);

    // 4.5 Check for Overrides (Calibration) - MOVED ABOVE RETURN TO AVOID CONDITIONAL HOOK ERROR
    const override = useIsoEditorStore(s => s.assetOverrides[assetId]);

    // 4.6 Determine Base Width based on folder defaults
    const getBaseWidth = () => {
        if (override?.baseWidth !== undefined) return override.baseWidth;
        if (assetInfo?.baseWidth !== undefined) return assetInfo.baseWidth;
        
        const idLower = assetId.toLowerCase();
        if (idLower.includes('units')) return 72;
        if (idLower.includes('bank')) return 40;
        if (idLower.includes('base')) return 40;
        
        return 256; // Global default
    };

    if (!assetInfo || !loaded || !texture) return null;

    // 5. Calculate Position & Scale
    const screenPos = isoToScreen(gridX, gridY);
    // User Update: Custom defaults for Units (72), Banks/Base (40)
    const targetWidth = getBaseWidth();
    const scale = targetWidth / texture.width;

    // Manual Offsets (Scaled)
    // User Requirement: 
    // 1. Plains are perfect with their specific config.
    // 2. All OTHER assets need "x: 0, y: -64".
    
    // Check if this asset is a "Plains" asset (folder or filename)
    const isPlains = assetId.includes('plains') || assetId.includes('grass');

    let finalOffsetX = (assetInfo.offset?.x || 0) + (override?.deltaX || 0);
    let finalOffsetY = (assetInfo.offset?.y || 0) + (override?.deltaY || 0);

    if (!isPlains) {
        // Apply global offset override for non-plains assets
        // Only apply if no manual override is present in the static config? 
        // No, apply as base, then allow tuning.
        // If the user hasn't touched the slider (deltaY=0), apply defaults.
        if ((assetInfo.offset?.y || 0) === 0) finalOffsetY -= 60; 
    }

    const offsetX = finalOffsetX * scale;
    const offsetY = finalOffsetY * scale;

    return (
        <Sprite 
            texture={texture}
            x={screenPos.x + offsetX}
            y={screenPos.y + offsetY}
            anchor={anchor} // Calculated above (includes override check)
            scale={scale}
            // Sort by Y for depth (simple painter's algorithm)
            zIndex={screenPos.y} 
            roundPixels={true}
        />
    );
};
