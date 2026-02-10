import { create } from 'zustand';

// Define the Map State for History
type EditorMapState = {
    tiles: Record<string, string>;
    objects: Record<string, string>;
};

type AssetOverride = {
    baseWidth?: number;
    deltaX?: number; // Offsets relative to default
    deltaY?: number;
};

interface IsoEditorState {
    tiles: Record<string, string>; // "x,y" -> AssetID 
    objects: Record<string, string>; // "x,y" -> AssetID
    
    // Asset Overrides (Calibration)
    assetOverrides: Record<string, AssetOverride>; // Key: "folder/filename"
    setAssetOverride: (id: string, override: AssetOverride) => void;

    // History
    past: EditorMapState[];
    future: EditorMapState[];

    // Selection
    selectedFolder: string;
    selectedAsset: string | null;  
    selectedLayer: 'GROUND' | 'OBJECT';
    
    // Mode
    selectedTool: 'PAINT' | 'ERASE' | 'RECTANGLE' | 'FILL' | 'PICKER';

    // Camera
    cameraX: number;
    cameraY: number;
    zoom: number;
    rotation: number;

    // Actions
    setTile: (x: number, y: number, assetId: string) => void;
    setObject: (x: number, y: number, assetId: string | null) => void;
    // Batch update is critical for Fill/Rect tools to be a single undo step
    batchUpdate: (updates: { x: number, y: number, layer: 'GROUND' | 'OBJECT', id: string | null }[]) => void;
    
    // History Actions
    pushUndo: () => void;
    undo: () => void;
    redo: () => void;

    // Storage Actions
    loadMapState: (tiles: Record<string, string>, objects: Record<string, string>) => void;

    selectAsset: (folder: string, filename: string) => void;
    selectFolder: (folder: string) => void;
    setTool: (tool: 'PAINT' | 'ERASE' | 'RECTANGLE' | 'FILL' | 'PICKER') => void;
    setCamera: (x: number, y: number) => void;
    setZoom: (zoom: number) => void;
    setRotation: (rotation: number) => void;
}

export const useIsoEditorStore = create<IsoEditorState>((set, get) => ({
    tiles: {},
    objects: {},
    assetOverrides: {},
    past: [],
    future: [],
    
    selectedFolder: 'plains',
    selectedAsset: null,

    setAssetOverride: (id, override) => set(state => ({
        assetOverrides: { ...state.assetOverrides, [id]: override }
    })),
    selectedLayer: 'GROUND',
    selectedTool: 'PAINT',

    cameraX: 600, 
    cameraY: 100,
    zoom: 1,
    rotation: 0,

    setTile: (x, y, assetId) => set(state => ({
        tiles: { ...state.tiles, [`${x},${y}`]: assetId }
    })),
    
    setObject: (x, y, assetId) => set(state => {
        const newObjects = { ...state.objects };
        if (assetId === null) {
            delete newObjects[`${x},${y}`];
        } else {
            newObjects[`${x},${y}`] = assetId;
        }
        return { objects: newObjects };
    }),

    batchUpdate: (updates) => set(state => {
        const newTiles = { ...state.tiles };
        const newObjects = { ...state.objects };

        updates.forEach(u => {
            const key = `${u.x},${u.y}`;
            if (u.layer === 'GROUND') {
                if (u.id === null || u.id === '') delete newTiles[key];
                else newTiles[key] = u.id;
            } else {
                if (u.id === null || u.id === '') delete newObjects[key];
                else newObjects[key] = u.id;
            }
        });

        return { tiles: newTiles, objects: newObjects };
    }),

    pushUndo: () => set(state => {
        // Limit history to 50 steps
        const newPast = [...state.past, { tiles: state.tiles, objects: state.objects }];
        if (newPast.length > 50) newPast.shift();
        
        return {
            past: newPast,
            future: [] // Clear redo stack on new action
        };
    }),

    undo: () => set(state => {
        if (state.past.length === 0) return {};
        
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        
        return {
            past: newPast,
            future: [{ tiles: state.tiles, objects: state.objects }, ...state.future],
            tiles: previous.tiles,
            objects: previous.objects
        };
    }),

    redo: () => set(state => {
        if (state.future.length === 0) return {};

        const next = state.future[0];
        const newFuture = state.future.slice(1);

        return {
            past: [...state.past, { tiles: state.tiles, objects: state.objects }],
            future: newFuture,
            tiles: next.tiles,
            objects: next.objects
        };
    }),

    loadMapState: (tiles, objects) => {
        // Reset history when loading a new map
        set({ tiles, objects, past: [], future: [] });
    },

    selectAsset: (folder, filename) => set({ 
        selectedFolder: folder, 
        selectedAsset: filename,
        selectedTool: 'PAINT',
        selectedLayer: (folder === 'plains' || folder === 'water' || folder === 'sand' || folder === 'road' || folder === 'river') ? 'GROUND' : 'OBJECT'
    }),
    selectFolder: (folder) => set({ selectedFolder: folder, selectedAsset: null }),
    setTool: (tool) => set({ selectedTool: tool }),

    setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
    setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
    setRotation: (r) => set({ rotation: r % 4 })
}));
