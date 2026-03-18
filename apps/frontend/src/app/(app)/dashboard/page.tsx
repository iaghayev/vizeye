import type { Metadata } from 'next';
import { StatsRow } from '@/components/dashboard/stats-row';
import { AlertsFeed } from '@/components/dashboard/alerts-feed';
import { IncidentsFeed } from '@/components/dashboard/incidents-feed';
import { MonitorStatusGrid } from '@/components/dashboard/monitor-status-grid';
export const metadata: Metadata = { title: 'Dashboard' };
export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-xl text-slate-100">Operations Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time infrastructure monitoring</p>
      </div>
      <StatsRow/>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3"><MonitorStatusGrid/></div>
        <div className="xl:col-span-2 grid grid-cols-1 gap-4">
          <AlertsFeed/>
          <IncidentsFeed/>
        </div>
      </div>
    </div>
  );
}
