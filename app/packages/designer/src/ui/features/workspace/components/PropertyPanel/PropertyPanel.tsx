import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { NodeType, PropertyMap, C4Level } from '@blueprint/core';
import { slugify, getSchemaEntityRef } from '@blueprint/core';
import { NODE_TYPES } from './nodeTypes';
import { IdentitySection } from './IdentitySection';
import { PropertiesSection } from './PropertiesSection';
import { ConnectionsSection } from './ConnectionsSection';
import { ComponentCatalog } from './ComponentCatalog';
import { ValidationSection } from './ValidationSection';

export const PropertyPanel: React.FC = () => {
  const {
    schema,
    selectedNodeId,
    nodes,
    edges,
    validationResult,
    updateSchemaName,
    updateSchemaLevel,
    addNode,
    updateNode,
    deleteNode,
    selectNode,
    updateDependency,
    deleteDependency,
    showTests,
    toggleShowTests,
    rightCollapsed,
    toggleRightCollapsed,
    workspaceName,
  } = useBlueprintStore();

  const selectedRFNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNode = selectedRFNode
    ? schema.nodes.find(sn => sn.entityRef === selectedRFNode.data.entityRef)
    : null;

  const [propKey, setPropKey] = useState('');
  const [propVal, setPropVal] = useState('');

  const isNode = !!selectedNode;

  const titleType = isNode
    ? NODE_TYPES.find(nt => nt.type === selectedNode.type)?.label || 'Component'
    : schema.level === 'component' || schema.level === 'code'
      ? 'Diagram'
      : 'Workspace';

  const nameValue = isNode ? selectedNode.name : schema.name;
  const nameInputId = isNode ? 'component-name-input' : 'workspace-name-input';
  const entityRefValue = isNode
    ? selectedNode.entityRef || 'Not resolved'
    : getSchemaEntityRef(schema, workspaceName) || '';
  const entityRefInputId = isNode ? 'component-entityref-input' : 'workspace-slug-input';
  const selectId = isNode ? 'component-type-select' : 'workspace-level-select';

  const handleNameChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNode) {
      if (!selectedNodeId) return;
      const newName = e.target.value;
      const newId = slugify(newName).replace(/_/g, '-');

      if (newId && newId !== selectedNodeId) {
        const idExists = schema.nodes.some(
          n => n.entityRef === newId || (n.entityRef && n.entityRef.endsWith('/' + newId))
        );
        if (!idExists) {
          updateNode(selectedNodeId, { name: newName, entityRef: newId });
          return;
        }
      }
      updateNode(selectedNodeId, { name: newName });
    } else {
      updateSchemaName(e.target.value);
    }
  };

  const handleTypeOrLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isNode) {
      if (!selectedNodeId) return;
      updateNode(selectedNodeId, { type: e.target.value as NodeType });
    } else {
      updateSchemaLevel(e.target.value as C4Level);
    }
  };

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !selectedNode || !propKey.trim()) return;

    const nextProps: PropertyMap = {
      ...(selectedNode.properties || {}),
      [propKey.trim()]: propVal,
    };

    updateNode(selectedNodeId, { properties: nextProps });
    setPropKey('');
    setPropVal('');
  };

  const handleDeleteProperty = (key: string) => {
    if (!selectedNodeId || !selectedNode || !selectedNode.properties) return;
    const nextProps = { ...selectedNode.properties };
    delete nextProps[key];
    updateNode(selectedNodeId, { properties: nextProps });
  };

  const nodeConnections = edges.filter(
    e => e.source === selectedNodeId || e.target === selectedNodeId
  );

  return (
    <div
      data-testid="right-panel"
      className={`h-full flex flex-col bg-slate-950/80 glass-panel transition-all duration-300 ease-in-out ${
        rightCollapsed
          ? 'w-0 border-l-0 opacity-0 overflow-hidden pointer-events-none'
          : 'w-full sm:w-80 border-l border-slate-900'
      }`}
    >
      <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/40">
        <h3 className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs">
          Properties Panel - {titleType}
        </h3>
        <div className="flex items-center gap-2">
          {selectedNodeId && (
            <button
              onClick={() => selectNode(null)}
              className="text-xs font-mono text-slate-400 hover:text-brand-400 cursor-pointer transition focus:outline-none"
            >
              Clear Selection
            </button>
          )}
          <button
            onClick={toggleRightCollapsed}
            className="sm:hidden p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center justify-center w-6 h-6 text-xs"
            title="Close Panel"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-6">
          <IdentitySection
            isNode={isNode}
            schema={schema}
            selectedNode={selectedNode ?? null}
            nameValue={nameValue}
            nameInputId={nameInputId}
            entityRefValue={entityRefValue}
            entityRefInputId={entityRefInputId}
            selectId={selectId}
            onNameChange={handleNameChangeLocal}
            onTypeOrLevelChange={handleTypeOrLevelChange}
            onExternalChange={checked =>
              updateNode(selectedNode?.entityRef || '', { external: checked })
            }
          />

          {isNode && selectedNode ? (
            <>
              <PropertiesSection
                properties={selectedNode.properties}
                propKey={propKey}
                propVal={propVal}
                onPropKeyChange={setPropKey}
                onPropValChange={setPropVal}
                onAddProperty={handleAddProperty}
                onDeleteProperty={handleDeleteProperty}
              />

              <ConnectionsSection
                selectedNodeId={selectedNodeId!}
                schemaNodes={schema.nodes}
                connections={nodeConnections}
                onUpdateDependency={updateDependency}
                onDeleteDependency={deleteDependency}
              />

              <div className="border-t border-slate-900 pt-4">
                <button
                  onClick={() => {
                    if (
                      confirm(`Are you sure you want to delete this ${titleType.toLowerCase()}?`)
                    ) {
                      deleteNode(selectedNode.entityRef || '');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-red-950/15 border border-red-900/30 hover:border-red-900/60 hover:bg-red-950/30 text-red-400 rounded-lg py-2 text-xs font-semibold transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {titleType}
                </button>
              </div>
            </>
          ) : (
            <>
              <ComponentCatalog
                showTests={showTests}
                onToggleShowTests={toggleShowTests}
                onAddNode={addNode}
              />
              <ValidationSection validationResult={validationResult} />
            </>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-900 text-center">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Blueprint Engine v0.1.0
        </span>
      </div>
    </div>
  );
};
