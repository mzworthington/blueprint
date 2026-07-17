import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeViewer } from './CodeViewer';
import { useBlueprintStore } from '../../../../../application/store/store';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>Mocked Mermaid SVG</svg>' }),
  },
}));

describe('CodeViewer UI Component', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      selectedNodeId: null,
      currentFilePath: 'blueprint.yaml',
      workspaceName: undefined,
      loadedSystems: [],
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Project',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'web-api', type: 'rest-api', name: 'Web API' }],
      dependencies: [],
    });
  });

  it('should render the Schema Explorer header and tabs', () => {
    render(<CodeViewer />);

    expect(screen.getByText(/Schema Explorer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^yaml$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^json$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mermaid\.js/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
  });

  it('should render the initial schema in the YAML code block', () => {
    render(<CodeViewer />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('name: Test Project');
    expect(textarea.value).toContain('entityRef: test-project/web-api');
    expect(textarea.value).toContain('type: rest-api');
  });

  it('should switch tabs and show JSON schema representation', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /^json$/i }));

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('"name": "Test Project"');
  });

  it('should support YAML direct edit and apply workflow', () => {
    render(<CodeViewer />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('name: Test Project');

    const newYaml = `
name: Edited YAML System
version: 2.1.0
level: container
nodes:
  - entityRef: custom-service
    type: grpc-service
    name: Custom Service
`;
    fireEvent.change(textarea, { target: { value: newYaml } });

    fireEvent.click(screen.getByRole('button', { name: /Apply YAML Changes/i }));

    expect(useBlueprintStore.getState().schema.name).toBe('Edited YAML System');
    expect(useBlueprintStore.getState().schema.nodes[0].entityRef).toBe(
      'edited-yaml-system/custom-service'
    );
  });

  it('should support JSON direct edit and apply workflow', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /json/i }));

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('"name": "Test Project"');

    const newJson = `{
  "name": "Edited JSON System",
  "version": "3.0.0",
  "level": "container",
  "nodes": [
    {
      "entityRef": "new-node",
      "type": "serverless-function",
      "name": "New Function"
    }
  ],
  "dependencies": []
}`;
    fireEvent.change(textarea, { target: { value: newJson } });

    fireEvent.click(screen.getByRole('button', { name: /Apply JSON Changes/i }));

    expect(useBlueprintStore.getState().schema.name).toBe('Edited JSON System');
    expect(useBlueprintStore.getState().schema.nodes[0].entityRef).toBe(
      'edited-json-system/new-node'
    );
  });

  it('should show error when applying invalid YAML configuration', () => {
    render(<CodeViewer />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'invalid: : yaml : syntax' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply YAML Changes/i }));

    expect(screen.getByText(/Invalid schema YAML/i)).toBeInTheDocument();
  });

  it('should show error when applying invalid JSON configuration', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /^json$/i }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: '{invalid json}' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply JSON Changes/i }));

    expect(screen.getByText(/Invalid schema JSON/i)).toBeInTheDocument();
  });

  it('should support Mermaid preview toggle and render mock visual preview', async () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /mermaid\.js/i }));

    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^import$/i })).toBeInTheDocument();

    const mockedSvg = await screen.findByText('Mocked Mermaid SVG');
    expect(mockedSvg).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /code/i }));

    expect(screen.getByText(content => content.includes('graph TD'))).toBeInTheDocument();
  });

  it('should open mermaid import dialog from the mermaid tab', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /mermaid\.js/i }));
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(useBlueprintStore.getState().isImportMermaidOpen).toBe(true);
  });

  it('should filter test components from YAML, JSON, and Mermaid views based on showTests state', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Filtered Project',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'app', type: 'rest-api', name: 'App Node', isTest: false },
        { entityRef: 'app-test', type: 'rest-api', name: 'App Test Node', isTest: true },
      ],
      dependencies: [{ from: 'app-test', to: 'app', type: 'direct-call', description: 'Test app' }],
    });

    useBlueprintStore.setState({ showTests: false });

    const { rerender } = render(<CodeViewer />);

    let textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('entityRef: filtered-project/app');
    expect(textarea.value).not.toContain('entityRef: filtered-project/app-test');

    fireEvent.click(screen.getByRole('button', { name: /^json$/i }));
    textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('"entityRef": "filtered-project/app"');
    expect(textarea.value).not.toContain('"entityRef": "filtered-project/app-test"');

    useBlueprintStore.setState({ showTests: true });
    rerender(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /^json$/i }));
    textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('"entityRef": "filtered-project/app"');
    expect(textarea.value).toContain('"entityRef": "filtered-project/app-test"');
  });
});
