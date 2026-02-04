
import React, { useState } from 'react';
import { SPRITES } from '../../core/assets/SpriteAssets';

export const AssetExporter = () => {
    const [status, setStatus] = useState<string>("Idle");

    const downloadImage = (name: string, dataUri: string, folder: 'terrain' | 'units') => {
        return new Promise<void>((resolve) => {
            const img = new Image();
            img.src = dataUri;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, 64, 64);
                    // Trigger Download
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    // Filename: terrain/plains.png
                    // Note: Browsers flatten folder structures on download, 
                    // user will get a bunch of files in their Download folder.
                    a.download = `${name.toLowerCase()}.png`; 
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
                setTimeout(resolve, 200); // 200ms delay to prevent browser blocking
            };
        });
    };

    const handleExport = async () => {
        setStatus("Starting Export...");
        
        // Export Terrain
        setStatus("Exporting Terrain...");
        for (const [key, uri] of Object.entries(SPRITES.TERRAIN)) {
            await downloadImage(key, uri, 'terrain');
            setStatus(`Exported ${key}...`);
        }

        // Export Units
        setStatus("Exporting Units...");
        for (const [key, uri] of Object.entries(SPRITES.UNITS)) {
            await downloadImage(key, uri, 'units');
            setStatus(`Exported ${key}...`);
        }

        setStatus("DONE! Check your Downloads folder.");
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.8)',
            padding: '15px',
            border: '2px solid #FFD700',
            borderRadius: '8px',
            zIndex: 9999,
            color: 'white',
            maxWidth: '300px'
        }}>
            <h4 style={{margin: '0 0 10px 0', color:'#FFD700'}}>DEV TOOL: Asset Exporter</h4>
            <p style={{fontSize: '11px', color: '#ccc'}}>
                Clicking this will download all game assets as .png files to your computer's Downloads folder.
            </p>
            <div style={{marginBottom:'10px', fontSize:'12px', fontWeight:'bold', color: status.includes('DONE') ? '#00FF00' : 'white'}}>
                Status: {status}
            </div>
            <button 
                onClick={handleExport}
                style={{
                    width: '100%',
                    padding: '8px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                ⬇️ DOWNLOAD ALL ASSETS
            </button>
            <p style={{fontSize:'10px', marginTop:'10px', color:'#888'}}>
                After downloading:<br/>
                1. Move terrain images to <b>public/assets/terrain/</b><br/>
                2. Move unit images to <b>public/assets/units/</b>
            </p>
        </div>
    );
};
