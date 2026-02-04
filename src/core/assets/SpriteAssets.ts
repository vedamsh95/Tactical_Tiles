
import { PLAYER_COLORS } from '../constants/Config';

// In a real production app, these would be URL paths to .png files in the public folder.
// For this contained demo, we use Base64 Data URIs to ensure it works immediately.

const CREATE_TILE = (color: string, symbol: string) => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="${color}" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
  <text x="32" y="45" font-family="Segoe UI, Emoji, sans-serif" font-size="28" fill="rgba(255,255,255,0.6)" text-anchor="middle" dominant-baseline="middle">${symbol}</text>
</svg>`;

const CREATE_ROAD = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#8BC34A"/>
  <rect x="16" y="0" width="32" height="64" fill="#9E9E9E" stroke="#757575" stroke-width="2"/>
  <line x1="32" y1="4" x2="32" y2="60" stroke="#FFEB3B" stroke-width="2" stroke-dasharray="8 8"/>
</svg>`;

const CREATE_ROAD_H = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#8BC34A"/>
  <rect x="0" y="16" width="64" height="32" fill="#9E9E9E" stroke="#757575" stroke-width="2"/>
  <line x1="4" y1="32" x2="60" y2="32" stroke="#FFEB3B" stroke-width="2" stroke-dasharray="8 8"/>
</svg>`;

const CREATE_BARRIER = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#212121"/>
  <line x1="0" y1="0" x2="64" y2="64" stroke="#FF5722" stroke-width="4"/>
  <line x1="64" y1="0" x2="0" y2="64" stroke="#FF5722" stroke-width="4"/>
  <rect x="16" y="16" width="32" height="32" fill="none" stroke="#FF5722" stroke-width="4"/>
  <text x="32" y="42" font-family="monospace" font-size="30" fill="#FF5722" text-anchor="middle" font-weight="bold">X</text>
</svg>`;

const CREATE_BRIDGE = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#2196F3"/>
  <rect x="0" y="10" width="64" height="44" fill="#8D6E63" stroke="#5D4037" stroke-width="2"/>
  <line x1="0" y1="10" x2="64" y2="10" stroke="#4E342E" stroke-width="4"/>
  <line x1="0" y1="54" x2="64" y2="54" stroke="#4E342E" stroke-width="4"/>
  <line x1="16" y1="10" x2="16" y2="54" stroke="#5D4037" stroke-width="2"/>
  <line x1="32" y1="10" x2="32" y2="54" stroke="#5D4037" stroke-width="2"/>
  <line x1="48" y1="10" x2="48" y2="54" stroke="#5D4037" stroke-width="2"/>
</svg>`;

const CREATE_BRIDGE_V = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#2196F3"/>
  <rect x="10" y="0" width="44" height="64" fill="#8D6E63" stroke="#5D4037" stroke-width="2"/>
  <line x1="10" y1="0" x2="10" y2="64" stroke="#4E342E" stroke-width="4"/>
  <line x1="54" y1="0" x2="54" y2="64" stroke="#4E342E" stroke-width="4"/>
  <line x1="10" y1="16" x2="54" y2="16" stroke="#5D4037" stroke-width="2"/>
  <line x1="10" y1="32" x2="54" y2="32" stroke="#5D4037" stroke-width="2"/>
  <line x1="10" y1="48" x2="54" y2="48" stroke="#5D4037" stroke-width="2"/>
</svg>`;

const CREATE_BANK = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#8BC34A"/>
  <rect x="8" y="16" width="48" height="40" fill="#CFD8DC" stroke="#78909C" stroke-width="2"/>
  <path d="M 4 16 L 32 4 L 60 16 Z" fill="#607D8B"/>
  <rect x="22" y="28" width="20" height="28" fill="#455A64"/>
  <circle cx="32" cy="24" r="5" fill="#FFD700" stroke="#F57F17"/>
  <text x="32" y="27" font-size="8" text-anchor="middle" fill="#000">$</text>
</svg>`;

const CREATE_BANK_EMPTY = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#8BC34A"/>
  <rect x="8" y="16" width="48" height="40" fill="#546E7A" stroke="#37474F" stroke-width="2"/>
  <path d="M 4 16 L 32 4 L 60 16 Z" fill="#455A64"/>
  <rect x="22" y="28" width="20" height="28" fill="#263238"/> 
  <text x="32" y="27" font-size="8" text-anchor="middle" fill="#90A4AE">EMPTY</text>
</svg>`;

const CREATE_BUILDING = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#546E7A"/>
  <rect x="8" y="8" width="20" height="20" fill="#B0BEC5"/>
  <rect x="36" y="8" width="20" height="20" fill="#B0BEC5"/>
  <rect x="8" y="36" width="20" height="20" fill="#B0BEC5"/>
  <rect x="36" y="36" width="20" height="20" fill="#B0BEC5"/>
  <rect x="0" y="0" width="64" height="64" fill="none" stroke="#37474F" stroke-width="4"/>
