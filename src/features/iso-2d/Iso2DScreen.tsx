import React, { useEffect } from 'react';
import { IsoGameRenderer } from './components/IsoGameRenderer';
import { useGameStore } from '../../store/useGameStore';

export const Iso2DScreen = () => {
    const setScreen = useGameStore(state => state.setScreen);
    const mapData = useGameStore(state => state.mapData);
    const initializeMap = useGameStore(state => state.initializeMap);
    
    // Auto-generate map if empty
    useEffect(() => {
        if (!mapData || mapData.length === 0) {
            console.log("Iso2D: No map data found, initializing...");
            initializeMap();
        }
    }, [mapData, initializeMap]);

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#222' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100, display: 'flex', gap: '10px' }}>
                <button 
                    onClick={() => setScreen('SETUP')}
                    style={{ padding: '8px 16px', fontSize: '16px', cursor: 'pointer', background: '#444', color: '#fff', border: 'none' }}
                >
                    Back to Menu
                </button>
                <button 
                    onClick={() => initializeMap()}
                    style={{ padding: '8px 16px', fontSize: '16px', cursor: 'pointer', background: '#2196F3', color: '#fff', border: 'none' }}
                >
                    Regenerate Map
                </button>
                <div style={{ color: 'white', marginTop: 10 }}>Iso-2D Mode</div>
            </div>
            <IsoGameRenderer />
        </div>
    );
};
