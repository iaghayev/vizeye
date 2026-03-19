'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, X, CheckCircle, XCircle, AlertTriangle, Clock, Pencil, ChevronDown } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { formatRelative, cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';

const statusIcon: any = {
  up:      <CheckCircle   size={13} className="text-green-400"/>,
  down:    <XCircle       size={13} className="text-red-400"/>,
  degraded:<AlertTriangle size={13} className="text-yellow-400"/>,
  timeout: <Clock         size={13} className="text-yellow-400"/>,
};

const MONITOR_TYPES = [
  { value:'https',      label:'HTTPS',          group:'🌐 Web',     desc:'HTTPS endpoint, keyword yoxlama' },
  { value:'http',       label:'HTTP',           group:'🌐 Web',     desc:'HTTP endpoint yoxlama' },
  { value:'ssl_expiry', label:'SSL Sertifikat', group:'🌐 Web',     desc:'SSL bitmə tarixini izlə' },
  { value:'tcp',        label:'TCP Port',       group:'🔌 Network', desc:'TCP port açıqdırmı' },
  { value:'ping',       label:'Ping (ICMP)',    group:'🔌 Network', desc:'Host əlçatandırmı' },
  { value:'dns',        label:'DNS',            group:'🔌 Network', desc:'DNS sorğu yoxla' },
  { value:'agent',      label:'Agent Metriki',  group:'🤖 Agent',   desc:'CPU/RAM/Disk/Net metriklər' },
  { value:'snmp',       label:'SNMP',           group:'🔌 Network', desc:'Switch/Router/Printer SNMP yoxla' },
];

const EMPTY: any = {
  name:'', monitorType:'https', target:'', intervalSec:60,
  timeoutSec:10, assetId:'', config:{},
};

