import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Stage, Container, Graphics } from '@pixi/react';
import { useIsoEditorStore } from './useIsoEditorStore';
import { isoToScreen, screenToIso, TILE_WIDTH, TILE_HEIGHT } from './IsoMath';
import { IsoSprite } from './components/IsoSprite';

const MAP_SIZE = 20;

export const IsoCanvas = () => {
    const store = useIsoEditorStore();
    const { 
        tiles, objects, 
        setTile, setObject, 
        selectedFolder, selectedAsset, selectedTool, selectedLayer,
        cameraX, cameraY, zoom, setCamera, setZoom
    } = store;

    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const stageRef = useRef<any>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Camera Drag State
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    
    // Fit canvas to parent
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    
    useEffect(() => {
        if (!canvasContainerRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            if (canvasContainerRef.current) {
                setDimensions({
                    width: canvasContainerRef.current.offsetWidth,
                    height: canvasContainerRef.current.offsetHeight
                });
            }
        });
        resizeObserver.observe(canvasContainerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const handleAction = (iso: {x: number, y: number}) => {
        if (!selectedAsset && selectedTool === 'PAINT') return;

        if (iso.x >= 0 && iso.x < MAP_SIZE && iso.y >= 0 && iso.y < MAP_SIZE) {
            const id = `${selectedFolder}/${selectedAsset}`;
            
            if (selectedTool === 'ERASE') {
                 if (selectedLayer === 'GROUND') setTile(iso.x, iso.y, ''); // Or delete
                 else setObject(iso.x, iso.y, null);
            } else {
                if (selectedLayer === 'GROUND') {
                    setTile(iso.x, iso.y, id);
                } else {
                    setObject(iso.x, iso.y, id);
                }
            }
        }
    };

    const getGlobalPosition = (e: any) => {
        if (e.global) return e.global;
        if (e.data && e.data.global) return e.data.global;
        if (e.target && (e.target as Element).getBoundingClientRect) {
             const rect = (e.target as Element).getBoundingClientRect();
             return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        return { x: 0, y: 0 };
    };

    const handlePointerMove = (e: any) => {
        if (!stageRef.current) return;
        
        const globalPos = getGlobalPosition(e);

        // 1. Handle Camera Pan
        if (isDragging.current) {
            const dx = globalPos.x - lastPos.current.x;
            const dy = globalPos.y - lastPos.current.y;
            setCamera(cameraX + dx, cameraY + dy);
            lastPos.current = { x: globalPos.x, y: globalPos.y };
            return;
        }

        const gridContainer = stageRef.current;
        if (!gridContainer) return;

        const local = gridContainer.toLocal(globalPos);
        const iso = screenToIso(local.x, local.y);
        setCursorPos(iso);
        
        if (e.buttons === 1 && !e.shiftKey) { 
             if (!isDragging.current) {
                 handleAction(iso);
             }
        }
    };

    const handlePointerDown = (e: any) => {
        const globalPos = getGlobalPosition(e);

        // Middle Click (1) or Click + Shift for Pan
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            // Start Pan
            isDragging.current = true;
            lastPos.current = { x: globalPos.x, y: globalPos.y };
            e.preventDefault(); 
            return;
        }

        if (e.button === 0) {
             const gridContainer = stageRef.current;
             if (!gridContainer) return;
             const local = gridContainer.toLocal(globalPos);
             const iso = screenToIso(local.x, local.y);
             handleAction(iso);
        }
    };

    const handlePointerUp = () => {
        isDragging.current = false;
    };

    // Global pointer up to catch drags releasing outside canvas
    useEffect(() => {
        const onUp = () => { isDragging.current = false; };
        window.addEventListener('pointerup', onUp);
        return () => window.removeEventListener('pointerup', onUp);
    }, []);

    const handleWheel = (e: WheelEvent) => {
        // Zoom
        const newZoom = zoom * (e.deltaY > 0 ? 0.9 : 1.1);
        setZoom(newZoom);
    };

    // Prepare Object List for Sorting
    const renderObjects = useMemo(() => {
        const list = Object.entries(objects).map(([key, assetId]) => {
            const [x, y] = key.split(',').map(Number);
            const pos = isoToScreen(x, y);
            const [folder, file] = assetId.split('/');
            return { x, y, folder, file, screenX: pos.x, screenY: pos.y };
        });
        return list.sort((a, b) => a.screenY - b.screenY);
    }, [objects]);

    return (
        <div 
            ref={canvasContainerRef}
            style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', cursor: 'crosshair' }}
            onWheel={(e) => handleWheel(e.nativeEvent)}
        >
            <Stage 
                width={dimensions.width} 
                height={dimensions.height} 
                options={{ background: 0x0f172a, antialias: true }} 
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                style={{ display: 'block' }}
            >
                <Container 
                    ref={stageRef}
                    x={cameraX} 
                    y={cameraY}
                    scale={zoom}
                    sortableChildren={true}
                >
                    {/* 1. GROUND LAYER */}
                    <Container sortableChildren={false} zIndex={0}>
                        {Array.from({ length: MAP_SIZE * MAP_SIZE }).map((_, i) => {
                            const x = i % MAP_SIZE;
                            const y = Math.floor(i / MAP_SIZE);
                            const pos = isoToScreen(x, y);
                            const assetId = tiles[`${x},${y}`];
                            
                            return (
                                <React.Fragment key={`tile-${x}-${y}`}>
                                    <Container x={pos.x} y={pos.y}>
                                        {/* Grid Outline */}
                                        <Graphics draw={g => {
                                            g.lineStyle(1, 0xFFFFFF, 0.05);
                                            g.moveTo(0, -TILE_HEIGHT/2);
                                            g.lineTo(TILE_WIDTH/2, 0);
                                            g.lineTo(0, TILE_HEIGHT/2);
                                            g.lineTo(-TILE_WIDTH / 2, 0);
                                            g.closePath();
                                        }} />
                                    </Container>
                                    
                                    { assetId && (
                                        <IsoSprite 
                                            assetId={assetId} 
                                            gridX={x} 
                                            gridY={y} 
                                            typeOverride="GROUND" 
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </Container>

                    {/* 2. OBJECT LAYER */}
                    <Container sortableChildren={true} zIndex={10}>
                        {renderObjects.map(obj => (
                            <IsoSprite 
                                key={`obj-${obj.x}-${obj.y}`}
                                assetId={`${obj.folder}/${obj.file}`}
                                gridX={obj.x}
                                gridY={obj.y}
                                typeOverride="OBJECT"
                            />
                        ))}
                    </Container>

                    {/* 3. CURSOR HIGHLIGHT */}
                    {(() => {
                        const pos = isoToScreen(cursorPos.x, cursorPos.y);
                        if(cursorPos.x >= 0 && cursorPos.x < MAP_SIZE && cursorPos.y >= 0 && cursorPos.y < MAP_SIZE){
                            return (
                                <Container x={pos.x} y={pos.y} zIndex={999}>
                                    <Graphics draw={g => {
                                        g.lineStyle(2, selectedTool === 'ERASE' ? 0xFF5252 : 0x60A5FA, 1);
                                        g.moveTo(0, -TILE_HEIGHT/2);
                                        g.lineTo(TILE_WIDTH/2, 0);
                                        g.lineTo(0, TILE_HEIGHT/2);
                                        g.lineTo(-TILE_WIDTH/2, 0);
                                        g.closePath();
                                    }} />
                                </Container>
                            )
                        }
                        return null;
                    })()}

                </Container>
            </Stage>

            {/* OVERLAY CONTROLS */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
                 <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    Zoom: {(zoom * 100).toFixed(0)}%
                 </div>
                 <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    Pan: Shift+Drag / Middle Click
                 </div>
                 <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '8px', fontSize: '12px', borderRadius: '4px' }}>
                     Cursor: {cursorPos.x}, {cursorPos.y}
                 </div>
            </div>
        </div>
    );
};
