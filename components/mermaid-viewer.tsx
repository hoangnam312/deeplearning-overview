"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TransformWrapper, TransformComponent, useControls, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Maximize, Minus, Plus, RotateCcw } from "lucide-react";
import type { NodeLinks } from "@/lib/types";
import { IconButton } from "./icon-button";
import { usePosts, type FocusTarget } from "./post-context";

let mermaidModule: Promise<typeof import("mermaid")["default"]> | undefined;
function getMermaid() {
  return mermaidModule ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      suppressErrorRendering: true,
      theme: "base",
      flowchart: { useMaxWidth: false, curve: "basis" },
      themeVariables: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "15px",
        primaryColor: "#eff6ff",
        primaryTextColor: "#1e293b",
        primaryBorderColor: "#93b4e8",
        lineColor: "#94a3b8",
        secondaryColor: "#f5f3ff",
        tertiaryColor: "#f0fdfa",
      },
    });
    return mermaid;
  });
}

function ViewerTools({ onFit }: { onFit: () => void }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return <div className="viewer-tools" role="toolbar" aria-label="Điều khiển sơ đồ">
    <IconButton label="Thu nhỏ" onClick={() => zoomOut()}><Minus size={16} /></IconButton>
    <IconButton label="Phóng to" onClick={() => zoomIn()}><Plus size={16} /></IconButton>
    <span className="mx-0.5 h-4 w-px bg-slate-200" />
    <IconButton label="Vừa khung" onClick={onFit}><Maximize size={16} /></IconButton>
    <IconButton label="Đặt lại" onClick={() => resetTransform()}><RotateCcw size={16} /></IconButton>
  </div>;
}

export interface MermaidViewerProps {
  source: string;
  nodeLinks?: NodeLinks;
  onOpenPost?: (slug: string, anchor?: FocusTarget) => void;
  compact?: boolean;
  label?: string;
}

