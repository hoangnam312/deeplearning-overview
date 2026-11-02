"use client";

import type { AnchorHTMLAttributes } from "react";
import { usePosts } from "./post-context";

export function PostLink({ slug, children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { slug: string }) {
  const { showPreview, hidePreview, openPost } = usePosts();
  return <a {...props} href={`/blog/${slug}`} aria-haspopup="dialog"
    onMouseEnter={(event) => showPreview(slug, event.currentTarget)}
    onMouseLeave={hidePreview}
    onFocus={(event) => showPreview(slug, event.currentTarget, true)}
    onBlur={hidePreview}
    onClick={(event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      openPost(slug, event.currentTarget);
    }}
  >{children}</a>;
}
