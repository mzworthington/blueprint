import { clearAllStoredSchemas } from '../../infrastructure/db/db';
import { resetBundledBlueprintLoaderState } from './states/diagramState/bundledBlueprintLoader';
import { clearSessionLayout } from './sessionLayoutCache';

/** Drop in-memory layout cache, bundled loader state, and IndexedDB working copies. */
export async function clearSandboxCaches(): Promise<void> {
  clearSessionLayout();
  resetBundledBlueprintLoaderState();
  await clearAllStoredSchemas();
}
