'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Flame, ArrowRight } from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { formatRelative, truncate } from '@/lib/utils';

export function IncidentsFeed() {
  const { data, isLoading } = useQuery({ queryKey:['dashboard-incidents'], queryFn:()=>dashboardApi.getOpenIncidents(8), refetchInterval:30000 });
  const incidents = Array.isArray(data) ? data : (data?.data ?? []);
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-cyan-500"/>
          <span className="font-display font-semibold text-sm text-slate-200">Open Incidents</span>
        </div>
        <Link href="/incidents" className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400"><ArrowRight size={12}/></Link>
      </div>
      {isLoading?<div className="space-y-2">{[0,1,2].map(i=><div key={i} className="skeleton h-12 w-full"/>)}</div>:
       incidents.length===0?<div className="py-6 text-center text-sm text-slate-600">No open incidents</div>:
       <div className="space-y-1">
         {incidents.map((inc:any)=>(
           <Link key={inc.id} href="/incidents" className="group block px-3 py-2.5 rounded-md hover:bg-edge/40 transition-colors">
             <p className="text-xs font-medium text-slate-300 truncate">{truncate(inc.title,50)}</p>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{inc.status}</span>
               <span className="text-[10px] font-mono text-slate-600">{formatRelative(inc.createdAt)}</span>
             </div>
           </Link>
         ))}
       </div>}
    </div>
  );
}
