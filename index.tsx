
import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameRenderer } from './src/components/game/GameRenderer';
import { LeftPanel, RightPanel, WinnerOverlay } from './src/components/ui/HUD';
import { GameSetup } from './src/screens/GameSetup';
import { MapEditor } from './src/screens/MapEditor';
import { HowToPlay } from './src/screens/HowToPlay';
import { ArcadeScreen } from './src/features/arcade/components/ArcadeScreen';
import { VisionScreen } from './src/features/vision3d/components/VisionScreen';
import { useGameStore } from './src/store/useGameStore';
import { ViewportProvider } from './src/context/ViewportContext';
import { MapControls } from './src/components/game/ui/MapControls';

const App = () => {
  const currentScreen = useGameStore(state => state.currentScreen);
  const resetGame = useGameStore(state => state.resetGame);

  if (currentScreen === 'SETUP') {
      return <GameSetup />;
  }

  if (currentScreen === 'EDITOR') {
      return <MapEditor />;
  }

  if (currentScreen === 'TUTORIAL') {
      return <HowToPlay />;
  }

  if (currentScreen === 'ARCADE') {
      return <ArcadeScreen />;
  }

  if (currentScreen === 'VISION3D') {
      return <VisionScreen />;
  }

  // GAME SCREEN
  return (
    <ViewportProvider>
    <div style={{ 
        display: 'flex', 
        width: '100vw', 
        height: '100vh', 
        background: '#0a0a0a', 
        overflow: 'hidden',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      <WinnerOverlay />
      
      {/* Left Column (Player Stats) */}
      <div style={{ width: '25%', minWidth: '300px', height: '100%' }}>
        <LeftPanel />
      </div>

      {/* Center Column (Fixed Map) */}
      <div style={{ flex: 1, position: 'relative', height: '100%', borderLeft: '1px solid #222', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
        
        {/* LEAVE BUTTON */}
        <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 50 }}>
            <button 
                onClick={() => resetGame()}
                style={{
                    background: 'rgba(20, 20, 20, 0.8)',
                    color: '#ef5350',
                    border: '1px solid #b71c1c',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    letterSpacing: '1px',
                    backdropFilter: 'blur(4px)',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(183, 28, 28, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(20, 20, 20, 0.8)'}
            >
                ABORT MISSION
            </button>
        </div>

        {/* TOP: Game Viewport Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <GameRenderer />
        </div>

        {/* BOTTOM: Control Deck Area (Separate Panel) */}
        <div style={{ height: '80px', background: '#0f0f0f', borderTop: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapControls />
        </div>
      </div>

      {/* Right Column (Info & Actions) */}
      <div style={{ width: '25%', minWidth: '300px', height: '100%' }}>
        <RightPanel />
      </div>
    </div>
    </ViewportProvider>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
