import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadContent } from "../lib/content";

function fixture(run: (root: string) => void) {
  const root = mkdtempSync(path.join(os.tmpdir(), "deeplearning-content-"));
  cpSync(path.join(process.cwd(), "content"), root, { recursive: true });
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
function mutate(file: string, run: (data: Record<string, unknown>) => void) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  run(data);
  writeFileSync(file, JSON.stringify(data));
}

test("load all posts in declared order and resolve diagrams", () => {
  const library = loadContent();
  assert.equal(library.posts.length, 4);
  assert.equal(Object.keys(library.diagrams).length, 5);
  for (const post of library.posts) assert.ok(library.diagrams[post.diagramId].source.startsWith("flowchart TD"));
  assert.deepEqual(Object.keys(library.diagrams[library.overviewDiagramId].nodeLinks), ["D", "J2", "J3", "J4"]);
});
test("duplicate slugs fail before build", () => fixture((root) => {
  cpSync(path.join(root, "posts/kiem-tra-anh.json"), path.join(root, "posts/duplicate.json"));
  assert.throws(() => loadContent(root), /Slug bài viết bị trùng/);
}));
test("missing diagram file fails before build", () => fixture((root) => {
  unlinkSync(path.join(root, "diagrams/kiem-tra-anh.mmd"));
  assert.throws(() => loadContent(root), /ENOENT/);
}));
test("broken related article fails before build", () => fixture((root) => {
  mutate(path.join(root, "posts/kiem-tra-anh.json"), (post) => { post.relatedSlugs = ["missing"]; });
  assert.throws(() => loadContent(root), /Liên kết không tồn tại/);
}));
test("missing node and node target are rejected", () => fixture((root) => {
  const file = path.join(root, "catalog.json");
  const original = readFileSync(file, "utf8");
  const data = JSON.parse(original);
  data.diagrams[0].nodeLinks = { DOES_NOT_EXIST: "kiem-tra-anh" };
  writeFileSync(file, JSON.stringify(data));
  assert.throws(() => loadContent(root), /Không tìm thấy node/);
  data.diagrams[0].nodeLinks = { D: "missing" };
  writeFileSync(file, JSON.stringify(data));
  assert.throws(() => loadContent(root), /bài không tồn tại/);
}));
test("diagram path traversal and duplicate order are rejected", () => fixture((root) => {
  const file = path.join(root, "catalog.json");
  const original = readFileSync(file, "utf8");
  const data = JSON.parse(original);
  data.diagrams[0].file = "../outside.mmd";
  writeFileSync(file, JSON.stringify(data));
  assert.throws(() => loadContent(root));
  writeFileSync(file, original);
  mutate(file, (catalog) => { catalog.postOrder = ["kiem-tra-anh", "kiem-tra-anh"]; });
  assert.throws(() => loadContent(root), /Thứ tự bài viết bị trùng/);
}));