</svg>`;

// --- DESERT ASSETS ---

const CREATE_SAND = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#E6C288"/>
  <circle cx="10" cy="10" r="1" fill="#D4A35B"/>
  <circle cx="50" cy="50" r="1" fill="#D4A35B"/>
  <circle cx="30" cy="20" r="1" fill="#D4A35B"/>
  <circle cx="20" cy="40" r="1" fill="#D4A35B"/>
</svg>`;

const CREATE_DUNES = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#E6C288"/>
  <path d="M0 40 Q 32 10 64 40" fill="#D4A35B" stroke="#B88A4A"/>
  <path d="M0 64 Q 32 34 64 64" fill="#C5934E" stroke="#B88A4A"/>
</svg>`;

const CREATE_QUICKSAND = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#E6C288"/>
  <ellipse cx="32" cy="32" rx="25" ry="15" fill="#A1887F" stroke="#8D6E63"/>
  <path d="M20 32 Q 32 40 44 32" stroke="#5D4037" fill="none" opacity="0.5"/>
</svg>`;

const CREATE_CANYON = () => `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="64" height="64" fill="#E6C288"/>
  <path d="M10 0 L 15 20 L 5 40 L 12 64" fill="#5D4037" stroke="#3E2723"/>
  <path d="M54 0 L 49 20 L 59 40 L 52 64" fill="#5D4037" stroke="#3E2723"/>
  <rect x="12" y="0" width="40" height="64" fill="#3E2723"/>
</svg>`;


const CREATE_UNIT = (color: string, type: 'SOLDIER' | 'ASSAULTER' | 'SNIPER') => {
  let shape = '';
  // Simple geometric representations for units
  if (type === 'SOLDIER') {
    // Circle with inner detail
    shape = `
      <circle cx="32" cy="32" r="18" fill="${color}" stroke="white" stroke-width="3"/>
      <circle cx="32" cy="32" r="8" fill="rgba(0,0,0,0.3)"/>
    `;
  }
  if (type === 'ASSAULTER') {
    // Heavy Square with metallic look
    shape = `
      <rect x="14" y="14" width="36" height="36" rx="4" fill="${color}" stroke="white" stroke-width="3"/>
      <rect x="22" y="22" width="20" height="20" rx="2" fill="rgba(0,0,0,0.3)"/>
    `;
  }
  if (type === 'SNIPER') {
    // Sharp Triangle
    shape = `
      <polygon points="32,10 56,50 8,50" fill="${color}" stroke="white" stroke-width="3"/>
      <circle cx="32" cy="34" r="6" fill="rgba(0,0,0,0.3)"/>
    `;
  }
  
  return `
  <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="2" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.5"/>
      </feComponentTransfer>
      <feMerge> 
        <feMergeNode in="offsetblur"/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>
    <g filter="url(#shadow)">
      ${shape}
    </g>
  </svg>`;
};

// Robust SVG to Data URI converter that handles Unicode (emojis) correctly
const svgToDataUri = (svg: string) => {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
};

const generateUnitSprites = () => {
    const units: Record<string, string> = {};
    Object.entries(PLAYER_COLORS).forEach(([id, color]) => {
        units[`P${id}_SOLDIER`] = svgToDataUri(CREATE_UNIT(color, 'SOLDIER'));
        units[`P${id}_ASSAULTER`] = svgToDataUri(CREATE_UNIT(color, 'ASSAULTER'));
        units[`P${id}_SNIPER`] = svgToDataUri(CREATE_UNIT(color, 'SNIPER'));
    });
    return units;
};

export const SPRITES = {
  TERRAIN: {
    PLAINS: svgToDataUri(CREATE_TILE('#8BC34A', '')),
    FOREST: svgToDataUri(CREATE_TILE('#388E3C', '🌲')),
    MOUNTAIN: svgToDataUri(CREATE_TILE('#795548', '⛰️')),
    WATER: svgToDataUri(CREATE_TILE('#2196F3', '🌊')),
    BASE: svgToDataUri(CREATE_TILE('#607D8B', '🏠')),
    ROAD: svgToDataUri(CREATE_ROAD()),
    ROAD_H: svgToDataUri(CREATE_ROAD_H()),
    BRIDGE: svgToDataUri(CREATE_BRIDGE()),
    BRIDGE_V: svgToDataUri(CREATE_BRIDGE_V()),
    BANK: svgToDataUri(CREATE_BANK()),
    BANK_EMPTY: svgToDataUri(CREATE_BANK_EMPTY()),
    BUILDING: svgToDataUri(CREATE_BUILDING()),
    BARRIER: svgToDataUri(CREATE_BARRIER()),
    SAND: svgToDataUri(CREATE_SAND()),
    DUNES: svgToDataUri(CREATE_DUNES()),
    QUICKSAND: svgToDataUri(CREATE_QUICKSAND()),
    CANYON: svgToDataUri(CREATE_CANYON()),
  },
  UNITS: generateUnitSprites()
};
