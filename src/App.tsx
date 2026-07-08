import { ReactFlowProvider } from '@xyflow/react';
import { CodeViewer } from './adapters/CodeViewer';
import { Canvas } from './adapters/Canvas';
import { PropertyPanel } from './adapters/PropertyPanel';

function App() {
  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 selection:bg-brand-600/30">
        {/* Left Side: Code Editor & Importer */}
        <CodeViewer />

        {/* Center: Interactive React Flow Canvas */}
        <Canvas />

        {/* Right Side: Attributes & Selection Config */}
        <PropertyPanel />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
