// src/features/vision3d/components/EditorUI.tsx

import React from 'react';
import { AssetId, ASSET_LIBRARY } from '../config/AssetRegistry';
import { useEditorStore } from '../stores/useEditorStore';

export const EditorUI = () => {
    const selectedAsset = useEditorStore(state => state.selectedAsset);
    const selectAsset = useEditorStore(state => state.selectAsset);
    const mapData = useEditorStore(state => state.mapData);
    const generateRandomMap = useEditorStore(state => state.generateRandomMap);

    const handleSave = () => {
        console.log("--- VISION3D MAP DATA ---");
        console.log(JSON.stringify(mapData, null, 2));
        alert('Map Saved to Console (F12)');
    };

    const handleRegenerate = () => {
        generateRandomMap(20, 20);
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, padding: '20px', background: 'rgba(0,0,0,0.8)', height: '100%', color: 'white', width: '250px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{marginTop: 0}}>Vision3D</h2>
            <h3>Asset Palette</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {(Object.keys(ASSET_LIBRARY) as AssetId[]).map(id => (
                    <button
                        key={id}
                        onClick={() => selectAsset(id)}
                        style={{
                            padding: '10px',
                            background: selectedAsset === id ? '#2196F3' : '#333',
                            color: 'white',
                            border: '1px solid #555',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        {id}
                    </button>
                ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                    onClick={handleRegenerate}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: '#9C27B0',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    REGENERATE MAP
                </button>
                <button 
                    onClick={handleSave}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    SAVE TO CONSOLE
                </button>
            </div>
            
            <div style={{ marginTop: '20px', fontSize: '12px', color: '#aaa' }}>
                Right Click to Delete <br/>
                Left Click to Paint
            </div>
        </div>
    );
};
