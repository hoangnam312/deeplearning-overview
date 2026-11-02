import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadContent } from "@/lib/content";
import { PostContent } from "@/components/post-content";

export function generateStaticParams() { return loadContent().posts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = loadContent().posts.find((item) => item.slug === slug);
  return { title: post?.title ?? "Không tìm thấy bài viết" };
}
export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = loadContent().posts.find((item) => item.slug === slug);
  if (!post) notFound();
  return <div className="h-[calc(100dvh-56px)] min-h-[440px] p-4 sm:p-6"><PostContent post={post} /></div>;
}
