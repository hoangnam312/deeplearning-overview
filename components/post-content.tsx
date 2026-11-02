"use client";

import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/types";
import { usePosts } from "./post-context";
import { MermaidViewer } from "./mermaid-viewer";
import { PostLink } from "./post-link";

export function PostContent({ post, compact = false, showRelated = true }: { post: Post; compact?: boolean; showRelated?: boolean }) {
  const { library } = usePosts();
  const diagram = library.diagrams[post.diagramId];
  return <article className="flex h-full min-h-0 flex-col gap-4">
    <h1 className={compact ? "pr-5 text-base font-semibold tracking-tight" : "pr-6 text-xl font-semibold tracking-tight sm:text-2xl"}>{post.title}</h1>
    <div className="min-h-0 flex-1">
      <MermaidViewer source={diagram.source} nodeLinks={diagram.nodeLinks} compact={compact} label={post.title} />
    </div>
    {showRelated && post.relatedSlugs.length > 0 && <nav aria-label="Bài viết khác" className="flex justify-end gap-1">
      {post.relatedSlugs.map((slug) => {
        const target = library.posts.find((item) => item.slug === slug)!;
        return <PostLink key={slug} slug={slug} className="icon-button" title={target.title} aria-label={target.title}><ArrowUpRight size={17} /></PostLink>;
      })}
    </nav>}
  </article>;
}
