
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Container, Sprite, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { SafeSprite } from '../components/game/SafeSprite';
import { useGameStore } from '../store/useGameStore';
import { Tile, TerrainType, BuildingSubType } from '../core/types';
import { TILE_SIZE, HEIGHT_COLORS, TERRAIN_COLORS, PLAYER_COLORS, TERRAIN_DEFENSE, TERRAIN_COSTS, BUILDING_STATS, BASE_STATS, BANK_STATS } from '../core/constants/Config';
import { preloadTextures, getTexture } from '../core/graphics/TextureManager';
import { MapStorage } from '../core/storage/MapStorageManager';

// Helper to create blank map of given size
const createBlankMap = (size: number): Tile[] => {
    return Array(size * size).fill(null).map((_, i) => {
        const x = i % size;
        const y = Math.floor(i / size);
        return {
            id: `${x},${y}`, x, y,
            type: 'PLAINS', height: 1, loot: null,
        } as Tile;
    });
};

const TERRAIN_TYPES: TerrainType[] = [
    'PLAINS', 'FOREST', 'MOUNTAIN', 'WATER', 
    'SAND', 'DUNES', 'QUICKSAND', 'CANYON',
    'ROAD', 'ROAD_H', 'BRIDGE', 'BRIDGE_V',
    'BASE', 'BANK', 'BUILDING', 'BARRIER'
];

// Helper Components
const Section = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
        <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>{title}</div>
        {children}
    </div>
);

