import { loadContent } from "@/lib/content";
import { MermaidViewer } from "@/components/mermaid-viewer";

export default function HomePage() {
  const library = loadContent();
  const diagram = library.diagrams[library.overviewDiagramId];
  return <div className="h-[calc(100dvh-56px)] min-h-80 p-3 sm:p-5"><MermaidViewer source={diagram.source} nodeLinks={diagram.nodeLinks} label="Sơ đồ tổng quan" /></div>;
}
