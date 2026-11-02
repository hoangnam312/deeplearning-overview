import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
    <span className="font-mono text-xs text-slate-400">404</span>
    <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
    <Link href="/" className="icon-button" aria-label="Về sơ đồ tổng quan" title="Về sơ đồ tổng quan"><ArrowLeft size={19} /></Link>
  </div>;
}
