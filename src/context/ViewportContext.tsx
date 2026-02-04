import React, { createContext, useContext, useState, useEffect } from 'react';
import { Viewport } from 'pixi-viewport';

// 1. Create the Context
interface ViewportContextType {
    viewport: Viewport | null;
    setViewport: (viewport: Viewport | null) => void;
}

const ViewportContext = createContext<ViewportContextType>({
    viewport: null,
    setViewport: () => {}
});

// 2. Create the Provider
export const ViewportProvider = ({ children }: { children: React.ReactNode }) => {
    const [viewport, setViewport] = useState<Viewport | null>(null);

    return (
        <ViewportContext.Provider value={{ viewport, setViewport }}>
            {children}
        </ViewportContext.Provider>
    );
};

// 3. Create the Hook
export const useViewportContext = () => useContext(ViewportContext);
