import { PixiComponent } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface SafeSpriteProps {
    texture?: PIXI.Texture;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    tint?: number;
    anchor?: number | [number, number];
    eventMode?: PIXI.EventMode;
    onclick?: (e: PIXI.FederatedPointerEvent) => void;
    onpointerenter?: (e: PIXI.FederatedPointerEvent) => void;
    onpointerleave?: (e: PIXI.FederatedPointerEvent) => void;
    [key: string]: any;
}

// Custom PixiComponent to bypass @pixi/react's strict prop validation
// enabling us to handle "Dual Package" hazards or invalid textures gracefully.
export const SafeSprite = PixiComponent<SafeSpriteProps, PIXI.Sprite>('SafeSprite', {
    create: () => new PIXI.Sprite(PIXI.Texture.WHITE),
    
    applyProps: (instance, oldProps, newProps) => {
        const { texture, ...rest } = newProps;
        let validTexture = texture;

        // 1. Validate Texture
        const isActuallyTexture = validTexture instanceof PIXI.Texture || (validTexture && (validTexture as any).baseTexture);
        
        if (!validTexture || !isActuallyTexture) {
             // Fallback to Red Square
             instance.texture = PIXI.Texture.WHITE;
             // Don't tint red if it's potentially just loading or white placeholder
             // instance.tint = 0xFF0000; 
             instance.tint = 0xFFFFFF; 
        } else {
             instance.texture = validTexture;
             // Apply tint from props, or default to white (no tint)
             instance.tint = rest.tint ?? 0xFFFFFF;
        }

        // 2. Manual Prop Application (Avoiding applyDefaultProps to prevent instance type checks)
        if (rest.x !== undefined) instance.x = rest.x;
        if (rest.y !== undefined) instance.y = rest.y;
        if (rest.width !== undefined) instance.width = rest.width;
        if (rest.height !== undefined) instance.height = rest.height;
        if (rest.anchor !== undefined) {
             if (typeof rest.anchor === 'number') {
                 instance.anchor.set(rest.anchor);
             } else if (Array.isArray(rest.anchor)) {
                 instance.anchor.set(rest.anchor[0], rest.anchor[1]);
             }
        }
        
        // Events & Interaction
        if (rest.eventMode) instance.eventMode = rest.eventMode;
        if (rest.cursor) instance.cursor = rest.cursor;
        
        // Interaction Events
        // We manually map common ones to ensure they attach correctly
        // Supporting both React style (pointerdown) and Pixi style (onpointerdown)
        
        // 1. CLICK
        if (rest.click) instance.onclick = rest.click;
        else if (rest.onclick) instance.onclick = rest.onclick;

        // 2. POINTER DOWN (Use this for fastest response!)
        if (rest.pointerdown) instance.onpointerdown = rest.pointerdown;
        else if (rest.onpointerdown) instance.onpointerdown = rest.onpointerdown;

        // 3. POINTER UP
        if (rest.pointerup) instance.onpointerup = rest.pointerup;
        else if (rest.onpointerup) instance.onpointerup = rest.onpointerup;

        // 4. MOUSE / POINTER OVER & OUT
        if (rest.pointerenter) instance.onpointerenter = rest.pointerenter;
        else if (rest.onpointerenter) instance.onpointerenter = rest.onpointerenter;

        if (rest.pointerleave) instance.onpointerleave = rest.pointerleave;
        else if (rest.onpointerleave) instance.onpointerleave = rest.onpointerleave;

        if (rest.pointerover) instance.onpointerover = rest.pointerover;
        else if (rest.onpointerover) instance.onpointerover = rest.onpointerover;

        if (rest.pointerout) instance.onpointerout = rest.pointerout;
        else if (rest.onpointerout) instance.onpointerout = rest.onpointerout;
    },
});
