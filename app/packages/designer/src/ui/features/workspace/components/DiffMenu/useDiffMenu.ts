import { useCallback, useEffect, useState } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  computeSchemaDiff,
  revertWorkingSchema,
  type SchemaDiff,
} from '../../../../../infrastructure/db/db';

export function useDiffMenu(isOpen: boolean, onClose: () => void) {
  const { currentFilePath, initSchema, loadedSystems, logger, saveActiveDiagram, setNotification } =
    useBlueprintStore();
  const [diff, setDiff] = useState<SchemaDiff | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await computeSchemaDiff(currentFilePath);
      setDiff(result);
    } catch (err) {
      logger.error('Failed to compute schema diff', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilePath, logger]);

  useEffect(() => {
    if (isOpen) {
      fetchDiff();
    }
  }, [isOpen, fetchDiff]);

  const handleRevert = async () => {
    if (!confirm('Are you sure you want to revert all unsaved draft changes for this diagram?')) {
      return;
    }

    try {
      const system = loadedSystems.find(s => s.path === currentFilePath);
      const originalSchema = await revertWorkingSchema(
        currentFilePath,
        system?.schema.name,
        system?.schema.version,
        system?.schema.level,
        system?.schema.entityRef
      );

      initSchema(originalSchema);
      logger.info('Reverted active diagram changes to baseline version');
      onClose();
    } catch (err) {
      logger.error('Failed to revert active diagram draft changes', err);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      const success = await saveActiveDiagram();
      if (success) {
        setNotification({
          type: 'success',
          title: 'Changes Committed',
          message: `Successfully committed pending draft changes to ${currentFilePath.split('/').pop()}`,
        });
        await fetchDiff();
      }
    } catch (err) {
      logger.error('Failed to commit active diagram changes', err);
      setNotification({
        type: 'error',
        title: 'Commit Failed',
        message: (err as Error).message || 'Failed to commit draft changes.',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    !!diff &&
    (diff.nodes.added.length > 0 ||
      diff.nodes.modified.length > 0 ||
      diff.nodes.deleted.length > 0 ||
      diff.dependencies.added.length > 0 ||
      diff.dependencies.deleted.length > 0);

  return { diff, loading, hasChanges, handleRevert, handleCommit };
}
