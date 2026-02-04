
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { PLAYER_COLORS, UNIT_STATS, TERRAIN_DEFENSE, TERRAIN_COLORS, CP_SYSTEM, UNIT_COSTS, SHOP_ITEMS, BUILDING_STATS, MAX_RESPAWNS, GOLD_SETTINGS, BARRIER_STATS } from '../../core/constants/Config';
import { Tile, WeatherType, LogEntry } from '../../core/types';

interface PanelProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
}

const Panel: React.FC<PanelProps> = ({ children, style, onClick }) => (
    <div 
        onClick={onClick}
        style={{
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '16px',
            color: '#eee',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            ...style
        }}
    >
        {children}
    </div>
);

const LogView = () => {
    const gameLog = useGameStore(state => state.gameLog);
    
    // Group logs by Round
    const groupedLogs: Record<number, LogEntry[]> = {};
    gameLog.forEach(log => {
        if (!groupedLogs[log.round]) groupedLogs[log.round] = [];
        groupedLogs[log.round].push(log);
    });

    const rounds = Object.keys(groupedLogs).map(k => parseInt(k)).sort((a,b) => b - a);

    if (rounds.length === 0) {
        return <div style={{ color:'#666', fontStyle:'italic', textAlign:'center', marginTop:'20px', fontSize: '13px' }}>Mission Log Empty</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {rounds.map(round => (
                <div key={round}>
                    <div style={{ 
                        fontSize: '10px', fontWeight: 'bold', color: '#666', 
                        borderBottom: '1px solid #333', marginBottom: '8px', 
                        textAlign: 'center', letterSpacing: '1px' 
                    }}>
                        ROUND {round}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {groupedLogs[round].map((log) => {
                            const isEnv = log.playerId === -1;
                            const color = isEnv ? '#9E9E9E' : (PLAYER_COLORS[log.playerId] || '#fff');
                            const bg = isEnv ? 'transparent' : `${color}10`; // 10% opacity hex
                            
                            return (
                                <div key={log.id} style={{ 
                                    display: 'flex', 
                                    fontSize: '11px', 
                                    background: bg,
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ width: '3px', background: color }}></div>
                                    <div style={{ padding: '6px 8px', flex: 1, color: isEnv ? '#ccc' : color }}>
                                        {log.message}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const BuildingInfoPanel = ({ tile }: { tile: Tile }) => {
    const weatherState = useGameStore(state => state.weather);
    const victoryMode = useGameStore(state => state.settings.victoryMode);

    let name: string = tile.type;
    let color = '#888';
    let ownerName = 'NEUTRAL';
    let stats = [];

    if (tile.type === 'BUILDING' && tile.subType) {
        const config = BUILDING_STATS[tile.subType];
        name = config.name.toUpperCase();
        if (tile.owner !== null && tile.owner !== undefined) { 
            color = PLAYER_COLORS[tile.owner]; 
            ownerName = `PLAYER ${tile.owner + 1}`; 
        }
        
        stats.push({ label: 'DEFENSE', value: `+${config.defense * 100}%` });
        stats.push({ label: 'RANGE', value: `+${config.rangeBonus}` });
        stats.push({ label: 'DMG', value: `x${config.damageBonus}` });
    } else if (tile.type === 'BANK') {
        name = 'BANK VAULT';
        const hacked = (tile.hackProgress || 0) >= 100;
        ownerName = hacked ? 'LOOTED' : 'SECURE';
        color = hacked ? '#546E7A' : '#FFD700';
    } else if (tile.type === 'BASE') {
        name = 'HEADQUARTERS';
        if (tile.owner !== null && tile.owner !== undefined) { 
            color = PLAYER_COLORS[tile.owner]; 
            ownerName = `PLAYER ${tile.owner + 1} BASE`; 
        }

        if (victoryMode === 'CONQUER' && tile.hp !== undefined) {
             stats.push({ label: 'INTEGRITY', value: `${tile.hp}/${tile.maxHp}` });
        } else {
             stats.push({ label: 'STATUS', value: 'INVULNERABLE' });
        }
    } else if (tile.type === 'BARRIER') {
        name = 'DEFENSE BARRIER';
        if (tile.hp !== undefined && tile.maxHp !== undefined) {
            stats.push({ label: 'INTEGRITY', value: `${tile.hp}/${tile.maxHp}` });
        } else {
            stats.push({ label: 'INTEGRITY', value: `${BARRIER_STATS.HP}/${BARRIER_STATS.HP}` });
        }
        const def = TERRAIN_DEFENSE[tile.type] * 100;
        stats.push({ label: 'COVER', value: `${def}%` });
    } else {
        name = tile.type;
        const def = TERRAIN_DEFENSE[tile.type] * 100;
        if (def !== 0) {
            const sign = def > 0 ? '+' : '';
            stats.push({ label: 'DEFENSE', value: `${sign}${def}%` });
        }
    }
    
    if (tile.zone !== undefined) {
        stats.push({ label: 'TERRITORY', value: `ZONE ${tile.zone + 1}` });
    }

    let activeWeather: WeatherType = 'CLEAR';
    if (tile.zone !== undefined && weatherState.playerZones[tile.zone]) {
        activeWeather = weatherState.playerZones[tile.zone];
    }

    let weatherLabel = 'Clear Skies';
    let weatherColor = '#aaa';
    const weatherEffects: string[] = [];

    if (activeWeather !== 'CLEAR') {
        switch (activeWeather) {
            case 'SCORCHED':
                weatherLabel = '🔥 SCORCHED';
                weatherColor = '#ff9800';
                if (tile.type === 'PLAINS') weatherEffects.push('Move Cost: 2 CP');
                if (tile.type === 'SAND') weatherEffects.push('Move Cost: 2 CP');
                break;
            case 'MONSOON':
                weatherLabel = '🌧️ MONSOON';
                weatherColor = '#90caf9';
                if (tile.type === 'PLAINS') weatherEffects.push('Mud: Heavy Units Slow');
                break;
            case 'FOG':
                weatherLabel = '🌫️ DENSE FOG';
                weatherColor = '#cfd8dc';
                weatherEffects.push('Vision Max: 2');
                weatherEffects.push('Sniper Range Max: 3');
                break;
            case 'TAILWIND':
                weatherLabel = '🍃 TAILWIND';
                weatherColor = '#69f0ae';
                if (tile.type === 'PLAINS') weatherEffects.push('Move Cost: 0.5 CP');
                weatherEffects.push('Unit Range: +1');
                break;
            case 'SANDSTORM':
                weatherLabel = '🌪️ SANDSTORM';
                weatherColor = '#D4A35B';
                weatherEffects.push('Vision Max: 3');
                break;
        }
    }

    return (
        <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>{name}</div>
            <div style={{ fontSize: '12px', color: color, fontWeight: 'bold', marginBottom: '15px' }}>{ownerName}</div>
            
            {stats.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#aaa' }}>{s.label}</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: s.value.toString().includes('-') ? '#ff5722' : 'white' }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ borderTop: '1px solid #444', paddingTop: '10px' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>WEATHER CONDITIONS</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: weatherColor, marginBottom: '5px' }}>
                    {weatherLabel}
                </div>
                {weatherEffects.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {weatherEffects.map((effect, i) => (
                            <div key={i} style={{ fontSize: '11px', color: '#ccc', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                {effect}
                            </div>
                        ))}
                    </div>
                )}
                {activeWeather === 'CLEAR' && (
                    <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No active effects.</div>
                )}
            </div>
        </div>
    );
};

const WeatherIcon = ({ type }: { type: WeatherType }) => {
    let icon = '☀️';
    switch(type) {
        case 'SCORCHED': icon = '🔥'; break;
        case 'MONSOON': icon = '🌧️'; break;
        case 'FOG': icon = '🌫️'; break;
        case 'TAILWIND': icon = '🍃'; break;
        case 'SANDSTORM': icon = '🌪️'; break;
    }
    return (
        <span style={{ fontSize: '14px', marginLeft: '5px' }}>{icon}</span>
    );
};

export const LeftPanel = () => {
    const currentPlayer = useGameStore(state => state.currentPlayer);
    const playerCount = useGameStore(state => state.settings.playerCount);
    const playerCp = useGameStore(state => state.playerCp);
    const playerGold = useGameStore(state => state.playerGold);
    const playerRespawns = useGameStore(state => state.playerRespawns);
    const playerStatus = useGameStore(state => state.playerStatus);
    const playerInventory = useGameStore(state => state.playerInventory);
    const graveyard = useGameStore(state => state.graveyard);
    const handleGraveyardSelect = useGameStore(state => state.handleGraveyardSelect);
    const selectedGraveyardUnitId = useGameStore(state => state.selectedGraveyardUnitId);
    const selectInventoryItem = useGameStore(state => state.selectInventoryItem);
    const selectedInventoryItemIndex = useGameStore(state => state.selectedInventoryItemIndex);
    const weather = useGameStore(state => state.weather);
    const settings = useGameStore(state => state.settings);
    const mapData = useGameStore(state => state.mapData);
    const units = useGameStore(state => state.units);

    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        if (playerCount > 4) {
            setExpandedId(currentPlayer);
        } else {
            setExpandedId(null);
        }
    }, [currentPlayer, playerCount]);

    const renderPlayerSection = (pid: number) => {
        const isCompactMode = playerCount > 4;
        const isExpanded = !isCompactMode || expandedId === pid;
        
        const isCurrent = currentPlayer === pid;
        const isEliminated = playerStatus[pid] === 'ELIMINATED';
        const color = PLAYER_COLORS[pid];
        const casualties = graveyard.filter(u => u.owner === pid);
        const respawnsUsed = playerRespawns[pid];
        const respawnsLeft = MAX_RESPAWNS - respawnsUsed;
        const inventory = playerInventory[pid] || [];
        
        let statsLabel = '';
        let statsValue = '';
        
        if (settings.victoryMode === 'CONQUER') {
             const base = mapData.find(t => t.type === 'BASE' && t.owner === pid);
             statsLabel = 'BASE HP';
             statsValue = base && base.hp !== undefined ? `${base.hp}` : 'DESTROYED';
        } else {
             const count = units.filter(u => u.owner === pid).length;
             statsLabel = 'UNITS';
             statsValue = `${count}`;
        }

        if (isEliminated) {
            return (
                <Panel key={pid} style={{ 
                    flex: '0 0 auto', 
                    opacity: 0.4, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '10px'
                }}>
                    <div style={{ color: color, fontWeight: 'bold', fontSize: '14px', textDecoration: 'line-through' }}>
                        P{pid + 1} (ELIM)
                    </div>
                </Panel>
            )
        }

        return (
            <Panel 
                key={pid} 
                onClick={() => { if(isCompactMode) setExpandedId(pid); }}
                style={{ 
                    flex: isExpanded ? 1 : '0 0 auto',
                    height: isExpanded ? 'auto' : 'auto',
                    border: isCurrent ? `2px solid ${color}` : '1px solid #333', 
                    opacity: isCurrent ? 1 : (isCompactMode && !isExpanded ? 0.6 : 0.8),
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '12px',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    cursor: isCompactMode ? 'pointer' : 'default',
                    overflow: 'hidden'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: `1px solid ${color}40`, paddingBottom: '4px' }}>
                    <h2 style={{ color: color, margin: 0, fontSize: '16px' }}>
                        P{pid + 1} <WeatherIcon type={weather.playerZones[pid]} />
                    </h2>
                    <div style={{ background: color, color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                         {statsLabel}: {statsValue}
                    </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isExpanded ? '10px' : '0', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#888' }}>GOLD</div>
                        <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '14px' }}>{playerGold[pid]}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#888' }}>CP</div>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{playerCp[pid]}</div>
                    </div>
                </div>

                {isExpanded && (
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: '60px', marginTop: '5px', animation: 'fadeIn 0.3s' }}>
                        
                        {inventory.length > 0 && (
                            <div style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
                                <div style={{ fontSize: '10px', color: '#aaa', fontWeight: 'bold', marginBottom: '4px' }}>INVENTORY (Click to Use)</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {inventory.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isCurrent) selectInventoryItem(idx === selectedInventoryItemIndex ? null : idx);
                                            }}
                                            style={{
                                                background: selectedInventoryItemIndex === idx ? '#4CAF50' : '#333',
                                                border: selectedInventoryItemIndex === idx ? '1px solid #81C784' : '1px solid #555',
                                                color: 'white',
                                                fontSize: '10px',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                cursor: isCurrent ? 'pointer' : 'default',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                                {selectedInventoryItemIndex !== null && isCurrent && (
                                    <div style={{ fontSize: '10px', color: '#4CAF50', marginTop: '4px', fontStyle: 'italic' }}>
                                        Select a unit on map to apply.
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Casualties ({respawnsLeft})</div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {casualties.map(unit => {
                                const cost = UNIT_COSTS[unit.type];
                                const canAfford = playerGold[pid] >= cost;
                                const isReady = unit.turnsUntilRespawn === 0;
                                const isSelected = selectedGraveyardUnitId === unit.id;
                                const hasRespawns = respawnsLeft > 0;

                                return (
                                    <div 
                                        key={unit.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isCurrent && isReady && canAfford && hasRespawns) {
                                                handleGraveyardSelect(unit.id);
                                            }
                                        }}
                                        style={{
                                            background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
                                            border: isSelected ? `1px solid ${color}` : '1px solid transparent',
                                            borderRadius: '4px',
                                            padding: '4px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            cursor: (isCurrent && isReady && canAfford && hasRespawns) ? 'pointer' : 'default',
                                            opacity: (isCurrent && isReady && !canAfford) ? 0.5 : 1
                                        }}
                                    >
                                        <div style={{fontSize:'10px'}}>
                                            <span style={{ color: color, fontWeight: 'bold' }}>{UNIT_STATS[unit.type].name.toUpperCase()}</span>
                                        </div>
                                        
                                        {isReady ? (
                                            <div style={{ 
                                                background: (canAfford && hasRespawns) ? color : '#333', 
                                                color: (canAfford && hasRespawns) ? 'white' : '#777',
                                                padding: '2px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold' 
                                            }}>
                                                ${cost}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#888', fontSize: '10px' }}>
                                                {unit.turnsUntilRespawn}t
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {casualties.length === 0 && (
                                <div style={{ fontSize:'10px', color:'#444', fontStyle:'italic', textAlign:'center', marginTop:'5px' }}>No Casualties</div>
                            )}
                        </div>
                    </div>
                )}
            </Panel>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', gap: '10px' }}>
            {Array.from({ length: playerCount }).map((_, i) => renderPlayerSection(i))}
        </div>
    );
};


const WeatherDebug = () => {
    const weatherStatus = useGameStore(state => state.weatherStatus);
    
    const cycleWeather = () => {
        const types: WeatherType[] = ['CLEAR', 'SCORCHED', 'MONSOON', 'FOG', 'TAILWIND', 'SANDSTORM'];
        // Handle undefined or null gracefully
        const current = weatherStatus || 'CLEAR';
        const currentIdx = types.indexOf(current);
        const nextIdx = (currentIdx + 1) % types.length;
        useGameStore.setState({ weatherStatus: types[nextIdx] });
    };

    return (
        <Panel style={{ marginBottom: '0px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(50,50,70,0.8)' }}>
            <div style={{ fontSize: '11px', color: '#aaa', fontWeight: 'bold' }}>ATMOSPHERE</div>
            <button 
                onClick={cycleWeather}
                style={{
                    background: weatherStatus === 'CLEAR' ? 'rgba(255,255,255,0.1)' : '#2196F3',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: 'white',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    width: '100px',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                }}
            >
                {weatherStatus || 'CLEAR'}
            </button>
        </Panel>
    );
};

const BankRewardModal = () => {
    const bankRewardPending = useGameStore((state) => state.bankRewardPending);
    const resolveBankReward = useGameStore((state) => state.resolveBankReward);
    const currentPlayer = useGameStore((state) => state.currentPlayer);

    if (!bankRewardPending || bankRewardPending.playerId !== currentPlayer) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
             <Panel style={{ width: '400px', textAlign: 'center', border: '2px solid #FFD700', boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)' }}>
                <h1 style={{ color: '#FFD700', fontSize: '24px', marginBottom: '10px' }}>VAULT BREACHED</h1>
                <p style={{ color: '#ccc', marginBottom: '30px' }}>The heist was successful. Choose your share of the loot.</p>
                
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <button 
                        onClick={() => resolveBankReward('GOLD')}
                        style={{
                            padding: '20px', background: 'rgba(255, 215, 0, 0.1)',
                            border: '1px solid #FFD700', borderRadius: '8px',
                            color: '#FFD700', cursor: 'pointer', flex: 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '24px', marginBottom: '5px' }}>💰</div>
                        <div style={{ fontWeight: 'bold' }}>{GOLD_SETTINGS.HEIST_REWARD_GOLD} GOLD</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Fund your war machine</div>
                    </button>

                    <button 
                        onClick={() => resolveBankReward('CP')}
                        style={{
                            padding: '20px', background: 'rgba(33, 150, 243, 0.1)',
                            border: '1px solid #2196F3', borderRadius: '8px',
                            color: '#2196F3', cursor: 'pointer', flex: 1,
                            transition: 'all 0.2s'
                        }}
                    >
                         <div style={{ fontSize: '24px', marginBottom: '5px' }}>⚡</div>
                        <div style={{ fontWeight: 'bold' }}>{GOLD_SETTINGS.HEIST_REWARD_CP} CP</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Tactical Advantage</div>
                    </button>
                </div>
             </Panel>
        </div>
    );
};

export const RightPanel = () => {
    // Force re-render on weather change for the debug panel
    const weatherStatus = useGameStore(state => state.weatherStatus); 

    const selectedUnitId = useGameStore(state => state.selectedUnitId);
    const selectedTileId = useGameStore(state => state.selectedTileId);
    const mapData = useGameStore(state => state.mapData);
    const units = useGameStore(state => state.units);
    const currentPlayer = useGameStore(state => state.currentPlayer);
    const playerGold = useGameStore(state => state.playerGold);
    const isAiTurn = useGameStore(state => state.isAiTurn);
    const endTurn = useGameStore(state => state.endTurn);
    const buyShopItem = useGameStore(state => state.buyShopItem);
    const cancelPlacement = useGameStore(state => state.cancelPlacement);
    const placementMode = useGameStore(state => state.placementMode);
    
    // Heist Bank Reward Check
    const bankRewardPending = useGameStore(state => state.bankRewardPending);
    
    const secureBuilding = useGameStore(state => state.secureBuilding);
    const heistBank = useGameStore(state => state.heistBank);
    const siegeBase = useGameStore(state => state.siegeBase);
    const demolishBarrier = useGameStore(state => state.demolishBarrier);
    const lootSupply = useGameStore(state => state.lootSupply);

    const validSecureTile = useGameStore(state => state.validSecureTile);
    const validHeistTile = useGameStore(state => state.validHeistTile);
    const validSiegeTile = useGameStore(state => state.validSiegeTile);
    const validLootTile = useGameStore(state => state.validLootTile);
    const validDemolishTile = useGameStore(state => state.validDemolishTile);

    const [activeTab, setActiveTab] = useState<'INTEL' | 'LOG'>('INTEL');

    const selectedUnit = units.find(u => u.id === selectedUnitId);
    const selectedTile = mapData.find(t => t.id === selectedTileId);

    const isMyTurn = !isAiTurn;

    // 1. BANK HEIST MODAL (Highest Priority Overlay)
    if (bankRewardPending && bankRewardPending.playerId === currentPlayer) {
         return <BankRewardModal />;
    }

    if (placementMode && placementMode.active) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
                <Panel style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <h2 style={{ color: '#FFD700', marginBottom: '10px' }}>CONSTRUCTION MODE</h2>
                    <p style={{ color: '#ccc', marginBottom: '20px' }}>Select a target tile to build.</p>
                    <div style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
                        Item: {SHOP_ITEMS[placementMode.itemKey as keyof typeof SHOP_ITEMS]?.name} (${placementMode.cost})
                    </div>
                    <button 
                        onClick={cancelPlacement}
                        style={{ padding: '12px 24px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        CANCEL BUILD
                    </button>
                </Panel>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', gap: '15px' }}>
            
            <WeatherDebug />

            {/* TOP SECTION: TABS & INTEL/LOGS (Flex 1 to fill available space) */}
            <Panel style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                {/* Tabs Header */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid #444', flexShrink: 0 }}>
                    <button 
                        onClick={() => setActiveTab('INTEL')}
                        style={{ 
                            flex: 1, padding: '12px', background: activeTab === 'INTEL' ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: activeTab === 'INTEL' ? 'white' : '#888', border: 'none', 
                            borderBottom: activeTab === 'INTEL' ? '3px solid #2196F3' : '3px solid transparent',
                            fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'
                        }}
                    >
                        INTEL
                    </button>
                    <button 
                        onClick={() => setActiveTab('LOG')}
                        style={{ 
                            flex: 1, padding: '12px', background: activeTab === 'LOG' ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: activeTab === 'LOG' ? 'white' : '#888', border: 'none',
                            borderBottom: activeTab === 'LOG' ? '3px solid #2196F3' : '3px solid transparent',
                            fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'
                        }}
                    >
                        LOGS
                    </button>
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {activeTab === 'INTEL' ? (
                        <>
                            {selectedUnit ? (
                                <div style={{ animation: 'fadeIn 0.2s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                                        <div style={{ 
                                            width: '40px', height: '40px', 
                                            background: PLAYER_COLORS[selectedUnit.owner], 
                                            borderRadius: '4px', marginRight: '10px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', color: 'rgba(0,0,0,0.6)'
                                        }}>
                                            {UNIT_STATS[selectedUnit.type].name.substring(0,2)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>{UNIT_STATS[selectedUnit.type].name.toUpperCase()}</div>
                                            <div style={{ fontSize: '12px', color: '#aaa' }}>{selectedUnit.owner === currentPlayer ? 'Your Unit' : 'Enemy Unit'}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px' }}>
                                            <div style={{ fontSize: '10px', color: '#888' }}>HP</div>
                                            <div style={{ color: selectedUnit.hp < 5 ? '#f44336' : 'white', fontWeight: 'bold' }}>{selectedUnit.hp} / {UNIT_STATS[selectedUnit.type].hp}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px' }}>
                                            <div style={{ fontSize: '10px', color: '#888' }}>AMMO</div>
                                            <div style={{ color: selectedUnit.ammo === 0 ? '#f44336' : 'white', fontWeight: 'bold' }}>{selectedUnit.ammo} / {UNIT_STATS[selectedUnit.type].maxAmmo}</div>
                                        </div>
                                    </div>
                                    
                                    {selectedUnit.owner === currentPlayer && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {validSecureTile && (
                                                <button onClick={secureBuilding} style={{ padding: '10px', background: '#FF9800', border: 'none', color: 'black', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    SECURE BUILDING (4 CP)
                                                </button>
                                            )}
                                            {validHeistTile && (
                                                <button onClick={heistBank} style={{ padding: '10px', background: '#FFD700', border: 'none', color: 'black', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    HEIST BANK (4 CP)
                                                </button>
                                            )}
                                            {validSiegeTile && (
                                                <button onClick={siegeBase} style={{ padding: '10px', background: '#D32F2F', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    SIEGE BASE
                                                </button>
                                            )}
                                            {validDemolishTile && (
                                                <button onClick={demolishBarrier} style={{ padding: '10px', background: '#D32F2F', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    DEMOLISH BARRIER
                                                </button>
                                            )}
                                            {validLootTile && (
                                                <button onClick={lootSupply} style={{ padding: '10px', background: '#4CAF50', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    RETRIEVE SUPPLY (4 CP)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : selectedTile ? (
                                <BuildingInfoPanel tile={selectedTile} />
                            ) : (
                                <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                                    Select a unit or tile for tactical analysis.
                                </div>
                            )}
                        </>
                    ) : (
                        <LogView />
                    )}
                </div>
            </Panel>

            {/* MIDDLE SECTION: SHOP (Limited Height, Scrollable) */}
            {isMyTurn && (
                <Panel style={{ height: '35%', minHeight: '160px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '4px', flexShrink: 0 }}>Field Shop (Requisition)</div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                        {Object.entries(SHOP_ITEMS).map(([key, item]) => (
                            <button
                                key={key}
                                onClick={() => buyShopItem(key)}
                                disabled={playerGold[currentPlayer] < item.cost}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid #333',
                                    borderRadius: '4px',
                                    cursor: playerGold[currentPlayer] >= item.cost ? 'pointer' : 'not-allowed',
                                    opacity: playerGold[currentPlayer] >= item.cost ? 1 : 0.5,
                                    width: '100%',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#ddd', fontSize: '12px', fontWeight: 'bold' }}>{item.name}</span>
                                    {item.type === 'CONSUMABLE' && <span style={{ color: '#888', fontSize: '10px' }}>Delivered via Drop Pod</span>}
                                </div>
                                <span style={{ color: '#FFD700', fontSize: '12px', fontWeight: 'bold' }}>${item.cost}</span>
                            </button>
                        ))}
                    </div>
                </Panel>
            )}

            {/* BOTTOM SECTION: END TURN BUTTON (Fixed Height) */}
            <button
                onClick={endTurn}
                disabled={!isMyTurn}
                style={{
                    height: '60px',
                    padding: '0 16px',
                    background: isMyTurn ? 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)' : '#333',
                    color: isMyTurn ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: isMyTurn ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: isMyTurn ? '0 4px 15px rgba(46, 125, 50, 0.4)' : 'none',
                    flexShrink: 0
                }}
            >
                {isMyTurn ? 'END TURN' : 'ENEMY TURN'}
            </button>
        </div>
    );
};

export const WinnerOverlay = () => {
    const winner = useGameStore(state => state.winner);
    const resetGame = useGameStore(state => state.resetGame);
    const victoryMode = useGameStore(state => state.settings.victoryMode);

    if (winner === null) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏆</div>
                <h1 style={{ color: PLAYER_COLORS[winner], fontSize: '48px', margin: '0 0 10px 0', textShadow: '0 0 20px currentColor' }}>
                    PLAYER {winner + 1} WINS!
                </h1>
                <p style={{ color: '#aaa', fontSize: '18px', marginBottom: '40px' }}>
                    {victoryMode === 'CONQUER' ? 'Enemy Headquarters Destroyed' : 'All Enemy Units Eliminated'}
                </p>
                <button
                    onClick={resetGame}
                    style={{
                        padding: '16px 32px', background: 'white', color: 'black',
                        border: 'none', borderRadius: '30px', fontSize: '18px', fontWeight: 'bold',
                        cursor: 'pointer', boxShadow: '0 0 20px rgba(255,255,255,0.4)'
                    }}
                >
                    RETURN TO BASE
                </button>
            </div>
        </div>
    );
};
