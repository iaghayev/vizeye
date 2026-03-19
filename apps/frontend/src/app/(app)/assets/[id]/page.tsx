'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { apiGet } from '@/lib/api';
import { useLang } from '@/lib/i18n/lang-context';
import { formatRelative, cn } from '@/lib/utils';
import { ArrowLeft, Cpu, HardDrive, MemoryStick, Wifi, Activity,
         Server, AlertTriangle, CheckCircle, RefreshCw, Terminal } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Rəng sxemi ────────────────────────────────────────────────────────────────
const COLORS = {
  cpu:     '#06B6D4',
  mem:     '#8B5CF6',
  disk:    '#F59E0B',
  net_in:  '#10B981',
  net_out: '#EF4444',
  load:    '#F97316',
};

// ── Metrik addan label ────────────────────────────────────────────────────────
function metricLabel(name: string) {
  const map: Record<string,string> = {
    'cpu.usage_percent':   'CPU %',
    'mem.usage_percent':   'RAM %',
    'mem.used_mb':         'RAM İstifadə (MB)',
    'disk.usage_percent':  'Disk %',
    'load.1m':             'Load 1m',
    'load.5m':             'Load 5m',
    'load.15m':            'Load 15m',
    'net.bytes_sent':      'Şəbəkə Göndərilən',
    'net.bytes_recv':      'Şəbəkə Alınan',
    'process.count':       'Proses sayı',
    'process.running':     'İşləyən proses',
    'docker.containers_running': 'Docker konteyner',
    'syslog.errors_per_min': 'Log xətası/dəq',
    'systemd.failed_units':  'Uğursuz servis',
  };
  return map[name] || name;
}

function metricUnit(name: string) {
  if (name.includes('percent')) return '%';
  if (name.includes('_mb'))    return 'MB';
  if (name.includes('bytes'))  return 'B/s';
  if (name.includes('load'))   return '';
  return '';
}

function metricColor(name: string) {
  if (name.includes('cpu'))    return COLORS.cpu;
  if (name.includes('mem'))    return COLORS.mem;
  if (name.includes('disk'))   return COLORS.disk;
  if (name.includes('load'))   return COLORS.load;
  if (name.includes('sent'))   return COLORS.net_out;
  if (name.includes('recv'))   return COLORS.net_in;
  return '#64748b';
}

