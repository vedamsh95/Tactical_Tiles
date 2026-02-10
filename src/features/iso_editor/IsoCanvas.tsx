import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Stage, Container, Graphics } from '@pixi/react';
import { useIsoEditorStore } from './useIsoEditorStore';
import { isoToScreen, screenToIso, TILE_WIDTH, TILE_HEIGHT } from './IsoMath';
import { IsoSprite } from './components/IsoSprite';

const MAP_SIZE = 20;

// Optimized Sub-Components to prevent re-renders on cursor move
const GroundLayer = React.memo(({ tiles }: { tiles: Record<string, string> }) => {
    return (
        <Container sortableChildren={false} zIndex={0}>
            {Array.from({ length: MAP_SIZE * MAP_SIZE }).map((_, i) => {
                const x = i % MAP_SIZE;
                const y = Math.floor(i / MAP_SIZE);
                const pos = isoToScreen(x, y);
                const assetId = tiles[`${x},${y}`];
                
                return (
                    <React.Fragment key={`tile-${x}-${y}`}>
                        {/* Grid Outline - Static, cheap */}
                        <Container x={pos.x} y={pos.y}>
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
    );
}, (prev, next) => prev.tiles === next.tiles); // Only re-render if tiles object reference changes

const ObjectLayer = React.memo(({ objects }: { objects: Record<string, string> }) => {
    // Prepare Object List for Sorting
    const sortedObjects = useMemo(() => {
        const list = Object.entries(objects).map(([key, assetId]) => {
            const [x, y] = key.split(',').map(Number);
            const pos = isoToScreen(x, y);
            const [folder, file] = assetId.split('/');
            return { x, y, folder, file, screenX: pos.x, screenY: pos.y };
        });
        return list.sort((a, b) => a.screenY - b.screenY);
    }, [objects]);

    return (
        <Container sortableChildren={true} zIndex={10}>
            {sortedObjects.map(obj => (
                <IsoSprite 
                    key={`obj-${obj.x}-${obj.y}`}
                    assetId={`${obj.folder}/${obj.file}`}
                    gridX={obj.x}
                    gridY={obj.y}
                    typeOverride="OBJECT"
                />
            ))}
        </Container>
    );
}, (prev, next) => prev.objects === next.objects);

const CursorLayer = ({ cursorPos, selectedTool, dragStart }: { cursorPos: {x: number, y: number}, selectedTool: string, dragStart: {x: number, y: number} | null }) => {
    const pos = isoToScreen(cursorPos.x, cursorPos.y);
    const isValid = cursorPos.x >= 0 && cursorPos.x < MAP_SIZE && cursorPos.y >= 0 && cursorPos.y < MAP_SIZE;

    const renderDragPreview = () => {
        if (!dragStart || !isValid) return null;
        if (selectedTool !== 'RECTANGLE') return null;

        const minX = Math.min(dragStart.x, cursorPos.x);
        const maxX = Math.max(dragStart.x, cursorPos.x);
        const minY = Math.min(dragStart.y, cursorPos.y);
        const maxY = Math.max(dragStart.y, cursorPos.y);

        const graphicsArray = [];
        for(let x=minX; x<=maxX; x++) {
            for(let y=minY; y<=maxY; y++) {
                 const p = isoToScreen(x, y);
                 graphicsArray.push({ x: p.x, y: p.y });
            }
        }
        
        return (
            <Container zIndex={999}>
                {graphicsArray.map((p, i) => (
                     <Container key={i} x={p.x} y={p.y}>
                        <Graphics draw={g => {
                            g.beginFill(0x2563eb, 0.3);
                            g.lineStyle(1, 0x2563eb, 0.8);
                            g.moveTo(0, -TILE_HEIGHT/2);
                            g.lineTo(TILE_WIDTH/2, 0);
                            g.lineTo(0, TILE_HEIGHT/2);
                            g.lineTo(-TILE_WIDTH/2, 0);
                            g.closePath();
                            g.endFill();
                        }} />
                     </Container>
                ))}
            </Container>
        );
    };

    if(isValid) {
        return (
            <React.Fragment>
                {renderDragPreview()}
                <Container x={pos.x} y={pos.y} zIndex={1000}>
                    <Graphics draw={g => {
                        let color = 0x60A5FA;
                        if (selectedTool === 'ERASE') color = 0xFF5252;
                        if (selectedTool === 'PICKER') color = 0xFBBF24;
                        if (selectedTool === 'FILL') color = 0x34D399;
                        
                        g.lineStyle(2, color, 1);
                        g.moveTo(0, -TILE_HEIGHT/2);
                        g.lineTo(TILE_WIDTH/2, 0);
                        g.lineTo(0, TILE_HEIGHT/2);
                        g.lineTo(-TILE_WIDTH/2, 0);
                        g.closePath();
                        
                        // Add icon indicator for fancy tools
                        if (selectedTool === 'FILL') {
                            g.beginFill(color, 0.5);
                            g.drawCircle(0, 0, 4);
                            g.endFill();
                        }
                    }} />
                </Container>
            </React.Fragment>
        )
    }
    return null;
};

export const IsoCanvas = () => {
    const store = useIsoEditorStore();
    const { 
        tiles, objects, 
        setTile, setObject, selectAsset,
        selectedFolder, selectedAsset, selectedTool, selectedLayer,
        cameraX, cameraY, zoom, setCamera, setZoom
    } = store;

    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
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

    // --- TOOL LOGIC ---

    const performPaint = (x: number, y: number) => {
        const id = `${selectedFolder}/${selectedAsset}`;
        if (selectedLayer === 'GROUND') setTile(x, y, id);
        else setObject(x, y, id);
    };

    const performErase = (x: number, y: number) => {
        if (selectedLayer === 'GROUND') setTile(x, y, ''); 
        else setObject(x, y, null);
    };

    const performPicker = (x: number, y: number) => {
        const key = `${x},${y}`;
        const assetId = selectedLayer === 'GROUND' ? tiles[key] : objects[key];
        
        if (assetId) {
            const [folder, file] = assetId.split('/');
            selectAsset(folder, file);
        }
    };

    const performFill = (x: number, y: number) => {
        // Simple Flood Fill
        const targetId = `${selectedFolder}/${selectedAsset}`;
        const sourceId = selectedLayer === 'GROUND' ? tiles[`${x},${y}`] : objects[`${x},${y}`];
        
        // Prevent infinite loop if filling same tile
        if (targetId === sourceId) return;

        // BFS Queue
        const queue = [{ x, y }];
        const visited = new Set<string>();
        const updates: {x: number, y: number, layer: 'GROUND'|'OBJECT', id: string}[] = [];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            // Check bounds
            if (current.x < 0 || current.x >= MAP_SIZE || current.y < 0 || current.y >= MAP_SIZE) continue;

            const currentAsset = selectedLayer === 'GROUND' ? tiles[key] : objects[key];
            
            // Match?
            // If source was empty (undefined), match empty.
            if (currentAsset === sourceId || (sourceId === undefined && !currentAsset)) {
                visited.add(key);
                updates.push({ x: current.x, y: current.y, layer: selectedLayer, id: targetId });
                
                // Add neighbors
                queue.push({ x: current.x + 1, y: current.y });
                queue.push({ x: current.x - 1, y: current.y });
                queue.push({ x: current.x, y: current.y + 1 });
                queue.push({ x: current.x, y: current.y - 1 });
            }
        }

        // Apply
        if (updates.length > 0) {
            store.batchUpdate(updates);
        }
    };

    const handleAction = (iso: {x: number, y: number}, isDown: boolean, isUp: boolean) => {
        if (!iso || iso.x < 0 || iso.x >= MAP_SIZE || iso.y < 0 || iso.y >= MAP_SIZE) return;

        // 1. PICKER (Instant)
        if (selectedTool === 'PICKER' && isDown) {
            performPicker(iso.x, iso.y);
            return;
        }

        // 2. FILL (Instant)
        if (selectedTool === 'FILL' && isDown) {
            if (!selectedAsset) return;
            store.pushUndo(); // Save state before filling
            performFill(iso.x, iso.y);
            return;
        }

        // 3. RECTANGLE (Drag)
        if (selectedTool === 'RECTANGLE') {
            if (isDown) {
                setDragStart(iso);
                store.pushUndo(); // Save state before drag commit (actually we could save on Up, but standard is Down usually)
                // Actually, for drag rect, we modify only on Up. So saving on Down is fine, 
                // but since no partial mods happen, saving on Up right before apply is also fine.
                // Let's stick effectively to "Action Start".
            }
            if (isUp && dragStart) {
                if (!selectedAsset && selectedTool !== 'ERASE') {
                     setDragStart(null);
                     return;
                }

                const minX = Math.min(dragStart.x, iso.x);
                const maxX = Math.max(dragStart.x, iso.x);
                const minY = Math.min(dragStart.y, iso.y);
                const maxY = Math.max(dragStart.y, iso.y);
                
                const updates: any[] = [];
                const targetId = selectedTool === 'ERASE' ? '' : `${selectedFolder}/${selectedAsset}`;

                for(let x=minX; x<=maxX; x++) {
                    for(let y=minY; y<=maxY; y++) {
                         updates.push({ x, y, layer: selectedLayer, id: targetId });
                    }
                }
                
                if (updates.length > 0) store.batchUpdate(updates);
                setDragStart(null);
            }
            return;
        }

        // 4. PAINT / ERASE (Continuous)
        if (selectedTool === 'PAINT' || selectedTool === 'ERASE') {
             // Only paint if asset selected (unless erasing)
             if (selectedTool === 'PAINT' && !selectedAsset) return;

             // Logic:
             // If Mouse DOWN: Paint
             // If Mouse DRAG (Move + Down): Paint
             if (isDown) {
                 store.pushUndo(); // New stroke
                 if (selectedTool === 'ERASE') performErase(iso.x, iso.y);
                 else performPaint(iso.x, iso.y);
             } else if (!isUp) {
                  // Dragging
                  if (selectedTool === 'ERASE') performErase(iso.x, iso.y);
                  else performPaint(iso.x, iso.y);
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
                 handleAction(iso, false, false);
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
            return;
        }

        if (e.button === 0) {
             const gridContainer = stageRef.current;
             if (!gridContainer) return;
             const local = gridContainer.toLocal(globalPos);
             const iso = screenToIso(local.x, local.y);
             handleAction(iso, true, false);
        }
    };

    const handlePointerUp = (e: any) => {
        isDragging.current = false;

        const gridContainer = stageRef.current;
        if (!gridContainer) return;
        const globalPos = getGlobalPosition(e);
        const local = gridContainer.toLocal(globalPos);
        const iso = screenToIso(local.x, local.y);
        handleAction(iso, false, true);
    };

    // Global pointer up to catch drags releasing outside canvas
    useEffect(() => {
        const onUp = () => { 
            isDragging.current = false;
            setDragStart(null);
        };
        window.addEventListener('pointerup', onUp);
        return () => window.removeEventListener('pointerup', onUp);
    }, []);

    const handleWheel = (e: WheelEvent) => {
        // Stop browser scroll
        e.preventDefault();
        // Zoom
        const newZoom = zoom * (e.deltaY > 0 ? 0.9 : 1.1);
        setZoom(newZoom);
    };

    // Prepare Object List for Sorting - Done inside ObjectLayer now

    return (
        <div 
            ref={canvasContainerRef}
            style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', cursor: 'crosshair' }}
            onWheel={(e) => handleWheel(e.nativeEvent)}
        >
            <Stage 
                width={dimensions.width} 
                height={dimensions.height} 
                options={{ background: 0x0f172a, antialias: false, resolution: window.devicePixelRatio || 1 }} 
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
                    <GroundLayer tiles={tiles} />
                    <ObjectLayer objects={objects} />
                    <CursorLayer cursorPos={cursorPos} selectedTool={selectedTool} dragStart={dragStart} />
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
                     Cursor: {
                        (cursorPos.x >= 0 && cursorPos.x < MAP_SIZE && cursorPos.y >= 0 && cursorPos.y < MAP_SIZE)
                        ? `${cursorPos.x}, ${cursorPos.y}` 
                        : 'Out of Bounds'
                     }
                 </div>
            </div>
        </div>
    );
};
