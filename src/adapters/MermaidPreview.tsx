import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, Loader } from 'lucide-react';

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
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rendering, setRendering] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    const renderDiagram = async () => {
      if (!code) return;
      setRendering(true);
      setError('');

      try {
        const id = `mermaid-render-${Math.random().toString(36).substring(2, 11)}`;
        // mermaid.render is asynchronous in modern versions
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
    <div className="flex-1 bg-slate-900/20 border border-slate-900/50 rounded-xl p-4 overflow-auto flex items-start justify-center relative group min-h-[300px]">
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }}
        className="w-full h-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto text-slate-100 flex items-center justify-center select-none"
      />
    </div>
  );
};
