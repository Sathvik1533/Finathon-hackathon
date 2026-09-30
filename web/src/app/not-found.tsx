import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-100">
      <p className="text-6xl font-bold text-zinc-700">404</p>
      <p className="text-lg font-medium text-zinc-300">Page not found</p>
      <Link href="/app" className="text-sm text-indigo-400 hover:underline">
        Back to Dashboard
      </Link>
    </div>
  );
}
