'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Radar, Play, Plus, Server, Wifi, Network, Check, Shield, Database } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Host {
  ipAddress: string;
  hostname?: string;
  openPorts: number[];
  responseTimeMs: number | null;
  suggestedType: string;
  isNew: boolean;
}

const PORT_LABELS: Record<number, string> = {
  22:'SSH', 80:'HTTP', 443:'HTTPS', 3306:'MySQL',
  5432:'PG', 8080:'HTTP-alt', 161:'SNMP',
  3389:'RDP', 6379:'Redis', 27017:'MongoDB',
};

const SNMP_OIDS = [
  { category:'Sistem',   oids:[
    { oid:'1.3.6.1.2.1.1.1.0', name:'sysDescr',    desc:'Sistem təsviri' },
    { oid:'1.3.6.1.2.1.1.3.0', name:'sysUpTime',   desc:'Uptime' },
    { oid:'1.3.6.1.2.1.1.5.0', name:'sysName',     desc:'Ad' },
    { oid:'1.3.6.1.2.1.1.6.0', name:'sysLocation', desc:'Yer' },
    { oid:'1.3.6.1.2.1.1.4.0', name:'sysContact',  desc:'Əlaqə' },
  ]},
  { category:'Cisco',    oids:[
    { oid:'1.3.6.1.4.1.9.2.1.57.0', name:'cpuLoad1m', desc:'CPU Load 1m %' },
    { oid:'1.3.6.1.4.1.9.2.1.58.0', name:'cpuLoad5m', desc:'CPU Load 5m %' },
  ]},
  { category:'Windows',  oids:[
    { oid:'1.3.6.1.2.1.25.3.3.1.2.0', name:'cpuUtil',     desc:'CPU %' },
    { oid:'1.3.6.1.2.1.25.2.3.1.6.1', name:'diskUsed',    desc:'Disk İstifadəsi' },
  ]},
  { category:'HP/Aruba', oids:[
    { oid:'1.3.6.1.4.1.11.2.14.11.1.2.6.1.4.1', name:'cpuUtil', desc:'CPU %' },
  ]},
];

