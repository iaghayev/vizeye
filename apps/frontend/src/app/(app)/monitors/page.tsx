import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Monitors' };
export default function Page() {
  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="font-display font-bold text-xl text-slate-100">Monitors</h1>
      <div className="card p-8 text-center text-slate-600 text-sm font-mono">Coming soon</div>
    </div>
  );
}
