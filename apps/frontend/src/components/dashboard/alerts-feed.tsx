'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BellRing, ArrowRight } from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { formatRelative, truncate } from '@/lib/utils';

export function AlertsFeed() {
  const { data, isLoading } = useQuery({ queryKey:['dashboard-alerts'], queryFn:()=>dashboardApi.getRecentAlerts(8), refetchInterval:20000 });
  const alerts = Array.isArray(data) ? data : (data?.data ?? []);
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing size={14} className="text-cyan-500"/>
          <span className="font-display font-semibold text-sm text-slate-200">Alert Events</span>
        </div>
        <Link href="/alerts" className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400"><ArrowRight size={12}/></Link>
      </div>
      {isLoading?<div className="space-y-2">{[0,1,2].map(i=><div key={i} className="skeleton h-10 w-full"/>)}</div>:
       alerts.length===0?<div className="py-6 text-center text-sm text-slate-600">No active alerts</div>:
       <div className="space-y-1">
         {alerts.map((a:any)=>(
           <Link key={a.id} href={`/alerts`} className="group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-edge/40 transition-colors">
             <div className="w-0.5 self-stretch rounded-full mt-0.5" style={{background:a.severity==='critical'?'#EF4444':a.severity==='warning'?'#F59E0B':'#3B82F6'}}/>
             <div className="flex-1 min-w-0">
               <p className="text-xs font-medium text-slate-300 truncate">{truncate(a.rule?.name||a.message||'Alert',36)}</p>
               <p className="text-[10px] font-mono text-slate-600 mt-0.5">{formatRelative(a.firedAt)}</p>
             </div>
             {a.status==='firing'&&<span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mt-1 shrink-0"/>}
           </Link>
         ))}
       </div>}
    </div>
  );
}
