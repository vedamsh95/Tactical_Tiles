import { create } from 'zustand';

interface IsoEditorState {
    tiles: Record<string, string>; // "x,y" -> AssetID (Folder/Filename combined)
    objects: Record<string, string>; // "x,y" -> AssetID
    
    // Selection
    selectedFolder: string;
    selectedAsset: string | null;  // Actually the filename
    selectedLayer: 'GROUND' | 'OBJECT';
    
    // Mode
    selectedTool: 'PAINT' | 'ERASE';

    // Camera
    cameraX: number;
    cameraY: number;
    zoom: number;
    rotation: number; // 0, 1, 2, 3 (Multiples of 90)

    // Actions
    setTile: (x: number, y: number, assetId: string) => void;
    setObject: (x: number, y: number, assetId: string | null) => void;
    selectAsset: (folder: string, filename: string) => void;
    selectFolder: (folder: string) => void;
    setTool: (tool: 'PAINT' | 'ERASE') => void;
    setCamera: (x: number, y: number) => void;
    setZoom: (zoom: number) => void;
    setRotation: (rotation: number) => void;
}

export const useIsoEditorStore = create<IsoEditorState>((set) => ({
    tiles: {},
    objects: {},
    
    selectedFolder: 'plains',
    selectedAsset: null,
    selectedLayer: 'GROUND',
    selectedTool: 'PAINT',

    cameraX: 600, // Center of 1200
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
    selectAsset: (folder, filename) => set({ 
        selectedFolder: folder, 
        selectedAsset: filename,
        selectedTool: 'PAINT',
        // Heuristic: if folder is 'mountain' or 'base' or 'bridge' or 'bank', assume object layer for now? 
        // Or just let user toggle. 
        selectedLayer: (folder === 'plains' || folder === 'water' || folder === 'sand' || folder === 'road' || folder === 'river') ? 'GROUND' : 'OBJECT'
    }),
    selectFolder: (folder) => set({ selectedFolder: folder, selectedAsset: null }),
    setTool: (tool) => set({ selectedTool: tool }),

    setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
    setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
    setRotation: (r) => set({ rotation: r % 4 })
}));
