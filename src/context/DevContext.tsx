import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface DevContextType {
  developerMode: boolean;
  setDeveloperMode: (mode: boolean) => void;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export const DevProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [developerMode, setDeveloperMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('slm_developer_mode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('slm_developer_mode', JSON.stringify(developerMode));
    } catch (e) {
      console.error('Failed to write developerMode to localStorage', e);
    }
  }, [developerMode]);

  return (
    <DevContext.Provider value={{ developerMode, setDeveloperMode }}>
      {children}
    </DevContext.Provider>
  );
};

export const useDev = (): DevContextType => {
  const context = useContext(DevContext);
  if (!context) {
    throw new Error('useDev must be used within a DevProvider');
  }
  return context;
};
