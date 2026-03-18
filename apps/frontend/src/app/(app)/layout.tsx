import { Sidebar } from '@/components/layout/sidebar';
import { Topbar }  from '@/components/layout/topbar';
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar/>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar/>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
