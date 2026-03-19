'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useLang } from '@/lib/i18n/lang-context';
import { cn } from '@/lib/utils';
import {
  Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  FileWarning, Server, RefreshCw, ChevronDown,
} from 'lucide-react';

// ── Status rəngləri ────────────────────────────────────────────────────────────
const STATUS = {
  up:      { icon: <CheckCircle  size={13}/>, color:'text-green-400',  bg:'bg-green-500/10 border-green-500/20',  label:'UP'       },
  down:    { icon: <XCircle      size={13}/>, color:'text-red-400',    bg:'bg-red-500/10 border-red-500/20',      label:'DOWN'     },
  degraded:{ icon: <AlertTriangle size={13}/>,color:'text-yellow-400', bg:'bg-yellow-500/10 border-yellow-500/20',label:'DEGRADED' },
  timeout: { icon: <Clock        size={13}/>, color:'text-orange-400', bg:'bg-orange-500/10 border-orange-500/20',label:'TIMEOUT'  },
  unknown: { icon: <Clock        size={13}/>, color:'text-slate-400',  bg:'bg-slate-700/30 border-slate-600/20',  label:'UNKNOWN'  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status as keyof typeof STATUS] || STATUS.unknown;
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full border', s.bg, s.color)}>
      {s.icon} {s.label}
    </span>
  );
}

function duration(ms: number) {
  if (!ms) return '—';
  if (ms < 60000)   return `${Math.round(ms/1000)}s`;
  if (ms < 3600000) return `${Math.round(ms/60000)}d`;
  return `${Math.round(ms/3600000)}s`;
}

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000)    return `${Math.round(diff/1000)}s əvvəl`;
  if (diff < 3600000)  return `${Math.round(diff/60000)}d əvvəl`;
  if (diff < 86400000) return `${Math.round(diff/3600000)}s əvvəl`;
  return new Date(ts).toLocaleString('az');
}

function absTime(ts: string) {
  return new Date(ts).toLocaleString('az', {
    month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit',
  });
}

