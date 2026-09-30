import { Sidebar } from "@/components/layout/Sidebar";
import { ShellProvider } from "@/components/layout/ShellContext";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-950 font-sans">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
    </ShellProvider>
  );
}
