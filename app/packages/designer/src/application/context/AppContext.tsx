/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect } from 'react';
import {
  BrowserFileSystemAdapter,
  BrowserWorkspaceAdapter,
} from '../../infrastructure/fileSystem/fileSync';
import { createBrowserLayoutRegistry } from '../../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../../infrastructure/layout/reactFlowGraphChangeAdapter';
import { ConsoleLoggerAdapter } from '../../infrastructure/logging/logger';
import { BrowserNetworkStatusAdapter } from '../../infrastructure/network/browserNetworkStatus';
import { dexieWorkingCopyAdapter } from '../../infrastructure/db/dexieWorkingCopyAdapter';
import type { NetworkStatusPort } from '../../core';
import { useBlueprintStore } from '../store/store';
import {
  seedDefaultSchemasSafely,
  isDefaultIdbSeedCancelled,
} from '../store/states/diagramState/defaultIdbSeed';
import { hydrateSandboxDrafts } from '../store/states/diagramState/hydrateSandboxDrafts';
import { resolveWorkspaceEntityRefs } from '@blueprint/core';
import {
  activateBundledSandbox,
  resolveBundledSandboxSystems,
} from '../store/states/diagramState/loadBundledSandbox';
import { startBundledBlueprintPrefetch } from '../store/states/diagramState/bundledBlueprintLoader';

interface AppContextProps {
  fileSystemPort: typeof BrowserFileSystemAdapter;
  workspacePort: typeof BrowserWorkspaceAdapter;
  logger: typeof ConsoleLoggerAdapter;
  networkStatus: NetworkStatusPort;
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
      workingCopyPort: dexieWorkingCopyAdapter,
      graphChangePort: reactFlowGraphChangeAdapter,
    });

    const bootSandbox = (systems: ReturnType<typeof resolveBundledSandboxSystems>) => {
      activateBundledSandbox(
        partial => useBlueprintStore.setState(partial),
        () => useBlueprintStore.getState(),
        systems
      );
    };

    // Seed demo blueprints only when a path is empty — never overwrite real drafts.
    const systems = resolveBundledSandboxSystems();
    const workingCopy = dexieWorkingCopyAdapter;
    void (async () => {
      await seedDefaultSchemasSafely(systems, resolveWorkspaceEntityRefs(systems), {
        pathHasStoredData: path => workingCopy.pathHasStoredData(path),
        saveBaselineSchema: (filePath, schema, systemId, nodeRefMap) =>
          workingCopy.saveBaselineSchema({ filePath, schema, systemId, nodeRefMap }),
        saveWorkingSchema: (filePath, schema, systemId, nodeRefMap) =>
          workingCopy.saveWorkingSchema({ filePath, schema, systemId, nodeRefMap }),
      }).catch(() => {});

      // Workspace open cancels default seed — never clobber a real folder with sandbox drafts.
      if (isDefaultIdbSeedCancelled() || useBlueprintStore.getState().isWorkspaceOpen) return;

      const { systems: hydrated } = await hydrateSandboxDrafts(systems, workingCopy);
      bootSandbox(hydrated);
      startBundledBlueprintPrefetch({
        get: () => useBlueprintStore.getState(),
        set: partial => useBlueprintStore.setState(partial),
      });
    })();
  }, []);

  return (
    <AppContext.Provider
      value={{
        fileSystemPort: BrowserFileSystemAdapter,
        workspacePort: BrowserWorkspaceAdapter,
        logger: ConsoleLoggerAdapter,
        networkStatus: BrowserNetworkStatusAdapter,
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
