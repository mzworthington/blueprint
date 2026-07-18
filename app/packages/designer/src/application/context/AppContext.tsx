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
import { defaultLoadedSystems, defaultInitialSchema } from '../store/defaultData';
import { resolveWorkspaceEntityRefs } from '@blueprint/core';

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

    // Seed demo blueprints only when a path is empty — never overwrite real drafts.
    const resolvedInitial = resolveWorkspaceEntityRefs(
      defaultLoadedSystems.length > 0
        ? defaultLoadedSystems
        : [{ path: 'blueprint.yaml', schema: defaultInitialSchema }]
    );
    const systems = defaultLoadedSystems.map(sys => ({
      ...sys,
      schema: resolvedInitial.schemas[sys.path] || sys.schema,
    }));
    const workingCopy = dexieWorkingCopyAdapter;
    void (async () => {
      await seedDefaultSchemasSafely(systems, resolvedInitial, {
        pathHasStoredData: path => workingCopy.pathHasStoredData(path),
        saveBaselineSchema: (filePath, schema, systemId, nodeRefMap) =>
          workingCopy.saveBaselineSchema({ filePath, schema, systemId, nodeRefMap }),
        saveWorkingSchema: (filePath, schema, systemId, nodeRefMap) =>
          workingCopy.saveWorkingSchema({ filePath, schema, systemId, nodeRefMap }),
      }).catch(() => {});

      // Workspace open cancels default seed — never clobber a real folder with sandbox drafts.
      if (isDefaultIdbSeedCancelled() || useBlueprintStore.getState().isWorkspaceOpen) return;

      const { systems: hydrated, restoredCount } = await hydrateSandboxDrafts(systems, workingCopy);
      if (restoredCount === 0) return;
      if (isDefaultIdbSeedCancelled() || useBlueprintStore.getState().isWorkspaceOpen) return;

      const first =
        hydrated.find(s => s.schema.level === 'context') ||
        hydrated.find(s => s.schema.level === 'container') ||
        hydrated[0];
      if (!first) return;

      useBlueprintStore.setState({
        loadedSystems: hydrated,
        currentFilePath: first.path,
      });
      useBlueprintStore.getState().initSchema(first.schema);
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
