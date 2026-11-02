import type { Metadata } from "next";
import { loadContent } from "@/lib/content";
import { Playground } from "@/components/playground";

export const metadata: Metadata = { title: "Thử Mermaid" };
export default function PlaygroundPage() {
  const library = loadContent();
  return <div className="flex h-[calc(100dvh-56px)] min-h-[620px] flex-col gap-5 p-4 sm:p-6">
    <h1 className="text-xl font-semibold tracking-tight">Thử Mermaid</h1>
    <Playground initialSource={library.diagrams[library.overviewDiagramId].source} />
  </div>;
}
