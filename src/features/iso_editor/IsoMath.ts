export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// 1. Logic -> Screen (Where do I draw the sprite?)
export const isoToScreen = (gridX: number, gridY: number) => {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2)
  };
};

// 2. Screen -> Logic (Which tile did I click?)
export const screenToIso = (screenX: number, screenY: number) => {
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  return {
    x: Math.floor((screenX / halfW + screenY / halfH) / 2),
    y: Math.floor((screenY / halfH - screenX / halfW) / 2)
  };
};
