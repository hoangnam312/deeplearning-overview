import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadContent } from "../lib/content";

test("all five diagrams match the original HTML except legacy click callbacks", { skip: !process.env.SOURCE_HTML }, () => {
  const html = readFileSync(process.env.SOURCE_HTML!, "utf8");
  const library = loadContent();
  const main = html.match(/<div class="mermaid" id="mainDiagram">([\s\S]*?)<\/div>/)![1]
    .replace(/^\s*click .*?$/gm, "").trim();
  assert.equal(library.diagrams[library.overviewDiagramId].source, main);
  const originalVariables: Record<string, string> = {
    "kiem-tra-anh": "topicDiagram",
    "chon-so-layer": "layerDiagram",
    "chon-neuron-filter": "neuronDiagram",
    "chon-ham-kich-hoat": "activationDiagram",
  };
  for (const [id, variable] of Object.entries(originalVariables)) {
    const source = html.match(new RegExp("const " + variable + " = `([\\s\\S]*?)`;"))![1].trim();
    assert.equal(library.diagrams[id].source, source, id);
  }
});
