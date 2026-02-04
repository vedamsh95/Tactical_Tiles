
import { SavedMap } from '../types';

const STORAGE_KEY = 'tactical_tiles_user_maps';

export const MapStorage = {
  // 1. GET ALL CUSTOM MAPS
  getAll: (): SavedMap[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("Failed to load maps from storage", e);
        return [];
    }
  },

  // 2. SAVE A NEW MAP
  save: (newMap: SavedMap) => {
    const maps = MapStorage.getAll();
    
    // Check if updating existing or creating new
    const index = maps.findIndex(m => m.id === newMap.id);
    if (index >= 0) {
      maps[index] = newMap; // Update
    } else {
      maps.push(newMap); // Add
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  },

  // 3. DELETE
  delete: (mapId: string) => {
    const maps = MapStorage.getAll().filter(m => m.id !== mapId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  },

  // 4. EXPORT (Download as JSON file)
  export: (map: SavedMap) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(map));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${map.name.replace(/\s+/g, '_')}.ttmap`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  },

  // 5. IMPORT (Parse JSON string)
  import: (jsonString: string): SavedMap | null => {
      try {
          const map = JSON.parse(jsonString);
          if (!map.data || !Array.isArray(map.data) || !map.name) {
              alert("Invalid Map File Format");
              return null;
          }
          // Sanitize ID to ensure no conflicts if importing same map twice
          const importedMap: SavedMap = {
              ...map,
              id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              isPreset: false,
              author: map.author || 'Imported'
          };
          MapStorage.save(importedMap);
          return importedMap;
      } catch (e) {
          alert("Failed to parse map file.");
          console.error(e);
          return null;
      }
  }
};
