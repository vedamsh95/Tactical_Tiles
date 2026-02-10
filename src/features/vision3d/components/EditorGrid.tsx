// src/features/vision3d/components/EditorGrid.tsx

import React from 'react';
import { Grid } from '@react-three/drei';
import { useEditorStore } from '../stores/useEditorStore';
import { ThreeEvent } from '@react-three/fiber';

export const EditorGrid = () => {
    const placeAsset = useEditorStore(state => state.placeAsset);
    const removeAsset = useEditorStore(state => state.removeAsset);
    const setHover = useEditorStore(state => state.setHover);

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        const x = Math.floor(e.point.x);
        const z = Math.floor(e.point.z);
        setHover(x, z);
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const x = Math.floor(e.point.x);
        const z = Math.floor(e.point.z);
        placeAsset(x, z);
    };

    const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const x = Math.floor(e.point.x);
        const z = Math.floor(e.point.z);
        removeAsset(x, z);
    };

    return (
        <group>
            {/* Visual Grid */}
            <Grid 
                position={[0.5, 0.01, 0.5]} 
                args={[100, 100]} 
                cellSize={1} 
                cellThickness={0.5} 
                cellColor="#6f6f6f" 
                sectionSize={5} 
                sectionThickness={1} 
                sectionColor="#9d4b4b" 
                fadeDistance={50} 
            />
            
            {/* Invisible Hit Plane */}
            <mesh 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0, 0]} 
                onPointerMove={handlePointerMove} 
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial visible={false} />
            </mesh>
        </group>
    );
};
