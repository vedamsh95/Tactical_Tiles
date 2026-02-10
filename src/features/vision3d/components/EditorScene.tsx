// src/features/vision3d/components/EditorScene.tsx

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Environment } from '@react-three/drei';
import { EditorGrid } from './EditorGrid';
import { GameModel } from './GameModel';
import { useEditorStore } from '../stores/useEditorStore';

// Helper to determine if an asset is a "Prop" that needs a ground tile under it
const isProp = (assetId: string) => {
    return assetId.startsWith('TREE') || 
           assetId.startsWith('BUILDING') || 
           assetId.startsWith('SKYSCRAPER');
};

export const EditorScene = () => {
    const mapData = useEditorStore(state => state.mapData);
    const hoverCursor = useEditorStore(state => state.hoverCursor);
    const selectedAsset = useEditorStore(state => state.selectedAsset);

    return (
        <Canvas shadows>
            <OrthographicCamera makeDefault position={[50, 50, 50]} zoom={40} near={-100} far={500}/>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 5]} castShadow intensity={1} shadow-mapSize={[2048, 2048]} />
            <OrbitControls 
                makeDefault
                target={[10, 0, 10]}
                enableRotate={true}
                enablePan={true}
                enableZoom={true}
                minZoom={10}
                maxZoom={100}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2.1}
            />

            <group position={[0,0,0]}>
                <EditorGrid />
                
                <Suspense fallback={null}>
                    {/* Placed Assets */}
                    {Object.entries(mapData).map(([key, data]) => {
                        const [x, y] = key.split(',').map(Number);
                        // In 3D space: x corresponds to X, y corresponds to Z (usually on ground plane)
                        
                        const items = [];
                        
                        // Always render the main asset
                        items.push(
                            <GameModel 
                                key={key} 
                                assetId={data.assetId} 
                                position={[x + 0.5, 0, y + 0.5]} 
                                rotation={data.rotation} 
                            />
                        );

                        // If it's a Prop (Building/Tree), render a Plains tile underneath
                        if (isProp(data.assetId)) {
                             items.push(
                                <GameModel 
                                    key={`${key}-base`}
                                    assetId="PLAINS"
                                    position={[x + 0.5, 0, y + 0.5]} 
                                    rotation={0} 
                                />
                             );
                        }
                        
                        return items;
                    })}

                    {/* Ghost Cursor */}
                    {hoverCursor && selectedAsset && (
                        <GameModel 
                            assetId={selectedAsset} 
                            position={[hoverCursor.x + 0.5, 0, hoverCursor.y + 0.5]} 
                            opacity={0.5} 
                        />
                    )}
                </Suspense>
            </group>
        </Canvas>
    );
};