const Stat = ({ label, value, color = 'white' }: { label: string, value: string | number, color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
        <span style={{ color: '#aaa' }}>{label}</span>
        <span style={{ fontWeight: 'bold', color }}>{value}</span>
    </div>
);

const getTerrainColor = (type: TerrainType) => {
    switch(type) {
        case 'PLAINS': return '#8BC34A';
        case 'FOREST': return '#388E3C';
        case 'MOUNTAIN': return '#795548';
        case 'WATER': return '#2196F3';
        case 'SAND': return '#E6C288';
        case 'DUNES': return '#D4A35B';
        case 'QUICKSAND': return '#A1887F';
        case 'CANYON': return '#5D4037';
        case 'BASE': return '#607D8B';
        case 'BANK': return '#FFD700';
        case 'BUILDING': return '#546E7A';
        case 'BARRIER': return '#212121';
        case 'ROAD': return '#9E9E9E';
        case 'BRIDGE': return '#8D6E63';
        default: return '#555';
    }
}

// --- RIGHT INTEL PANEL COMPONENT ---
const RightIntelPanel = ({ mode, brush, brushSettings, activeZone }: { mode: 'PAINT' | 'ZONE', brush: TerrainType, brushSettings: any, activeZone: number | null }) => {
    
    // --- ZONE MODE INTEL ---
    if (mode === 'ZONE') {
        return (
            <div style={{ width: '320px', background: '#1a1a1a', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #333', background: '#222' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: 'white', letterSpacing: '1px' }}>ZONE EDITOR</h2>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '5px', fontWeight: 'bold' }}>METEOROLOGY & CONTROL</div>
                </div>
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    <Section title="Active Selection">
                         {activeZone === null ? (
                             <div style={{ color: '#aaa', fontStyle: 'italic' }}>NEUTRAL ZONE (No Weather Effects)</div>
                         ) : (
                             <div>
                                 <div style={{ fontSize: '24px', fontWeight: 'bold', color: PLAYER_COLORS[activeZone], marginBottom: '10px', textShadow: `0 0 10px ${PLAYER_COLORS[activeZone]}40` }}>
                                     ZONE {activeZone + 1}
                                 </div>
                                 <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.5' }}>
                                     Territory assigned to Player {activeZone + 1}. <br/>
                                     The dynamic weather system will roll a unique weather condition for this zone every 5 turns.
                                 </p>
                             </div>
                         )}
                    </Section>
                    <Section title="Weather Possibilities">
                        <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: '#aaa', lineHeight: '1.8' }}>
                            <li><strong style={{color:'#ff9800'}}>SCORCHED:</strong> Heat waves increase move cost (+1).</li>
                            <li><strong style={{color:'#90caf9'}}>MONSOON:</strong> Rain slows heavy units.</li>
                            <li><strong style={{color:'#cfd8dc'}}>FOG:</strong> Reduces vision range to 2 tiles.</li>
                            <li><strong style={{color:'#69f0ae'}}>TAILWIND:</strong> Increases range (+1) and speed.</li>
                            <li><strong style={{color:'#D4A35B'}}>SANDSTORM:</strong> Blinds units (Vision 3).</li>
                        </ul>
                    </Section>
                </div>
            </div>
        );
    }

    // --- PAINT MODE INTEL ---
    const def = TERRAIN_DEFENSE[brush] !== undefined ? TERRAIN_DEFENSE[brush] * 100 : 0;
    const cost = TERRAIN_COSTS[brush] >= 99 ? 'IMPASSABLE' : TERRAIN_COSTS[brush];
    
    let description = "Standard terrain.";
    let tactical = "No specific bonuses.";
    let weatherNotes = "No specific interactions.";
    let previewColor = getTerrainColor(brush);

    // Customize based on brush
    switch (brush) {
        case 'PLAINS':
            description = "Open flat ground with minimal obstruction.";
            tactical = "Neutral ground. No defense bonuses. Easy to traverse.";
            weatherNotes = "Highly susceptible to SCORCHED (+Cost) and TAILWIND (-Cost).";
            break;
        case 'FOREST':
            description = "Dense vegetation and trees.";
            tactical = "Provides 40% Defense cover. Costs 2 CP to move through.";
            weatherNotes = "Standard effects apply.";
            break;
        case 'MOUNTAIN':
            description = "High elevation rocky terrain.";
            tactical = "High ground. Grants SNIPERS bonus range and damage. Hard to traverse (3 CP).";
            weatherNotes = "Blocks wind effects partially.";
            break;
        case 'WATER':
            description = "Deep water bodies.";
            tactical = "Impassable to ground units. Requires BRIDGES to cross.";
            break;
        case 'SAND':
            description = "Loose, shifting sand.";
            tactical = "Unstable footing. Units take +10% more damage here (Negative Cover).";
            weatherNotes = "SCORCHED weather increases movement cost to 2.";
            break;
        case 'DUNES':
            description = "Large sand dunes obstructing view.";
            tactical = "Blocks Line of Sight. Provides 20% Cover and High Ground bonuses.";
            weatherNotes = "Similar to Mountains but in desert biomes.";
            break;
        case 'QUICKSAND':
            description = "Deceptive liquid soil.";
            tactical = "HAZARD: Entering this tile ROOTS the unit for 1 turn (Cannot move next turn).";
            break;
        case 'CANYON':
            description = "Deep geological rift.";
            tactical = "IMPASSABLE to movement. Does NOT block Line of Sight (Shooting allowed).";
            break;
        case 'BASE':
            description = "Military Headquarters.";
            tactical = `Spawn point. Heavily armored (${BASE_STATS.HP} HP). Equipped with Artillery (${BASE_STATS.RANGE} Range).`;
            previewColor = '#607D8B';
            break;
        case 'BANK':
            description = "Financial storage vault.";
            tactical = `Contains Gold/CP. Can be HEISTED by units. Protected by Turrets (${BANK_STATS.DAMAGE} DMG).`;
            previewColor = '#FFD700';
            break;
        case 'BUILDING':
            if (brushSettings.buildingType === 'WATCHTOWER') {
                description = "Observation Tower.";
                tactical = `+${BUILDING_STATS.WATCHTOWER.rangeBonus} Range, +${Math.round((BUILDING_STATS.WATCHTOWER.damageBonus-1)*100)}% Damage. Weak defense.`;
            } else {
                description = "Reinforced Bunker.";
                tactical = `+${BUILDING_STATS.BUNKER.defense*100}% Defense. +${BUILDING_STATS.BUNKER.rangeBonus} Range. Tough structure.`;
            }
            previewColor = '#546E7A';
            break;
        case 'BARRIER':
            description = "Artificial blockade.";
            tactical = "Blocks all movement. High cover (80%) if standing behind it.";
            break;
        case 'ROAD':
        case 'ROAD_H':
            description = "Paved infrastructure.";
            tactical = "Optimized for travel. Standard 1 CP cost.";
            break;
        case 'BRIDGE':
        case 'BRIDGE_V':
            description = "Water crossing infrastructure.";
            tactical = "Allows movement over WATER. Standard 1 CP cost.";
            break;
    }

    return (
        <div style={{ width: '320px', background: '#1a1a1a', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
             <div style={{ padding: '20px', borderBottom: '1px solid #333', background: '#222' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'white', letterSpacing: '1px' }}>INTEL DATABASE</h2>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '5px', fontWeight: 'bold' }}>TERRAIN ANALYSIS</div>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ 
                        width: '50px', height: '50px', 
                        background: previewColor, borderRadius: '8px', border: '2px solid #555',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                    }}>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{brush}</div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                            {brush === 'BUILDING' ? brushSettings.buildingType : 'TERRAIN FEATURE'}
                        </div>
                    </div>
                </div>

                <Section title="Description">
                    <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.5', margin: 0 }}>{description}</p>
                </Section>

                <Section title="Combat Statistics">
                     <Stat label="Movement Cost" value={cost} color={cost === 'IMPASSABLE' ? '#F44336' : (typeof cost === 'number' && cost > 1 ? '#FF9800' : '#4CAF50')} />
                     <Stat label="Defense Bonus" value={def < 0 ? `${def}%` : `+${def}%`} color={def < 0 ? '#F44336' : (def > 0 ? '#4CAF50' : '#888')} />
                     {brush === 'BANK' && (
                         <>
                            <div style={{ height: '1px', background: '#444', margin: '8px 0' }}></div>
                            <Stat label="Gold Reward" value={brushSettings.bankGold} color="#FFD700" />
                            <Stat label="CP Reward" value={brushSettings.bankCp} color="#2196F3" />
                         </>
                     )}
                     {brush === 'BASE' && (
                         <Stat label="Base Integrity" value={`${BASE_STATS.HP} HP`} color="#E91E63" />
                     )}
                </Section>

                <Section title="Tactical Analysis">
                    <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.5', margin: 0 }}>{tactical}</p>
                </Section>

                <Section title="Weather Conditions">
                    <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.5', margin: 0, fontStyle: 'italic' }}>{weatherNotes}</p>
                </Section>
            </div>
        </div>
    );
}

