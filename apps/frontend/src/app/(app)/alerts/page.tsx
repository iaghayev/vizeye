'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Plus, X, Shield } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { formatRelative, cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';

const sevColor:any = {
  critical:'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function AlertsPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'events'|'rules'>('events');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', metricName:'cpu.usage_percent', threshold:90, severity:'warning', operator:'gt' });

  const { data:events, isLoading:loadingEvts } = useQuery({
    queryKey:['alert-events'], queryFn:()=>apiGet<any>('/api/v1/alerts/events?limit=50'), refetchInterval:15000,
  });
  const { data:rules, isLoading:loadingRules } = useQuery({
    queryKey:['alert-rules'], queryFn:()=>apiGet<any>('/api/v1/alerts/rules'), refetchInterval:30000,
  });
  const { data:summary } = useQuery({
    queryKey:['alert-summary'], queryFn:()=>apiGet<any>('/api/v1/alerts/events/summary'), refetchInterval:15000,
  });

  const eventList = Array.isArray(events)?events:(events?.data??[]);
  const ruleList  = Array.isArray(rules)?rules:(rules?.data??[]);

  const resolveMut = useMutation({
    mutationFn:(id:string)=>apiPatch(`/api/v1/alerts/events/${id}/resolve`),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['alert-events']}); qc.invalidateQueries({queryKey:['alert-summary']}); toast.success(t('common.success')); },
  });

  const toggleMut = useMutation({
    mutationFn:(id:string)=>apiPatch(`/api/v1/alerts/rules/${id}/toggle`),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['alert-rules']}); toast.success(t('common.success')); },
  });

  const deleteMut = useMutation({
    mutationFn:(id:string)=>apiDelete(`/api/v1/alerts/rules/${id}`),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['alert-rules']}); toast.success(t('common.success')); },
  });

  const createRuleMut = useMutation({
    mutationFn:(d:any)=>apiPost('/api/v1/alerts/rules',d),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['alert-rules']}); setShowForm(false); toast.success(t('common.success')); },
    onError:()=>toast.error(t('common.error')),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">{t('alerts.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('alerts.subtitle')}</p>
        </div>
        {tab==='rules'&&(
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
            <Plus size={15}/>{t('alerts.newRule')}
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:t('alerts.totalFiring'), value:summary?.totalFiring??0,  color:'text-red-400'},
          {label:t('alerts.critical'),    value:summary?.critical??0,      color:'text-red-400'},
          {label:t('alerts.warning'),     value:summary?.warning??0,       color:'text-yellow-400'},
          {label:t('alerts.resolved'),    value:summary?.resolved24h??0,   color:'text-green-400'},
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-canvas-elevated rounded-lg border border-edge w-fit">
        {(['events','rules'] as const).map(tb=>(
          <button key={tb} onClick={()=>setTab(tb)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab===tb?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300')}>
            {t(`alerts.${tb}`)}
          </button>
        ))}
      </div>

      {/* Create rule form */}
      {showForm && tab==='rules' && (
        <div className="card p-5 border-cyan-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-slate-200">{t('alerts.newRule')}</h2>
            <button onClick={()=>setShowForm(false)} className="p-1.5 rounded text-slate-500 hover:text-slate-300"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('alerts.form.name')}</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="High CPU Usage"
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('alerts.form.metric')}</label>
              <select value={form.metricName} onChange={e=>setForm(f=>({...f,metricName:e.target.value}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                {['cpu.usage_percent','mem.usage_percent','disk.usage_percent','load.1m'].map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('alerts.form.operator')}</label>
              <select value={form.operator} onChange={e=>setForm(f=>({...f,operator:e.target.value}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                {['gt','gte','lt','lte','eq'].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('alerts.form.threshold')}</label>
              <input type="number" value={form.threshold} onChange={e=>setForm(f=>({...f,threshold:+e.target.value}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('alerts.form.severity')}</label>
              <select value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                {['critical','warning','info'].map(s=><option key={s} value={s}>{t(`alerts.${s}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={()=>createRuleMut.mutate({...form,targetType:'org',condition:{operator:form.operator,threshold:form.threshold,consecutiveCount:2},notificationChannelIds:[]})}
              disabled={!form.name||createRuleMut.isPending}
              className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
              {createRuleMut.isPending?t('common.loading'):t('common.create')}
            </button>
            <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300 hover:bg-edge/50 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Events tab */}
      {tab==='events' && (
        loadingEvts ? <div className="space-y-2">{[0,1,2].map(i=><div key={i} className="skeleton h-14 w-full rounded-lg"/>)}</div> :
        eventList.length===0 ? (
          <div className="card p-12 text-center">
            <BellRing size={32} className="text-green-500 mx-auto mb-3"/>
            <p className="text-slate-400 font-medium">{t('alerts.noAlerts')}</p>
            <p className="text-slate-600 text-sm mt-1">{t('alerts.allClear')}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-edge">
                {[t('alerts.rule'),t('alerts.severity'),t('alerts.status'),t('alerts.asset'),t('alerts.firedAt'),t('common.actions')].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {eventList.map((e:any,i:number)=>(
                  <tr key={e.id} className={cn('border-b border-edge/50 hover:bg-edge/20 transition-colors',i===eventList.length-1&&'border-0')}>
                    <td className="px-4 py-3"><p className="text-sm text-slate-200">{e.rule?.name||'—'}</p></td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border',sevColor[e.severity])}>
                        {t(`alerts.${e.severity}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border',
                        e.status==='firing'?sevColor.critical:'bg-green-500/10 text-green-400 border-green-500/20')}>
                        {e.status==='firing'?t('alerts.totalFiring'):t('alerts.resolved')}
                      </span>
                    </td>
                    <td className="px-4 py-3"><p className="text-xs font-mono text-slate-500">{e.asset?.name||'—'}</p></td>
                    <td className="px-4 py-3"><p className="text-xs font-mono text-slate-500">{formatRelative(e.firedAt)}</p></td>
                    <td className="px-4 py-3">
                      {e.status==='firing'&&(
                        <button onClick={()=>resolveMut.mutate(e.id)}
                          className="px-2 py-1 rounded text-xs font-mono text-green-500 hover:bg-green-500/10 transition-colors">
                          {t('alerts.resolve')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Rules tab */}
      {tab==='rules' && (
        loadingRules ? <div className="space-y-2">{[0,1,2].map(i=><div key={i} className="skeleton h-14 w-full rounded-lg"/>)}</div> :
        ruleList.length===0 ? (
          <div className="card p-12 text-center">
            <Shield size={32} className="text-slate-600 mx-auto mb-3"/>
            <p className="text-slate-400 font-medium">{t('alerts.noRules')}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-edge">
                {[t('alerts.name'),t('alerts.metric'),t('alerts.severity'),t('alerts.status'),t('common.actions')].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {ruleList.map((r:any,i:number)=>(
                  <tr key={r.id} className={cn('border-b border-edge/50 hover:bg-edge/20 transition-colors',i===ruleList.length-1&&'border-0')}>
                    <td className="px-4 py-3"><p className="text-sm text-slate-200">{r.name}</p></td>
                    <td className="px-4 py-3"><p className="text-xs font-mono text-slate-500">{r.metricName||'—'}</p></td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border',sevColor[r.severity])}>
                        {t(`alerts.${r.severity}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border',
                        r.isActive?'bg-green-500/10 text-green-400 border-green-500/20':'bg-slate-700/30 text-slate-500 border-slate-600/20')}>
                        {r.isActive?t('settings.active'):t('settings.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>toggleMut.mutate(r.id)}
                          className="px-2 py-1 rounded text-xs font-mono text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                          {t('alerts.toggle')}
                        </button>
                        <button onClick={()=>{ if(confirm(t('common.confirm')+'?')) deleteMut.mutate(r.id); }}
                          className="px-2 py-1 rounded text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors">
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
