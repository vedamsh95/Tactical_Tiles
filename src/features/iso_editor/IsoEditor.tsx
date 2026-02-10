import React, { useState, useEffect } from 'react';
import { IsoCanvas } from './IsoCanvas';
import { useIsoEditorStore } from './useIsoEditorStore';
import { ASSET_FOLDERS, getAssetPath, ASSET_CONFIG } from './IsoV2Assets';

export const IsoEditor = () => {
    const { 
        selectedAsset, selectAsset, 
        selectedFolder, selectFolder,
        selectedTool, setTool,
        undo, redo, past, future,
        tiles, objects, loadMapState,
        assetOverrides, setAssetOverride
    } = useIsoEditorStore();

    const [showLoadModal, setShowLoadModal] = useState(false);
    const [savedMaps, setSavedMaps] = useState<string[]>([]);

    // Determine current calibration
    const currentAssetId = selectedFolder && selectedAsset ? `${selectedFolder}/${selectedAsset}` : null;
    const currentConfig = (currentAssetId ? ASSET_CONFIG[currentAssetId] : null) || {};
    const currentOverride = (currentAssetId ? assetOverrides[currentAssetId] : null) || {};

    // Defaults
    const valWidth = currentOverride.baseWidth ?? currentConfig.baseWidth ?? 256;
    const valDeltaX = currentOverride.deltaX || 0;
    const valDeltaY = currentOverride.deltaY || 0;

    const handleCalibrate = (field: 'baseWidth' | 'deltaX' | 'deltaY', value: number) => {
        if (!currentAssetId) return;
        setAssetOverride(currentAssetId, {
            ...currentOverride,
            [field]: value
        });
    };

    const copyConfig = () => {
         if (!currentAssetId) return;
         const config = {
             baseWidth: valWidth,
             offset: { x: valDeltaX, y: valDeltaY }
         };
         navigator.clipboard.writeText(`'${selectedAsset}': ${JSON.stringify(config, null, 2)}`);
         alert('Config copied to clipboard! Send this to the developer.');
    };

    useEffect(() => {
        // Load map list on mount
        const maps = JSON.parse(localStorage.getItem('iso_maps') || '{}');
        setSavedMaps(Object.keys(maps));
    }, [showLoadModal]);

    const handleSave = () => {
        const name = prompt("Enter map name to save:", "New Map");
        if (!name) return;

        const maps = JSON.parse(localStorage.getItem('iso_maps') || '{}');
        maps[name] = {
            tiles,
            objects,
            lastModified: Date.now()
        };
        localStorage.setItem('iso_maps', JSON.stringify(maps));
        alert('Map saved successfully!');
    };

    const handleLoad = (name: string) => {
        const maps = JSON.parse(localStorage.getItem('iso_maps') || '{}');
        if (maps[name]) {
            loadMapState(maps[name].tiles, maps[name].objects);
            setShowLoadModal(false);
        }
    };

    // The available files for the currently selected folder
    const folderFiles = ASSET_FOLDERS[selectedFolder] || [];

    const styles = {
        container: {
            display: 'flex',
            height: '100vh',
            width: '100vw',
            backgroundColor: '#0f172a',
            color: '#e2e8f0',
            overflow: 'hidden'
        },
        sidebarLeft: {
            width: '200px',
            display: 'flex',
            flexDirection: 'column' as const,
            borderRight: '1px solid #334155',
            backgroundColor: '#1e293b',
            zIndex: 10,
            flexShrink: 0
        },
        sidebarRight: {
            width: '320px', // Increased width for better visibility
            display: 'flex',
            flexDirection: 'column' as const,
            borderLeft: '1px solid #334155',
            backgroundColor: '#1e293b',
            zIndex: 10,
            flexShrink: 0,
            height: '100%' // Ensure full height
        },
        centerConfig: {
            flex: 1,
            position: 'relative' as const,
            backgroundColor: '#000',
            minWidth: 0
        },
        header: {
            padding: '16px',
            borderBottom: '1px solid #334155',
            backgroundColor: '#0f172a',
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#38bdf8'
        },
        listContainer: {
            flex: 1,
            overflowY: 'auto' as const,
        },
        folderBtn: (isActive: boolean) => ({
             width: '100%',
             textAlign: 'left' as const,
             padding: '12px 16px',
             fontSize: '14px',
             fontWeight: 500,
             border: 'none',
             borderLeft: isActive ? '4px solid #38bdf8' : '4px solid transparent',
             backgroundColor: isActive ? '#334155' : 'transparent',
             color: isActive ? '#38bdf8' : '#94a3b8',
             cursor: 'pointer',
             transition: 'background-color 0.2s'
        }),
        menuBar: {
            display: 'flex',
            gap: '8px',
            padding: '16px',
            borderBottom: '1px solid #334155',
            backgroundColor: '#0f172a'
        },
        menuBtn: (disabled: boolean = false) => ({
            padding: '6px 12px',
            backgroundColor: disabled ? '#1e293b' : '#334155',
            color: disabled ? '#64748b' : '#e2e8f0',
            border: '1px solid #475569',
            borderRadius: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
        }),
        toolContainer: {
            padding: '16px',
            borderTop: '1px solid #334155',
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '8px'
        },
        toolBtn: (active: boolean, color: string) => ({
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: active ? color : '#334155',
            color: active ? '#fff' : '#94a3b8'
        }),
        assetGrid: {
            padding: '16px',
            display: 'grid',
            // Fixed column size (120px) to prevent stretching to massive sizes when few items exist.
            // Fits ~2 items per row on the 320px panel.
            gridTemplateColumns: 'repeat(auto-fill, 120px)', 
            justifyContent: 'space-between', // Distribute evenly
            gap: '12px',
            overflowY: 'auto' as const,
            flex: 1,
            minHeight: 0 
        },
        assetBtn: (isActive: boolean) => ({
            width: '120px',
            height: '120px',
            flexShrink: 0, // Prevent squishing
            position: 'relative' as const,
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            border: isActive ? '1px solid #3b82f6' : '1px solid #334155',
            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(51, 65, 85, 0.3)',
            cursor: 'pointer',
            overflow: 'hidden'
        }),
        checkerboard: {
            position: 'absolute' as const,
            inset: 0,
            opacity: 0.2,
            backgroundImage: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)', 
            backgroundSize: '10px 10px'
        }
    };

    return (
        <div style={styles.container}>
            
            {/* LEFT SIDEBAR: Folders */}
            <div style={styles.sidebarLeft}>
                <div style={styles.header}>
                    IsoEditor V2
                </div>
                
                {/* MENU BAR (Undo/Redo/Save/Load) */}
                <div style={styles.menuBar}>
                    <button style={styles.menuBtn(past.length === 0)} onClick={undo} disabled={past.length === 0}>Undo</button>
                    <button style={styles.menuBtn(future.length === 0)} onClick={redo} disabled={future.length === 0}>Redo</button>
                </div>
                <div style={styles.menuBar}>
                    <button style={styles.menuBtn()} onClick={handleSave}>Save</button>
                    <button style={styles.menuBtn()} onClick={() => setShowLoadModal(true)}>Load</button>
                </div>

                <div style={styles.listContainer}>
                    {Object.keys(ASSET_FOLDERS).map(folder => (
                        <button
                            key={folder}
                            onClick={() => selectFolder(folder)}
                            style={styles.folderBtn(selectedFolder === folder)}
                        >
                            <span style={{ textTransform: 'capitalize' }}>{folder}</span>
                        </button>
                    ))}
                </div>
                
                {/* Global Tools */}
                <div style={styles.toolContainer}>
                    <button 
                        onClick={() => setTool('PAINT')}
                        style={styles.toolBtn(selectedTool === 'PAINT', '#2563eb')}
                        title="Brush Tool (Paint Single Tile)"
                    >
                        🖌 Paint
                    </button>
                    <button 
                        onClick={() => setTool('RECTANGLE')}
                        style={styles.toolBtn(selectedTool === 'RECTANGLE', '#2563eb')}
                        title="Box Tool (Drag to fill area)"
                    >
                        ⬜ Box Fill
                    </button>
                    <button 
                         onClick={() => setTool('FILL')}
                         style={styles.toolBtn(selectedTool === 'FILL', '#2563eb')}
                         title="Bucket Tool (Fill same adjacent tiles)"
                    >
                        💧 Bucket
                    </button>
                    <button 
                         onClick={() => setTool('PICKER')}
                         style={styles.toolBtn(selectedTool === 'PICKER', '#0891b2')}
                         title="Eyedropper (Pick asset from map)"
                    >
                        🖊 Picker
                    </button>
                    <button 
                         onClick={() => setTool('ERASE')}
                         style={styles.toolBtn(selectedTool === 'ERASE', '#dc2626')}
                         title="Eraser (Remove tiles)"
                    >
                        ❌ Erase
                    </button>
                </div>
            </div>

            {/* MIDDLE: Canvas */}
            <div style={styles.centerConfig}>
                <IsoCanvas />
            </div>

            {/* RIGHT SIDEBAR: Asset Grid */}
            <div style={styles.sidebarRight}>
                
                {/* CALIBRATION PANEL (If Asset Selected) */}
                {selectedAsset && (
                    <div style={{ padding: '16px', borderBottom: '1px solid #334155', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Calibration: {valWidth}px</span>
                            <button onClick={copyConfig} style={{ border: 'none', background: 'none', color: '#38bdf8', cursor: 'pointer' }}>[Copy]</button>
                        </div>
                        
                        {/* Width Slider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ fontSize: '10px', width: '20px' }}>W</span>
                             <input 
                                type="range" min="32" max="512" step="8" 
                                value={valWidth} 
                                onChange={(e) => handleCalibrate('baseWidth', parseInt(e.target.value))}
                                style={{ flex: 1 }}
                             />
                        </div>

                         {/* Offset X */}
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ fontSize: '10px', width: '20px' }}>X</span>
                             <input 
                                type="range" min="-128" max="128" step="4" 
                                value={valDeltaX} 
                                onChange={(e) => handleCalibrate('deltaX', parseInt(e.target.value))}
                                style={{ flex: 1 }}
                             />
                        </div>

                         {/* Offset Y */}
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ fontSize: '10px', width: '20px' }}>Y</span>
                             <input 
                                type="range" min="-128" max="128" step="4" 
                                value={valDeltaY} 
                                onChange={(e) => handleCalibrate('deltaY', parseInt(e.target.value))}
                                style={{ flex: 1 }}
                             />
                        </div>
                    </div>
                )}

                <div style={{ ...styles.header, fontSize: '12px', textAlign: 'center', textTransform: 'uppercase', color: '#64748b' }}>
                    {selectedFolder} Assets
                </div>

                <div style={styles.assetGrid}>
                    {folderFiles.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '40px', gridColumn: 'span 2' }}>No assets found</div>
                    )}
                    {folderFiles.map((filename) => {
                        const isActive = selectedAsset === filename;
                        const src = getAssetPath(selectedFolder, filename);
                        
                        return (
                            <button
                                key={filename}
                                onClick={() => selectAsset(selectedFolder, filename)}
                                style={styles.assetBtn(isActive)}
                                title={filename}
                            >
                                <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px', position: 'relative', minHeight: 0 }}>
                                    {/* Checkerboard Logic Simplified for Inline */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: '#fff' }}></div>
                                    
                                    <img 
                                        src={src} 
                                        alt={filename}
                                        style={{ 
                                            position: 'relative', 
                                            zIndex: 10, 
                                            maxWidth: '100%', 
                                            maxHeight: '100%', 
                                            objectFit: 'contain',
                                            imageRendering: 'pixelated'
                                        }}
                                    />
                                </div>
                                <span style={{ 
                                    fontSize: '9px', 
                                    textAlign: 'center', 
                                    width: '100%', 
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    color: isActive ? '#fff' : '#94a3b8',
                                    flexShrink: 0
                                }}>
                                    {filename.replace('.png', '')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* LOAD MODAL */}
            {showLoadModal && (
                <div style={{
                    position: 'fixed', inset: 0, 
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        width: '400px', backgroundColor: '#1e293b', 
                        border: '1px solid #475569', borderRadius: '8px', padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                        <h3 style={{ margin: 0, marginBottom: '8px', color: '#fff' }}>Load Map</h3>
                        {savedMaps.length === 0 && <div style={{color: '#94a3b8'}}>No saved maps found.</div>}
                        
                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {savedMaps.map(mapName => (
                                <button
                                    key={mapName}
                                    onClick={() => handleLoad(mapName)}
                                    style={{
                                        padding: '8px',
                                        backgroundColor: '#334155',
                                        border: 'none',
                                        color: '#e2e8f0',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderRadius: '4px'
                                    }}
                                >
                                    {mapName}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowLoadModal(false)}
                            style={{ padding: '8px', marginTop: '8px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
