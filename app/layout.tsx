import type { Metadata } from "next";
import { loadContent } from "@/lib/content";
import { Navigation } from "@/components/navigation";
import { PostProvider } from "@/components/post-overlays";
import "./globals.css";

export function generateMetadata(): Metadata {
  return { title: { default: loadContent().title, template: `%s · ${loadContent().title}` } };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const library = loadContent();
  return <html lang="vi"><body>
    <PostProvider library={library}>
      <div className="flex min-h-dvh flex-col">
        <Navigation title={library.title} />
        <main id="main-content" className="flex min-h-[calc(100dvh-56px)] flex-col">{children}</main>
      </div>
    </PostProvider>
  </body></html>;
}
