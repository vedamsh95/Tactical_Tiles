import { useEffect } from 'react';
import { useArcadeStore } from '../stores/useArcadeStore';

export const useArcadeInput = (viewport?: any) => {
    const setKey = useArcadeStore(state => state.setKey);
    const setMouse = useArcadeStore(state => state.setMouse);
    const setMouseDown = useArcadeStore(state => state.setMouseDown);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) {
                setKey(key as 'w' | 'a' | 's' | 'd', true);
            }
            // Spacebar allows firing too (mapped to mouse click effectively)
            if (e.code === 'Space') {
                 // Map Space to mouse down
                 setMouseDown(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) {
                setKey(key as 'w' | 'a' | 's' | 'd', false);
            }
            if (e.code === 'Space') {
                 setMouseDown(false);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (viewport) {
                const worldPoint = viewport.toWorld(e.clientX, e.clientY);
                setMouse(worldPoint.x, worldPoint.y);
            } else {
                setMouse(e.clientX, e.clientY);
            }
        };

        const handleMouseDown = () => {
             setMouseDown(true);
        };

        const handleMouseUp = () => {
             setMouseDown(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [viewport, setKey, setMouse, setMouseDown]); 
};
