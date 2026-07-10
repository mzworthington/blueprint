import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeViewer } from './CodeViewer';
import { useBlueprintStore } from './store';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>Mocked Mermaid SVG</svg>' }),
  },
}));

describe('CodeViewer UI Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Project',
      version: '1.0.0',
      level: 'container',
      nodes: [{ id: 'web-api', type: 'rest-api', name: 'Web API' }],
      dependencies: [],
    });
  });

  it('should render the Schema Explorer header and tabs', () => {
    render(<CodeViewer />);

    expect(screen.getByText('Schema Explorer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yaml/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mermaid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
  });

  it('should render the initial schema in the YAML code block', () => {
    render(<CodeViewer />);

    const codeBlock = screen.getByText(content => content.includes('name: Test Project'));
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock).toHaveTextContent('id: web-api');
    expect(codeBlock).toHaveTextContent('type: rest-api');
  });

  it('should switch tabs and show JSON schema representation', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /json/i }));

    const codeBlock = screen.getByText(content => content.includes('"name": "Test Project"'));
    expect(codeBlock).toBeInTheDocument();
  });

  it('should support YAML import workflow', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    expect(screen.getByText(/Paste your Blueprint YAML schema/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/name: My System/i);
    expect(textarea).toBeInTheDocument();

    const newYaml = `
name: Imported System
version: 2.1.0
level: container
nodes:
  - id: custom-service
    type: grpc-service
    name: Custom Service
`;
    fireEvent.change(textarea, { target: { value: newYaml } });

    fireEvent.click(screen.getByRole('button', { name: /Apply Schema/i }));

    expect(screen.getByRole('button', { name: /yaml/i })).toHaveClass('text-brand-100');
    expect(useBlueprintStore.getState().schema.name).toBe('Imported System');
    expect(useBlueprintStore.getState().schema.nodes[0].id).toBe('custom-service');
  });

  it('should show error when importing invalid YAML configuration', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    const textarea = screen.getByPlaceholderText(/name: My System/i);

    fireEvent.change(textarea, { target: { value: 'invalid: : yaml : syntax' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Schema/i }));

    expect(screen.getByText(/Invalid schema YAML/i)).toBeInTheDocument();
  });

  it('should support Mermaid preview toggle and render mock visual preview', async () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /mermaid/i }));

    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();

    const mockedSvg = await screen.findByText('Mocked Mermaid SVG');
    expect(mockedSvg).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /code/i }));

    expect(screen.getByText(content => content.includes('graph TD'))).toBeInTheDocument();
  });

  it('should filter test components from YAML, JSON, and Mermaid views based on showTests state', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Filtered Project',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { id: 'app', type: 'rest-api', name: 'App Node', isTest: false },
        { id: 'app-test', type: 'rest-api', name: 'App Test Node', isTest: true },
      ],
      dependencies: [{ from: 'app-test', to: 'app', type: 'direct-call', description: 'Test app' }],
    });

    useBlueprintStore.setState({ showTests: false });

    const { rerender } = render(<CodeViewer />);

    let yamlBlock = screen.getByText(content => content.includes('name: Filtered Project'));
    expect(yamlBlock).toHaveTextContent('id: app');
    expect(yamlBlock).not.toHaveTextContent('id: app-test');

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    let jsonBlock = screen.getByText(content => content.includes('"name": "Filtered Project"'));
    expect(jsonBlock).toHaveTextContent('"id": "app"');
    expect(jsonBlock).not.toHaveTextContent('"id": "app-test"');

    useBlueprintStore.setState({ showTests: true });
    rerender(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /json/i }));
    jsonBlock = screen.getByText(content => content.includes('"name": "Filtered Project"'));
    expect(jsonBlock).toHaveTextContent('"id": "app"');
    expect(jsonBlock).toHaveTextContent('"id": "app-test"');
  });
});