export function MermaidViewer({ source, nodeLinks, onOpenPost, compact = false, label = "Sơ đồ Mermaid" }: MermaidViewerProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const generation = useRef(0);
  const canvas = useRef<HTMLDivElement>(null);
  const svgHost = useRef<HTMLDivElement>(null);
  const transform = useRef<ReactZoomPanPinchRef>(null);
  const fitRef = useRef<() => void>(() => {});
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const { library, showPreview, hidePreview, openPost } = usePosts();
  const [rendered, setRendered] = useState({ source: "", svg: "", error: "" });
  const ready = rendered.source === source && !!rendered.svg && !rendered.error;
  const error = rendered.source === source ? rendered.error : "";

  useEffect(() => {
    if (!source.trim()) return;
    let cancelled = false;
    const renderId = `mermaid-${id}-${++generation.current}`;
    void (async () => {
      let renderHost: HTMLDivElement | undefined;
      try {
        const mermaid = await getMermaid();
        if (cancelled) return;
        // Mermaid needs a mounted SVG to measure labels. Contain its temporary
        // layout so preview rendering cannot create scrollbars and reset other viewers.
        renderHost = document.createElement("div");
        renderHost.setAttribute("aria-hidden", "true");
        renderHost.setAttribute("data-mermaid-render-host", "");
        renderHost.style.cssText = "position:fixed;inset:0;overflow:hidden;visibility:hidden;pointer-events:none;contain:strict";
        document.body.appendChild(renderHost);
        const { svg } = await mermaid.render(renderId, source, renderHost);
        if (!cancelled) setRendered({ source, svg, error: "" });
      } catch (cause) {
        if (!cancelled) setRendered({ source, svg: "", error: cause instanceof Error ? cause.message : String(cause) });
      } finally {
        renderHost?.remove();
      }
    })();
    return () => { cancelled = true; };
  }, [source, id]);

  useEffect(() => {
    if (!ready || !canvas.current || !svgHost.current) return;
    const svg = svgHost.current.querySelector("svg");
    if (!svg) return;
    const viewBox = svg.viewBox.baseVal;
    const width = viewBox.width || 800;
    const height = viewBox.height || 600;
    svg.style.maxWidth = "none";
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    const fit = () => {
      if (!canvas.current) return;
      const horizontalPadding = compact ? 24 : 64;
      const verticalPadding = compact ? 104 : 144;
      const scale = Math.max(0.01, Math.min((canvas.current.clientWidth - horizontalPadding) / width, (canvas.current.clientHeight - verticalPadding) / height, 1));
      transform.current?.centerView(scale, 0);
    };
    fitRef.current = fit;
    const frame = requestAnimationFrame(fit);
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(fit);
    });
    observer.observe(canvas.current);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(resizeFrame); observer.disconnect(); };
  }, [ready, rendered.svg, compact]);

  useEffect(() => {
    if (!ready || !svgHost.current) return;
    const cleanups: (() => void)[] = [];
    for (const [nodeId, slug] of Object.entries(nodeLinks ?? {})) {
      const post = library.posts.find((item) => item.slug === slug);
      const node = [...svgHost.current.querySelectorAll<SVGGElement>("g.node")].find((element) => element.id.startsWith(`flowchart-${nodeId}-`) || element.id.includes(`-flowchart-${nodeId}-`));
      if (!node || !post || node.parentElement?.tagName.toLowerCase() === "a") continue;
      const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
      link.setAttribute("href", `/blog/${slug}`);
      link.setAttribute("tabindex", "0");
      link.setAttribute("role", "link");
      link.setAttribute("aria-label", post.title);
      link.setAttribute("aria-haspopup", "dialog");
      link.setAttribute("data-post-slug", slug);
      link.classList.add("diagram-post-link");
      node.before(link);
      link.appendChild(node);
      const enter = () => showPreview(slug, link);
      const focus = () => showPreview(slug, link, true);
      const click = (event: MouseEvent) => {
        if (dragged.current) { event.preventDefault(); return; }
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        (onOpenPost ?? openPost)(slug, link);
      };
      const keydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          event.preventDefault();
          (onOpenPost ?? openPost)(slug, link);
        }
      };
      link.addEventListener("mouseenter", enter);
      link.addEventListener("mouseleave", hidePreview);
      link.addEventListener("focus", focus);
      link.addEventListener("blur", hidePreview);
      link.addEventListener("click", click);
      link.addEventListener("keydown", keydown);
      cleanups.push(() => {
        link.removeEventListener("mouseenter", enter);
        link.removeEventListener("mouseleave", hidePreview);
        link.removeEventListener("focus", focus);
        link.removeEventListener("blur", hidePreview);
        link.removeEventListener("click", click);
        link.removeEventListener("keydown", keydown);
        link.replaceWith(node);
      });
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [ready, rendered.svg, nodeLinks, library.posts, showPreview, hidePreview, openPost, onOpenPost]);

  return <section className={`mermaid-viewer ${compact ? "compact-viewer" : ""}`} aria-label={label} aria-busy={!!source.trim() && !ready && !error}>
    {!source.trim() ? <div className="viewer-message" role="status">Nhập code Mermaid để xem sơ đồ.</div>
      : error ? <div className="viewer-message p-6" role="alert"><p className="mb-3 font-medium text-rose-700">Không thể hiển thị sơ đồ</p><pre className="max-h-64 max-w-full overflow-auto whitespace-pre-wrap text-left text-xs text-slate-500">{error}</pre></div>
      : !ready ? <div className="viewer-message" role="status"><span className="loading-dot" />Đang vẽ sơ đồ…</div> : null}
    <div ref={canvas} className={`absolute inset-0 ${ready ? "" : "invisible"}`}
      onPointerDownCapture={(event) => { pointer.current = { x: event.clientX, y: event.clientY }; dragged.current = false; }}
      onPointerMoveCapture={(event) => {
        if (pointer.current && Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 5) {
          dragged.current = true;
          hidePreview();
        }
      }}
      onPointerUpCapture={() => { pointer.current = null; }}
      onPointerCancel={() => { pointer.current = null; }}
    >
      <TransformWrapper ref={transform} minScale={0.01} maxScale={8} limitToBounds={false} centerOnInit
        wheel={{ step: 0.12 }} doubleClick={{ disabled: true }} panning={{ velocityDisabled: true }}>
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%", touchAction: "none" }} contentStyle={{ width: "max-content", height: "max-content" }}>
          <div ref={svgHost} className="svg-host" dangerouslySetInnerHTML={{ __html: ready ? rendered.svg : "" }} />
        </TransformComponent>
        {ready && <ViewerTools onFit={() => fitRef.current()} />}
      </TransformWrapper>
    </div>
  </section>;
}
