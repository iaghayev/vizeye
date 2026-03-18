'use client';
import { usePathname } from 'next/navigation';
import { Bell, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { dashboardApi } from '@/lib/api/dashboard.api';

const TITLES: Record<string,string> = {
  '/dashboard':'Dashboard','/assets':'Assets','/monitors':'Monitors',
  '/alerts':'Alerts','/incidents':'Incidents','/settings':'Settings',
};

export function Topbar() {
  const path = usePathname();
  const title = Object.entries(TITLES).find(([k])=>path===k||path.startsWith(k+'/'))?.[1]||'VizEye';
  const { data:summary, refetch } = useQuery({ queryKey:['alert-summary'], queryFn:dashboardApi.getAlertSummary, refetchInterval:15000 });
  const firing = summary?.totalFiring??0;
  return (
    <header className="h-14 flex items-center gap-4 px-6 border-b border-edge bg-canvas-surface/80 backdrop-blur-sm shrink-0">
      <h1 className="font-display font-semibold text-[15px] text-slate-200">{title}</h1>
      <div className="flex-1"/>
      <button onClick={()=>refetch()} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-edge/50 transition-colors"><RefreshCw size={14}/></button>
      <button className={cn('relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all',
        firing>0?'bg-red-500/10 border border-red-500/25 text-red-400':'bg-edge/40 border border-edge text-slate-500')}>
        <Bell size={13} className={firing>0?'animate-pulse':''}/>
        <span>{firing}</span>
        {firing>0&&<span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 animate-ping"/>}
      </button>
    </header>
  );
}
