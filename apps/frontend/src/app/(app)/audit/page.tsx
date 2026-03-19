'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Filter, Download, User, Server, Radio, BellRing, Settings, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDateTime, formatRelative, cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';

const actionIcons: Record<string, React.ElementType> = {
  'asset.create': Server, 'asset.update': Server, 'asset.delete': Server,
  'monitor.create': Radio, 'monitor.update': Radio, 'monitor.delete': Radio,
  'alert.create': BellRing, 'alert.resolve': BellRing,
  'incident.create': Shield, 'incident.update': Shield,
  'user.login': User, 'user.invite': User, 'user.update': User,
  'settings.update': Settings,
};

const actionColors: Record<string, string> = {
  create: 'text-emerald-400 bg-emerald-500/10',
  update: 'text-cyan-400 bg-cyan-500/10',
  delete: 'text-red-400 bg-red-500/10',
  login:  'text-blue-400 bg-blue-500/10',
  resolve:'text-emerald-400 bg-emerald-500/10',
  invite: 'text-yellow-400 bg-yellow-500/10',
};

export default function AuditPage() {
  const { t } = useLang();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: () => apiGet<any>('/api/v1/audit', {
      page, limit,
      ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
    }),
    refetchInterval: 30000,
  });

  const logs = Array.isArray(data) ? data : (data?.data ?? []);
  const total = data?.meta?.total ?? logs.length;
  const totalPages = Math.ceil(total / limit) || 1;

  const filteredLogs = search
    ? logs.filter((l: any) =>
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.details?.toLowerCase?.()?.includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">{t('audit.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('audit.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-edge text-slate-400 hover:text-slate-300 hover:bg-edge/30 transition-all">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap animate-fade-in stagger-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('audit.search')}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-canvas border border-edge text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'create', 'update', 'delete', 'login'].map(f => (
            <button key={f} onClick={() => { setActionFilter(f); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border',
                actionFilter === f
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                  : 'border-edge text-slate-500 hover:text-slate-300'
              )}>
              {f === 'all' ? t('common.all') : f}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({length:8}, (_,i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}</div>
      ) : filteredLogs.length === 0 ? (
        <div className="card p-16 text-center animate-scale-in">
          <FileText size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">{t('audit.empty')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead><tr className="border-b border-edge">
              {[t('audit.time'), t('audit.user'), t('audit.action'), t('audit.resource'), t('audit.details'), 'IP'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-[0.1em]">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredLogs.map((log: any, i: number) => {
                const actionParts = (log.action || '').split('.');
                const actionType = actionParts[1] || actionParts[0];
                const Icon = actionIcons[log.action] || FileText;
                const colorClass = actionColors[actionType] || 'text-slate-400 bg-slate-500/10';
                return (
                  <tr key={log.id || i} className={cn('border-b border-edge/30 hover:bg-edge/15 transition-colors', i === filteredLogs.length-1 && 'border-0')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-slate-600" />
                        <span className="text-[10px] font-mono text-slate-500">{formatDateTime(log.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-canvas-elevated border border-edge flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-slate-400">{log.user?.email?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                        <span className="text-xs text-slate-300">{log.user?.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg', colorClass)}>
                        <Icon size={10} /> {actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-500">{log.resourceType || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{log.details || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-slate-600">{log.ipAddress || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between animate-fade-in">
          <span className="text-xs text-slate-600">{total} {t('audit.entries')}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-edge text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-slate-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-edge text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