export default function EventsPage() {
  const { t } = useLang();
  const [tab,        setTab]        = useState<'events'|'transitions'|'files'|'asset'>('events');
  const [hours,      setHours]      = useState(24);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState('');

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['event-stats', hours],
    queryFn:  () => apiGet<any>(`/api/v1/events/stats?hours=${hours}`),
    refetchInterval: 30000,
  });

  const { data: eventsData, isLoading: loadingEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['events', hours, statusFilter],
    queryFn:  () => apiGet<any>(
      `/api/v1/events?hours=${hours}&limit=200${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`
    ),
    refetchInterval: 30000,
  });

  const { data: fileData, isLoading: loadingFiles } = useQuery({
    queryKey: ['file-changes', hours],
    queryFn:  () => apiGet<any>(`/api/v1/events/file-changes?hours=${hours}`),
    refetchInterval: 60000,
  });

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn:  () => apiGet<any>('/api/v1/assets'),
  });

  const { data: assetHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['asset-history', selectedAsset, hours],
    queryFn:  () => selectedAsset
      ? apiGet<any>(`/api/v1/events/asset/${selectedAsset}?hours=${hours}`)
      : null,
    enabled: !!selectedAsset,
    refetchInterval: 30000,
  });

  const events   = eventsData?.events   || [];
  const changes  = fileData?.changes    || [];
  const assetList = Array.isArray(assets) ? assets : (assets?.data ?? []);

  const refetchAll = () => { refetchStats(); refetchEvents(); };

  // ── Stat kartlar ───────────────────────────────────────────────────────────
  const statCards = [
    { label:'Cəmi Yoxlama',   value: stats?.checks         ?? '—', color:'text-cyan-400',   icon: Activity       },
    { label:'DOWN Hadisə',    value: stats?.downEvents      ?? '—', color:'text-red-400',    icon: XCircle        },
    { label:'DEGRADED',       value: stats?.degradedEvents  ?? '—', color:'text-yellow-400', icon: AlertTriangle  },
    { label:'Uptime',         value: stats?.uptime ? `${stats.uptime}%` : '—', color:'text-green-400', icon: CheckCircle },
    { label:'Fayl Dəyişikliyi', value: stats?.fileChanges   ?? '—', color:'text-orange-400', icon: FileWarning   },
    { label:'Uğursuz Servis', value: stats?.failedServices  ?? '—', color:(stats?.failedServices||0) > 0?'text-red-400':'text-green-400', icon: Server },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
            <Activity size={20} className="text-cyan-400"/> Hadisə Jurnalı
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Server up/down tarixçəsi, fayl dəyişiklikləri, servis problemləri
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Zaman aralığı */}
          <div className="flex gap-1">
            {[1,6,24,72,168].map(h => (
              <button key={h} onClick={() => setHours(h)}
                className={cn('px-2.5 py-1.5 rounded text-xs font-mono border transition-colors',
                  hours === h
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-edge/30 border-edge text-slate-500 hover:border-slate-500')}>
                {h < 24 ? `${h}s` : h < 168 ? `${h/24}g` : '7g'}
              </button>
            ))}
          </div>
          <button onClick={refetchAll}
            className="p-2 rounded-md text-slate-500 hover:text-slate-300 hover:bg-edge/50 transition-colors">
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {/* Stat kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={12} className={s.color}/>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider truncate">{s.label}</p>
            </div>
            <p className={`font-display font-bold text-xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-canvas-elevated rounded-lg border border-edge w-fit flex-wrap">
        {[
          { key:'events',      label:'Event Log'       },
          { key:'transitions', label:'Asset Tarixçəsi' },
          { key:'files',       label:'Fayl Dəyişikliyi'},
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key as any)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === tb.key ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300')}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── EVENT LOG (Zabbix kimi) ─────────────────────────────────────────── */}
      {tab === 'events' && (
        <div className="space-y-3">
          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all','down','degraded','up','timeout'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-mono border transition-colors',
                  statusFilter === s
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-edge/30 border-edge text-slate-500 hover:border-slate-500')}>
                {s === 'all' ? 'Hamısı' : s.toUpperCase()}
              </button>
            ))}
            <span className="text-xs font-mono text-slate-600 ml-auto">
              {events.length} hadisə — son {hours} saat
            </span>
          </div>

          {loadingEvents ? (
            <div className="space-y-1">{[0,1,2,3,4].map(i => <div key={i} className="skeleton h-12 w-full rounded"/>)}</div>
          ) : events.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle size={28} className="text-green-400 mx-auto mb-2"/>
              <p className="text-slate-400">Heç bir hadisə yoxdur</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge bg-canvas-elevated">
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500 uppercase">Vaxt</th>
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500 uppercase">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500 uppercase">Asset</th>
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500 uppercase hidden sm:table-cell">Monitor</th>
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500 uppercase hidden md:table-cell">Cavab</th>
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500 uppercase hidden lg:table-cell">Xəta / Hədəf</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e: any, i: number) => (
                    <tr key={e.id}
                      className={cn(
                        'border-b border-edge/40 transition-colors',
                        i === events.length - 1 && 'border-0',
                        e.status === 'down'     && 'bg-red-500/3 hover:bg-red-500/5',
                        e.status === 'degraded' && 'bg-yellow-500/3 hover:bg-yellow-500/5',
                        e.status === 'up'       && 'hover:bg-edge/20',
                      )}>
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-xs font-mono text-slate-300">{absTime(e.checkedAt)}</p>
                          <p className="text-[10px] font-mono text-slate-600">{relTime(e.checkedAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={e.status}/>
                      </td>
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-xs font-medium text-slate-200">{e.asset?.name || '—'}</p>
                          <p className="text-[10px] font-mono text-slate-600">{e.asset?.ipAddress || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <div>
                          <p className="text-xs text-slate-400">{e.monitor?.name}</p>
                          <p className="text-[10px] font-mono text-slate-600">{e.monitor?.type}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className={cn('text-xs font-mono',
                          e.responseTimeMs > 2000 ? 'text-red-400' :
                          e.responseTimeMs > 1000 ? 'text-yellow-400' : 'text-slate-400')}>
                          {e.responseTimeMs != null ? `${e.responseTimeMs}ms` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell max-w-[200px]">
                        <p className="text-xs font-mono text-red-400/70 truncate">
                          {e.errorMessage || e.monitor?.target || '—'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ASSET TARİXÇƏSİ ─────────────────────────────────────────────────── */}
      {tab === 'transitions' && (
        <div className="space-y-4">
          {/* Asset seçimi */}
          <div className="card p-4">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Asset seçin
            </label>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">— Asset seçin —</option>
              {assetList.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.ipAddress ? ` (${a.ipAddress})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedAsset && (
            loadingHistory ? (
              <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="skeleton h-14 w-full rounded"/>)}</div>
            ) : assetHistory ? (
              <div className="space-y-4">
                {/* Uptime kartı */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label:'Uptime',         value:`${assetHistory.uptime}%`, color: parseFloat(assetHistory.uptime) > 99 ? 'text-green-400' : parseFloat(assetHistory.uptime) > 95 ? 'text-yellow-400' : 'text-red-400' },
                    { label:'Cəmi yoxlama',   value: assetHistory.total,       color:'text-cyan-400' },
                    { label:'Keçid sayı',     value: assetHistory.transitions?.length || 0, color:'text-slate-400' },
                    { label:'Müddət',         value: `${hours}s`,             color:'text-slate-400' },
                  ].map(s => (
                    <div key={s.label} className="card p-4">
                      <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.label}</p>
                      <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Uptime bar */}
                <div className="card p-4">
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
                    Status Tarixçəsi (son {hours} saat)
                  </p>
                  <div className="flex gap-0.5 h-10">
                    {assetHistory.recent?.slice(0, 100).map((r: any, i: number) => (
                      <div key={i} title={`${r.status} — ${absTime(r.checkedAt)}`}
                        className={cn('flex-1 rounded-sm transition-all hover:opacity-80',
                          r.status === 'up'       ? 'bg-green-500'  :
                          r.status === 'down'     ? 'bg-red-500'    :
                          r.status === 'degraded' ? 'bg-yellow-500' : 'bg-slate-600'
                        )}/>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-600">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500"/>UP</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500"/>DOWN</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500"/>DEGRADED</span>
                  </div>
                </div>

                {/* Keçidlər */}
                {assetHistory.transitions?.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-edge bg-canvas-elevated">
                      <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                        Status Keçidləri
                      </p>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-edge">
                          <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500">Vaxt</th>
                          <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500">Dəyişiklik</th>
                          <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500">Monitor</th>
                          <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500">Müddət</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetHistory.transitions.map((tr: any, i: number) => (
                          <tr key={i} className={cn('border-b border-edge/40 hover:bg-edge/20',
                            i === assetHistory.transitions.length - 1 && 'border-0',
                            tr.to === 'down' && 'bg-red-500/3')}>
                            <td className="px-4 py-2.5">
                              <p className="text-xs font-mono text-slate-300">{absTime(tr.at)}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <StatusBadge status={tr.from || 'unknown'}/>
                                <span className="text-slate-600">→</span>
                                <StatusBadge status={tr.to}/>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="text-xs font-mono text-slate-400">{tr.monitor}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="text-xs font-mono text-slate-500">
                                {tr.durationMs ? duration(tr.durationMs) : '—'}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* ── FAYL DƏYİŞİKLİKLƏRİ ─────────────────────────────────────────────── */}
      {tab === 'files' && (
        <div className="space-y-4">
          <div className="card p-4 border-orange-500/10">
            <div className="flex items-center gap-2 mb-1">
              <FileWarning size={15} className="text-orange-400"/>
              <p className="text-sm font-medium text-slate-300">Fayl Bütövlüyü Monitorinqi</p>
            </div>
            <p className="text-xs text-slate-500">
              Agent hər 30 saniyədə bu faylların MD5 hash-ini yoxlayır:
              <code className="text-orange-400 bg-orange-500/10 px-1 rounded mx-1">
                /etc/passwd, /etc/shadow, /etc/hosts, /etc/ssh/sshd_config, /etc/sudoers, /etc/crontab
              </code>
            </p>
          </div>

          {loadingFiles ? (
            <div className="skeleton h-32 w-full rounded-lg"/>
          ) : changes.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle size={28} className="text-green-400 mx-auto mb-2"/>
              <p className="text-slate-400">Son {hours} saatda fayl dəyişikliyi yoxdur</p>
              <p className="text-slate-600 text-sm mt-1">Bütün kritik sistem faylları dəyişməyib</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-edge bg-red-500/5 border-red-500/10 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400"/>
                <p className="text-xs font-mono text-red-400 uppercase tracking-wider">
                  {changes.length} fayl dəyişikliyi aşkarlandı
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500">Vaxt</th>
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500">Asset</th>
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-slate-500">Fayl</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c: any, i: number) => (
                    <tr key={i} className={cn('border-b border-edge/40 bg-red-500/3 hover:bg-red-500/5',
                      i === changes.length - 1 && 'border-0')}>
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-xs font-mono text-slate-300">{absTime(c.time)}</p>
                          <p className="text-[10px] font-mono text-slate-600">{relTime(c.time)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-slate-200">{c.assetName}</p>
                        <p className="text-[10px] font-mono text-slate-600">{c.ip}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileWarning size={12} className="text-orange-400 shrink-0"/>
                          <code className="text-xs font-mono text-orange-400">
                            {(c.tags as any)?.path || 'naməlum fayl'}
                          </code>
                        </div>
                        {(c.tags as any)?.hash && (
                          <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                            MD5: {(c.tags as any).hash.substring(0, 16)}...
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
