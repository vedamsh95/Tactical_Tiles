// src/features/vision3d/components/VisionScreen.tsx

import React, { useEffect } from 'react';
import { EditorScene } from './EditorScene';
import { EditorUI } from './EditorUI';
import { useEditorStore } from '../stores/useEditorStore';

export const VisionScreen = () => {
    const generateRandomMap = useEditorStore(state => state.generateRandomMap);

    useEffect(() => {
        generateRandomMap(20, 20);
    }, [generateRandomMap]);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            <EditorScene />
            <EditorUI />
        </div>
    );
};
