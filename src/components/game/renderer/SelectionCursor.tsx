import React, { useState, useCallback } from 'react';
import { Graphics, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { TILE_SIZE, UI_COLORS } from '../../../core/constants/Config';

interface SelectionCursorProps {
    x: number;
    y: number;
}

export const SelectionCursor: React.FC<SelectionCursorProps> = ({ x, y }) => {
    const [alpha, setAlpha] = useState(1);
    const [time, setTime] = useState(0);

    useTick((delta) => {
        setTime(t => t + (0.1 * delta));
        // Sine wave between 0.6 and 1.0
        const val = 0.8 + Math.sin(time) * 0.2; 
        setAlpha(val);
    });

    const draw = useCallback((g: PIXI.Graphics) => {
        g.clear();
        const color = 0x00FF00; // Bright Green for tactical feel
        const radius = (TILE_SIZE / 2) * 1.2; // Slightly larger than tile
        const center = TILE_SIZE / 2;

        g.lineStyle(2, color, 1);
        
        // Draw 4 corners (Brackets)
        const cornerLen = 8;
        
        // Top Left
        g.moveTo(0, cornerLen);
        g.lineTo(0, 0);
        g.lineTo(cornerLen, 0);

        // Top Right
        g.moveTo(TILE_SIZE - cornerLen, 0);
        g.lineTo(TILE_SIZE, 0);
        g.lineTo(TILE_SIZE, cornerLen);

        // Bottom Right
        g.moveTo(TILE_SIZE, TILE_SIZE - cornerLen);
        g.lineTo(TILE_SIZE, TILE_SIZE);
        g.lineTo(TILE_SIZE - cornerLen, TILE_SIZE);

        // Bottom Left
        g.moveTo(cornerLen, TILE_SIZE);
        g.lineTo(0, TILE_SIZE);
        g.lineTo(0, TILE_SIZE - cornerLen);

        // Pulsing Ring inside
        // g.lineStyle(1, color, 0.5);
        // g.drawCircle(center, center, radius * 0.8);

    }, []);

    return (
        <Graphics 
            draw={draw} 
            x={x} 
            y={y} 
            alpha={alpha}
        />
    );
};
