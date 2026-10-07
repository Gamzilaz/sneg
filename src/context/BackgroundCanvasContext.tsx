import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface BackgroundCanvasContextType {
  registerBackgroundCanvas: (canvas: HTMLCanvasElement | null) => () => void;
  getBackgroundCanvas: () => HTMLCanvasElement | null;
}

const BackgroundCanvasContext = createContext<BackgroundCanvasContextType | undefined>(undefined);

export const BackgroundCanvasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const registerBackgroundCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      activeCanvasRef.current = canvas;
    }
    return () => {
      if (activeCanvasRef.current === canvas) {
        activeCanvasRef.current = null;
      }
    };
  }, []);

  const getBackgroundCanvas = useCallback(() => {
    if (activeCanvasRef.current && document.body.contains(activeCanvasRef.current)) {
      return activeCanvasRef.current;
    }
    // Fallback: query DOM for active background canvas
    const bgCanvas = document.querySelector<HTMLCanvasElement>(
      '[data-bg-container] canvas, [data-bg-canvas], .background-effects-container canvas'
    );
    return bgCanvas || null;
  }, []);

  return (
    <BackgroundCanvasContext.Provider value={{ registerBackgroundCanvas, getBackgroundCanvas }}>
      {children}
    </BackgroundCanvasContext.Provider>
  );
};

export const useBackgroundCanvas = () => {
  return useContext(BackgroundCanvasContext);
};
