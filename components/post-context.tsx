"use client";

import { createContext, useContext } from "react";
import type { ContentLibrary } from "@/lib/types";

export type FocusTarget = HTMLElement | SVGElement;
export interface PostInteractions {
  library: ContentLibrary;
  showPreview: (slug: string, anchor: FocusTarget, immediate?: boolean) => void;
  hidePreview: () => void;
  keepPreview: () => void;
  openPost: (slug: string, anchor?: FocusTarget) => void;
}
export const PostContext = createContext<PostInteractions | null>(null);
export function usePosts() {
  const context = useContext(PostContext);
  if (!context) throw new Error("PostContext chưa được khởi tạo.");
  return context;
}
