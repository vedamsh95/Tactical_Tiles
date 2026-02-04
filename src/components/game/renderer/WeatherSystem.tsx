import React, { useEffect, useMemo, useRef } from 'react';
import { Container, Graphics, useTick, useApp } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { GodrayFilter } from 'pixi-filters';
import { useGameStore } from '../../../store/useGameStore';

interface WeatherSystemProps {
    width: number;
    height: number;
}

export const WeatherSystem: React.FC<WeatherSystemProps> = ({ width, height }) => {
    const app = useApp();
    const totalTurns = useGameStore(state => state.totalTurns);
    const timeRef = useRef(0);

    // 1. Day/Night Filter (Applied to STAGE)
    const colorMatrix = useMemo(() => new PIXI.filters.ColorMatrixFilter(), []);

    useEffect(() => {
        const existingFilters = app.stage.filters || [];
        // Only add if not present
        if (!existingFilters.includes(colorMatrix)) {
            app.stage.filters = [...existingFilters, colorMatrix];
        }

        // Cycle: Day (0-4), Sunset (5-9), Night (10+)
        // Using Modulo 20 for a reasonable cycle length
        const phase = totalTurns % 20; 
        colorMatrix.reset();

        if (phase < 5) {
            // DAY: Bright
            colorMatrix.brightness(1.05, false);
            colorMatrix.saturate(1.1, false); // Vivid
        } else if (phase < 10) {
            // SUNSET: Warm
            colorMatrix.technicolor(true);
            colorMatrix.brightness(0.9, false);
        } else {
            // NIGHT: Dark, Blue, Contrast
            colorMatrix.night(0.7, false); 
            colorMatrix.brightness(0.6, false);
            colorMatrix.contrast(0.2, true);
        }

        return () => {
             // Cleanup
             if (app.stage.filters) {
                 app.stage.filters = app.stage.filters.filter(f => f !== colorMatrix);
             }
        };
    }, [totalTurns, app, colorMatrix]);

    // 2. Godrays (Applied to Mist Container)
    const godrayFilter = useMemo(() => new GodrayFilter({
        gain: 0.2, // Adjusted (+30%)
        lacunarity: 2.5,
        alpha: 0.13, // Adjusted (+30%)
        time: 0,
        angle: 30,
        parallel: true 
    }), []);

    useTick((delta) => {
        timeRef.current += 0.005 * delta;
        godrayFilter.time += 0.01 * delta;
        godrayFilter.angle = 30 + Math.sin(timeRef.current) * 10;
    });

    // Draw Mist/Atmosphere 
    const drawMist = React.useCallback((g: PIXI.Graphics) => {
        g.clear();
        g.beginFill(0xFFFFFF, 0.03); // Very faint white
        // Draw clusters of "mist"
        for(let i=0; i<8; i++) {
             const cx = Math.random() * width;
             const cy = Math.random() * height;
             const r = 150 + Math.random() * 400;
             g.drawCircle(cx, cy, r);
        }
        g.endFill();
    }, [width, height]);


    return (
        <Container filters={[godrayFilter]}>
             <Graphics draw={drawMist} />
        </Container>
    );
};

