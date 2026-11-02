import { loadContent } from "../lib/content";

const library = loadContent();
console.log(`Nội dung hợp lệ: ${library.posts.length} bài, ${Object.keys(library.diagrams).length} sơ đồ.`);