// --- MAIN MAP EDITOR ---
export const MapEditor = () => {
    const exitEditor = useGameStore(state => state.exitEditor);
    const loadMapAndStart = useGameStore(state => state.loadMapAndStart);
    const mapToEdit = useGameStore(state => state.mapToEdit);
    
    const [mapSize, setMapSize] = useState<number>(() => mapToEdit ? mapToEdit.width : 20); 
    const [mapData, setMapData] = useState<Tile[]>(() => {
        if (mapToEdit) return JSON.parse(JSON.stringify(mapToEdit.data));
        return createBlankMap(20);
    });
    const [history, setHistory] = useState<Tile[][]>([]);
    
    const [mode, setMode] = useState<'PAINT' | 'ZONE'>('PAINT');
    const [activeBrush, setActiveBrush] = useState<TerrainType>('PLAINS');
    const [activeZone, setActiveZone] = useState<number | null>(0); 
    const [isDrawing, setIsDrawing] = useState(false);
    
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [mapName, setMapName] = useState(() => mapToEdit ? mapToEdit.name : '');

    const [brushSettings, setBrushSettings] = useState({
        bankGold: 200,
        bankCp: 10,
        buildingType: 'WATCHTOWER' as BuildingSubType
    });
    
    // Pixi Layout State
    const containerRef = useRef<HTMLDivElement>(null);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [layout, setLayout] = useState({ width: 800, height: 800, scale: 1, offsetX: 0, offsetY: 0 });

    useEffect(() => {
        preloadTextures().then(() => {
            console.log("MapEditor: Textures Loaded");
            setImagesLoaded(true);
        });
    }, []);

    // Layout Calculation
    useEffect(() => {
        if (!containerRef.current) return;
        const resize = () => {
            if (!containerRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;
            const worldSize = mapSize * TILE_SIZE;
            
            // Calculate scale to fit
            const scale = Math.min(clientWidth / worldSize, clientHeight / worldSize);
            // Limit max scale to 1.5 to avoid pixelation, but allow it to shrink as much as needed
            const safeScale = Math.min(scale, 1.5);

            const offsetX = (clientWidth - worldSize * safeScale) / 2;
            const offsetY = (clientHeight - worldSize * safeScale) / 2;
            
            console.log(`[MapEditor] Resize: W${clientWidth} H${clientHeight} World${worldSize} Scale${scale} Safe${safeScale} Off${offsetX},${offsetY}`);
            setLayout({ width: clientWidth, height: clientHeight, scale: safeScale, offsetX, offsetY });
        };
        const obs = new ResizeObserver(resize);
        obs.observe(containerRef.current);
        resize();
        return () => obs.disconnect();
    }, [mapSize]);


    // --- EDITING ACTIONS ---
    const handleUndo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, prev.length - 1));
        setMapData(previousState);
    };

    const requestClearMap = () => setShowClearConfirm(true);

    const executeClear = () => {
        setHistory(prev => [...prev, mapData]);
        setMapData(createBlankMap(mapSize));
        setShowClearConfirm(false);
    };

    const handleResize = (size: number) => {
        if (size === mapSize) return;
        if (mapData.some(t => t.type !== 'PLAINS')) {
             if (!window.confirm(`⚠️ RESIZE WARNING:\n\nChanging to ${size}x${size} will reset the map. Continue?`)) return;
        }
        setMapSize(size);
        setMapData(createBlankMap(size));
        setHistory([]);
    };

    const handlePaint = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        // Correct conversion from Screen to World Grid
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Apply Inverse Transforms: (Mouse - Offset) / Scale
        const worldX = (mouseX - layout.offsetX) / layout.scale;
        const worldY = (mouseY - layout.offsetY) / layout.scale;
        
        const gridX = Math.floor(worldX / TILE_SIZE);
        const gridY = Math.floor(worldY / TILE_SIZE);

        if (gridX < 0 || gridX >= mapSize || gridY < 0 || gridY >= mapSize) return;

        setMapData(prev => {
            const idx = gridY * mapSize + gridX;
            // Diff check
            if (prev[idx].type === activeBrush && mode === 'PAINT') {
                 // Additional checks for properties
                 if (activeBrush === 'BANK' && 
                     prev[idx].bankGoldReward === brushSettings.bankGold && 
                     prev[idx].bankCpReward === brushSettings.bankCp) return prev;
                 if (activeBrush === 'BUILDING' && prev[idx].subType === brushSettings.buildingType) return prev;
                 // Base diff check done for type
                 if (activeBrush !== 'BANK' && activeBrush !== 'BUILDING') return prev;
            }
            if (mode === 'ZONE' && prev[idx].zone === activeZone) return prev;

            const newMap = [...prev]; 
            const oldTile = newMap[idx];
            
            // --- ZONE MODE ---
            if (mode === 'ZONE') {
                const newTile = { ...oldTile };
                if (activeZone === null) delete newTile.zone;
                else newTile.zone = activeZone;
                newMap[idx] = newTile;
                return newMap;
            }

            // --- PAINT MODE ---
            // Bridge rules
            if ((activeBrush === 'BRIDGE' || activeBrush === 'BRIDGE_V') && oldTile.type !== 'WATER' && oldTile.type !== 'CANYON') return prev;

            let newHeight = 1;
            if (activeBrush === 'WATER' || activeBrush === 'CANYON') newHeight = 0;
            if (activeBrush === 'MOUNTAIN' || activeBrush === 'DUNES') newHeight = 2;
            
            const newTile: Tile = {
                ...oldTile,
                type: activeBrush,
                height: newHeight,
                subType: undefined,
                bankGoldReward: undefined,
                bankCpReward: undefined
            };

            if (activeBrush === 'BANK') {
                newTile.bankGoldReward = brushSettings.bankGold;
                newTile.bankCpReward = brushSettings.bankCp;
            } else if (activeBrush === 'BUILDING') {
                newTile.subType = brushSettings.buildingType;
            }

            newMap[idx] = newTile;
            return newMap;
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setHistory(prev => [...prev, mapData]); 
        setIsDrawing(true);
        handlePaint(e);
    };

    const handleSave = () => {
        const baseCount = mapData.filter(t => t.type === 'BASE').length;
        if (baseCount < 2) {
            alert("Error: Map must have at least 2 BASES to be playable.");
            return;
        }
        setShowSaveModal(true);
    };

    const executeSave = () => {
        if (!mapName.trim()) return;
        MapStorage.save({
            id: `custom_${Date.now()}`,
            name: mapName,
            author: 'Player',
            width: mapSize,
            height: mapSize,
            createdAt: Date.now(),
            isPreset: false,
            data: mapData,
            baseCount: mapData.filter(t => t.type === 'BASE').length
        });
        alert('Map Saved to Local Storage!');
        setShowSaveModal(false);
        setMapName('');
    };

    const handleLoadPlay = () => {
        const baseCount = mapData.filter(t => t.type === 'BASE').length;
        if (baseCount < 2) {
            alert("Error: Map must have at least 2 BASES to play.");
            return;
        }
        loadMapAndStart(mapData);
    };

    if (!imagesLoaded) return <div style={{ color: 'white', padding: '20px' }}>Loading Editor Resources...</div>;

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#111', color: 'white' }}>
            {/* LEFT PALETTE */}
            <div style={{ width: '280px', background: '#1a1a1a', borderRight: '1px solid #333', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
                {/* 1. MAIN ACTIONS */}
                <div>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Actions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <button onClick={exitEditor} style={{ padding: '10px', background: '#444', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', fontSize: '11px' }}>EXIT</button>
                        <button onClick={handleLoadPlay} style={{ padding: '10px', background: '#2E7D32', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', fontSize: '11px' }}>TEST MAP</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <button onClick={handleSave} style={{ padding: '8px', background: '#FF9800', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', fontSize: '10px' }}>SAVE MAP</button>
                        <button onClick={handleUndo} disabled={history.length === 0} style={{ padding: '8px', background: history.length > 0 ? '#FB8C00' : '#333', border: 'none', color: history.length > 0 ? 'white' : '#777', borderRadius: '4px', cursor: history.length > 0 ? 'pointer' : 'default', fontWeight:'bold', fontSize: '10px' }}>UNDO</button>
                    </div>
                    <button onClick={requestClearMap} style={{ width: '100%', padding: '12px', background: '#D32F2F', border: '1px solid #B71C1C', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', fontSize: '11px' }}>CLEAR MAP</button>
                </div>

                <div style={{ height: '1px', background: '#333' }}></div>

                {/* 2. MAP SIZE */}
                <div>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Map Size</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {[20, 25, 30].map(s => (
                            <button key={s} onClick={() => handleResize(s)} style={{ flex: 1, padding: '8px', background: mapSize === s ? '#2196F3' : '#333', border: '1px solid #444', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', fontSize: '11px', opacity: mapSize === s ? 1 : 0.7 }}>
                                {s}x{s}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ height: '1px', background: '#333' }}></div>

                {/* 3. MODE TOGGLE */}
                <div>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Editor Tool</div>
                    <div style={{ display: 'flex', background:'#333', padding:'4px', borderRadius:'6px' }}>
                        <button onClick={() => setMode('PAINT')} style={{ flex: 1, padding: '8px', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer', background: mode === 'PAINT' ? '#2196F3' : 'transparent', color: mode === 'PAINT' ? 'white' : '#888', fontSize: '11px' }}>TERRAIN</button>
                        <button onClick={() => setMode('ZONE')} style={{ flex: 1, padding: '8px', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer', background: mode === 'ZONE' ? '#E91E63' : 'transparent', color: mode === 'ZONE' ? 'white' : '#888', fontSize: '11px' }}>ZONES</button>
                    </div>
                </div>

                {/* PALETTE CONTENT */}
                {mode === 'PAINT' ? (
                    <>
                        <h3 style={{ marginTop: 0, color: '#aaa', fontSize:'12px' }}>BRUSHES</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {TERRAIN_TYPES.map(type => (
                                <button key={type} onClick={() => setActiveBrush(type)} style={{ background: activeBrush === type ? '#4CAF50' : '#333', border: '1px solid #555', borderRadius: '4px', padding: '10px', color: 'white', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {type}
                                </button>
                            ))}
                        </div>
                        {/* BRUSH SETTINGS */}
                        <div style={{ marginTop: '10px', padding: '10px', background: '#222', borderRadius: '4px', border: '1px solid #444' }}>
                            <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>Brush Settings</div>
                            {activeBrush === 'BANK' && (
                                <div>
                                    <div style={{marginBottom: '10px'}}>
                                        <div style={{ fontSize: '11px', marginBottom:'4px' }}>Max Gold: {brushSettings.bankGold}</div>
                                        <input type="range" min="50" max="400" step="50" value={brushSettings.bankGold} onChange={(e) => setBrushSettings({...brushSettings, bankGold: parseInt(e.target.value)})} style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', marginBottom:'4px' }}>Max CP: {brushSettings.bankCp}</div>
                                        <input type="range" min="0" max="15" step="1" value={brushSettings.bankCp} onChange={(e) => setBrushSettings({...brushSettings, bankCp: parseInt(e.target.value)})} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}
                            {activeBrush === 'BUILDING' && (
                                <div>
                                    <div style={{ fontSize: '11px', marginBottom:'4px' }}>Defense Type</div>
                                    <select value={brushSettings.buildingType} onChange={(e) => setBrushSettings({...brushSettings, buildingType: e.target.value as BuildingSubType})} style={{ width: '100%', padding: '5px', background: '#333', color: 'white', border: '1px solid #555' }}>
                                        <option value="WATCHTOWER">Watchtower (Range)</option>
                                        <option value="BUNKER">Bunker (Defense)</option>
                                    </select>
                                </div>
                            )}
                            {/* Tips */}
                            {activeBrush === 'BARRIER' && <div style={{ fontSize: '11px', color: '#ff9800', fontStyle: 'italic' }}>Blocks movement completely.</div>}
                            {activeBrush === 'QUICKSAND' && <div style={{ fontSize: '11px', color: '#ff9800', fontStyle: 'italic' }}>ROOTS unit for 1 Turn.</div>}
                            {activeBrush === 'CANYON' && <div style={{ fontSize: '11px', color: '#ff9800', fontStyle: 'italic' }}>Impassable, but allows shooting.</div>}
                            {activeBrush === 'SAND' && <div style={{ fontSize: '11px', color: '#ff5722', fontStyle: 'italic' }}>Negative Cover (-10% Defense).</div>}
                        </div>
                    </>
                ) : (
                    <>
                        <h3 style={{ marginTop: 0, color: '#aaa', fontSize:'12px' }}>WEATHER ZONES</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() => setActiveZone(null)} style={{ padding: '10px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', background: activeZone === null ? '#9E9E9E' : '#333', color: activeZone === null ? 'black' : '#888', border: '1px solid #555' }}>NEUTRAL / NO ZONE</button>
                            {[0,1,2,3,4,5].map(pid => (
                                <button key={pid} onClick={() => setActiveZone(pid)} style={{ padding: '10px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', background: activeZone === pid ? PLAYER_COLORS[pid] : '#333', color: 'white', border: '1px solid #555', opacity: activeZone === pid ? 1 : 0.6 }}>
                                    ZONE {pid + 1}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: '20px', padding: '10px', background: '#222', borderRadius: '4px', fontSize: '11px', color: '#ccc' }}>
                            Paint zones manually to define weather regions.
                        </div>
                    </>
                )}
            </div>

            {/* CENTER CANVAS AREA */}
            <div 
                ref={containerRef}
                style={{ flex: 1, height: '100%', position: 'relative', background: '#050505', cursor: 'crosshair', overflow: 'hidden' }}
                onMouseDown={handleMouseDown}
                onMouseMove={(e) => { if (isDrawing) handlePaint(e); }}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
            >
                {/* PIXI STAGE */}
                <Stage 
                    width={layout.width} 
                    height={layout.height} 
                    options={{ background: 0x050505, antialias: true }}
                >
                    <Container x={layout.offsetX} y={layout.offsetY} scale={layout.scale}>
                        {/* GRID BACKGROUND */}
                        <Graphics draw={g => {
                            g.clear();
                            // Fill with slightly lighter black so we can see transparency issues
                            g.beginFill(0x111111);
                            g.drawRect(0, 0, mapSize * TILE_SIZE, mapSize * TILE_SIZE);
                            g.endFill();

                            g.lineStyle(1, 0x444444, 1);
                            g.drawRect(0, 0, mapSize * TILE_SIZE, mapSize * TILE_SIZE);
                        }} />

                        {/* TILES */}
                        {mapData.map(tile => {
                            let texKey = `TERRAIN_${tile.type}`;
                            return (
                                <Container key={tile.id} x={tile.x * TILE_SIZE} y={tile.y * TILE_SIZE}>
                                    <SafeSprite 
                                        texture={getTexture(texKey)} 
                                        width={TILE_SIZE} 
                                        height={TILE_SIZE}
                                        tint={0xFFFFFF} 
                                    />
                                    
                                    {/* Height Overlay - Subtle Gradient or Border Only */}
                                    {tile.height !== 1 && (
                                        <Graphics 
                                            eventMode="none"
                                            draw={g => {
                                                g.clear();
                                                // Down = Dark (Shadow)
                                                if (tile.height === 0) {
                                                    g.beginFill(0x000000, 0.4);
                                                    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
                                                    g.endFill();
                                                }
                                                // Up = Light (Highlight) - Use Overlay blend mode if possible, but for now just low alpha white
                                                else if (tile.height === 2) {
                                                    g.beginFill(0xFFFFFF, 0.1); 
                                                    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
                                                    g.endFill();
                                                    // Add a border to signify height
                                                    g.lineStyle(2, 0xFFFFFF, 0.5);
                                                    g.drawRect(1, 1, TILE_SIZE-2, TILE_SIZE-2);
                                                }
                                            }} 
                                        />
                                    )}

                                    {/* Zone Overlay */}
                                    {tile.zone !== undefined && (
                                        <>
                                            <Graphics 
                                                eventMode="none"
                                                draw={g => {
                                                    const colorStr = PLAYER_COLORS[tile.zone! % 6] || '#ffffff';
                                                    const color = parseInt(colorStr.replace('#', '0x'));
                                                    g.beginFill(color, 0.25);
                                                    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
                                                    g.endFill();
                                                }} 
                                            />
                                            {mode === 'ZONE' && (
                                                <Text 
                                                    text={`Z${tile.zone+1}`} 
                                                    x={4} y={14} 
                                                    style={new PIXI.TextStyle({ 
                                                        fill: 'rgba(255,255,255,0.7)', 
                                                        fontSize: 12, 
                                                        fontWeight: 'bold' 
                                                    })} 
                                                />
                                            )}
                                        </>
                                    )}

                                    {/* Stats / Info */}
                                    {tile.type === 'BANK' && (
                                        <Text 
                                            text={`$${tile.bankGoldReward || 200}`} 
                                            x={34} y={58} 
                                            anchor={0.5} // Approximate centering
                                            style={new PIXI.TextStyle({ fill: 'black', fontSize: 8, fontWeight: 'bold' })} 
                                        />
                                    )}
                                    
                                    {/* Grid Lines */}
                                    <Graphics draw={g => {
                                        g.lineStyle(1, 0xFFFFFF, 0.05);
                                        g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
                                    }} />

                                </Container>
                            );
                        })}
                    </Container>
                </Stage>

                {/* MODALS */}
                {showClearConfirm && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '24px', borderRadius: '12px', width: '320px', textAlign: 'center' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                            <h3 style={{ color: '#ef5350', marginTop: 0, marginBottom: '10px' }}>CLEAR ENTIRE MAP?</h3>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: '12px', background: '#333', border: '1px solid #444', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>CANCEL</button>
                                <button onClick={executeClear} style={{ flex: 1, padding: '12px', background: '#D32F2F', border: '1px solid #B71C1C', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>CONFIRM</button>
                            </div>
                        </div>
                    </div>
                )}
                {showSaveModal && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '24px', borderRadius: '12px', width: '320px', textAlign: 'center' }}>
                            <h3 style={{ color: '#FF9800', marginTop: 0, marginBottom: '10px' }}>SAVE CUSTOM MAP</h3>
                            <input type="text" placeholder="Enter Map Name..." value={mapName} onChange={(e) => setMapName(e.target.value)} style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '6px', marginBottom: '20px' }} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowSaveModal(false)} style={{ flex: 1, padding: '12px', background: '#333', border: '1px solid #444', color: '#ccc', borderRadius: '6px', cursor: 'pointer' }}>CANCEL</button>
                                <button onClick={executeSave} disabled={!mapName.trim()} style={{ flex: 1, padding: '12px', background: mapName.trim() ? '#FF9800' : '#555', border: 'none', color: 'white', borderRadius: '6px', cursor: mapName.trim() ? 'pointer' : 'default' }}>SAVE</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT INTEL PANEL */}
            <RightIntelPanel mode={mode} brush={activeBrush} brushSettings={brushSettings} activeZone={activeZone} />
        </div>
    );
};