export default function DiscoveryPage() {
  const { t } = useLang();
  const qc    = useQueryClient();

  const [activeTab,    setActiveTab]    = useState<'discovery'|'snmp'>('discovery');
  const [range,        setRange]        = useState('192.168.1.1-254');
  const [ports,        setPorts]        = useState('22,80,443,3306,5432,8080,161,3389');
  const [result,       setResult]       = useState<any>(null);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [previewCount, setPreviewCount] = useState<number|null>(null);

  // SNMP state
  const [snmpHost,    setSnmpHost]    = useState('');
  const [snmpComm,    setSnmpComm]    = useState('public');
  const [snmpOid,     setSnmpOid]     = useState('1.3.6.1.2.1.1.1.0');
  const [snmpResult,  setSnmpResult]  = useState<any>(null);
  const [snmpDevInfo, setSnmpDevInfo] = useState<any>(null);

  const previewMut = useMutation({
    mutationFn: () => apiPost<any>('/api/v1/discovery/preview', { range }),
    onSuccess:  (d) => setPreviewCount(d.count),
    onError:    () => toast.error('Yanlış range formatı'),
  });

  const scanMut = useMutation({
    mutationFn: () => apiPost<any>('/api/v1/discovery/scan', {
      range,
      ports: ports.split(',').map(p => parseInt(p.trim())).filter(Boolean),
      maxConcurrent: 20,
    }),
    onSuccess: (d) => { setResult(d); setSelected(new Set()); },
    onError:   () => toast.error(t('common.error')),
  });

  const importMut = useMutation({
    mutationFn: (hosts: Host[]) => apiPost<any>('/api/v1/discovery/import', { hosts }),
    onSuccess:  (d) => { qc.invalidateQueries({ queryKey:['assets'] }); toast.success(`${d.created} aktiv yaradıldı`); },
    onError:    () => toast.error(t('common.error')),
  });

  const snmpTestMut = useMutation({
    mutationFn: () => apiPost<any>('/api/v1/snmp/test', {
      host: snmpHost, community: snmpComm, oid: snmpOid,
    }),
    onSuccess: (d) => setSnmpResult(d),
    onError:   () => toast.error('SNMP xətası'),
  });

  const snmpDevMut = useMutation({
    mutationFn: () => apiPost<any>('/api/v1/snmp/device-info', {
      host: snmpHost, community: snmpComm,
    }),
    onSuccess: (d) => setSnmpDevInfo(d),
    onError:   () => toast.error('SNMP cihaz məlumatı alınmadı'),
  });


  const toggleSelect = (ip: string) => {
    const next = new Set(selected);
    next.has(ip) ? next.delete(ip) : next.add(ip);
    setSelected(next);
  };

  const selectNew = () => {
    if (!result?.hosts) return;
    setSelected(new Set(result.hosts.filter((h:Host) => h.isNew).map((h:Host) => h.ipAddress)));
  };

  const importSelected = () => {
    if (!result?.hosts) return;
    importMut.mutate(result.hosts.filter((h:Host) => selected.has(h.ipAddress)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
          <Radar size={20} className="text-cyan-400"/> Auto-Discovery & SNMP
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Şəbəkəni tara, SNMP cihazlarını izlə</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-canvas-elevated rounded-lg border border-edge w-fit">
        {([
          { key:'discovery', label:'Şəbəkə Skanı', icon: Radar },
          { key:'snmp',      label:'SNMP Monitor',  icon: Shield },
        ] as const).map(tb => (
          <button key={tb.key} onClick={() => setActiveTab(tb.key)}
            className={cn('flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tb.key ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300')}>
            <tb.icon size={14}/>{tb.label}
          </button>
        ))}
      </div>

      {/* ── Discovery Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'discovery' && (
        <>
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-slate-200 text-sm">Skan Konfiqurasiyası</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">IP Aralığı</label>
                <input value={range} onChange={e => { setRange(e.target.value); setPreviewCount(null); }}
                  placeholder="192.168.1.1-254  |  192.168.1.0/24  |  10.0.0.1"
                  className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                             text-slate-200 placeholder:text-slate-600 font-mono
                             focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                <p className="text-xs text-slate-600 mt-1">Format: 192.168.1.1-254 · 10.0.0.0/24 · tək IP</p>
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Port Siyahısı</label>
                <input value={ports} onChange={e => setPorts(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                             text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Object.entries(PORT_LABELS).map(([p,l]) => (
                    <button key={p} onClick={() => {
                      const arr = new Set(ports.split(',').map(x=>x.trim()).filter(Boolean));
                      arr.has(p) ? arr.delete(p) : arr.add(p);
                      setPorts([...arr].join(','));
                    }}
                    className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors',
                      ports.includes(p)
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-slate-700/30 text-slate-500 border-slate-600/20 hover:border-slate-500')}>
                      {p} {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => previewMut.mutate()} disabled={!range || previewMut.isPending}
                className="px-4 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50">
                Önizlə
              </button>
              {previewCount !== null && (
                <span className="text-sm text-slate-400 font-mono">{previewCount} IP skanlanacaq</span>
              )}
              <button onClick={() => scanMut.mutate()} disabled={scanMut.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                <Play size={14}/>{scanMut.isPending ? 'Skanlanır...' : 'Skanı Başlat'}
              </button>
              {scanMut.isPending && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"/>
                  Şəbəkə taranır...
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'Skanlandı', value:result.scanned, color:'text-cyan-400'  },
                  { label:'Tapıldı',   value:result.found,   color:'text-green-400' },
                  { label:'Yeni',      value:result.newHosts,color:'text-yellow-400'},
                ].map(s => (
                  <div key={s.label} className="card p-4 text-center">
                    <p className="text-xs font-mono text-slate-500 uppercase mb-1">{s.label}</p>
                    <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {result.found > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={selectNew}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
                    Yeniləri seç ({result.newHosts})
                  </button>
                  {selected.size > 0 && (
                    <button onClick={importSelected} disabled={importMut.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                      <Plus size={14}/>{selected.size} hostu import et
                    </button>
                  )}
                  <span className="text-xs font-mono text-slate-600">{selected.size} seçilib</span>
                </div>
              )}

              {result.hosts.length === 0 ? (
                <div className="card p-8 text-center">
                  <Radar size={28} className="text-slate-600 mx-auto mb-3"/>
                  <p className="text-slate-500">Heç bir aktiv host tapılmadı</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-edge">
                        <th className="w-10 px-4 py-3"></th>
                        <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">IP</th>
                        <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase hidden sm:table-cell">Hostname</th>
                        <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">Portlar</th>
                        <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase hidden md:table-cell">Növ</th>
                        <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.hosts.map((h:Host, i:number) => (
                        <tr key={h.ipAddress} onClick={() => toggleSelect(h.ipAddress)}
                          className={cn('border-b border-edge/50 cursor-pointer transition-colors',
                            i === result.hosts.length-1 && 'border-0',
                            selected.has(h.ipAddress) ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : 'hover:bg-edge/20')}>
                          <td className="px-4 py-3">
                            <div className={cn('w-4 h-4 rounded border flex items-center justify-center transition-colors',
                              selected.has(h.ipAddress) ? 'bg-cyan-500 border-cyan-500' : 'border-edge')}>
                              {selected.has(h.ipAddress) && <Check size={10} className="text-white"/>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-mono text-slate-200">{h.ipAddress}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-xs font-mono text-slate-500">{h.hostname || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {h.openPorts.map(p => (
                                <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-edge">
                                  {p}{PORT_LABELS[p] ? ` ${PORT_LABELS[p]}` : ''}
                                </span>
                              ))}
                              {h.openPorts.length === 0 && <span className="text-xs text-slate-600">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-slate-400">{t(`type.${h.suggestedType}`)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded-full border',
                              h.isNew ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                      : 'bg-slate-700/20 text-slate-500 border-slate-700/20')}>
                              {h.isNew ? 'Yeni' : 'Mövcud'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SNMP Tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'snmp' && (
        <div className="space-y-5">
          {/* SNMP Config */}
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-slate-200 text-sm">SNMP Konfiqurasiya</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Host / IP *</label>
                <input value={snmpHost} onChange={e => setSnmpHost(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                             text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Community String</label>
                <input value={snmpComm} onChange={e => setSnmpComm(e.target.value)}
                  placeholder="public"
                  className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                             text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">OID</label>
                <input value={snmpOid} onChange={e => setSnmpOid(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                             text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => snmpTestMut.mutate()} disabled={!snmpHost || snmpTestMut.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50">
                <Play size={13}/>{snmpTestMut.isPending ? 'Sorğulanır...' : 'OID Sorğula'}
              </button>
              <button onClick={() => snmpDevMut.mutate()} disabled={!snmpHost || snmpDevMut.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                <Server size={13}/>{snmpDevMut.isPending ? 'Yüklənir...' : 'Cihaz Məlumatları'}
              </button>
            </div>
          </div>

          {/* Single OID result */}
          {snmpResult && (
            <div className={cn('card p-4 border', snmpResult.status === 'up' ? 'border-green-500/20' : 'border-red-500/20')}>
              <div className="flex items-center gap-2 mb-2">
                {snmpResult.status === 'up'
                  ? <Wifi size={14} className="text-green-400"/>
                  : <Wifi size={14} className="text-red-400"/>}
                <p className="text-sm font-medium text-slate-200">OID Sorğu Nəticəsi</p>
                {snmpResult.responseTimeMs && (
                  <span className="text-xs font-mono text-slate-500 ml-auto">{snmpResult.responseTimeMs}ms</span>
                )}
              </div>
              {snmpResult.value ? (
                <code className="text-xs font-mono text-cyan-400 block bg-canvas-elevated rounded p-3 border border-edge break-all">
                  {snmpResult.value}
                </code>
              ) : (
                <p className="text-xs text-red-400">{snmpResult.error || 'Cavab alınmadı'}</p>
              )}
            </div>
          )}

          {/* Device info */}
          {snmpDevInfo && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', snmpDevInfo.reachable ? 'bg-green-400' : 'bg-red-400')}/>
                <h3 className="font-display font-semibold text-slate-200 text-sm">
                  {snmpDevInfo.host} — Cihaz Məlumatları
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(snmpDevInfo.info || {}).map(([key, val]) => (
                  <div key={key} className="bg-canvas-elevated rounded-md p-3 border border-edge">
                    <p className="text-xs font-mono text-slate-500 uppercase mb-1">{key}</p>
                    <p className="text-sm font-mono text-slate-300 break-all">{String(val) || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OID Kataloqu */}
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Database size={14} className="text-cyan-400"/> SNMP OID Kataloqu
            </h3>
            <div className="space-y-4">
              {SNMP_OIDS.map(cat => (
                <div key={cat.category}>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">{cat.category}</p>
                  <div className="space-y-1">
                    {cat.oids.map(item => (
                      <div key={item.oid}
                        className="flex items-center gap-3 px-3 py-2 rounded-md bg-canvas-elevated border border-edge hover:border-cyan-500/30 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-300">{item.name}</p>
                          <code className="text-[10px] font-mono text-slate-500">{item.oid}</code>
                        </div>
                        <p className="text-xs text-slate-600 hidden sm:block">{item.desc}</p>
                        <button
                          onClick={() => { setSnmpOid(item.oid); toast.success(`OID seçildi: ${item.name}`); }}
                          className="text-[10px] font-mono px-2 py-1 rounded bg-cyan-500/10 text-cyan-400
                                     border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors shrink-0">
                          Seç
                        </button>
                        {snmpHost && (
                          <button
                            onClick={() => {
                              setSnmpOid(item.oid);
                              setTimeout(() => snmpTestMut.mutate(), 100);
                            }}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-slate-700/50 text-slate-400
                                       border border-edge hover:bg-slate-700 transition-colors shrink-0">
                            Test
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
