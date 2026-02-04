import React from 'react';
import { useViewportContext } from '../../../context/ViewportContext';

const IconZoomIn = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
);

const IconZoomOut = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
);

const IconFocus = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
        <line x1="12" y1="2" x2="12" y2="4"></line>
        <line x1="12" y1="20" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="4" y2="12"></line>
        <line x1="20" y1="12" x2="22" y2="12"></line>
    </svg>
);

export const MapControls = () => {
    const { viewport } = useViewportContext();

    const handleZoomIn = () => {
        if (!viewport) return;
        viewport.animate({
            time: 400,
            scale: viewport.scale.x * 1.5,
            ease: 'easeInOutQuad',
        });
    };

    const handleZoomOut = () => {
        if (!viewport) return;
        viewport.animate({
            time: 400,
            scale: viewport.scale.x * 0.75,
            ease: 'easeInOutQuad',
        });
    };

    const handleReset = () => {
        if (!viewport) return;

        // Calculate fit scale (mimics viewport.fit())
        const scaleX = viewport.screenWidth / viewport.worldWidth;
        const scaleY = viewport.screenHeight / viewport.worldHeight;
        const fitScale = Math.min(scaleX, scaleY);

        viewport.animate({
            time: 1000,
            position: { x: viewport.worldWidth / 2, y: viewport.worldHeight / 2 },
            scale: fitScale,
            ease: 'easeInOutCubic',
        });
    };

    const buttonStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: 'none',
        borderRadius: '8px',
        padding: '10px',
        cursor: 'pointer',
        color: '#ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s, color 0.2s',
    };

    const activeButtonStyle = {
        ...buttonStyle,
        background: 'rgba(59, 130, 246, 0.2)',
        color: '#93c5fd',
        border: '1px solid rgba(59, 130, 246, 0.3)'
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '16px',
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 16px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto'
        }}>
            <button 
                onClick={handleZoomOut} 
                style={buttonStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                title="Zoom Out (-)"
            >
                <IconZoomOut />
                <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 'bold' }}>-</span>
            </button>
            
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />

            <button 
                onClick={handleReset} 
                title="Reset View (R)" 
                style={activeButtonStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.4)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
            >
                <IconFocus />
                <span style={{ marginLeft: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reset</span>
            </button>

            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />

            <button 
                onClick={handleZoomIn} 
                style={buttonStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                title="Zoom In (+)"
            >
                <IconZoomIn />
                <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 'bold' }}>+</span>
            </button>
        </div>
    );
};
