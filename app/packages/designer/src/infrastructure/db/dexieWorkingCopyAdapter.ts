import type { SystemSchema } from '@blueprint/core';
import type {
  WorkingCopyPort,
  SaveWorkingCopyArgs,
  LoadWorkingCopyArgs,
  SchemaDiff,
} from '../../core';
import {
  saveBaselineSchema as dexieSaveBaseline,
  saveWorkingSchema as dexieSaveWorking,
  computeSchemaDiff as dexieComputeDiff,
  revertWorkingSchema as dexieRevert,
  pathHasStoredData as dexiePathHasStoredData,
  loadWorkingSchema as dexieLoadWorking,
} from './db';

/**
 * Dexie-backed working-copy adapter. Application code depends on WorkingCopyPort only.
 */
export const dexieWorkingCopyAdapter: WorkingCopyPort = {
  saveBaselineSchema: async ({ filePath, schema, systemId, nodeRefMap }: SaveWorkingCopyArgs) => {
    await dexieSaveBaseline(filePath, schema, systemId, nodeRefMap);
  },
  saveWorkingSchema: async ({ filePath, schema, systemId, nodeRefMap }: SaveWorkingCopyArgs) => {
    await dexieSaveWorking(filePath, schema, systemId, nodeRefMap);
  },
  computeSchemaDiff: (filePath: string): Promise<SchemaDiff> => dexieComputeDiff(filePath),
  revertWorkingSchema: async ({
    filePath,
    systemName,
    systemVersion,
    systemLevel,
    systemEntityRef,
  }: LoadWorkingCopyArgs): Promise<SystemSchema> =>
    dexieRevert(filePath, systemName, systemVersion, systemLevel, systemEntityRef),
  pathHasStoredData: (filePath: string) => dexiePathHasStoredData(filePath),
  loadWorkingSchema: async ({
    filePath,
    systemName,
    systemVersion,
    systemLevel,
    systemEntityRef,
  }: LoadWorkingCopyArgs) =>
    dexieLoadWorking(filePath, systemName, systemVersion, systemLevel, systemEntityRef),
};
