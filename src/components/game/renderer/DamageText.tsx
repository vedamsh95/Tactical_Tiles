import React, { useState, useRef, useEffect } from 'react';
import { Text, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface DamageTextProps {
    data: {
        id: string;
        x: number;
        y: number;
        value: string;
        color: string;
    };
}

export const DamageText: React.FC<DamageTextProps> = ({ data }) => {
    const [age, setAge] = useState(0);
    const [yOffset, setYOffset] = useState(0);
    const [scale, setScale] = useState(0.5);
    const [alpha, setAlpha] = useState(1);

    useTick((delta) => {
        const newAge = age + delta;
        setAge(newAge);

        // Float up (1px per tick roughly)
        setYOffset(prev => prev - (1 * delta));

        // Scale Pop Logic (Elastic out effect simplified)
        // 0 to 10 frames: Grow
        if (newAge < 10) {
            setScale(0.5 + (0.7 * (newAge / 10))); // 0.5 -> 1.2
        } 
        // 10 to 20 frames: Settle
        else if (newAge < 20) {
            setScale(1.2 - (0.2 * ((newAge - 10) / 10))); // 1.2 -> 1.0
        } else {
            setScale(1.0);
        }

        // Fade out in last 30 frames (assuming ~60 frames per sec, 1s life)
        // Life is managed by store timeout (1000ms), which is approx 60 ticks.
        if (newAge > 30) {
            const fade = 1 - ((newAge - 30) / 30);
            setAlpha(Math.max(0, fade));
        }
    });

    return (
        <Text
            text={data.value}
            x={data.x}
            y={data.y + yOffset}
            anchor={0.5}
            scale={scale}
            alpha={alpha}
            style={new PIXI.TextStyle({
                fontFamily: 'Arial', // or config font
                fontSize: 24,
                fontWeight: 'bold',
                fill: [data.color, '#eeeeee'], // Gradient for sheen
                stroke: '#000000',
                strokeThickness: 4,
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 2,
                dropShadowAngle: Math.PI / 6,
                dropShadowDistance: 2,
            })}
        />
    );
};
