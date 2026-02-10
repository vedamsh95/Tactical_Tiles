// src/features/vision3d/components/GameModel.tsx

import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { ASSET_LIBRARY, AssetId } from '../config/AssetRegistry';
import { Mesh, MeshStandardMaterial } from 'three';

interface GameModelProps {
    assetId: AssetId;
    position: [number, number, number];
    opacity?: number;
    rotation?: number;
}

export const GameModel: React.FC<GameModelProps> = ({ assetId, position, opacity = 1, rotation = 0 }) => {
    const config = ASSET_LIBRARY[assetId];
    
    if (!config) {
        console.warn(`Asset not found: ${assetId}`);
        return null;
    }

    // This will suspend if loading.
    const { scene } = useGLTF(config.url);
    const clonedScene = useMemo(() => {
        const s = scene.clone();
        
        // Fix for missing textures: Apply procedural colors if white
        s.traverse((child) => {
            if ((child as Mesh).isMesh) {
                const mesh = child as Mesh;
                if (mesh.material instanceof MeshStandardMaterial) {
                   mesh.material = mesh.material.clone();
                   
                   // Ensure material is fully opaque/white by default to show texture correctly
                   mesh.material.color.setHex(0xFFFFFF);
                   mesh.material.roughness = 0.8;
                   mesh.material.metalness = 0.1;

                   // If opacity is set, apply it
                   if (opacity < 1) {
                        mesh.material.transparent = true;
                        mesh.material.opacity = opacity;
                   }

                   // Fallback logic: If texture is missing or name suggests a color
                   // (If colormap.png is loaded successfully, .map will be defined)
                   if (!mesh.material.map) {
                        // Very basic "hashed" color based on asset name/mesh name to distinguish types
                        if (assetId.includes('TREE')) {
                            // Greenish
                            mesh.material.color.setHex(0x4CAF50);
                        } else if (assetId.includes('RIVER')) {
                            // Blueish
                            mesh.material.color.setHex(0x2196F3);
                        } else if (assetId.includes('ROAD')) {
                            // Dark Grey
                            mesh.material.color.setHex(0x555555);
                        } else if (assetId.includes('BUILDING')) {
                             // Varied Grey/Red
                             mesh.material.color.setHex(0x9E9E9E);
                        } else if (assetId.includes('BANK')) {
                             mesh.material.color.setHex(0xFFD700);
                        } else if (assetId.includes('MOUNTAIN')) {
                             mesh.material.color.setHex(0x795548);
                        } else if (assetId.includes('PLAINS')) {
                             mesh.material.color.setHex(0x66BB6A); // Grass Green
                        } else if (assetId.includes('BRIDGE')) {
                             mesh.material.color.setHex(0x8D6E63); // Wood Brown
                        }
                   } else {
                       // Texture exists! clean it up
                       mesh.material.map.anisotropy = 16;
                   }
                }
            }
        });
        return s;
    }, [scene, opacity, assetId]);

    return <primitive object={clonedScene} position={position} scale={config.scale} rotation={[0, rotation, 0]} />;
};

// Pre-load assets
Object.values(ASSET_LIBRARY).forEach(asset => useGLTF.preload(asset.url));
