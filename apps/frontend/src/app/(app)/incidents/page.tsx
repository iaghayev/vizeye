'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, Plus, X, MessageCircle } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { formatRelative, cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';

const sevColor:any = {
  critical:'bg-red-500/10 text-red-400 border-red-500/20',
  high:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low:     'bg-slate-700/30 text-slate-400 border-slate-600/20',
};
const statusColor:any = {
  open:         'bg-red-500/10 text-red-400 border-red-500/20',
  acknowledged: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  in_progress:  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  resolved:     'bg-green-500/10 text-green-400 border-green-500/20',
  closed:       'bg-slate-700/20 text-slate-500 border-slate-700/20',
};

export default function IncidentsPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ title:'', description:'', severity:'medium', assetId:'' });

  const { data, isLoading } = useQuery({
    queryKey:['incidents',statusFilter],
    queryFn:()=>apiGet<any>(`/api/v1/incidents?limit=50${statusFilter!=='all'?`&status=${statusFilter}`:''}`),
    refetchInterval:30000,
  });
  const { data:stats } = useQuery({ queryKey:['incident-stats'], queryFn:()=>apiGet<any>('/api/v1/incidents/stats'), refetchInterval:30000 });
  const { data:assets } = useQuery({ queryKey:['assets'], queryFn:()=>apiGet<any>('/api/v1/assets') });
  const { data:detail } = useQuery({
    queryKey:['incident-detail',selected?.id],
    queryFn:()=>apiGet<any>(`/api/v1/incidents/${selected?.id}`),
    enabled:!!selected?.id, refetchInterval:10000,
  });

  const incidents = Array.isArray(data)?data:(data?.data??[]);
  const assetList = Array.isArray(assets)?assets:(assets?.data??[]);

  const createMut = useMutation({
    mutationFn:(d:any)=>apiPost('/api/v1/incidents',d),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['incidents']}); qc.invalidateQueries({queryKey:['incident-stats']}); setShowForm(false); toast.success(t('common.success')); },
    onError:()=>toast.error(t('common.error')),
  });

  const updateMut = useMutation({
    mutationFn:({id,data}:{id:string;data:any})=>apiPatch(`/api/v1/incidents/${id}`,data),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['incidents']}); qc.invalidateQueries({queryKey:['incident-detail',selected?.id]}); toast.success(t('common.success')); },
  });

  const commentMut = useMutation({
    mutationFn:({id,content}:{id:string;content:string})=>apiPost(`/api/v1/incidents/${id}/comments`,{content}),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['incident-detail',selected?.id]}); setComment(''); toast.success(t('common.success')); },
  });

  const statuses = ['all','open','acknowledged','in_progress','resolved'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">{t('incidents.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('incidents.subtitle')}</p>
        </div>
        <button onClick={()=>setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
          <Plus size={15}/>{t('incidents.new')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {label:t('incidents.open'),         value:stats?.open??0,         color:'text-red-400'},
          {label:t('incidents.acknowledged'),  value:stats?.acknowledged??0,  color:'text-yellow-400'},
          {label:t('incidents.inProgress'),    value:stats?.inProgress??0,    color:'text-cyan-400'},
          {label:t('incidents.resolved'),      value:stats?.resolved24h??0,   color:'text-green-400'},
          {label:t('incidents.critical'),      value:stats?.critical??0,      color:'text-red-400'},
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-5 border-cyan-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-slate-200">{t('incidents.new')}</h2>
            <button onClick={()=>setShowForm(false)} className="p-1.5 rounded text-slate-500 hover:text-slate-300"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('incidents.form.title')}</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                placeholder="Database connection timeout..."
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('incidents.form.desc')}</label>
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('incidents.form.severity')}</label>
              <select value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                {['critical','high','medium','low'].map(s=><option key={s} value={s}>{t(`incidents.${s}`)}</option>)}
              </select>
            </div>
            {assetList.length>0 && (
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('incidents.form.asset')}</label>
                <select value={form.assetId} onChange={e=>setForm(f=>({...f,assetId:e.target.value}))}
                  className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                  <option value="">— {t('common.all')} —</option>
                  {assetList.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={()=>createMut.mutate({...form,assetId:form.assetId||null})}
              disabled={!form.title||createMut.isPending}
              className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
              {createMut.isPending?t('common.loading'):t('common.create')}
            </button>
            <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300 hover:bg-edge/50 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap">
        {statuses.map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-mono transition-colors',
              statusFilter===s?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-edge/50 border border-edge')}>
            {s==='all'?t('common.all'):t(`incidents.${s==='in_progress'?'inProgress':s}`)}
          </button>
        ))}
      </div>

      {/* List + Detail side-by-side */}
      <div className={cn('grid gap-4', selected?'grid-cols-1 lg:grid-cols-2':'grid-cols-1')}>
        {/* List */}
        <div>
          {isLoading ? <div className="space-y-2">{[0,1,2].map(i=><div key={i} className="skeleton h-16 w-full rounded-lg"/>)}</div> :
           incidents.length===0 ? (
            <div className="card p-12 text-center">
              <Flame size={32} className="text-green-500 mx-auto mb-3"/>
              <p className="text-slate-400 font-medium">{t('incidents.noIncidents')}</p>
              <p className="text-slate-600 text-sm mt-1">{t('incidents.stable')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc:any)=>(
                <div key={inc.id} onClick={()=>setSelected(inc)}
                  className={cn('card p-4 cursor-pointer hover:border-cyan-500/30 transition-all',
                    selected?.id===inc.id&&'border-cyan-500/30 bg-cyan-500/5')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{inc.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border',statusColor[inc.status])}>
                          {t(`incidents.${inc.status==='in_progress'?'inProgress':inc.status}`)}
                        </span>
                        <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border',sevColor[inc.severity])}>
                          {t(`incidents.${inc.severity}`)}
                        </span>
                        {inc.asset&&<span className="text-xs font-mono text-slate-600">{inc.asset.name}</span>}
                        <span className="text-xs font-mono text-slate-600 ml-auto">{formatRelative(inc.createdAt)}</span>
                      </div>
                    </div>
                    {inc._count?.comments>0&&(
                      <div className="flex items-center gap-1 text-slate-600">
                        <MessageCircle size={12}/>
                        <span className="text-xs font-mono">{inc._count.comments}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="font-display font-semibold text-slate-200 text-sm flex-1 pr-2">{detail?.title||selected.title}</h2>
              <button onClick={()=>setSelected(null)} className="p-1.5 rounded text-slate-500 hover:text-slate-300 shrink-0"><X size={14}/></button>
            </div>

            {detail?.description&&(
              <p className="text-xs text-slate-500 leading-relaxed">{detail.description}</p>
            )}

            {/* Actions */}
            {detail?.status==='open'&&(
              <button onClick={()=>updateMut.mutate({id:selected.id,data:{status:'acknowledged'}})}
                className="w-full py-2 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
                {t('incidents.acknowledge')}
              </button>
            )}
            {(detail?.status==='acknowledged'||detail?.status==='in_progress')&&(
              <button onClick={()=>updateMut.mutate({id:selected.id,data:{status:'resolved'}})}
                className="w-full py-2 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                {t('incidents.resolve')}
              </button>
            )}

            {/* Comments */}
            <div className="border-t border-edge pt-4 space-y-3">
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{t('incidents.comments')}</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(detail?.comments||[]).map((c:any)=>(
                  <div key={c.id} className="bg-canvas-elevated rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-300">{c.user?.firstName||'User'}</span>
                      <span className="text-xs font-mono text-slate-600">{formatRelative(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={comment} onChange={e=>setComment(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&comment.trim()&&(commentMut.mutate({id:selected.id,content:comment}))}
                  placeholder={t('incidents.addComment')}
                  className="flex-1 px-3 py-2 rounded-md text-xs bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                <button onClick={()=>comment.trim()&&commentMut.mutate({id:selected.id,content:comment})}
                  disabled={!comment.trim()||commentMut.isPending}
                  className="px-3 py-2 rounded-md text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
