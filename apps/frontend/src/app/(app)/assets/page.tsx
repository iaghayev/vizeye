'use client';
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Server, Plus, X, Upload, Download, Wifi, WifiOff,
  Pencil, CheckCircle, AlertCircle, Copy, Search,
  Loader2, ShieldCheck, ShieldX, Network, Globe,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { formatRelative, cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';
import Link from 'next/link';

const critColor:any = {
  critical:'text-red-400 bg-red-500/10 border-red-500/20',
  high:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low:     'text-slate-400 bg-slate-500/10 border-slate-500/20',
};
const envColor:any = {
  production: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  staging:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  development:'text-green-400 bg-green-500/10 border-green-500/20',
  test:       'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const EMPTY_FORM = {
  name:'', assetType:'server', hostname:'', ipAddress:'', osName:'',
  osVersion:'', environment:'production', criticality:'medium',
  location:'', description:'', tags:'',
};

// ── Connectivity Badge ─────────────────────────────────────────────────────────
function ConnBadge({ result }: { result: any }) {
  if (!result) return null;
  const open = result.openPorts || [];
  const PORT_NAMES: Record<number, string> = {
    22:'SSH', 80:'HTTP', 443:'HTTPS', 3306:'MySQL',
    5432:'PG', 8080:'HTTP-alt', 161:'SNMP', 3389:'RDP',
  };
  return (
    <div className={cn('rounded-lg p-4 border space-y-3',
      result.reachable
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-red-500/5 border-red-500/20')}>
      <div className="flex items-center gap-3">
        {result.reachable
          ? <ShieldCheck size={18} className="text-green-400"/>
          : <ShieldX    size={18} className="text-red-400"/>}
        <div>
          <p className={cn('text-sm font-semibold',
            result.reachable ? 'text-green-400' : 'text-red-400')}>
            {result.reachable ? '✓ Host əlçatandır' : '✗ Host əlçatan deyil'}
          </p>
          <p className="text-xs text-slate-500">
            {result.reachable
              ? `${result.method?.toUpperCase()} ilə əlaqə — ${result.pingMs ?? '?'}ms`
              : result.error || 'Bağlantı uğursuz oldu'}
          </p>
        </div>
      </div>

      {result.hostname && (
        <div className="flex items-center gap-2 text-xs">
          <Globe size={11} className="text-slate-500"/>
          <span className="font-mono text-slate-400">{result.hostname}</span>
        </div>
      )}

      {open.length > 0 && (
        <div>
          <p className="text-xs font-mono text-slate-500 mb-1.5">Açıq portlar:</p>
          <div className="flex flex-wrap gap-1.5">
            {open.map((p: number) => (
              <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-full
                                       bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {p}{PORT_NAMES[p] ? ` (${PORT_NAMES[p]})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.reachable && (
        <p className="text-xs text-green-400/70 flex items-center gap-1.5">
          <CheckCircle size={11}/>
          Asset əlavə etməyə hazırdır
        </p>
      )}
    </div>
  );
}

export default function AssetsPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab,          setTab]          = useState<'list'|'create'|'edit'|'import'>('list');
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [csvContent,   setCsvContent]   = useState('');
  const [csvPreview,   setCsvPreview]   = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [agentToken,   setAgentToken]   = useState<any>(null);
  const [connResult,   setConnResult]   = useState<any>(null);
  const [checking,     setChecking]     = useState(false);
  const [search,       setSearch]       = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn:  () => apiGet<any>('/api/v1/assets'),
    refetchInterval: 30000,
  });

  const allAssets = Array.isArray(data) ? data : (data?.data ?? []);
  const assets = allAssets.filter((a: any) =>
    !search ||
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.ipAddress?.includes(search) ||
    a.hostname?.toLowerCase().includes(search.toLowerCase())
  );

  const createMut = useMutation({
    mutationFn: (d:any) => apiPost('/api/v1/assets', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['assets'] });
      setTab('list'); setForm({...EMPTY_FORM}); setConnResult(null);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }:{ id:string; data:any }) =>
      apiPatch(`/api/v1/assets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['assets'] });
      setTab('list'); setEditingAsset(null); setForm({...EMPTY_FORM}); setConnResult(null);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMut = useMutation({
    mutationFn: (id:string) => apiDelete(`/api/v1/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['assets'] }); toast.success(t('common.success')); },
  });

  const agentTokenMut = useMutation({
    mutationFn: (id:string) => apiPost<any>(`/api/v1/assets/${id}/agent-token`),
    onSuccess:  (d) => setAgentToken(d),
    onError:    () => toast.error(t('common.error')),
  });

  const validateMut = useMutation({
    mutationFn: (csv:string) => apiPost<any>('/api/v1/assets/import/validate', { csv }),
    onSuccess:  (d) => setCsvPreview(d),
  });

  const importMut = useMutation({
    mutationFn: (csv:string) => apiPost<any>('/api/v1/assets/import/csv', { csv }),
    onSuccess:  (d) => { setImportResult(d); qc.invalidateQueries({ queryKey:['assets'] }); },
  });

  // ── Connectivity check ──────────────────────────────────────────────────────
  const checkConnectivity = useCallback(async () => {
    const ip = form.ipAddress || form.hostname;
    if (!ip) { toast.error('IP ünvanı və ya hostname daxil edin'); return; }
    setChecking(true);
    setConnResult(null);
    try {
      const result = await apiPost<any>('/api/v1/assets/check-connectivity', {
        ip, timeout: 4000,
      });
      setConnResult(result);
      if (result.reachable && result.hostname && !form.hostname) {
        setForm(f => ({ ...f, hostname: result.hostname }));
      }
    } catch { toast.error('Yoxlama zamanı xəta'); }
    finally { setChecking(false); }
  }, [form.ipAddress, form.hostname]);

  const openCreate = () => {
    setForm({...EMPTY_FORM}); setEditingAsset(null);
    setConnResult(null); setTab('create');
  };

  const openEdit = (asset: any) => {
    setEditingAsset(asset);
    setForm({
      name:        asset.name        || '',
      assetType:   asset.assetType   || 'server',
      hostname:    asset.hostname    || '',
      ipAddress:   asset.ipAddress   || '',
      osName:      asset.osName      || '',
      osVersion:   asset.osVersion   || '',
      environment: asset.environment || 'production',
      criticality: asset.criticality || 'medium',
      location:    asset.location    || '',
      description: asset.description || '',
      tags:        (asset.tags || []).join(';'),
    });
    setConnResult(null);
    setTab('edit');
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(';').map((t:string) => t.trim()).filter(Boolean) : [],
      metadata: editingAsset?.metadata || {},
    };
    if (editingAsset) {
      updateMut.mutate({ id: editingAsset.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvContent(ev.target?.result as string);
      setCsvPreview(null); setImportResult(null);
    };
    reader.readAsText(file);
  };

  const stats = {
    total:      allAssets.length,
    production: allAssets.filter((a:any) => a.environment === 'production').length,
    critical:   allAssets.filter((a:any) => a.criticality === 'critical').length,
    online:     allAssets.filter((a:any) => a.lastSeenAt &&
                  new Date(a.lastSeenAt) > new Date(Date.now() - 5*60*1000)).length,
  };

  const assetTypes    = ['server','vm','network_device','container','website','service','other'];
  const environments  = ['production','staging','development','test'];
  const criticalities = ['critical','high','medium','low'];
  const isFormMode    = tab === 'create' || tab === 'edit';
  const isPending     = createMut.isPending || updateMut.isPending;

  // ── Form ────────────────────────────────────────────────────────────────────
  const AssetForm = () => (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-slate-200">
          {editingAsset ? `${t('common.edit')}: ${editingAsset.name}` : t('assets.new')}
        </h2>
        <button onClick={() => { setTab('list'); setEditingAsset(null); setConnResult(null); }}
          className="p-1.5 rounded text-slate-500 hover:text-slate-300">
          <X size={16}/>
        </button>
      </div>

      {/* IP + Ping yoxlaması */}
      <div className="border border-edge rounded-lg p-4 space-y-3 bg-canvas-elevated/50">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Network size={11}/> Bağlantı Yoxlaması
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-mono text-slate-400 block mb-1">IP Ünvanı *</label>
            <input
              value={form.ipAddress}
              onChange={e => { setForm(f=>({...f,ipAddress:e.target.value})); setConnResult(null); }}
              placeholder="192.168.1.10"
              className="w-full px-3 py-2 rounded-md text-sm bg-canvas border border-edge
                         text-slate-200 placeholder:text-slate-600 font-mono
                         focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>
          <div className="flex-1">
            <label className="text-xs font-mono text-slate-400 block mb-1">Hostname</label>
            <input
              value={form.hostname}
              onChange={e => setForm(f=>({...f,hostname:e.target.value}))}
              placeholder="web01.company.com"
              className="w-full px-3 py-2 rounded-md text-sm bg-canvas border border-edge
                         text-slate-200 placeholder:text-slate-600
                         focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>
          <div className="flex items-end">
            <button
              onClick={checkConnectivity}
              disabled={checking || (!form.ipAddress && !form.hostname)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                         bg-slate-700 hover:bg-slate-600 text-slate-200 border border-edge
                         transition-colors disabled:opacity-50 whitespace-nowrap">
              {checking
                ? <><Loader2 size={14} className="animate-spin"/> Yoxlanır...</>
                : <><Search size={14}/> Ping at</>}
            </button>
          </div>
        </div>

        {/* Connectivity result */}
        {connResult && <ConnBadge result={connResult}/>}

        {!connResult && !checking && (
          <p className="text-xs text-slate-600">
            IP ünvanı daxil edib "Ping at" düyməsinə basın — sistem avtomatik port skan edəcək
          </p>
        )}
      </div>

      {/* Əsas məlumatlar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: t('assets.form.name'), key:'name',        placeholder:'web-server-01', required:true },
          { label: t('assets.osName'),    key:'osName',      placeholder:'Ubuntu 22.04' },
          { label: t('assets.location'),  key:'location',    placeholder:'us-east-1, Bakı DC' },
          { label: t('assets.tags'),      key:'tags',        placeholder:'web;nginx;prod' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
              {f.label}{(f as any).required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
              value={(form as any)[f.key]}
              onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
              placeholder={(f as any).placeholder}
              className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                         text-slate-200 placeholder:text-slate-600
                         focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>
        ))}

        {[
          { label: t('assets.form.type'), key:'assetType',   opts: assetTypes,    tKey:'type' },
          { label: t('assets.form.env'),  key:'environment', opts: environments,  tKey:'env'  },
          { label: t('assets.form.crit'), key:'criticality', opts: criticalities, tKey:'crit' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{f.label}</label>
            <select
              value={(form as any)[f.key]}
              onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
              className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                         text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
              {f.opts.map(o => <option key={o} value={o}>{t(`${f.tKey}.${o}`)}</option>)}
            </select>
          </div>
        ))}

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
            {t('assets.description')}
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(p=>({...p,description:e.target.value}))}
            rows={2}
            className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                       text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"/>
        </div>
      </div>

      {/* Xəbərdarlıq — əlçatmaz amma yenə də əlavə et */}
      {connResult && !connResult.reachable && (
        <div className="flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
          <AlertCircle size={15} className="text-yellow-400 shrink-0 mt-0.5"/>
          <p className="text-xs text-yellow-400">
            Host əlçatan deyil. Yenə də əlavə edə bilərsiniz, amma agent qoşulmayacaq
            ta ki server əlçatan olana qədər.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!form.name || isPending}
          className="px-5 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500
                     text-white transition-colors disabled:opacity-50">
          {isPending ? t('common.loading') : editingAsset ? t('common.save') : t('common.create')}
        </button>
        <button
          onClick={() => { setTab('list'); setEditingAsset(null); setConnResult(null); }}
          className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300
                     hover:bg-edge/50 transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">{t('assets.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('assets.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                       bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-edge transition-colors">
            <Download size={14}/> Template
          </button>
          <button onClick={() => { setTab('import'); setCsvContent(''); setCsvPreview(null); setImportResult(null); }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                       bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-edge transition-colors">
            <Upload size={14}/> CSV Import
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                       bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
            <Plus size={15}/>{t('assets.new')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('assets.total'),      value: stats.total,      color:'text-cyan-400'  },
          { label: t('assets.production'), value: stats.production, color:'text-blue-400'  },
          { label: t('assets.critical'),   value: stats.critical,   color:'text-red-400'   },
          { label: t('assets.online'),     value: stats.online,     color:'text-green-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {isFormMode && <AssetForm/>}

      {/* Agent token modal */}
      {agentToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-slate-200">Agent Enrollment Key</h2>
              <button onClick={() => setAgentToken(null)} className="p-1.5 rounded text-slate-500 hover:text-slate-300">
                <X size={16}/>
              </button>
            </div>
            <div className="bg-canvas-elevated rounded-lg p-4 border border-cyan-500/20">
              <p className="text-xs font-mono text-slate-500 mb-2">Enrollment Key:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-cyan-400 break-all">{agentToken.enrollmentKey}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(agentToken.enrollmentKey); toast.success('Kopyalandı!'); }}
                  className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors shrink-0">
                  <Copy size={13}/>
                </button>
              </div>
            </div>
            <button onClick={() => setAgentToken(null)}
              className="w-full py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
              Bağla
            </button>
          </div>
        </div>
      )}

      {/* CSV Import */}
      {tab === 'import' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-slate-200">CSV Bulk Import</h2>
            <button onClick={() => setTab('list')} className="p-1.5 rounded text-slate-500 hover:text-slate-300">
              <X size={16}/>
            </button>
          </div>
          {!importResult ? (
            <>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-edge hover:border-cyan-500/40 rounded-lg p-8 text-center cursor-pointer transition-colors">
                <Upload size={28} className="text-slate-600 mx-auto mb-3"/>
                <p className="text-sm text-slate-400">CSV faylını seçin</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile}/>
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  və ya CSV mətni yapışdırın
                </label>
                <textarea value={csvContent} onChange={e => { setCsvContent(e.target.value); setCsvPreview(null); }} rows={5}
                  placeholder="name,asset_type,ip_address,environment,criticality&#10;web-01,server,192.168.1.10,production,critical"
                  className="w-full px-3 py-2 rounded-md text-xs font-mono bg-canvas-elevated border border-edge
                             text-slate-300 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"/>
              </div>
              {csvPreview && (
                <div className={cn('rounded-lg p-4 border',
                  csvPreview.valid ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20')}>
                  {csvPreview.valid
                    ? <div className="flex items-center gap-2"><CheckCircle size={15} className="text-green-400"/>
                        <span className="text-sm text-green-400">{csvPreview.rowCount} sətir hazırdır</span></div>
                    : <div className="flex items-center gap-2"><AlertCircle size={15} className="text-red-400"/>
                        <span className="text-sm text-red-400">{csvPreview.error}</span></div>}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => csvContent && validateMut.mutate(csvContent)}
                  disabled={!csvContent || validateMut.isPending}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50">
                  Yoxla
                </button>
                <button onClick={() => csvContent && importMut.mutate(csvContent)}
                  disabled={!csvContent || !csvPreview?.valid || importMut.isPending}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                  {importMut.isPending ? t('common.loading') : 'Import et'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-4 text-center"><p className="text-xs font-mono text-slate-500 uppercase mb-1">Yaradıldı</p>
                  <p className="font-display font-bold text-2xl text-green-400">{importResult.success}</p></div>
                <div className="card p-4 text-center"><p className="text-xs font-mono text-slate-500 uppercase mb-1">Uğursuz</p>
                  <p className="font-display font-bold text-2xl text-red-400">{importResult.failed}</p></div>
                <div className="card p-4 text-center"><p className="text-xs font-mono text-slate-500 uppercase mb-1">Cəmi</p>
                  <p className="font-display font-bold text-2xl text-cyan-400">{importResult.success+importResult.failed}</p></div>
              </div>
              <button onClick={() => { setTab('list'); setCsvContent(''); setCsvPreview(null); setImportResult(null); }}
                className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
                Siyahıya qayıt
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assets List */}
      {tab === 'list' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Ad, IP, hostname ilə axtar..."
              className="w-full pl-9 pr-4 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                         text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="skeleton h-16 w-full rounded-lg"/>)}</div>
          ) : assets.length === 0 ? (
            <div className="card p-12 text-center">
              <Server size={32} className="text-slate-600 mx-auto mb-3"/>
              <p className="text-slate-400 font-medium">{t('assets.empty')}</p>
              <p className="text-slate-600 text-sm mt-1">{t('assets.emptyDesc')}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge">
                    {[t('assets.name'), t('assets.ip'), t('assets.env'), t('assets.criticality'),
                      t('assets.status'), t('assets.lastSeen'), t('common.actions')].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a:any, i:number) => {
                    const isOnline = a.lastSeenAt &&
                      new Date(a.lastSeenAt) > new Date(Date.now() - 5*60*1000);
                    return (
                      <tr key={a.id} className={cn('border-b border-edge/50 hover:bg-edge/20 transition-colors',
                        i === assets.length-1 && 'border-0')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-slate-700/50 border border-edge flex items-center justify-center shrink-0">
                              <Server size={13} className="text-slate-400"/>
                            </div>
                            <div>
                              <Link href={`/assets/${a.id}`}
                                className="text-sm font-medium text-slate-200 hover:text-cyan-400 transition-colors">
                                {a.name}
                              </Link>
                              <p className="text-xs font-mono text-slate-600">{t(`type.${a.assetType}`)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-slate-400">{a.ipAddress || a.hostname || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border', envColor[a.environment])}>
                            {t(`env.${a.environment}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full border', critColor[a.criticality])}>
                            {t(`crit.${a.criticality}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isOnline ? (
                            <div className="flex items-center gap-1.5">
                              <Wifi size={12} className="text-green-400"/>
                              <span className="text-xs text-green-400">Online</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <WifiOff size={12} className="text-slate-600"/>
                              <span className="text-xs text-slate-600">Offline</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-slate-600">
                            {a.lastSeenAt ? formatRelative(a.lastSeenAt) : t('common.never')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(a)}
                              className="p-1.5 rounded text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                              title={t('common.edit')}>
                              <Pencil size={13}/>
                            </button>
                            <button onClick={() => agentTokenMut.mutate(a.id)}
                              className="px-2 py-1 rounded text-xs font-mono text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                              Token
                            </button>
                            <button onClick={() => { if(confirm(t('common.confirm')+'?')) deleteMut.mutate(a.id); }}
                              className="px-2 py-1 rounded text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors">
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
