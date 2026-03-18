'use client';
import { useQuery } from '@tanstack/react-query';
import { Server,Radio,BellRing,Flame } from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard.api';

function StatCard({label,value,icon:Icon,variant,loading}:any) {
  const colors:any = { cyan:'text-cyan-400', critical:'text-red-400', warning:'text-yellow-400', success:'text-green-400' };
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{label}</span>
        {Icon&&<div className="p-1.5 rounded-md bg-slate-700/30"><Icon size={14} className={colors[variant]||'text-slate-400'}/></div>}
      </div>
      {loading?<div className="skeleton h-7 w-16"/>:
        <div className={`font-display font-bold text-2xl tabular-nums ${colors[variant]||'text-slate-100'}`}>{value}</div>}
    </div>
  );
}

export function StatsRow() {
  const { data:org,   isLoading:lo } = useQuery({ queryKey:['org-stats'],       queryFn:dashboardApi.getOrgStats,      refetchInterval:30000 });
  const { data:alerts,isLoading:la } = useQuery({ queryKey:['alert-summary'],   queryFn:dashboardApi.getAlertSummary,  refetchInterval:15000 });
  const { data:inc,   isLoading:li } = useQuery({ queryKey:['incident-stats'],  queryFn:dashboardApi.getIncidentStats, refetchInterval:30000 });
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Total Assets"    value={org?.totalAssets??'—'}    icon={Server}   variant="cyan"     loading={lo}/>
      <StatCard label="Active Monitors" value={org?.activeMonitors??'—'} icon={Radio}    variant="cyan"     loading={lo}/>
      <StatCard label="Firing Alerts"   value={alerts?.totalFiring??'—'} icon={BellRing} variant={(alerts?.totalFiring||0)>0?'critical':'success'} loading={la}/>
      <StatCard label="Open Incidents"  value={inc?.open??'—'}           icon={Flame}    variant={(inc?.open||0)>0?'warning':'success'}  loading={li}/>
    </div>
  );
}
