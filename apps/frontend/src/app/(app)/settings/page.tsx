'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, X, Mail, Hash, Globe, Copy, Key, ExternalLink, CheckCircle } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'org'|'channels'|'apikeys'|'status'|'profile'>('org');
  const [showChForm, setShowChForm] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [chForm, setChForm] = useState({ name:'', channelType:'email', config:'{}' });
  const [keyForm, setKeyForm] = useState({ name:'', permissions:{ read:true, write:false } });
  const [newKey, setNewKey] = useState('');

  const { data: org }      = useQuery({ queryKey:['org'],      queryFn:()=>apiGet<any>('/api/v1/org') });
  const { data: channels } = useQuery({ queryKey:['channels'], queryFn:()=>apiGet<any>('/api/v1/notifications/channels') });
  const { data: apiKeys }  = useQuery({ queryKey:['api-keys'], queryFn:()=>apiGet<any>('/api/v1/api-keys') });

  const channelList = Array.isArray(channels) ? channels : (channels?.data ?? []);
  const keyList     = Array.isArray(apiKeys)  ? apiKeys  : (apiKeys?.data  ?? []);

  const [orgName, setOrgName] = useState('');

  const updateOrgMut = useMutation({
    mutationFn: (d:any) => apiPatch('/api/v1/org', d),
    onSuccess:  () => { qc.invalidateQueries({queryKey:['org']}); toast.success(t('settings.saved')); },
  });

  const createChMut = useMutation({
    mutationFn: (d:any) => apiPost('/api/v1/notifications/channels', d),
    onSuccess:  () => { qc.invalidateQueries({queryKey:['channels']}); setShowChForm(false); toast.success(t('common.success')); },
  });

  const deleteChMut = useMutation({
    mutationFn: (id:string) => apiDelete(`/api/v1/notifications/channels/${id}`),
    onSuccess:  () => qc.invalidateQueries({queryKey:['channels']}),
  });

  const testChMut = useMutation({
    mutationFn: (id:string) => apiPost(`/api/v1/notifications/channels/${id}/test`),
    onSuccess:  () => toast.success('Test göndərildi ✓'),
  });

  const createKeyMut = useMutation({
    mutationFn: (d:any) => apiPost<any>('/api/v1/api-keys', d),
    onSuccess:  (d) => { qc.invalidateQueries({queryKey:['api-keys']}); setNewKey(d.key); setShowKeyForm(false); },
    onError:    () => toast.error(t('common.error')),
  });

  const deleteKeyMut = useMutation({
    mutationFn: (id:string) => apiDelete(`/api/v1/api-keys/${id}`),
    onSuccess:  () => { qc.invalidateQueries({queryKey:['api-keys']}); toast.success(t('common.success')); },
  });

  const statusPageUrl = org?.slug
    ? `${window.location.origin}/status/${org.slug}`
    : '';

  const TABS = [
    { key:'org',      label:'Təşkilat' },
    { key:'channels', label:'Bildirişlər' },
    { key:'apikeys',  label:'API Keys' },
    { key:'status',   label:'Status Page' },
    { key:'profile',  label:'Profil' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-xl text-slate-100">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('settings.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-canvas-elevated rounded-lg border border-edge flex-wrap">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key as any)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === tb.key ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300')}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── ORG ──────────────────────────────────────────────────────────── */}
      {tab === 'org' && (
        <div className="card p-6 max-w-lg space-y-4">
          <h2 className="font-display font-semibold text-slate-200">{t('settings.org')}</h2>
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('settings.orgName')}</label>
            <input defaultValue={org?.name||''} onChange={e => setOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Slug (URL)</label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-600">/status/</span>
              <code className="text-sm font-mono text-cyan-400">{org?.slug || '—'}</code>
            </div>
          </div>
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('settings.timezone')}</label>
            <select className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
              {['UTC','Asia/Baku','Europe/Moscow','Europe/Istanbul','Asia/Riyadh','America/New_York','America/Los_Angeles'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <button onClick={() => orgName && updateOrgMut.mutate({name:orgName})}
            disabled={!orgName || updateOrgMut.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
            {updateOrgMut.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      )}

      {/* ── CHANNELS ─────────────────────────────────────────────────────── */}
      {tab === 'channels' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowChForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
              <Plus size={15}/> Yeni Kanal
            </button>
          </div>
          {showChForm && (
            <div className="card p-5 border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-slate-200">Yeni Kanal</h2>
                <button onClick={() => setShowChForm(false)} className="p-1.5 rounded text-slate-500 hover:text-slate-300"><X size={16}/></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Ad</label>
                  <input value={chForm.name} onChange={e => setChForm(f=>({...f,name:e.target.value}))}
                    placeholder="Ops Team Email"
                    className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Tip</label>
                  <select value={chForm.channelType} onChange={e => setChForm(f=>({...f,channelType:e.target.value}))}
                    className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                    <option value="telegram">Telegram</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Config (JSON) —{' '}
                    {chForm.channelType==='email'    ? '{"to":["ops@company.com"]}' :
                     chForm.channelType==='slack'    ? '{"webhookUrl":"https://hooks.slack.com/..."}' :
                     chForm.channelType==='telegram' ? '{"botToken":"...","chatId":"..."}' :
                     '{"url":"https://..."}'}
                  </label>
                  <textarea value={chForm.config} onChange={e => setChForm(f=>({...f,config:e.target.value}))} rows={3}
                    className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"/>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { try { createChMut.mutate({...chForm, config: JSON.parse(chForm.config)}); } catch { toast.error('Yanlış JSON'); }}}
                  disabled={!chForm.name || createChMut.isPending}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                  {t('common.create')}
                </button>
                <button onClick={() => setShowChForm(false)} className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300 hover:bg-edge/50 transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {channelList.map((ch: any) => (
              <div key={ch.id} className="card p-4 flex items-center gap-4">
                <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400">
                  {ch.channelType === 'email' ? <Mail size={14}/> : ch.channelType === 'slack' ? <Hash size={14}/> : <Globe size={14}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{ch.name}</p>
                  <p className="text-xs font-mono text-slate-500 capitalize">{ch.channelType}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => testChMut.mutate(ch.id)}
                    className="px-2 py-1 rounded text-xs font-mono text-cyan-500 hover:bg-cyan-500/10 transition-colors">Test</button>
                  <button onClick={() => { if(confirm('Silmək?')) deleteChMut.mutate(ch.id); }}
                    className="px-2 py-1 rounded text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors">Sil</button>
                </div>
              </div>
            ))}
            {channelList.length === 0 && !showChForm && (
              <div className="card p-8 text-center">
                <Mail size={28} className="text-slate-600 mx-auto mb-2"/>
                <p className="text-slate-400 text-sm">Heç bir bildiriş kanalı yoxdur</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── API KEYS ─────────────────────────────────────────────────────── */}
      {tab === 'apikeys' && (
        <div className="space-y-4">
          {newKey && (
            <div className="card p-4 border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={15} className="text-green-400"/>
                <p className="text-sm font-semibold text-green-400">API Key yaradıldı — İndi kopyalayın!</p>
              </div>
              <div className="flex items-center gap-2 bg-canvas rounded-md p-3 border border-edge">
                <code className="flex-1 text-xs font-mono text-yellow-400 break-all">{newKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Kopyalandı!'); }}
                  className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors shrink-0">
                  <Copy size={13}/>
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2">Bu açar bir daha göstərilməyəcək. Təhlükəsiz saxlayın.</p>
              <button onClick={() => setNewKey('')} className="text-xs text-slate-500 hover:text-slate-300 mt-2">Bağla</button>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setShowKeyForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
              <Plus size={15}/> Yeni API Key
            </button>
          </div>

          {showKeyForm && (
            <div className="card p-5 border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-slate-200">Yeni API Key</h2>
                <button onClick={() => setShowKeyForm(false)} className="p-1.5 rounded text-slate-500 hover:text-slate-300"><X size={16}/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Ad *</label>
                  <input value={keyForm.name} onChange={e => setKeyForm(f=>({...f,name:e.target.value}))}
                    placeholder="CI/CD Pipeline, Grafana inteqrasiya..."
                    className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">İcazələr</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={keyForm.permissions.read}
                        onChange={e => setKeyForm(f=>({...f,permissions:{...f.permissions,read:e.target.checked}}))}
                        className="accent-cyan-500"/>
                      Oxu (GET)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={keyForm.permissions.write}
                        onChange={e => setKeyForm(f=>({...f,permissions:{...f.permissions,write:e.target.checked}}))}
                        className="accent-cyan-500"/>
                      Yaz (POST/PATCH)
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => createKeyMut.mutate(keyForm)}
                  disabled={!keyForm.name || createKeyMut.isPending}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                  {createKeyMut.isPending ? t('common.loading') : t('common.create')}
                </button>
                <button onClick={() => setShowKeyForm(false)} className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300 hover:bg-edge/50 transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {keyList.map((k: any) => (
              <div key={k.id} className="card p-4 flex items-center gap-4">
                <div className="p-2 rounded-md bg-slate-700/50">
                  <Key size={14} className="text-slate-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{k.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <code className="text-xs font-mono text-slate-500">{k.keyPrefix}</code>
                    {k.lastUsedAt && (
                      <span className="text-xs text-slate-600">
                        Son istifadə: {new Date(k.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => { if(confirm('API key-i ləğv et?')) deleteKeyMut.mutate(k.id); }}
                  className="px-2 py-1 rounded text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors">
                  Ləğv et
                </button>
              </div>
            ))}
            {keyList.length === 0 && !showKeyForm && (
              <div className="card p-8 text-center">
                <Key size={28} className="text-slate-600 mx-auto mb-2"/>
                <p className="text-slate-400 text-sm">API key yoxdur</p>
                <p className="text-slate-600 text-xs mt-1">Grafana, CI/CD, Zapier üçün API key yaradın</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STATUS PAGE ───────────────────────────────────────────────────── */}
      {tab === 'status' && (
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="font-display font-semibold text-slate-200">Public Status Page</h2>
            <p className="text-sm text-slate-400">
              Müştəriləriniz üçün açıq status səhifəsi — sistem vəziyyətini real vaxtda göstərir.
            </p>
            {org?.slug ? (
              <div className="space-y-3">
                <div className="bg-canvas-elevated rounded-lg p-4 border border-edge">
                  <p className="text-xs font-mono text-slate-500 mb-1">Sizin status page URL-niz:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-cyan-400 break-all">{statusPageUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(statusPageUrl); toast.success('Kopyalandı!'); }}
                      className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors shrink-0">
                      <Copy size={13}/>
                    </button>
                    <a href={statusPageUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors shrink-0">
                      <ExternalLink size={13}/>
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label:'Bütün monitorlar göstərilir', done: true },
                    { label:'90 günlük uptime tarixi', done: true },
                    { label:'Aktiv insidentlər', done: true },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={14} className="text-green-400 shrink-0"/>
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-yellow-400">Slug tapılmadı — təşkilat adını yadda saxlayın</p>
            )}
          </div>

          <div className="card p-4 border-cyan-500/10">
            <p className="text-xs font-mono text-cyan-400 mb-2">Müştərilərinizlə paylaşın:</p>
            <p className="text-sm text-slate-400">
              Status page linkinizi veb saytınıza, e-poçt imzanıza və ya müştəri portalınıza əlavə edin.
              Müştərilər autentifikasiya olmadan sisteminizin vəziyyətini görə bilər.
            </p>
          </div>
        </div>
      )}

      {/* ── PROFILE ───────────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="card p-6 max-w-lg space-y-4">
          <h2 className="font-display font-semibold text-slate-200">{t('settings.profile')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('settings.firstName')}</label>
              <input className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">{t('settings.lastName')}</label>
              <input className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            </div>
          </div>
          <button className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
            {t('common.save')}
          </button>
          <div className="border-t border-edge pt-4 space-y-3">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{t('settings.changePass')}</p>
            {[t('settings.currentPass'), t('settings.newPass')].map(lbl => (
              <div key={lbl}>
                <label className="text-xs font-mono text-slate-400 block mb-1">{lbl}</label>
                <input type="password" className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              </div>
            ))}
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
              {t('settings.changePass')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
