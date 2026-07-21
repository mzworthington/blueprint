import { validateGraph, serializeSchemaToYaml, type SystemSchema } from '@blueprint/core';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { CONTEXT_BLUEPRINT_PATH } from '../../defaultData';

export interface DiagramInitialState {
  schema: SystemSchema;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  validationResult: ReturnType<typeof validateGraph>;
  yamlCode: string;
  currentFilePath: string;
  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
  nodeRefMap: Record<string, Record<string, string>>;
}

const emptySchema: SystemSchema = {
  name: 'Loading',
  version: '1.0.0',
  level: 'context',
  nodes: [],
  dependencies: [],
};

/** Minimal store boot state — bundled sandbox activation replaces this at runtime. */
export function createDiagramInitialState(): DiagramInitialState {
  return {
    schema: emptySchema,
    nodes: [],
    edges: [],
    validationResult: validateGraph(emptySchema),
    yamlCode: serializeSchemaToYaml(emptySchema),
    currentFilePath: CONTEXT_BLUEPRINT_PATH,
    loadedSystems: [],
    nodeRefMap: {},
  };
}