export default function MonitorsPage() {
  const { t } = useLang();
  const qc = useQueryClient();

  const [tab,          setTab]     = useState<'list'|'form'>('list');
  const [editing,      setEditing] = useState<any>(null);
  const [form,         setForm]    = useState<any>({ ...EMPTY });
  const [typeOpen,     setTypeOpen]= useState(false);
  const [filterStatus, setFilter]  = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['monitors'],
    queryFn:  () => apiGet<any>('/api/v1/monitors'),
    refetchInterval: 15000,
  });
  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn:  () => apiGet<any>('/api/v1/assets'),
  });

  const allMonitors = Array.isArray(data) ? data : (data?.data ?? []);
  const monitors    = allMonitors.filter((m:any) =>
    filterStatus === 'all' || m.lastStatus === filterStatus);
  const assetList   = Array.isArray(assets) ? assets : (assets?.data ?? []);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d:any) => apiPost('/api/v1/monitors', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['monitors'] });
      setTab('list'); setForm({ ...EMPTY }); setEditing(null);
      toast.success(t('common.success'));
    },
    onError: (e:any) => {
      const msg = e?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || t('common.error'));
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }:{ id:string; data:any }) =>
      apiPatch(`/api/v1/monitors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['monitors'] });
      setTab('list'); setForm({ ...EMPTY }); setEditing(null);
      toast.success(t('common.success'));
    },
    onError: (e:any) => {
      const msg = e?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || t('common.error'));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id:string) => apiDelete(`/api/v1/monitors/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey:['monitors'] }); toast.success(t('common.success')); },
  });

  const checkNowMut = useMutation({
    mutationFn: (id:string) => apiPost(`/api/v1/monitors/${id}/check-now`),
    onSuccess:  () => toast.success('Yoxlama başladıldı'),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setTab('form'); };

  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      name:        m.name         || '',
      monitorType: m.monitorType  || 'https',
      target:      m.target       || '',
      intervalSec: m.intervalSec  || 60,
      timeoutSec:  m.timeoutSec   || 10,
      assetId:     m.assetId      || '',
      config:      m.config       || {},
    });
    setTab('form');
  };

  const handleSubmit = () => {
    // Validation
    if (!form.name.trim()) { toast.error('Monitor adı tələb olunur'); return; }
    if (form.monitorType !== 'agent' && !form.target.trim()) {
      toast.error('Hədəf (target) tələb olunur'); return;
    }
    if (form.monitorType === 'agent' && !form.assetId) {
      toast.error('Agent monitor üçün asset seçilməlidir'); return;
    }

    const payload: any = {
      name:        form.name.trim(),
      monitorType: form.monitorType,
      intervalSec: Number(form.intervalSec) || 60,
      timeoutSec:  Number(form.timeoutSec)  || 10,
      config:      form.config || {},
      isActive:    true,
    };

    // Agent monitor üçün target assetId olur
    if (form.monitorType === 'agent') {
      payload.target  = form.assetId;
      payload.assetId = form.assetId;
    } else {
      payload.target  = form.target.trim();
      payload.assetId = form.assetId || null;
    }

    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending      = createMut.isPending || updateMut.isPending;
  const selectedType   = MONITOR_TYPES.find(mt => mt.value === form.monitorType);
  const stats = {
    total: allMonitors.length,
    up:    allMonitors.filter((m:any) => m.lastStatus === 'up').length,
    down:  allMonitors.filter((m:any) => m.lastStatus === 'down').length,
    agent: allMonitors.filter((m:any) => m.monitorType === 'agent').length,
  };

  // ── Config fields ──────────────────────────────────────────────────────────
  const ConfigFields = () => {
    const set = (key: string, val: any) =>
      setForm((f:any) => ({ ...f, config: { ...f.config, [key]: val } }));

    switch (form.monitorType) {
      case 'https':
      case 'http':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Gözlənilən HTTP Status</label>
              <input type="number" value={form.config.expectedStatus ?? 200}
                onChange={e => set('expectedStatus', +e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Keyword (istəgəl)</label>
              <input placeholder="OK, status:up..." value={form.config.keyword || ''}
                onChange={e => set('keyword', e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Degraded hədd (ms)</label>
              <input type="number" value={form.config.degradedThresholdMs ?? 1500}
                onChange={e => set('degradedThresholdMs', +e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="fr"
                checked={form.config.followRedirects !== false}
                onChange={e => set('followRedirects', e.target.checked)}
                className="rounded border-edge accent-cyan-500"/>
              <label htmlFor="fr" className="text-sm text-slate-400">Redirect-ləri izlə</label>
            </div>
          </div>
        );
      case 'ssl_expiry':
        return (
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Xəbərdarlıq (bitmədən neçə gün əvvəl)</label>
            <input type="number" value={form.config.warningDaysBeforeExpiry ?? 14}
              onChange={e => set('warningDaysBeforeExpiry', +e.target.value)}
              className="field-input w-32"/>
            <p className="text-xs text-slate-600 mt-1">Standart: 14 gün</p>
          </div>
        );
      case 'ping':
        return (
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Paket sayı</label>
            <input type="number" value={form.config.packetCount ?? 4}
              onChange={e => set('packetCount', +e.target.value)}
              className="field-input w-32"/>
          </div>
        );
            case 'snmp':
        return (
          <div className="space-y-0 border border-edge rounded-lg overflow-hidden">
            {/* Interface header */}
            <div className="grid grid-cols-12 gap-0 text-[10px] font-mono text-slate-500 uppercase px-4 py-2 bg-canvas-elevated border-b border-edge">
              <span className="col-span-1">Tip</span>
              <span className="col-span-3">IP Ünvanı</span>
              <span className="col-span-3">DNS Adı</span>
              <span className="col-span-2">Qoşulma</span>
              <span className="col-span-2">Port</span>
              <span className="col-span-1">Standart</span>
            </div>
            {/* Interface row */}
            <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-canvas-elevated/30 border-b border-edge">
              <div className="col-span-1">
                <span className="text-xs font-mono font-bold text-cyan-400">SNMP</span>
              </div>
              <div className="col-span-3">
                <input value={form.target.split(':')[0] || ''}
                  onChange={e => {
                    const port = form.target.includes(':') ? form.target.split(':')[1] : '161';
                    setForm((f:any) => ({...f, target: `${e.target.value}:${port}`}));
                  }}
                  placeholder="192.168.1.1"
                  className="w-full px-2 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
              <div className="col-span-3">
                <input value={form.config.dnsName || ''}
                  onChange={e => set('dnsName', e.target.value)}
                  placeholder="switch.company.com"
                  className="w-full px-2 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
              <div className="col-span-2">
                <div className="flex gap-1">
                  {['IP','DNS'].map(ct => (
                    <button key={ct} type="button"
                      onClick={() => set('connectTo', ct)}
                      className={cn('flex-1 py-1.5 rounded text-xs font-mono font-medium transition-colors',
                        (form.config.connectTo||'IP') === ct
                          ? 'bg-cyan-600 text-white'
                          : 'bg-edge/50 text-slate-500 hover:bg-edge border border-edge')}>
                      {ct}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <input type="number"
                  value={form.target.includes(':') ? form.target.split(':')[1] : '161'}
                  onChange={e => {
                    const host = form.target.split(':')[0] || '';
                    setForm((f:any) => ({...f, target: `${host}:${e.target.value}`}));
                  }}
                  className="w-full px-2 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
              <div className="col-span-1 flex justify-center">
                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400"/>
                </div>
              </div>
            </div>

            {/* SNMP parametrləri */}
            <div className="divide-y divide-edge">
              {/* SNMP Version */}
              <div className="grid grid-cols-4 items-center px-4 py-2.5">
                <label className="text-sm text-slate-400 flex items-center gap-1">
                  <span className="text-red-400">*</span> SNMP version
                </label>
                <div className="col-span-3">
                  <select value={form.config.version || '2c'}
                    onChange={e => set('version', e.target.value)}
                    className="px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-36">
                    <option value="1">SNMPv1</option>
                    <option value="2c">SNMPv2c</option>
                    <option value="3">SNMPv3</option>
                  </select>
                </div>
              </div>

              {/* v1/v2c — Community */}
              {form.config.version !== '3' && (
                <div className="grid grid-cols-4 items-center px-4 py-2.5">
                  <label className="text-sm text-slate-400">Community string</label>
                  <div className="col-span-3">
                    <input value={form.config.community || 'public'}
                      onChange={e => set('community', e.target.value)}
                      placeholder="public"
                      className="w-80 px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                  </div>
                </div>
              )}

              {/* v3 parametrləri */}
              {form.config.version === '3' && (<>
                {/* Max repetition count */}
                <div className="grid grid-cols-4 items-center px-4 py-2.5">
                  <label className="text-sm text-slate-400">Max repetition count</label>
                  <div className="col-span-3">
                    <input type="number" value={form.config.maxRepetition || 10}
                      onChange={e => set('maxRepetition', +e.target.value)}
                      className="w-24 px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                  </div>
                </div>
                {/* Context name */}
                <div className="grid grid-cols-4 items-center px-4 py-2.5">
                  <label className="text-sm text-slate-400">Context name</label>
                  <div className="col-span-3">
                    <input value={form.config.contextName || ''}
                      onChange={e => set('contextName', e.target.value)}
                      placeholder=""
                      className="w-80 px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                  </div>
                </div>
                {/* Security name */}
                <div className="grid grid-cols-4 items-center px-4 py-2.5">
                  <label className="text-sm text-slate-400">Security name</label>
                  <div className="col-span-3">
                    <input value={form.config.securityName || ''}
                      onChange={e => set('securityName', e.target.value)}
                      placeholder="libre"
                      className="w-80 px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                  </div>
                </div>
                {/* Security level */}
                <div className="grid grid-cols-4 items-center px-4 py-2.5">
                  <label className="text-sm text-slate-400">Security level</label>
                  <div className="col-span-3">
                    <select value={form.config.securityLevel || 'authPriv'}
                      onChange={e => set('securityLevel', e.target.value)}
                      className="px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-48">
                      <option value="noAuthNoPriv">noAuthNoPriv</option>
                      <option value="authNoPriv">authNoPriv</option>
                      <option value="authPriv">authPriv</option>
                    </select>
                  </div>
                </div>
                {/* Auth protocol */}
                {(form.config.securityLevel==='authNoPriv'||form.config.securityLevel==='authPriv'||!form.config.securityLevel) && (<>
                  <div className="grid grid-cols-4 items-center px-4 py-2.5">
                    <label className="text-sm text-slate-400">Authentication protocol</label>
                    <div className="col-span-3">
                      <select value={form.config.authProtocol || 'SHA1'}
                        onChange={e => set('authProtocol', e.target.value)}
                        className="px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-36">
                        <option value="MD5">MD5</option>
                        <option value="SHA1">SHA1</option>
                        <option value="SHA256">SHA256</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center px-4 py-2.5">
                    <label className="text-sm text-slate-400">Authentication passphrase</label>
                    <div className="col-span-3">
                      <input type="password" value={form.config.authPassphrase || ''}
                        onChange={e => set('authPassphrase', e.target.value)}
                        placeholder="Libre42nms3M"
                        className="w-80 px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                    </div>
                  </div>
                </>)}
                {/* Privacy */}
                {(form.config.securityLevel==='authPriv'||!form.config.securityLevel) && (<>
                  <div className="grid grid-cols-4 items-center px-4 py-2.5">
                    <label className="text-sm text-slate-400">Privacy protocol</label>
                    <div className="col-span-3">
                      <select value={form.config.privProtocol || 'AES128'}
                        onChange={e => set('privProtocol', e.target.value)}
                        className="px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-36">
                        <option value="DES">DES</option>
                        <option value="AES128">AES128</option>
                        <option value="AES256">AES256</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center px-4 py-2.5">
                    <label className="text-sm text-slate-400">Privacy passphrase</label>
                    <div className="col-span-3">
                      <input type="password" value={form.config.privPassphrase || ''}
                        onChange={e => set('privPassphrase', e.target.value)}
                        placeholder="M3smn24erbiL"
                        className="w-80 px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                    </div>
                  </div>
                </>)}
                {/* Use combined requests */}
                <div className="grid grid-cols-4 items-center px-4 py-2.5">
                  <div className="col-start-2 col-span-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={form.config.useCombinedRequests !== false}
                        onChange={e => set('useCombinedRequests', e.target.checked)}
                        className="w-4 h-4 accent-cyan-500"/>
                      <span className="text-sm text-slate-300">Use combined requests</span>
                    </label>
                  </div>
                </div>
              </>)}

              {/* OID — həmişə göstər */}
              <div className="grid grid-cols-4 items-center px-4 py-2.5">
                <label className="text-sm text-slate-400">OID</label>
                <div className="col-span-3 flex items-center gap-3 flex-wrap">
                  <input value={form.config.oid || '1.3.6.1.2.1.1.1.0'}
                    onChange={e => set('oid', e.target.value)}
                    className="w-72 px-3 py-1.5 rounded text-sm bg-canvas-elevated border border-edge text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label:'sysDescr',  oid:'1.3.6.1.2.1.1.1.0' },
                      { label:'sysUpTime', oid:'1.3.6.1.2.1.1.3.0' },
                      { label:'sysName',   oid:'1.3.6.1.2.1.1.5.0' },
                      { label:'Cisco CPU', oid:'1.3.6.1.4.1.9.2.1.57.0' },
                      { label:'Win CPU',   oid:'1.3.6.1.2.1.25.3.3.1.2.0' },
                    ].map(o => (
                      <button key={o.oid} type="button"
                        onClick={() => set('oid', o.oid)}
                        className={cn('text-[10px] font-mono px-2 py-1 rounded border transition-colors',
                          form.config.oid === o.oid
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-slate-700/30 text-slate-500 border-slate-600/20 hover:border-slate-500')}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'agent':
        return (
          <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-4">
            <p className="text-xs font-mono text-cyan-400 mb-2">ℹ️ Agent Monitor</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Agent özü metrikləri göndərir — ayrıca yoxlama yoxdur.
              Bu monitor agentin son aktivlik statusunu izləyir.
            </p>
            <div className="mt-3">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Offline hədd (saniyə)</label>
              <input type="number" value={form.config.offlineThresholdSec ?? 120}
                onChange={e => set('offlineThresholdSec', +e.target.value)}
                className="field-input w-32"/>
              <p className="text-xs text-slate-600 mt-1">Bu qədər cavab gəlməsə DOWN sayılır</p>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Tailwind inline style hack for reusable classes */}
      <style>{`
        .field-label { display:block; font-size:0.65rem; font-family:monospace;
          color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
        .field-input { padding:8px 12px; border-radius:6px; font-size:14px;
          background:#111827; border:1px solid #1A2740; color:#E2E8F0;
          outline:none; transition:border-color .15s; }
        .field-input:focus { border-color:#06B6D4; }
        .field-input::placeholder { color:#334155; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">{t('monitors.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('monitors.subtitle')}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
          <Plus size={15}/>{t('monitors.new')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('monitors.total'),  value: stats.total, color:'text-cyan-400'   },
          { label: t('monitors.up'),     value: stats.up,    color:'text-green-400'  },
          { label: t('monitors.down'),   value: stats.down,  color:'text-red-400'    },
          { label: 'Agent',              value: stats.agent, color:'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── FORM ────────────────────────────────────────────────────────────── */}
      {tab === 'form' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-slate-200">
              {editing ? `${t('common.edit')}: ${editing.name}` : t('monitors.new')}
            </h2>
            <button onClick={() => { setTab('list'); setEditing(null); }}
              className="p-1.5 rounded text-slate-500 hover:text-slate-300">
              <X size={16}/>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Monitor Adı */}
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Monitor Adı *</label>
              <input
                value={form.name}
                onChange={e => setForm((f:any) => ({ ...f, name: e.target.value }))}
                placeholder="Homepage HTTPS"
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>

            {/* Monitor Növü — Dropdown */}
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Monitor Növü *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTypeOpen(o => !o)}
                  className={cn(
                    'field-input w-full flex items-center justify-between gap-2',
                    typeOpen && 'border-cyan-500'
                  )}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{selectedType?.group}</span>
                    <span className="text-slate-200">{selectedType?.label}</span>
                  </div>
                  <ChevronDown size={14} className={cn('text-slate-500 transition-transform', typeOpen && 'rotate-180')}/>
                </button>

                {typeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setTypeOpen(false)}/>
                    <div className="absolute left-0 top-full mt-1 z-50 w-full
                                    bg-canvas-elevated border border-edge-bright rounded-lg
                                    shadow-xl overflow-hidden">
                      {['🌐 Web','🔌 Network','🤖 Agent'].map(group => (
                        <div key={group}>
                          <div className="px-3 py-1.5 bg-edge/30 border-b border-edge">
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{group}</p>
                          </div>
                          {MONITOR_TYPES.filter(mt => mt.group === group).map(mt => (
                            <button key={mt.value}
                              onClick={() => {
                                setForm((f:any) => ({ ...f, monitorType: mt.value, config:{}, target:'' }));
                                setTypeOpen(false);
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                                'hover:bg-edge/50',
                                form.monitorType === mt.value
                                  ? 'bg-cyan-500/10 text-cyan-400'
                                  : 'text-slate-400'
                              )}>
                              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                                form.monitorType === mt.value ? 'bg-cyan-400' : 'bg-slate-600')}/>
                              <div>
                                <p className="text-sm font-medium">{mt.label}</p>
                                <p className="text-xs text-slate-500">{mt.desc}</p>
                              </div>
                              {form.monitorType === mt.value && (
                                <CheckCircle size={13} className="ml-auto text-cyan-400 shrink-0"/>
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Target — Agent üçün gizlə */}
            {form.monitorType !== 'agent' && (
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Hədəf (Target) *</label>
                <input
                  value={form.target}
                  onChange={e => setForm((f:any) => ({ ...f, target: e.target.value }))}
                  placeholder={
                    form.monitorType === 'tcp'        ? '192.168.1.1:5432' :
                    form.monitorType === 'ping'       ? '192.168.1.1' :
                    form.monitorType === 'ssl_expiry' ? 'example.com:443' :
                    form.monitorType === 'dns'        ? 'example.com' :
                    'https://example.com'
                  }
                  className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
            )}

            {/* Asset */}
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Asset {form.monitorType === 'agent' ? '*' : '(istəgəl)'}
              </label>
              <select
                value={form.assetId}
                onChange={e => setForm((f:any) => ({ ...f, assetId: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <option value="">— Seçin —</option>
                {assetList.map((a:any) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.ipAddress ? ` (${a.ipAddress})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* İnterval + Timeout — Agent üçün gizlə */}
            {form.monitorType !== 'agent' && (
              <>
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">İnterval (saniyə)</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="number" min={10}
                      value={form.intervalSec}
                      onChange={e => setForm((f:any) => ({ ...f, intervalSec: +e.target.value }))}
                      className="field-input w-20"/>
                    <div className="flex gap-1">
                      {[30,60,300,600].map(s => (
                        <button key={s} type="button"
                          onClick={() => setForm((f:any) => ({ ...f, intervalSec: s }))}
                          className={cn('px-2 py-1.5 rounded text-xs font-mono border transition-colors',
                            form.intervalSec === s
                              ? 'bg-cyan-600 border-cyan-500 text-white'
                              : 'bg-edge/30 border-edge text-slate-500 hover:border-slate-500')}>
                          {s < 60 ? `${s}s` : `${s/60}d`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Timeout (saniyə)</label>
                  <input type="number" min={1}
                    value={form.timeoutSec}
                    onChange={e => setForm((f:any) => ({ ...f, timeoutSec: +e.target.value }))}
                    className="field-input w-20"/>
                </div>
              </>
            )}
          </div>

          {/* Tip-ə xas config */}
          <div className="border-t border-edge pt-4 space-y-3">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              {selectedType?.label} Parametrləri
            </p>
            <ConfigFields/>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button onClick={handleSubmit} disabled={isPending}
              className="px-5 py-2.5 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500
                         text-white transition-colors disabled:opacity-50 flex items-center gap-2">
              {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
              {isPending ? t('common.loading') : editing ? t('common.save') : t('common.create')}
            </button>
            <button onClick={() => { setTab('list'); setEditing(null); }}
              className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300
                         hover:bg-edge/50 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── LIST ────────────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <>
          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all','up','down','degraded','unknown'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-mono border transition-colors',
                  filterStatus === s
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-edge/30 border-edge text-slate-500 hover:border-slate-500')}>
                {s === 'all' ? t('common.all') : t(`status.${s}`)}
              </button>
            ))}
            <span className="text-xs font-mono text-slate-600 ml-auto">
              {monitors.length} / {allMonitors.length} monitor
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="skeleton h-16 w-full rounded-lg"/>)}</div>
          ) : monitors.length === 0 ? (
            <div className="card p-12 text-center">
              <Radio size={32} className="text-slate-600 mx-auto mb-3"/>
              <p className="text-slate-400 font-medium">{t('monitors.empty')}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge">
                    {['Ad','Növ','Hədəf','Status','Son yoxlama','Əməliyyat'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((m:any, i:number) => (
                    <tr key={m.id}
                      className={cn('border-b border-edge/50 hover:bg-edge/20 transition-colors',
                        i === monitors.length - 1 && 'border-0')}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-200">{m.name}</p>
                        {m.asset && <p className="text-xs font-mono text-slate-600">{m.asset.name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border',
                          m.monitorType === 'agent'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-slate-700/50 text-slate-400 border-edge')}>
                          {MONITOR_TYPES.find(mt => mt.value === m.monitorType)?.label || m.monitorType}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-xs font-mono text-slate-400 truncate">{m.target || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon[m.lastStatus] || <div className="w-2 h-2 rounded-full bg-slate-600"/>}
                          <span className={cn('text-xs font-mono',
                            m.lastStatus==='up'      ? 'text-green-400'  :
                            m.lastStatus==='down'    ? 'text-red-400'    :
                            m.lastStatus==='degraded'? 'text-yellow-400' : 'text-slate-500')}>
                            {m.lastStatus ? t(`status.${m.lastStatus}`) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-500">
                          {m.lastCheckedAt ? formatRelative(m.lastCheckedAt) : t('common.never')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(m)}
                            className="p-1.5 rounded text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            title={t('common.edit')}>
                            <Pencil size={13}/>
                          </button>
                          {m.monitorType !== 'agent' && (
                            <button onClick={() => checkNowMut.mutate(m.id)}
                              className="px-2 py-1 rounded text-xs font-mono text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                              Yoxla
                            </button>
                          )}
                          <button
                            onClick={() => { if(confirm(t('common.confirm')+'?')) deleteMut.mutate(m.id); }}
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
          )}
        </>
      )}
    </div>
  );
}
