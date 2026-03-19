'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, X, Wrench, CheckCircle } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MaintenancePage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', startTime: '', endTime: '', monitorIds: [] as string[],
  });

  const { data: windows, isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn:  () => apiGet<any>('/api/v1/maintenance'),
    refetchInterval: 30000,
  });

  const { data: monitors } = useQuery({
    queryKey: ['monitors'],
    queryFn:  () => apiGet<any>('/api/v1/monitors'),
  });

  const { data: active } = useQuery({
    queryKey: ['maintenance-active'],
    queryFn:  () => apiGet<any>('/api/v1/maintenance/active'),
    refetchInterval: 60000,
  });

  const createMut = useMutation({
    mutationFn: (d: any) => apiPost('/api/v1/maintenance', d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey:['maintenance'] }); setShowForm(false); toast.success(t('common.success')); },
    onError:    () => toast.error(t('common.error')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/maintenance/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey:['maintenance'] }); toast.success(t('common.success')); },
  });

  const allWindows = Array.isArray(windows) ? windows : (windows?.data ?? []);
  const activeList = Array.isArray(active)  ? active  : (active?.data  ?? []);
  const monitorList = Array.isArray(monitors) ? monitors : (monitors?.data ?? []);

  const now = new Date();
  const upcoming = allWindows.filter((w: any) => new Date(w.startTime) > now);
  const past     = allWindows.filter((w: any) => new Date(w.endTime)   < now);

  const formatRange = (start: string, end: string) => {
    const s = new Date(start), e = new Date(end);
    return `${s.toLocaleString()} → ${e.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <Wrench size={20} className="text-cyan-400"/> Maintenance Windows
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Planlı dayanma vaxtlarında alertlər avtomatik susur
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
          <Plus size={15}/> Yeni Pencərə
        </button>
      </div>

      {/* Aktiv maintenance */}
      {activeList.length > 0 && (
        <div className="card p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>
            <p className="text-sm font-semibold text-blue-400">Aktiv Maintenance</p>
          </div>
          {activeList.map((w: any) => (
            <div key={w.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-200">{w.name}</p>
                <p className="text-xs font-mono text-slate-500">{formatRange(w.startTime, w.endTime)}</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Aktiv
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-slate-200">Yeni Maintenance Pencərəsi</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded text-slate-500 hover:text-slate-300">
              <X size={16}/>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Ad *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="Haftalık Yenilənmə"
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Başlanğıc *</label>
              <input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Bitmə *</label>
              <input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({...f, endTime: e.target.value}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Açıqlama</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="OS yenilənməsi..."
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Monitorlar (boş = hamısı)</label>
              <select multiple value={form.monitorIds}
                onChange={e => setForm(f => ({...f, monitorIds: Array.from(e.target.selectedOptions, o => o.value)}))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 h-24">
                {monitorList.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate(form)}
              disabled={!form.name || !form.startTime || !form.endTime || createMut.isPending}
              className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
              {createMut.isPending ? t('common.loading') : t('common.create')}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300 hover:bg-edge/50 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">Gələcək</h3>
          {upcoming.map((w: any) => (
            <div key={w.id} className="card p-4 flex items-center gap-4">
              <Clock size={16} className="text-blue-400 shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{w.name}</p>
                <p className="text-xs font-mono text-slate-500">{formatRange(w.startTime, w.endTime)}</p>
                {w.description && <p className="text-xs text-slate-600 mt-0.5">{w.description}</p>}
              </div>
              <button onClick={() => { if(confirm('Silmək istəyirsiniz?')) deleteMut.mutate(w.id); }}
                className="px-2 py-1 rounded text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors shrink-0">
                Sil
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">Keçmiş</h3>
          {past.slice(0, 10).map((w: any) => (
            <div key={w.id} className="card p-4 flex items-center gap-4 opacity-60">
              <CheckCircle size={16} className="text-green-400 shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{w.name}</p>
                <p className="text-xs font-mono text-slate-500">{formatRange(w.startTime, w.endTime)}</p>
              </div>
              <span className="text-xs font-mono text-green-400">Tamamlandı</span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && allWindows.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <Wrench size={32} className="text-slate-600 mx-auto mb-3"/>
          <p className="text-slate-400">Maintenance window yoxdur</p>
          <p className="text-slate-600 text-sm mt-1">Planlı dayanma vaxtlarını əvvəlcədən planlaşdırın</p>
        </div>
      )}
    </div>
  );
}
