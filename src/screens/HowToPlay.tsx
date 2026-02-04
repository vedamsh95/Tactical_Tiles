
import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { UNIT_STATS, TERRAIN_DEFENSE, TERRAIN_COSTS, UNIT_COSTS, CP_SYSTEM, BASE_STATS, BANK_STATS } from '../core/constants/Config';
import { UnitType } from '../core/types';

const TabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        style={{
            flex: 1, padding: '15px',
            background: active ? '#2196F3' : '#222',
            color: active ? 'white' : '#888',
            border: 'none',
            fontSize: '16px', fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s',
            borderBottom: active ? '4px solid #1565C0' : '4px solid #111'
        }}
    >
        {label}
    </button>
);

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
    <div style={{ marginBottom: '40px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
        <h3 style={{ color: '#4CAF50', borderBottom: '1px solid #444', paddingBottom: '10px', marginTop: 0, letterSpacing: '1px' }}>{title}</h3>
        {children}
    </div>
);

const StatRow = ({ label, value }: { label: string, value: string | number }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#aaa' }}>{label}</span>
        <span style={{ fontWeight: 'bold', color: 'white' }}>{value}</span>
    </div>
);

export const HowToPlay = () => {
    const exitTutorial = useGameStore(state => state.exitTutorial);
    const [activeTab, setActiveTab] = useState<'GUIDE' | 'INTEL'>('GUIDE');

    return (
        <div style={{ 
            width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
            background: '#0a0a0a', color: 'white', fontFamily: "'Segoe UI', sans-serif"
        }}>
            {/* Header */}
            <div style={{ 
                height: '70px', background: '#111', borderBottom: '1px solid #333', 
                display: 'flex', alignItems: 'center', padding: '0 30px', justifyContent: 'space-between',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 10
            }}>
                <div>
                    <h2 style={{ margin: 0, letterSpacing: '2px', color: '#fff' }}>TACTICAL FIELD MANUAL</h2>
                    <div style={{ fontSize: '11px', color: '#666', letterSpacing: '1px' }}>CLASSIFIED: EYES ONLY</div>
                </div>
                <button 
                    onClick={exitTutorial}
                    style={{ 
                        padding: '12px 24px', background: '#D32F2F', color: 'white', 
                        border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.4)'
                    }}
                >
                    RETURN TO OPERATIONS
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
                <TabButton label="MISSION BRIEFING (GAMEPLAY)" active={activeTab === 'GUIDE'} onClick={() => setActiveTab('GUIDE')} />
                <TabButton label="TECHNICAL SPECS (STATS)" active={activeTab === 'INTEL'} onClick={() => setActiveTab('INTEL')} />
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                
                {activeTab === 'GUIDE' && (
                    <div className="guide-content">
                        
                        {/* 1. CORE LOOP */}
                        <Section title="1. CORE COMBAT LOOP">
                            <p style={{ lineHeight: '1.6', color: '#ddd', fontSize: '15px' }}>
                                Commander, your goal is to secure the sector using a squad of elite specialists. The battlefield is grid-based and turn-based. Victory requires careful management of your <strong>Command Points (CP)</strong> and tactical positioning.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginTop: '20px' }}>
                                <div style={{ background: '#222', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🚀</div>
                                    <strong style={{ color: '#4CAF50' }}>DEPLOY</strong>
                                    <p style={{ fontSize: '12px', color: '#aaa' }}>Spawn units from your Base using Gold.</p>
                                </div>
                                <div style={{ background: '#222', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏃</div>
                                    <strong style={{ color: '#2196F3' }}>MANEUVER</strong>
                                    <p style={{ fontSize: '12px', color: '#aaa' }}>Spend CP to move. Terrain affects cost.</p>
                                </div>
                                <div style={{ background: '#222', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎯</div>
                                    <strong style={{ color: '#D32F2F' }}>ENGAGE</strong>
                                    <p style={{ fontSize: '12px', color: '#aaa' }}>Attack enemies or siege bases. Requires Line of Sight.</p>
                                </div>
                                <div style={{ background: '#222', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>💰</div>
                                    <strong style={{ color: '#FFD700' }}>ECONOMY</strong>
                                    <p style={{ fontSize: '12px', color: '#aaa' }}>Heist Banks and Secure Buildings for bonuses.</p>
                                </div>
                            </div>
                        </Section>

                        {/* 2. GAME MODES */}
                        <Section title="2. OPERATIONAL MODES">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <h4 style={{ color: '#FFD700', margin: '0 0 5px 0' }}>👑 CONQUER MODE</h4>
                                    <p style={{ margin: 0, color: '#ccc', fontSize: '14px' }}>
                                        <strong>Objective:</strong> Destroy the enemy <strong>HEADQUARTERS (BASE)</strong>.
                                        <br/>
                                        The Enemy Base has <strong>{BASE_STATS.HP} HP</strong>. It is heavily armored but stationary. Siege units (Snipers/Assaulters) are recommended for demolition.
                                    </p>
                                </div>
                                <div>
                                    <h4 style={{ color: '#FF5722', margin: '0 0 5px 0' }}>☠️ DEATHMATCH (DOOMSDAY)</h4>
                                    <p style={{ margin: 0, color: '#ccc', fontSize: '14px' }}>
                                        <strong>Objective:</strong> Eliminate <strong>ALL</strong> enemy units.
                                        <br/>
                                        <strong>Warning:</strong> The "Doomsday Protocol" initiates at Turn 30. The map edges will turn to <strong>LAVA</strong>, shrinking the play area every 5 turns. Any unit caught in the lava is instantly destroyed.
                                    </p>
                                </div>
                            </div>
                        </Section>

                        {/* 3. DEFENSE SYSTEMS */}
                        <Section title="3. INFRASTRUCTURE & DEFENSES">
                            <p style={{ color: '#aaa', fontSize: '14px', fontStyle: 'italic', marginBottom: '15px' }}>
                                Intelligence Report: Neutral structures are no longer passive. They are equipped with automated defense turrets.
                            </p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #444', color: '#888', textAlign: 'left' }}>
                                        <th style={{ padding: '10px' }}>Structure</th>
                                        <th style={{ padding: '10px' }}>Function</th>
                                        <th style={{ padding: '10px' }}>Defense System (Automated)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#FFD700' }}>BANK VAULT</td>
                                        <td style={{ padding: '15px', color: '#ccc' }}>
                                            Contains massive Gold reserves. 
                                            <br/><span style={{fontSize:'12px', color:'#aaa'}}>Action: <strong>HEIST (4 CP)</strong> to loot.</span>
                                        </td>
                                        <td style={{ padding: '15px', color: '#F44336' }}>
                                            <strong>Proximity Turret</strong>
                                            <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize:'13px' }}>
                                                <li>Range: <strong>{BANK_STATS.RANGE} Tiles</strong></li>
                                                <li>Damage: <strong>{BANK_STATS.DAMAGE} per Turn</strong></li>
                                                <li><em>Status: Attacks closest unit until Hacked/Looted.</em></li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#2196F3' }}>HEADQUARTERS (BASE)</td>
                                        <td style={{ padding: '15px', color: '#ccc' }}>
                                            Spawn point for reinforcements.
                                            <br/><span style={{fontSize:'12px', color:'#aaa'}}>Primary target in Conquer Mode.</span>
                                        </td>
                                        <td style={{ padding: '15px', color: '#F44336' }}>
                                            <strong>Heavy Artillery</strong>
                                            <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize:'13px' }}>
                                                <li>Range: <strong>{BASE_STATS.RANGE} Tiles</strong></li>
                                                <li>Damage: <strong>{BASE_STATS.MIN_DMG}-{BASE_STATS.MAX_DMG} per Turn</strong></li>
                                                <li><em>Status: Fires at enemies threatening the base.</em></li>
                                            </ul>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </Section>

                        {/* 4. WEATHER ZONES */}
                        <Section title="4. METEOROLOGICAL ZONES">
                            <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '20px' }}>
                                The battlefield is divided into "Voronoi Zones" controlled by local weather systems. Weather shifts every <strong>5 Turns</strong>.
                            </p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#333', color: '#fff' }}>
                                            <th style={{ padding: '12px' }}>Type</th>
                                            <th style={{ padding: '12px' }}>Visual</th>
                                            <th style={{ padding: '12px' }}>Tactical Effect</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#ff9800' }}>SCORCHED</td>
                                            <td style={{ padding: '12px' }}>Heat Haze / Orange</td>
                                            <td style={{ padding: '12px', color: '#ccc' }}>
                                                Extreme Heat.
                                                <div style={{ color: '#ff9800', marginTop:'4px' }}>• Movement Cost on PLAINS & SAND increased by +1 CP.</div>
                                            </td>
                                        </tr>
                                        <tr style={{ background: '#222', borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#90caf9' }}>MONSOON</td>
                                            <td style={{ padding: '12px' }}>Rain / Blue Tint</td>
                                            <td style={{ padding: '12px', color: '#ccc' }}>
                                                Muddy Terrain.
                                                <div style={{ color: '#90caf9', marginTop:'4px' }}>• Heavy Units (Assaulters) pay +1 Move Cost on all terrain.</div>
                                            </td>
                                        </tr>
                                        <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#cfd8dc' }}>FOG</td>
                                            <td style={{ padding: '12px' }}>Grey Mist</td>
                                            <td style={{ padding: '12px', color: '#ccc' }}>
                                                Low Visibility.
                                                <div style={{ color: '#cfd8dc', marginTop:'4px' }}>• Vision Range capped at 2 Tiles.</div>
                                                <div style={{ color: '#cfd8dc' }}>• Snipers are effectively neutralized.</div>
                                            </td>
                                        </tr>
                                        <tr style={{ background: '#222', borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#69f0ae' }}>TAILWIND</td>
                                            <td style={{ padding: '12px' }}>Green Breeze</td>
                                            <td style={{ padding: '12px', color: '#ccc' }}>
                                                High Winds.
                                                <div style={{ color: '#69f0ae', marginTop:'4px' }}>• All Units: +1 Attack Range.</div>
                                                <div style={{ color: '#69f0ae' }}>• Plains Movement Cost reduced to 0.5 CP.</div>
                                            </td>
                                        </tr>
                                        <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#D4A35B' }}>SANDSTORM</td>
                                            <td style={{ padding: '12px' }}>Brown Dust</td>
                                            <td style={{ padding: '12px', color: '#ccc' }}>
                                                Blinding Dust.
                                                <div style={{ color: '#D4A35B', marginTop:'4px' }}>• Vision Range capped at 3 Tiles.</div>
                                            </td>
                                        </tr>
                                        <tr style={{ background: '#222' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff' }}>CLEAR</td>
                                            <td style={{ padding: '12px' }}>Standard</td>
                                            <td style={{ padding: '12px', color: '#ccc' }}>No modifiers. Standard engagement rules apply.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </Section>

                        {/* 5. SHOP */}
                         <Section title="5. LOGISTICS (FIELD SHOP)">
                            <p style={{ color: '#ddd', fontSize: '14px' }}>
                                Access the FIELD SHOP in the bottom right panel to order supply drops.
                            </p>
                            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.8' }}>
                                <li><strong>Ammo Drop (50 Gold):</strong> Restores full ammo. Delivered via pod 3-9 tiles from base.</li>
                                <li><strong>Medkit (100 Gold):</strong> Fully heals a unit. Delivered via pod 3-9 tiles from base.</li>
                            </ul>
                            <p style={{ color: '#F44336', fontSize: '12px', fontStyle: 'italic', marginTop: '10px' }}>
                                <strong>RETRIEVAL PROTOCOL:</strong> <br/>
                                Supply pods do not activate automatically. A unit must be adjacent to (or on) the pod and spend <strong>4 CP</strong> to execute a "RETRIEVE SUPPLY" action.
                            </p>
                        </Section>
                    </div>
                )}

                {activeTab === 'INTEL' && (
                    <div className="intel-content">
                        <Section title="UNIT CLASSIFICATIONS">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                {Object.entries(UNIT_STATS).map(([key, stats]) => (
                                    <div key={key} style={{ background: '#222', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#fff', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                                            {stats.name.toUpperCase()} <span style={{fontSize:'12px', color:'#FFD700', float:'right'}}>${UNIT_COSTS[key as UnitType]}</span>
                                        </h4>
                                        <StatRow label="HP" value={stats.hp} />
                                        <StatRow label="Attack" value={stats.damage} />
                                        <StatRow label="Range" value={stats.range} />
                                        <StatRow label="Attack Cost" value={`${stats.attackCost} CP`} />
                                        <StatRow label="Move Cost" value={`${stats.moveCost}x`} />
                                        <StatRow label="Ammo Capacity" value={stats.maxAmmo} />
                                        <StatRow label="Vision Radius" value={stats.vision} />
                                        {key === 'SNIPER' && (
                                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#ff9800', fontStyle: 'italic' }}>
                                                *RESTRICTION: Can only shoot from Mountains or Owned Buildings.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>

                        <Section title="TERRAIN DATABASE">
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: '#333', color: '#fff' }}>
                                            <th style={{ padding: '12px' }}>Type</th>
                                            <th style={{ padding: '12px' }}>Defense</th>
                                            <th style={{ padding: '12px' }}>Base Move Cost</th>
                                            <th style={{ padding: '12px' }}>Tactical Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.keys(TERRAIN_DEFENSE).map((key, i) => {
                                            const def = TERRAIN_DEFENSE[key] * 100;
                                            const isNegative = def < 0;
                                            const defColor = isNegative ? '#ff5722' : (def > 0 ? '#4CAF50' : '#888');
                                            const sign = def > 0 ? '+' : '';
                                            
                                            return (
                                                <tr key={key} style={{ background: i % 2 === 0 ? '#1a1a1a' : '#222', borderBottom: '1px solid #333' }}>
                                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#ccc' }}>{key}</td>
                                                    <td style={{ padding: '12px', color: defColor }}>
                                                        {def !== 0 ? `${sign}${def}%` : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#aaa' }}>{TERRAIN_COSTS[key] >= 99 ? 'N/A' : TERRAIN_COSTS[key]}</td>
                                                    <td style={{ padding: '12px', color: '#888', fontStyle: 'italic' }}>
                                                        {key === 'MOUNTAIN' && 'High Ground. Essential for Snipers.'}
                                                        {key === 'FOREST' && 'Provides 40% Cover.'}
                                                        {key === 'SAND' && 'Exposed Terrain. Vulnerable to attacks.'}
                                                        {key === 'DUNES' && 'High Ground. Blocks Line of Sight.'}
                                                        {key === 'QUICKSAND' && 'Traps units (Rooted) for 1 Turn.'}
                                                        {key === 'CANYON' && 'Impassable. Allows shooting over.'}
                                                        {key === 'BUILDING' && 'Securable. Watchtowers boost Range.'}
                                                        {key === 'WATER' && 'Impassable without Bridge.'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    </div>
                )}
            </div>
        </div>
    );
};