// ── Mini Stat Card ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, unit, color, warn }: any) {
  return (
    <div className={cn('card p-4 flex items-center gap-3', warn && 'border-red-500/20')}>
      <div className={cn('p-2 rounded-lg', warn ? 'bg-red-500/10' : 'bg-slate-700/50')}>
        <Icon size={16} style={{ color: warn ? '#EF4444' : color }}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="font-display font-bold text-xl mt-0.5" style={{ color: warn ? '#EF4444' : color }}>
          {value ?? '—'}{unit && value != null ? <span className="text-sm font-normal text-slate-500 ml-1">{unit}</span> : ''}
        </p>
      </div>
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-canvas-elevated border border-edge rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-mono text-slate-500 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Əsas komponent ────────────────────────────────────────────────────────────
export default function AssetDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const { t }     = useLang();
  const [tab, setTab] = useState<'overview'|'cpu'|'memory'|'disk'|'network'|'processes'|'logs'>('overview');
  const [range, setRange] = useState(60); // son neçə dəqiqə
  const logRef = useRef<HTMLDivElement>(null);

  // ── Asset məlumatı ────────────────────────────────────────────────────────
  const { data: asset } = useQuery({
    queryKey: ['asset', id],
    queryFn:  () => apiGet<any>(`/api/v1/assets/${id}`),
    refetchInterval: 30000,
  });

  // ── Son metrik dəyərləri (dashboard üçün) ────────────────────────────────
  const { data: latest, refetch: refetchLatest } = useQuery({
    queryKey: ['metrics-latest', id],
    queryFn:  () => apiGet<any>(`/api/v1/metrics/${id}/latest`),
    refetchInterval: 15000,
  });

  // ── Tarixçə metriklər (qrafik üçün) ──────────────────────────────────────
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['metrics-history', id, range],
    queryFn:  () => apiGet<any>(`/api/v1/metrics/${id}/history?minutes=${range}&names=cpu.usage_percent,mem.usage_percent,disk.usage_percent,load.1m,net.bytes_sent,net.bytes_recv`),
    refetchInterval: 30000,
  });

  // ── Log məlumatları ────────────────────────────────────────────────────────
  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['asset-logs', id],
    queryFn:  () => apiGet<any>(`/api/v1/metrics/${id}/latest?names=syslog.errors_per_min,systemd.failed_units,process.count,process.running,docker.containers_running,docker.containers_stopped`),
    refetchInterval: 15000,
  });

  // Log scroll aşağı
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logsData]);

  // ── Metrik dəyər tap ──────────────────────────────────────────────────────
  const getVal = (name: string, data: any = latest) => {
    if (!data?.metrics) return null;
    const m = data.metrics.find((m: any) => m.name === name);
    return m ? Math.round(m.value * 10) / 10 : null;
  };

  // ── Qrafik datanı hazırla ─────────────────────────────────────────────────
  const buildChartData = (metricNames: string[]) => {
    if (!history?.series) return [];
    const timeMap: Record<string, any> = {};

    for (const serie of history.series) {
      if (!metricNames.includes(serie.name)) continue;
      for (const point of (serie.points || [])) {
        const time = new Date(point.time).toLocaleTimeString('az', { hour:'2-digit', minute:'2-digit' });
        if (!timeMap[time]) timeMap[time] = { time };
        timeMap[time][metricLabel(serie.name)] = Math.round(point.value * 10) / 10;
      }
    }

    return Object.values(timeMap).slice(-60);
  };

  const cpuData  = buildChartData(['cpu.usage_percent']);
  const memData  = buildChartData(['mem.usage_percent']);
  const loadData = buildChartData(['load.1m','load.5m','load.15m']);
  const netData  = buildChartData(['net.bytes_sent','net.bytes_recv']);
  const diskData = buildChartData(['disk.usage_percent']);
  const allData  = buildChartData(['cpu.usage_percent','mem.usage_percent','disk.usage_percent']);

  const cpu    = getVal('cpu.usage_percent');
  const mem    = getVal('mem.usage_percent');
  const disk   = getVal('disk.usage_percent');
  const load1m = getVal('load.1m');
  const procCount = getVal('process.count', logsData);
  const dockerRunning = getVal('docker.containers_running', logsData);
  const syslogErrors  = getVal('syslog.errors_per_min', logsData);
  const failedUnits   = getVal('systemd.failed_units', logsData);

  const isOnline = asset?.lastSeenAt &&
    new Date(asset.lastSeenAt) > new Date(Date.now() - 5 * 60 * 1000);

  const TABS = [
    { key:'overview',  label:'İcmal'      },
    { key:'cpu',       label:'CPU'        },
    { key:'memory',    label:'RAM'        },
    { key:'disk',      label:'Disk'       },
    { key:'network',   label:'Şəbəkə'    },
    { key:'processes', label:'Proseslər'  },
    { key:'logs',      label:'Loglar'     },
  ];

  const ChartCard = ({ title, data, lines, height=200 }: any) => (
    <div className="card p-4">
      <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">{title}</p>
      {data.length === 0 ? (
        <div className="flex items-center justify-center text-slate-600 text-sm" style={{height}}>
          Məlumat yoxdur — agent metrik göndərməyib
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top:5, right:10, left:-20, bottom:0 }}>
            <defs>
              {lines.map((l: any) => (
                <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={l.color} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={l.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2740" vertical={false}/>
            <XAxis dataKey="time" tick={{ fill:'#475569', fontSize:10, fontFamily:'monospace' }} tickLine={false} axisLine={false}/>
            <YAxis tick={{ fill:'#475569', fontSize:10, fontFamily:'monospace' }} tickLine={false} axisLine={false} domain={[0,'auto']}/>
            <Tooltip content={<CustomTooltip/>}/>
            {lines.length > 1 && <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }}/>}
            {lines.map((l: any) => (
              <Area key={l.key} type="monotone" dataKey={l.key}
                stroke={l.color} strokeWidth={1.5}
                fill={`url(#grad-${l.key})`} dot={false} name={l.key}/>
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/assets"
          className="p-2 rounded-md text-slate-500 hover:text-slate-300 hover:bg-edge/50 transition-colors mt-1">
          <ArrowLeft size={16}/>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-bold text-xl text-slate-100">
              {asset?.name || '...'}
            </h1>
            <span className={cn('flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-full border',
              isOnline
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-slate-700/30 text-slate-500 border-slate-600/20')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-600')}/>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className="text-sm font-mono text-slate-500">{asset?.ipAddress || asset?.hostname || '—'}</span>
            <span className="text-xs font-mono text-slate-600">{t(`type.${asset?.assetType}`)}</span>
            <span className="text-xs font-mono text-slate-600">{t(`env.${asset?.environment}`)}</span>
            {asset?.osName && <span className="text-xs font-mono text-slate-600">{asset.osName}</span>}
            {asset?.lastSeenAt && (
              <span className="text-xs font-mono text-slate-600">
                Son görünüş: {formatRelative(asset.lastSeenAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Range seçimi */}
          <div className="flex gap-1">
            {[15,60,360,1440].map(m => (
              <button key={m} onClick={() => setRange(m)}
                className={cn('px-2 py-1.5 rounded text-xs font-mono border transition-colors',
                  range === m
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-edge/30 border-edge text-slate-500 hover:border-slate-500')}>
                {m < 60 ? `${m}d` : m < 1440 ? `${m/60}s` : '24s'}
              </button>
            ))}
          </div>
          <button onClick={() => { refetchLatest(); refetchHistory(); refetchLogs(); }}
            className="p-2 rounded-md text-slate-500 hover:text-slate-300 hover:bg-edge/50 transition-colors">
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {/* Canlı stat kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        <StatCard icon={Cpu}        label="CPU"    value={cpu}    unit="%"   color={COLORS.cpu}  warn={cpu != null && cpu > 90}/>
        <StatCard icon={MemoryStick}label="RAM"    value={mem}    unit="%"   color={COLORS.mem}  warn={mem != null && mem > 90}/>
        <StatCard icon={HardDrive}  label="Disk"   value={disk}   unit="%"   color={COLORS.disk} warn={disk != null && disk > 90}/>
        <StatCard icon={Activity}   label="Load 1m" value={load1m} unit=""   color={COLORS.load} warn={load1m != null && load1m > 4}/>
      </div>

      {/* Əlavə stat kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Server}        label="Proses sayı"      value={procCount}       unit=""  color="#64748b"/>
        <StatCard icon={Server}        label="Docker konteyner" value={dockerRunning}   unit=""  color="#06B6D4"/>
        <StatCard icon={AlertTriangle} label="Log xətası/dəq"  value={syslogErrors}    unit=""  color="#F59E0B" warn={syslogErrors != null && syslogErrors > 0}/>
        <StatCard icon={AlertTriangle} label="Uğursuz servis"   value={failedUnits}     unit=""  color="#EF4444" warn={failedUnits != null && failedUnits > 0}/>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-canvas-elevated rounded-lg border border-edge w-fit flex-wrap">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key as any)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              tab === tb.key ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300')}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="CPU İstifadəsi (%)" data={cpuData}
            lines={[{ key:'CPU %', color: COLORS.cpu }]}/>
          <ChartCard title="RAM İstifadəsi (%)" data={memData}
            lines={[{ key:'RAM %', color: COLORS.mem }]}/>
          <ChartCard title="Disk İstifadəsi (%)" data={diskData}
            lines={[{ key:'Disk %', color: COLORS.disk }]}/>
          <ChartCard title="Şəbəkə (Bytes)" data={netData}
            lines={[
              { key:'Şəbəkə Göndərilən', color: COLORS.net_out },
              { key:'Şəbəkə Alınan',      color: COLORS.net_in  },
            ]}/>
        </div>
      )}

      {/* ── CPU ───────────────────────────────────────────────────────────── */}
      {tab === 'cpu' && (
        <div className="space-y-4">
          <ChartCard title="CPU İstifadəsi (%) — Real vaxt" data={cpuData}
            lines={[{ key:'CPU %', color: COLORS.cpu }]} height={280}/>
          <ChartCard title="System Load Average" data={loadData}
            lines={[
              { key:'Load 1m',  color: COLORS.load   },
              { key:'Load 5m',  color: '#F59E0B'     },
              { key:'Load 15m', color: '#D97706'     },
            ]} height={220}/>
          <div className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">CPU Məlumatları</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'CPU %',     value: cpu,    unit:'%',  warn: cpu != null && cpu > 90 },
                { label:'Load 1m',   value: load1m, unit:'',   warn: false },
                { label:'Proses',    value: procCount, unit:'', warn: false },
                { label:'İşləyən',   value: getVal('process.running', logsData), unit:'', warn: false },
              ].map(s => (
                <div key={s.label} className={cn('p-3 rounded-lg border',
                  s.warn ? 'bg-red-500/5 border-red-500/20' : 'bg-canvas-elevated border-edge')}>
                  <p className="text-xs font-mono text-slate-500">{s.label}</p>
                  <p className={cn('font-display font-bold text-xl mt-1',
                    s.warn ? 'text-red-400' : 'text-cyan-400')}>
                    {s.value ?? '—'}{s.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Memory ────────────────────────────────────────────────────────── */}
      {tab === 'memory' && (
        <div className="space-y-4">
          <ChartCard title="RAM İstifadəsi (%) — Real vaxt" data={memData}
            lines={[{ key:'RAM %', color: COLORS.mem }]} height={280}/>
          <div className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">RAM Məlumatları</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label:'İstifadə %', value: mem,                          unit:'%' },
                { label:'İstifadə',   value: getVal('mem.used_mb'),        unit:'MB' },
                { label:'Swap %',     value: getVal('mem.swap_percent'),   unit:'%' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg border bg-canvas-elevated border-edge">
                  <p className="text-xs font-mono text-slate-500">{s.label}</p>
                  <p className="font-display font-bold text-xl mt-1 text-purple-400">
                    {s.value ?? '—'}{s.value != null ? s.unit : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Disk ──────────────────────────────────────────────────────────── */}
      {tab === 'disk' && (
        <div className="space-y-4">
          <ChartCard title="Disk İstifadəsi (%) — Real vaxt" data={diskData}
            lines={[{ key:'Disk %', color: COLORS.disk }]} height={280}/>
          <div className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Disk Məlumatları</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'İstifadə %',    value: disk,                          unit:'%'  },
                { label:'İstifadə',      value: getVal('disk.used_gb'),        unit:'GB' },
                { label:'Boş',           value: getVal('disk.free_gb'),        unit:'GB' },
                { label:'Cəmi',          value: getVal('disk.total_gb'),       unit:'GB' },
              ].map(s => (
                <div key={s.label} className={cn('p-3 rounded-lg border',
                  s.label === 'İstifadə %' && disk != null && disk > 90
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-canvas-elevated border-edge')}>
                  <p className="text-xs font-mono text-slate-500">{s.label}</p>
                  <p className="font-display font-bold text-xl mt-1 text-yellow-400">
                    {s.value ?? '—'}{s.value != null ? s.unit : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Network ───────────────────────────────────────────────────────── */}
      {tab === 'network' && (
        <div className="space-y-4">
          <ChartCard title="Şəbəkə trafiki — Real vaxt" data={netData}
            lines={[
              { key:'Şəbəkə Göndərilən', color: COLORS.net_out },
              { key:'Şəbəkə Alınan',      color: COLORS.net_in  },
            ]} height={280}/>
          <div className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Şəbəkə Məlumatları</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'Göndərilən',  value: getVal('net.bytes_sent'),    unit:'B/s', color:'text-red-400'   },
                { label:'Alınan',      value: getVal('net.bytes_recv'),    unit:'B/s', color:'text-green-400' },
                { label:'Paket göndər',value: getVal('net.packets_sent'),  unit:'',    color:'text-slate-400' },
                { label:'Paket al',    value: getVal('net.packets_recv'),  unit:'',    color:'text-slate-400' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg border bg-canvas-elevated border-edge">
                  <p className="text-xs font-mono text-slate-500">{s.label}</p>
                  <p className={`font-display font-bold text-xl mt-1 ${s.color}`}>
                    {s.value ?? '—'}{s.value != null ? s.unit : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Processes ─────────────────────────────────────────────────────── */}
      {tab === 'processes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Cəmi proses',    value: procCount,                             color:'text-cyan-400'   },
              { label:'İşləyən',        value: getVal('process.running', logsData),   color:'text-green-400'  },
              { label:'Docker running', value: dockerRunning,                          color:'text-blue-400'   },
              { label:'Docker stopped', value: getVal('docker.containers_stopped', logsData), color:'text-slate-400' },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value ?? '—'}</p>
              </div>
            ))}
          </div>
          <div className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
              Proses və Docker metriklər
            </p>
            <p className="text-xs text-slate-500">
              Ətraflı proses siyahısı üçün agentin proses collector-u işləməlidir.
              Agent hər 30 saniyədə bir <code className="text-cyan-400 bg-cyan-500/10 px-1 rounded">process.count</code>,
              <code className="text-cyan-400 bg-cyan-500/10 px-1 rounded">docker.containers_running</code> metrikləri göndərir.
            </p>
          </div>
        </div>
      )}

      {/* ── Logs ──────────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Log xətası/dəq',  value: syslogErrors, color: syslogErrors ? 'text-red-400' : 'text-green-400',  warn: !!syslogErrors },
              { label:'Uğursuz servis',  value: failedUnits,  color: failedUnits  ? 'text-red-400' : 'text-green-400',  warn: !!failedUnits  },
              { label:'Proses sayı',     value: procCount,    color:'text-cyan-400',   warn: false },
              { label:'Docker running',  value: dockerRunning,color:'text-blue-400',   warn: false },
            ].map(s => (
              <div key={s.label} className={cn('card p-4', s.warn && 'border-red-500/20')}>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value ?? '—'}</p>
              </div>
            ))}
          </div>

          {/* Log panel */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-edge bg-canvas-elevated">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-cyan-400"/>
                <span className="text-xs font-mono text-slate-400">System Journal — Son hadisələr</span>
              </div>
              <button onClick={() => refetchLogs()}
                className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-edge/50 transition-colors">
                <RefreshCw size={12}/>
              </button>
            </div>
            <div ref={logRef}
              className="p-4 font-mono text-xs leading-6 max-h-96 overflow-y-auto bg-canvas space-y-0.5">
              {syslogErrors == null && failedUnits == null ? (
                <p className="text-slate-600">
                  Agent log məlumatlarını göndərməyib. Agentin işlədiyini yoxlayın:
                  <br/><span className="text-cyan-400">journalctl -u vizeye-agent -f</span>
                </p>
              ) : (
                <>
                  <div className="text-slate-600">═══ System Status ═══════════════════════════════</div>
                  <div className={cn(syslogErrors ? 'text-red-400' : 'text-green-400')}>
                    [{new Date().toLocaleTimeString()}] syslog.errors_per_min = {syslogErrors ?? 0}
                    {syslogErrors ? '  ⚠ Sistem xətaları var!' : '  ✓ Normal'}
                  </div>
                  <div className={cn(failedUnits ? 'text-red-400' : 'text-green-400')}>
                    [{new Date().toLocaleTimeString()}] systemd.failed_units = {failedUnits ?? 0}
                    {failedUnits ? '  ⚠ Uğursuz servis var!' : '  ✓ Normal'}
                  </div>
                  <div className="text-slate-500">
                    [{new Date().toLocaleTimeString()}] process.count = {procCount ?? '—'}
                  </div>
                  <div className="text-slate-500">
                    [{new Date().toLocaleTimeString()}] docker.containers_running = {dockerRunning ?? '—'}
                  </div>
                  <div className="text-slate-600 mt-2">═══ Son yenilənmə: {new Date().toLocaleString()} ═══</div>
                </>
              )}
            </div>
          </div>

          <div className="card p-4 border-cyan-500/10">
            <p className="text-xs font-mono text-cyan-400 mb-2">Real-time loglar üçün:</p>
            <code className="text-xs font-mono text-slate-400 block bg-canvas-elevated px-3 py-2 rounded border border-edge">
              ssh root@{asset?.ipAddress || 'SERVER_IP'} "journalctl -f"
            </code>
            <p className="text-xs text-slate-600 mt-2">
              VizEye agent sistem log xətalarının sayını izləyir. Tam log axını üçün birbaşa serverə SSH edin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
