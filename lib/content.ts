import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ContentLibrary } from "./types";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const postSchema = z.object({
  slug,
  title: z.string().trim().min(1),
  diagramId: slug,
  relatedSlugs: z.array(slug),
}).strict();
const catalogSchema = z.object({
  title: z.string().trim().min(1),
  overviewDiagramId: slug,
  postOrder: z.array(slug).min(1),
  diagrams: z.array(z.object({
    id: slug,
    file: z.string().regex(/^[a-z0-9-]+\.mmd$/),
    nodeLinks: z.record(z.string().min(1), slug).default({}),
  }).strict()).min(1),
}).strict();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function loadContent(root = path.join(process.cwd(), "content")): ContentLibrary {
  const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));
  const catalog = catalogSchema.parse(json(path.join(root, "catalog.json")));
  const posts = readdirSync(path.join(root, "posts"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => postSchema.parse(json(path.join(root, "posts", file))));
  const slugs = new Set(posts.map((post) => post.slug));
  assert(slugs.size === posts.length, "Slug bài viết bị trùng.");
  assert(new Set(catalog.postOrder).size === catalog.postOrder.length, "Thứ tự bài viết bị trùng.");
  assert(catalog.postOrder.length === posts.length && catalog.postOrder.every((s) => slugs.has(s)), "postOrder phải chứa đúng tất cả slug bài viết.");
  const ids = new Set(catalog.diagrams.map((diagram) => diagram.id));
  assert(ids.size === catalog.diagrams.length, "ID sơ đồ bị trùng.");
  assert(new Set(catalog.diagrams.map((d) => d.file)).size === catalog.diagrams.length, "File sơ đồ bị khai báo trùng.");
  assert(ids.has(catalog.overviewDiagramId), "Không tìm thấy sơ đồ tổng quan.");
  for (const post of posts) {
    assert(ids.has(post.diagramId), `Thiếu sơ đồ của bài ${post.slug}.`);
    assert(new Set(post.relatedSlugs).size === post.relatedSlugs.length, `Liên kết bị trùng trong ${post.slug}.`);
    for (const related of post.relatedSlugs) {
      assert(slugs.has(related), `Liên kết không tồn tại: ${post.slug} → ${related}.`);
    }
  }
  const diagrams: ContentLibrary["diagrams"] = {};
  for (const diagram of catalog.diagrams) {
    const source = readFileSync(path.join(root, "diagrams", diagram.file), "utf8").trim();
    assert(source, `Sơ đồ rỗng: ${diagram.file}.`);
    for (const [node, target] of Object.entries(diagram.nodeLinks)) {
      assert(slugs.has(target), `Node ${node} trỏ tới bài không tồn tại: ${target}.`);
      const escaped = node.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert(new RegExp(`(?:^|\\s)${escaped}\\s*(?:\\[|\\{|\\()`, "m").test(source), `Không tìm thấy node ${node} trong ${diagram.file}.`);
    }
    diagrams[diagram.id] = { id: diagram.id, source, nodeLinks: diagram.nodeLinks };
  }
  const actualFiles = readdirSync(path.join(root, "diagrams")).filter((file) => file.endsWith(".mmd"));
  assert(actualFiles.length === catalog.diagrams.length && actualFiles.every((file) => catalog.diagrams.some((diagram) => diagram.file === file)), "Mọi file .mmd phải được khai báo trong catalog.");
  return {
    title: catalog.title,
    overviewDiagramId: catalog.overviewDiagramId,
    posts: catalog.postOrder.map((s) => posts.find((post) => post.slug === s)!),
    diagrams,
  };
}
