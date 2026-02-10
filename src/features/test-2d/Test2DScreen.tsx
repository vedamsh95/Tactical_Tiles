import React, { useEffect } from 'react';
import { Test2DRenderer } from './components/Test2DRenderer';
import { LeftPanel, RightPanel, WinnerOverlay } from '../../components/ui/HUD';
import { useGameStore } from '../../store/useGameStore';

export const Test2DScreen = () => {
    const setScreen = useGameStore(state => state.setScreen);
    const mapData = useGameStore(state => state.mapData);
    const initializeMap = useGameStore(state => state.initializeMap);
    
    // Ensure map exists
    useEffect(() => {
        // If mapData is empty, initialize a default game
        if (!mapData || mapData.length === 0) {
            console.log("No Map Data found in Test2D - Initializing default...");
            initializeMap();
        }
    }, [mapData, initializeMap]);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#111', overflow: 'hidden' }}>
            {/* HUD OVERLAYS */}
            <LeftPanel />
            <RightPanel />
            <WinnerOverlay />
            
            {/* Top Bar / Back Button for Demo */}
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100, display: 'flex', gap: '10px' }}>
                <button 
                    onClick={() => setScreen('SETUP')}
                    style={{ padding: '8px 16px', fontSize: '16px', cursor: 'pointer', background: '#444', color: '#fff', border: 'none' }}
                >
                    Back to Menu
                </button>
                <div style={{ color: 'white', marginTop: 10, background: 'rgba(0,0,0,0.5)', padding: '5px' }}>
                     TEST-2D (Playable Isometric Demo)
                </div>
            </div>

            {/* RENDERER */}
            <Test2DRenderer />
        </div>
    );
};
