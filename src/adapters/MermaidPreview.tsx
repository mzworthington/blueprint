import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mermaid from 'mermaid';
import { AlertCircle, Loader, X, Maximize2, Plus, Minus, RefreshCw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
});

interface MermaidPreviewProps {
  code: string;
}

export const MermaidPreview: React.FC<MermaidPreviewProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rendering, setRendering] = useState<boolean>(false);

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isExpanded) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isExpanded]);

  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container || !isExpanded) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.08;
      const delta = e.deltaY < 0 ? 1 : -1;
      setScale(current => Math.min(Math.max(current + delta * zoomFactor, 0.4), 4.0));
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, [isExpanded]);

  useEffect(() => {
    let active = true;

    const renderDiagram = async () => {
      if (!code) return;
      setRendering(true);
      setError('');

      try {
        const id = `mermaid-render-${Math.random().toString(36).substring(2, 11)}`;

        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (active) {
          setSvg(renderedSvg);
          setRendering(false);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (active) {
          setError('Could not render preview diagram. Please verify configuration.');
          setRendering(false);
        }
      }
    };

    renderDiagram();

    return () => {
      active = false;
    };
  }, [code]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-red-950/10 border border-red-900/20 rounded-xl text-slate-400 text-center text-xs space-y-2">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <span className="font-semibold text-red-200">Visualization Error</span>
        <p className="max-w-[240px] text-[11px] text-slate-400 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (rendering && !svg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900/10 border border-slate-900/40 rounded-xl text-slate-400 text-xs space-y-2">
        <Loader className="w-6 h-6 text-brand-500 animate-spin" />
        <span>Generating flowchart...</span>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => setIsExpanded(true)}
        className="flex-1 bg-slate-900/20 border border-slate-900/50 rounded-xl p-4 overflow-auto flex items-start justify-center relative group min-h-[300px] cursor-zoom-in hover:border-slate-800 transition"
      >
        <div
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full h-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto text-slate-100 flex items-center justify-center select-none"
        />

        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl">
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Click to Expand</span>
          </div>
        </div>
      </div>

      {isExpanded &&
        createPortal(
          <div
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-8 cursor-zoom-out animate-in fade-in duration-200"
          >
            {/* Close button in top right */}
            <button
              onClick={e => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition z-50 shadow-lg cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              ref={zoomContainerRef}
              onClick={e => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className={`w-11/12 h-5/6 max-w-[90vw] max-h-[85vh] bg-slate-900/95 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex relative text-slate-100 select-none animate-in zoom-in-95 duration-200 ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
                className="m-auto py-6 px-4 flex items-center justify-center w-full h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:h-auto [&>svg]:w-auto [&>svg]:mx-auto"
              />
            </div>

            <div
              onClick={e => e.stopPropagation()}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 z-50 text-slate-200 text-xs font-semibold select-none"
            >
              <button
                onClick={() => setScale(s => Math.max(s - 0.2, 0.4))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="min-w-[45px] text-center font-mono text-[11px]">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(s + 0.2, 4.0))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-800" />
              <button
                onClick={() => {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Reset View"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
