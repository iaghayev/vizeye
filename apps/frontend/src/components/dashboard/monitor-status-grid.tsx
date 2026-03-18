'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Radio, ArrowRight } from 'lucide-react';
import { monitorsApi } from '@/lib/api/monitors.api';
import { statusDotClass, formatRelative } from '@/lib/utils';

export function MonitorStatusGrid() {
  const { data, isLoading } = useQuery({ queryKey:['monitors-overview'], queryFn:()=>monitorsApi.list({limit:12}), refetchInterval:15000 });
  const monitors = Array.isArray(data) ? data : (data?.data ?? []);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-cyan-500"/>
          <span className="font-display font-semibold text-sm text-slate-200">Monitor Status</span>
        </div>
        <Link href="/monitors" className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400">Manage <ArrowRight size={12}/></Link>
      </div>
      {isLoading?<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[0,1,2,3,4,5].map(i=><div key={i} className="skeleton h-14"/>)}</div>:
       monitors.length===0?<p className="text-sm text-slate-600 text-center py-6">No monitors configured</p>:
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
         {monitors.map((m:any)=>(
           <Link key={m.id} href="/monitors"
             className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-edge bg-canvas-elevated hover:border-edge-bright transition-all">
             <span className={statusDotClass(m.lastStatus)}/>
             <div className="flex-1 min-w-0">
               <p className="text-xs font-medium text-slate-300 truncate">{m.name}</p>
               <p className="text-[10px] font-mono text-slate-600 truncate">{m.target}</p>
             </div>
             <p className="text-[10px] font-mono text-slate-700 shrink-0">{m.lastCheckedAt?formatRelative(m.lastCheckedAt):'—'}</p>
           </Link>
         ))}
       </div>}
    </div>
  );
}
