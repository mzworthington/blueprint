import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CodeViewer } from './CodeViewer';
import { useBlueprintStore } from './store';

describe('CodeViewer UI Component', () => {
  beforeEach(() => {
    // Reset store before each test
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Project',
      version: '1.0.0',
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

    // Click JSON tab
    fireEvent.click(screen.getByRole('button', { name: /json/i }));

    const codeBlock = screen.getByText(content => content.includes('"name": "Test Project"'));
    expect(codeBlock).toBeInTheDocument();
  });

  it('should support YAML import workflow', () => {
    render(<CodeViewer />);

    // Switch to import tab
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    // Check if instructions exist
    expect(screen.getByText(/Paste your Blueprint YAML schema/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/name: My System/i);
    expect(textarea).toBeInTheDocument();

    // Type a new valid YAML schema
    const newYaml = `
name: Imported System
version: 2.1.0
nodes:
  - id: custom-service
    type: grpc-service
    name: Custom Service
`;
    fireEvent.change(textarea, { target: { value: newYaml } });

    // Click Apply
    fireEvent.click(screen.getByRole('button', { name: /Apply Schema/i }));

    // Should switch back to YAML tab and display new state
    expect(screen.getByRole('button', { name: /yaml/i })).toHaveClass('text-brand-100');
    expect(useBlueprintStore.getState().schema.name).toBe('Imported System');
    expect(useBlueprintStore.getState().schema.nodes[0].id).toBe('custom-service');
  });

  it('should show error when importing invalid YAML configuration', () => {
    render(<CodeViewer />);

    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    const textarea = screen.getByPlaceholderText(/name: My System/i);

    // Enter invalid YAML
    fireEvent.change(textarea, { target: { value: 'invalid: : yaml : syntax' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Schema/i }));

    // Verification warning message is displayed
    expect(screen.getByText(/Invalid schema YAML/i)).toBeInTheDocument();
  });
});
