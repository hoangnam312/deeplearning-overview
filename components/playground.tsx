"use client";

import { useEffect, useState } from "react";
import { MermaidViewer } from "./mermaid-viewer";

export function Playground({ initialSource }: { initialSource: string }) {
  const [code, setCode] = useState(initialSource);
  const [source, setSource] = useState(initialSource);
  useEffect(() => {
    const timer = setTimeout(() => setSource(code), 400);
    return () => clearTimeout(timer);
  }, [code]);
  return <div className="grid min-h-0 flex-1 grid-rows-[minmax(180px,0.7fr)_minmax(280px,1fr)] gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:grid-rows-1">
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <label htmlFor="mermaid-source" className="border-b border-slate-100 px-4 py-3 text-xs font-medium text-slate-500">Mermaid</label>
      <textarea id="mermaid-source" spellCheck={false} aria-label="Code Mermaid" value={code} onChange={(event) => setCode(event.target.value)} className="min-h-0 flex-1 resize-none p-4 font-mono text-xs leading-6 text-slate-700 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" />
    </div>
    <MermaidViewer source={source} label="Kết quả Mermaid" />
  </div>;
}
