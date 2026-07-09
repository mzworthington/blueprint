import { ReactFlowProvider } from '@xyflow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CodeViewer } from './adapters/CodeViewer';
import { Canvas } from './adapters/Canvas';
import { PropertyPanel } from './adapters/PropertyPanel';
import { useBlueprintStore } from './adapters/store';

function App() {
  const { leftCollapsed, rightCollapsed, toggleLeftCollapsed, toggleRightCollapsed } =
    useBlueprintStore();

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 selection:bg-brand-600/30 relative">
        <CodeViewer />
        <Canvas />
        <PropertyPanel />

        <button
          onClick={toggleLeftCollapsed}
          className="absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-r-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer flex items-center justify-center border-l-0"
          style={{ left: leftCollapsed ? '0px' : '384px' }}
          aria-label="Toggle Left Panel"
          title={leftCollapsed ? 'Expand Schema Explorer' : 'Collapse Schema Explorer'}
        >
          {leftCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={toggleRightCollapsed}
          className="absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-l-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer flex items-center justify-center border-r-0"
          style={{ right: rightCollapsed ? '0px' : '320px' }}
          aria-label="Toggle Right Panel"
          title={rightCollapsed ? 'Expand Properties Panel' : 'Collapse Properties Panel'}
        >
          {rightCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </ReactFlowProvider>
  );
}

export default App;
