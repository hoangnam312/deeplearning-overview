import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { loadContent } from "@/lib/content";
import { PostLink } from "@/components/post-link";

export const metadata: Metadata = { title: "Bài viết" };
export default function BlogIndex() {
  const { posts } = loadContent();
  return <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-16">
    <h1 className="mb-8 text-2xl font-semibold tracking-tight">Bài viết</h1>
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {posts.map((post, index) => <PostLink key={post.slug} slug={post.slug} className="group flex items-center gap-5 py-6">
        <span className="font-mono text-xs text-slate-400">{String(index + 1).padStart(2, "0")}</span>
        <span className="flex-1 text-base font-medium transition-colors group-hover:text-blue-600">{post.title}</span>
        <ArrowUpRight size={18} className="text-slate-400" />
      </PostLink>)}
    </div>
  </div>;
}
