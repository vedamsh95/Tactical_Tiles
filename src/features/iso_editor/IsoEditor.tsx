import React, { useState } from 'react';
import { IsoCanvas } from './IsoCanvas';
import { useIsoEditorStore } from './useIsoEditorStore';
import { ASSET_FOLDERS, getAssetPath } from './IsoV2Assets';

export const IsoEditor = () => {
    const { 
        selectedAsset, selectAsset, 
        selectedFolder, selectFolder,
        selectedTool, setTool
    } = useIsoEditorStore();

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
            width: '280px',
            display: 'flex',
            flexDirection: 'column' as const,
            borderLeft: '1px solid #334155',
            backgroundColor: '#1e293b',
            zIndex: 10,
            flexShrink: 0
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
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            overflowY: 'auto' as const,
            flex: 1
        },
        assetBtn: (isActive: boolean) => ({
            position: 'relative' as const,
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            padding: '8px',
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
                    >
                        Paint Tool
                    </button>
                    <button 
                         onClick={() => setTool('ERASE')}
                         style={styles.toolBtn(selectedTool === 'ERASE', '#dc2626')}
                    >
                        Eraser Tool
                    </button>
                </div>
            </div>

            {/* MIDDLE: Canvas */}
            <div style={styles.centerConfig}>
                <IsoCanvas />
            </div>

            {/* RIGHT SIDEBAR: Asset Grid */}
            <div style={styles.sidebarRight}>
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
                                <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', position: 'relative' }}>
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
                                    fontSize: '10px', 
                                    textAlign: 'center', 
                                    width: '100%', 
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    color: isActive ? '#fff' : '#cbd5e1'
                                }}>
                                    {filename.replace('.png', '')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
