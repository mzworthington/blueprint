/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect } from 'react';
import {
  BrowserFileSystemAdapter,
  BrowserWorkspaceAdapter,
} from '../../infrastructure/fileSystem/fileSync';
import { createBrowserLayoutRegistry } from '../../infrastructure/layout/createBrowserLayoutRegistry';
import { ConsoleLoggerAdapter } from '../../infrastructure/logging/logger';
import { useBlueprintStore } from '../store/store';

interface AppContextProps {
  fileSystemPort: typeof BrowserFileSystemAdapter;
  workspacePort: typeof BrowserWorkspaceAdapter;
  logger: typeof ConsoleLoggerAdapter;
}

const AppContext = createContext<AppContextProps | null>(null);

const browserLayoutRegistry = createBrowserLayoutRegistry();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Wire up the infrastructure adapters to the Zustand store at launch
  useEffect(() => {
    useBlueprintStore.getState().setPorts({
      fileSystemPort: BrowserFileSystemAdapter,
      workspacePort: BrowserWorkspaceAdapter,
      logger: ConsoleLoggerAdapter,
      layoutRegistry: browserLayoutRegistry,
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        fileSystemPort: BrowserFileSystemAdapter,
        workspacePort: BrowserWorkspaceAdapter,
        logger: ConsoleLoggerAdapter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
