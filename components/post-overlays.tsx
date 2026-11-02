"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, PanelRightOpen, X } from "lucide-react";
import type { ContentLibrary, Post } from "@/lib/types";
import { IconButton } from "./icon-button";
import { PostContent } from "./post-content";
import { PostContext, type FocusTarget } from "./post-context";

type Preview = { slug: string; anchor: FocusTarget };

export function PostProvider({ library, children }: { library: ContentLibrary; children: ReactNode }) {
  const pathname = usePathname();
  return <PostProviderForRoute key={pathname} library={library}>{children}</PostProviderForRoute>;
}

function PostProviderForRoute({ library, children }: { library: ContentLibrary; children: ReactNode }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const returnFocus = useRef<FocusTarget | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocus = useRef(false);
  const clearTimer = useCallback(() => { if (timer.current) clearTimeout(timer.current); }, []);
  const showPreview = useCallback((slug: string, anchor: FocusTarget, immediate = false) => {
    clearTimer();
    if (suppressFocus.current || (!immediate && window.matchMedia("(hover: none)").matches)) return;
    timer.current = setTimeout(() => setPreview({ slug, anchor }), immediate ? 0 : 220);
  }, [clearTimer]);
  const hidePreview = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => setPreview(null), 220);
  }, [clearTimer]);
  const openPost = useCallback((slug: string, anchor?: FocusTarget) => {
    clearTimer();
    // Keep the original trigger when following links within the same sidebar.
    if (anchor && !anchor.closest("[data-post-sidebar]")) returnFocus.current = anchor;
    setPreview(null);
    setActiveSlug(slug);
  }, [clearTimer]);
  const restoreFocus = useCallback((target: FocusTarget | null) => {
    suppressFocus.current = true;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus({ preventScroll: true });
      requestAnimationFrame(() => { suppressFocus.current = false; });
    });
  }, []);
  const closePreview = useCallback(() => {
    clearTimer();
    setPreview(null);
    restoreFocus(preview?.anchor ?? null);
  }, [clearTimer, preview, restoreFocus]);
  const closeSidebar = useCallback(() => {
    clearTimer();
    setPreview(null);
    setActiveSlug(null);
    restoreFocus(returnFocus.current);
  }, [clearTimer, restoreFocus]);

  useEffect(() => () => clearTimer(), [clearTimer]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (preview) { event.preventDefault(); closePreview(); }
      else if (activeSlug) { event.preventDefault(); closeSidebar(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview, activeSlug, closePreview, closeSidebar]);
  useEffect(() => {
    if (!preview) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-post-preview]") && !preview.anchor.contains(target)) {
        clearTimer(); setPreview(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [preview, clearTimer]);

  const activePost = library.posts.find((post) => post.slug === activeSlug);
  const previewPost = library.posts.find((post) => post.slug === preview?.slug);
  return <PostContext.Provider value={{ library, showPreview, hidePreview, keepPreview: clearTimer, openPost }}>
    {children}
    {activePost && <PostSidebar post={activePost} onClose={closeSidebar} />}
    {preview && previewPost && <PostPreview post={previewPost} anchor={preview.anchor} onClose={closePreview} onOpen={() => openPost(preview.slug, preview.anchor)} onEnter={clearTimer} onLeave={hidePreview} />}
  </PostContext.Provider>;
}

function OpenPageLink({ post }: { post: Post }) {
  return <a href={`/blog/${post.slug}`} className="icon-button" aria-label={`Mở trang: ${post.title}`} title="Mở trang bài viết"><ExternalLink size={16} /></a>;
}

export function PostPreview({ post, anchor, onClose, onOpen, onEnter, onLeave }: {
  post: Post; anchor: FocusTarget; onClose: () => void; onOpen: () => void; onEnter: () => void; onLeave: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const position = () => {
      if (!panel.current) return;
      const bounds = anchor.getBoundingClientRect();
      const { width, height } = panel.current.getBoundingClientRect();
      const preferred = bounds.right + 12 + width <= window.innerWidth - 12 ? bounds.right + 12 : bounds.left - width - 12;
      panel.current.style.left = `${Math.max(12, Math.min(preferred, window.innerWidth - width - 12))}px`;
      panel.current.style.top = `${Math.max(12, Math.min(bounds.top, window.innerHeight - height - 12))}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => { window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [anchor]);
  return <div ref={panel} data-post-preview role="dialog" aria-label={`Xem nhanh: ${post.title}`} className="post-preview"
    onMouseEnter={onEnter} onMouseLeave={onLeave} onFocusCapture={onEnter}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onLeave(); }}>
    <div className="mb-2 flex justify-end gap-1">
      <IconButton label="Mở sidebar" onClick={onOpen}><PanelRightOpen size={16} /></IconButton>
      <OpenPageLink post={post} />
      <IconButton label="Đóng xem nhanh" onClick={onClose}><X size={16} /></IconButton>
    </div>
    <div className="min-h-0 flex-1"><PostContent post={post} compact showRelated={false} /></div>
  </div>;
}

export function PostSidebar({ post, onClose }: { post: Post; onClose: () => void }) {
  const [width, setWidth] = useState(480);
  const resizing = useRef<{ x: number; width: number } | null>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus({ preventScroll: true }); }, [post.slug]);
  const clampWidth = (value: number) => Math.max(320, Math.min(value, 960, window.innerWidth * 0.75));
  return <aside ref={panel} data-post-sidebar role="dialog" aria-label={`Bài viết: ${post.title}`} className="post-sidebar" style={{ width }}
    onKeyDown={(event) => {
      if (event.key !== "Tab" || !window.matchMedia("(max-width: 640px)").matches) return;
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div role="separator" tabIndex={0} aria-label="Đổi chiều rộng sidebar" aria-orientation="vertical" aria-valuenow={Math.round(width)} aria-valuemin={320} aria-valuemax={960}
      className="sidebar-resizer"
      onPointerDown={(event) => { resizing.current = { x: event.clientX, width }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (resizing.current) setWidth(clampWidth(resizing.current.width + resizing.current.x - event.clientX)); }}
      onPointerUp={() => { resizing.current = null; }} onPointerCancel={() => { resizing.current = null; }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault(); setWidth((current) => clampWidth(current + (event.key === "ArrowLeft" ? 24 : -24)));
        }
      }} />
    <div className="mb-5 flex justify-end gap-1">
      <OpenPageLink post={post} />
      <IconButton ref={closeButton} label="Đóng sidebar" onClick={onClose}><X size={18} /></IconButton>
    </div>
    <div className="min-h-0 flex-1"><PostContent key={post.slug} post={post} /></div>
  </aside>;
}
