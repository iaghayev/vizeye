'use client';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowRight, TrendingUp, TrendingDown, Minus,
  Server, Radio, BellRing, Flame, Activity,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Wifi, WifiOff, Cpu, MemoryStick, HardDrive,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useLang } from '@/lib/i18n/lang-context';
import { cn, formatRelative } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  up:      'bg-green-400',
  down:    'bg-red-400 animate-pulse',
  degraded:'bg-yellow-400',
  timeout: 'bg-orange-400',
  unknown: 'bg-slate-600',
};

const SEV_COLOR: Record<string, string> = {
  critical: 'text-red-400',
  warning:  'text-yellow-400',
  info:     'text-blue-400',
};

const INC_STATUS: Record<string, string> = {
  open:         'bg-red-500/10 text-red-400 border-red-500/20',
  acknowledged: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  in_progress:  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-canvas-elevated border border-edge rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] font-mono text-slate-500 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="font-mono font-bold" style={{ color: p.color }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
            {p.name?.includes('%') ? '%' : p.name?.includes('ms') ? 'ms' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, href, trend, loading }: any) {
  const card = (
    <div className={cn(
      'card p-5 flex flex-col gap-3 transition-all',
      href && 'hover:border-cyan-500/30 cursor-pointer'
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn('p-1.5 rounded-md', `bg-${color}-500/10`)}>
          <Icon size={14} className={`text-${color}-400`}/>
        </div>
      </div>
      {loading ? (
        <div className="skeleton h-8 w-16 rounded"/>
      ) : (
        <div className="flex items-end gap-2">
          <p className={cn('font-display font-bold text-3xl tabular-nums animate-count-up', `text-${color}-400`)}>
            {value ?? '—'}
          </p>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-0.5 text-xs font-mono mb-1',
              trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-slate-600')}>
              {trend > 0 ? <TrendingUp size={12}/> : trend < 0 ? <TrendingDown size={12}/> : <Minus size={12}/>}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      )}
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

// ── Mini spark chart ──────────────────────────────────────────────────────────
function SparkChart({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={pts} margin={{ top:2, right:0, left:0, bottom:0 }}>
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.3}/>
            <stop offset="100%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color})`} dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Metric mini card ──────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, spark, color, icon: Icon }: any) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-slate-500"/>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{label}</p>
        </div>
        <p className="font-display font-bold text-lg tabular-nums" style={{ color }}>
          {value != null ? `${Math.round(value)}` : '—'}
          <span className="text-xs font-normal text-slate-600 ml-0.5">{unit}</span>
        </p>
      </div>
      {spark?.length > 0 && <SparkChart data={spark} color={color}/>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useLang();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // ─── FIX: Düzgün endpoint → /api/v1/org/stats ───
  const { data: orgStats, isLoading: lo } = useQuery({
    queryKey: ['org-stats'],
    queryFn:  () => apiGet<any>('/api/v1/org/stats'),
    refetchInterval: 30000,
  });

  const { data: alertSum } = useQuery({
    queryKey: ['alert-summary'],
    queryFn:  () => apiGet<any>('/api/v1/alerts/events/summary'),
    refetchInterval: 15000,
  });

  const { data: incStats } = useQuery({
    queryKey: ['incident-stats'],
    queryFn:  () => apiGet<any>('/api/v1/incidents/stats'),
    refetchInterval: 30000,
  });

  const { data: monitors } = useQuery({
    queryKey: ['monitors-dash'],
    queryFn:  () => apiGet<any>('/api/v1/monitors?limit=12'),
    refetchInterval: 15000,
  });

  const { data: alertEvents } = useQuery({
    queryKey: ['alert-events-dash'],
    queryFn:  () => apiGet<any>('/api/v1/alerts/events?limit=8'),
    refetchInterval: 15000,
  });

  const { data: incidents } = useQuery({
    queryKey: ['incidents-dash'],
    queryFn:  () => apiGet<any>('/api/v1/incidents?limit=5&status=open'),
    refetchInterval: 30000,
  });

  const { data: assets } = useQuery({
    queryKey: ['assets-dash'],
    queryFn:  () => apiGet<any>('/api/v1/assets?limit=10'),
    refetchInterval: 60000,
  });

  // Metrics for top assets (agent data)
  const { data: topMetrics } = useQuery({
    queryKey: ['top-metrics'],
    queryFn:  async () => {
      const assetList = Array.isArray(assets) ? assets : (assets?.data ?? []);
      const withAgent = assetList.filter((a: any) => a.lastSeenAt &&
        new Date(a.lastSeenAt) > new Date(Date.now() - 5 * 60 * 1000));
      if (!withAgent.length) return [];
      const results = await Promise.all(
        withAgent.slice(0, 3).map(async (a: any) => {
          try {
            const m = await apiGet<any>(`/api/v1/metrics/${a.id}/latest`);
            const get = (name: string) => m?.metrics?.find((x: any) => x.name === name)?.value ?? null;
            return {
              id: a.id, name: a.name, ip: a.ipAddress,
              cpu:  get('cpu.usage_percent'),
              mem:  get('mem.usage_percent'),
              disk: get('disk.usage_percent'),
              load: get('load.1m'),
            };
          } catch { return null; }
        })
      );
      return results.filter(Boolean);
    },
    enabled: !!assets,
    refetchInterval: 30000,
  });

  const monList   = Array.isArray(monitors)     ? monitors     : (monitors?.data     ?? []);
  const evtList   = Array.isArray(alertEvents)  ? alertEvents  : (alertEvents?.data  ?? []);
  const incList   = Array.isArray(incidents)    ? incidents    : (incidents?.data    ?? []);
  const metricList= topMetrics ?? [];

  // ─── FIX: Backend-dən gələn monitorsUp/Down istifadə et ───
  const upCount   = orgStats?.monitorsUp   ?? monList.filter((m: any) => m.lastStatus === 'up').length;
  const downCount = orgStats?.monitorsDown ?? monList.filter((m: any) => m.lastStatus === 'down').length;

  // Response time chart data
  const rtChartData = monList
    .filter((m: any) => m.lastResponseTimeMs != null)
    .slice(0, 8)
    .map((m: any) => ({
      name: m.name.length > 12 ? m.name.substring(0, 12) + '…' : m.name,
      ms:   m.lastResponseTimeMs,
    }));

  // ─── FIX: Asset online/offline — həm agent həm monitor status yoxla ───
  const getAssetStatus = (a: any) => {
    // 1) Agent lastSeenAt ilə yoxla
    const agentOnline = a.lastSeenAt &&
      new Date(a.lastSeenAt) > new Date(Date.now() - 5 * 60 * 1000);
    if (agentOnline) return 'online';

    // 2) Əgər agenti yoxdursa, monitorlarına bax
    const assetMonitors = monList.filter((m: any) => m.assetId === a.id);
    if (assetMonitors.length > 0) {
      const anyUp = assetMonitors.some((m: any) => m.lastStatus === 'up');
      const anyDown = assetMonitors.some((m: any) => m.lastStatus === 'down');
      if (anyUp) return 'online';
      if (anyDown) return 'offline';
      return 'unknown';
    }

    // 3) Heç bir məlumat yoxdursa
    return a.lastSeenAt ? 'offline' : 'unknown';
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">{t('dashboard.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
          <span>Canlı — hər 30 saniyə yenilənir</span>
        </div>
      </div>

      {/* ── Stat Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t('dashboard.totalAssets')}
          value={orgStats?.totalAssets}
          sub={`${orgStats?.onlineAssets ?? 0} online`}
          icon={Server} color="cyan" href="/assets" loading={lo}/>
        <StatCard
          label={t('dashboard.monitors')}
          value={orgStats?.activeMonitors ?? monList.length}
          sub={`${upCount} up · ${downCount} down`}
          icon={Radio} color="blue" href="/monitors" loading={lo}/>
        <StatCard
          label={t('dashboard.alerts')}
          value={alertSum?.totalFiring ?? 0}
          sub={`${alertSum?.resolved24h ?? 0} həll edildi (24s)`}
          icon={BellRing}
          color={(alertSum?.totalFiring || 0) > 0 ? 'red' : 'green'}
          href="/alerts"/>
        <StatCard
          label={t('dashboard.incidents')}
          value={incStats?.open ?? orgStats?.openIncidents ?? 0}
          sub={`${incStats?.resolved24h ?? 0} bu gün həll edildi`}
          icon={Flame}
          color={(incStats?.open || orgStats?.openIncidents || 0) > 0 ? 'yellow' : 'green'}
          href="/incidents"/>
      </div>

      {/* ── Agent Metrik Kartlar ─────────────────────────────────────────── */}
      {metricList.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={13} className="text-cyan-400"/>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Canlı Server Metriklər
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metricList.map((m: any) => (
              <Link key={m.id} href={`/assets/${m.id}`}>
                <div className="card p-4 hover:border-cyan-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                    <p className="text-sm font-medium text-slate-200">{m.name}</p>
                    <p className="text-xs font-mono text-slate-600 ml-auto">{m.ip}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label:'CPU', value: m.cpu,  color:'#06B6D4', warn: m.cpu  > 85 },
                      { label:'RAM', value: m.mem,  color:'#8B5CF6', warn: m.mem  > 85 },
                      { label:'DSK', value: m.disk, color:'#F59E0B', warn: m.disk > 85 },
                      { label:'LD',  value: m.load, color:'#F97316', warn: m.load > 4, unit:'' },
                    ].map(s => (
                      <div key={s.label} className={cn('text-center p-2 rounded-md',
                        s.warn ? 'bg-red-500/10' : 'bg-canvas-elevated')}>
                        <p className="text-[10px] font-mono text-slate-600 mb-0.5">{s.label}</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: s.warn ? '#EF4444' : s.color }}>
                          {s.value != null ? `${Math.round(s.value)}${s.unit !== '' ? '%' : ''}` : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Monitor Status */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio size={14} className="text-cyan-400"/>
              <p className="font-display font-semibold text-sm text-slate-200">
                {t('dashboard.monitorStatus')}
              </p>
            </div>
            <Link href="/monitors"
              className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
              {t('common.manage')} <ArrowRight size={11}/>
            </Link>
          </div>

          {monList.length === 0 ? (
            <div className="text-center py-8">
              <Radio size={24} className="text-slate-700 mx-auto mb-2"/>
              <p className="text-sm text-slate-600">{t('monitors.empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {monList.map((m: any) => (
                <Link key={m.id} href="/monitors"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-edge
                             bg-canvas-elevated hover:border-edge-bright hover:bg-edge/20 transition-all">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[m.lastStatus] || 'bg-slate-600')}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{m.name}</p>
                    <p className="text-[10px] font-mono text-slate-600 truncate">{m.target}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {m.lastResponseTimeMs != null && (
                      <p className={cn('text-[10px] font-mono',
                        m.lastResponseTimeMs > 2000 ? 'text-red-400' :
                        m.lastResponseTimeMs > 1000 ? 'text-yellow-400' : 'text-slate-600')}>
                        {m.lastResponseTimeMs}ms
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-slate-700">
                      {m.lastCheckedAt ? formatRelative(m.lastCheckedAt) : '—'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Response Time Bar Chart */}
          {rtChartData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-edge">
              <p className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-3">
                Cavab Vaxtı (ms)
              </p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={rtChartData} margin={{ top:0, right:0, left:-30, bottom:0 }}>
                  <XAxis dataKey="name" tick={{ fill:'#475569', fontSize:9, fontFamily:'monospace' }}
                    tickLine={false} axisLine={false}/>
                  <YAxis tick={{ fill:'#475569', fontSize:9 }} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="ms" fill="#06B6D4" radius={[2,2,0,0]} maxBarSize={20}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Alert Events */}
          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing size={14} className="text-cyan-400"/>
                <p className="font-display font-semibold text-sm text-slate-200">
                  {t('dashboard.alertEvents')}
                </p>
              </div>
              <Link href="/alerts"
                className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400">
                <ArrowRight size={11}/>
              </Link>
            </div>

            {evtList.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle size={20} className="text-green-500 mx-auto mb-1.5"/>
                <p className="text-xs text-slate-500">{t('alerts.allClear')}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {evtList.map((a: any) => (
                  <Link key={a.id} href="/alerts"
                    className="flex items-start gap-2.5 px-2.5 py-2 rounded-md
                               hover:bg-edge/40 transition-colors">
                    <div className={cn('w-0.5 self-stretch rounded-full shrink-0 mt-0.5',
                      a.severity === 'critical' ? 'bg-red-500' :
                      a.severity === 'warning'  ? 'bg-yellow-500' : 'bg-blue-500')}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">
                        {a.rule?.name || 'Alert'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[10px] font-mono', SEV_COLOR[a.severity])}>
                          {a.severity}
                        </span>
                        {a.asset && (
                          <span className="text-[10px] font-mono text-slate-600">{a.asset.name}</span>
                        )}
                        <span className="text-[10px] font-mono text-slate-700 ml-auto">
                          {formatRelative(a.firedAt)}
                        </span>
                      </div>
                    </div>
                    {a.status === 'firing' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0 mt-1.5"/>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Incidents */}
          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-cyan-400"/>
                <p className="font-display font-semibold text-sm text-slate-200">
                  {t('dashboard.openIncidents')}
                </p>
              </div>
              <Link href="/incidents"
                className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400">
                <ArrowRight size={11}/>
              </Link>
            </div>

            {incList.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle size={20} className="text-green-500 mx-auto mb-1.5"/>
                <p className="text-xs text-slate-500">{t('incidents.stable')}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {incList.map((inc: any) => (
                  <Link key={inc.id} href="/incidents"
                    className="block px-2.5 py-2 rounded-md hover:bg-edge/40 transition-colors">
                    <p className="text-xs font-medium text-slate-300 truncate">{inc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded-full border',
                        INC_STATUS[inc.status] || 'bg-slate-700/30 text-slate-500 border-slate-600/20')}>
                        {t(`incidents.${inc.status === 'in_progress' ? 'inProgress' : inc.status}`)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-700 ml-auto">
                        {formatRelative(inc.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Asset Overview — FIX: monitor + agent statusu birlikdə yoxla ─── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-cyan-400"/>
            <p className="font-display font-semibold text-sm text-slate-200">Asset Statusu</p>
          </div>
          <Link href="/assets"
            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400">
            Hamısı <ArrowRight size={11}/>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {(Array.isArray(assets) ? assets : (assets?.data ?? [])).map((a: any) => {
            const status = getAssetStatus(a);
            return (
              <Link key={a.id} href={`/assets/${a.id}`}>
                <div className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all',
                  'hover:border-cyan-500/30 cursor-pointer',
                  status === 'online'  ? 'border-green-500/15 bg-green-500/3' :
                  status === 'offline' ? 'border-red-500/15 bg-red-500/3' :
                                         'border-edge bg-canvas-elevated'
                )}>
                  {status === 'online'
                    ? <Wifi    size={12} className="text-green-400 shrink-0"/>
                    : status === 'offline'
                    ? <WifiOff size={12} className="text-red-400 shrink-0"/>
                    : <WifiOff size={12} className="text-slate-600 shrink-0"/>}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{a.name}</p>
                    <p className="text-[10px] font-mono text-slate-600 truncate">
                      {a.ipAddress || a.hostname || '—'}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
