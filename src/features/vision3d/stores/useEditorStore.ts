// src/features/vision3d/stores/useEditorStore.ts

import { create } from 'zustand';
import { AssetId, ASSET_LIBRARY } from '../config/AssetRegistry';

export interface PlacedAsset {
    assetId: AssetId;
    rotation: number;
}

interface EditorState {
    mapData: Record<string, PlacedAsset>;
    selectedAsset: AssetId | null;
    hoverCursor: { x: number; y: number } | null;
    
    selectAsset: (id: AssetId) => void;
    placeAsset: (x: number, y: number) => void;
    removeAsset: (x: number, y: number) => void;
    setHover: (x: number, y: number) => void;
    generateRandomMap: (width: number, height: number) => void;
}

const ASSET_IDS = Object.keys(ASSET_LIBRARY) as AssetId[];
const ROTATIONS = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];

const BUILDING_ASSETS: AssetId[] = [
    'BUILDING_BANK', 'BUILDING_BASE', 'SKYSCRAPER_A', 'SKYSCRAPER_B'
];

export const useEditorStore = create<EditorState>((set) => ({
    mapData: {},
    selectedAsset: 'TREE_SIMPLE', // Default
    hoverCursor: null,

    selectAsset: (id) => set({ selectedAsset: id }),
    
    placeAsset: (x, y) => set((state) => {
        if (!state.selectedAsset) return {};
        const key = `${x},${y}`;
        return {
            mapData: {
                ...state.mapData,
                [key]: { assetId: state.selectedAsset, rotation: 0 }
            }
        };
    }),
    
    removeAsset: (x, y) => set((state) => {
        const key = `${x},${y}`;
        const newMap = { ...state.mapData };
        delete newMap[key];
        return { mapData: newMap };
    }),
    
    setHover: (x, y) => set({ hoverCursor: { x, y } }),

    generateRandomMap: (width, height) => set(() => {
        const nextMap: Record<string, PlacedAsset> = {};
        const buildings: {x: number, y: number}[] = [];

        // 1. Fill base with Plains
        for (let x = 0; x < width; x += 1) {
            for (let y = 0; y < height; y += 1) {
                nextMap[`${x},${y}`] = { assetId: 'PLAINS', rotation: 0 };
            }
        }

        // 2. Place Buildings with constraints (2 tile distance i.e. 2 empty tiles between)
        // Try many times
        const ATTEMPTS = 1000;
        const MIN_DIST = 3; // Distance 3 means (0,0) and (3,0) -> Gap is (1,0), (2,0) = 2 tiles.

        for (let i = 0; i < ATTEMPTS; i++) {
            const bx = Math.floor(Math.random() * width);
            const by = Math.floor(Math.random() * height);

            // Check distance
            let valid = true;
            for (const other of buildings) {
                const dist = Math.max(Math.abs(bx - other.x), Math.abs(by - other.y));
                if (dist < MIN_DIST) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                const assetId = BUILDING_ASSETS[Math.floor(Math.random() * BUILDING_ASSETS.length)];
                nextMap[`${bx},${by}`] = { 
                    assetId, 
                    rotation: ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)] 
                };
                buildings.push({x: bx, y: by});
            }
        }
        
        return { mapData: nextMap };
    })
}));
