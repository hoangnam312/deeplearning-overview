"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Braces, Workflow } from "lucide-react";

export function Navigation({ title }: { title: string }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Sơ đồ tổng quan", icon: Workflow },
    { href: "/blog", label: "Danh sách bài viết", icon: BookOpen },
    { href: "/playground", label: "Thử Mermaid", icon: Braces },
  ];
  return <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6">
    <Link href="/" className="truncate text-sm font-semibold tracking-tight">{title}</Link>
    <nav aria-label="Điều hướng chính" className="ml-3 flex gap-1">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} title={label} aria-label={label} aria-current={(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "page" : undefined} className="icon-button"><Icon size={18} strokeWidth={1.7} /></Link>)}
    </nav>
  </header>;
}
