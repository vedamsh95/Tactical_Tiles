import React, { useState, useCallback } from 'react';
import { Graphics, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface ProjectileRendererProps {
    data: {
        id: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        color: number;
    }
}

export const ProjectileRenderer: React.FC<ProjectileRendererProps> = ({ data }) => {
    const [progress, setProgress] = useState(0);

    useTick((delta) => {
        // Move 20% per tick (Fast bullet)
        setProgress(p => {
             const np = p + (0.2 * delta);
             return np > 1 ? 1 : np; 
        });
    });

    const draw = useCallback((g: PIXI.Graphics) => {
        g.clear();
        if (progress >= 1) return;

        const currentX = data.startX + (data.endX - data.startX) * progress;
        const currentY = data.startY + (data.endY - data.startY) * progress;

        g.beginFill(data.color);
        g.drawCircle(currentX, currentY, 4);
        g.endFill();
        
        // Trail
        g.lineStyle(2, data.color, 0.5);
        g.moveTo(data.startX + (data.endX - data.startX) * Math.max(0, progress - 0.2), 
                 data.startY + (data.endY - data.startY) * Math.max(0, progress - 0.2));
        g.lineTo(currentX, currentY);

    }, [progress, data]);

    return <Graphics draw={draw} />;
};
