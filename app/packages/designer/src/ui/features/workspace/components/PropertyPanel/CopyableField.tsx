import React from 'react';

export const CopyableField: React.FC<{ label: string; value: string; id: string }> = ({
  label,
  value,
  id,
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        readOnly
        value={value}
        onClick={e => (e.target as HTMLInputElement).select()}
        className="w-full bg-[#040914]/40 border border-slate-800/80 focus:border-brand-500/50 focus:shadow-[0_0_8px_rgba(139,92,246,0.05)] rounded-lg px-3 py-2 text-xs font-mono text-brand-400 cursor-text transition duration-200 select-all focus:outline-none"
        title="Click to select all and copy"
      />
    </div>
  );
};
