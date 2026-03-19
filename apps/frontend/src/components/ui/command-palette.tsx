'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search, LayoutDashboard, Server, Radio, BellRing, Flame,
  Settings, Activity, Wrench, Radar, Terminal, Network,
  ArrowRight, Command, Users, FileText, Hash, CornerDownLeft,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';

interface SearchResult {
  id: string;
  type: 'page' | 'asset' | 'monitor' | 'incident' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
}

const PAGES: SearchResult[] = [
  { id:'p-dash',       type:'page', title:'Dashboard',       icon:LayoutDashboard, href:'/dashboard' },
  { id:'p-assets',     type:'page', title:'Assets',          icon:Server,          href:'/assets' },
  { id:'p-monitors',   type:'page', title:'Monitors',        icon:Radio,           href:'/monitors' },
  { id:'p-alerts',     type:'page', title:'Alerts',          icon:BellRing,        href:'/alerts' },
  { id:'p-incidents',  type:'page', title:'Incidents',       icon:Flame,           href:'/incidents' },
  { id:'p-events',     type:'page', title:'Events',          icon:Activity,        href:'/events' },
  { id:'p-maintenance',type:'page', title:'Maintenance',     icon:Wrench,          href:'/maintenance' },
  { id:'p-discovery',  type:'page', title:'Discovery',       icon:Radar,           href:'/discovery' },
  { id:'p-deploy',     type:'page', title:'Deploy Agent',    icon:Terminal,        href:'/deploy' },
  { id:'p-snmp',       type:'page', title:'SNMP Devices',    icon:Network,         href:'/snmp-devices' },
  { id:'p-team',       type:'page', title:'Team Management', icon:Users,           href:'/team' },
  { id:'p-audit',      type:'page', title:'Audit Log',       icon:FileText,        href:'/audit' },
  { id:'p-settings',   type:'page', title:'Settings',        icon:Settings,        href:'/settings' },
];

export function CommandPalette() {
  const router = useRouter();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch assets & monitors for search
  const { data: assets } = useQuery({
    queryKey: ['cmd-assets'], queryFn: () => apiGet<any>('/api/v1/assets?limit=50'),
    enabled: open, staleTime: 60000,
  });
  const { data: monitors } = useQuery({
    queryKey: ['cmd-monitors'], queryFn: () => apiGet<any>('/api/v1/monitors?limit=50'),
    enabled: open, staleTime: 60000,
  });
  const { data: incidents } = useQuery({
    queryKey: ['cmd-incidents'], queryFn: () => apiGet<any>('/api/v1/incidents?limit=20&status=open'),
    enabled: open, staleTime: 30000,
  });

  const assetList: any[] = Array.isArray(assets) ? assets : (assets?.data ?? []);
  const monList: any[] = Array.isArray(monitors) ? monitors : (monitors?.data ?? []);
  const incList: any[] = Array.isArray(incidents) ? incidents : (incidents?.data ?? []);

  // Build results
  const allResults: SearchResult[] = [
    ...PAGES,
    ...assetList.map((a: any) => ({
      id: `a-${a.id}`, type: 'asset' as const, title: a.name,
      subtitle: `${a.ipAddress || ''} · ${a.environment}`,
      icon: Server, href: `/assets/${a.id}`,
    })),
    ...monList.map((m: any) => ({
      id: `m-${m.id}`, type: 'monitor' as const, title: m.name,
      subtitle: m.target, icon: Radio, href: '/monitors',
    })),
    ...incList.map((i: any) => ({
      id: `i-${i.id}`, type: 'incident' as const, title: i.title,
      subtitle: `${i.severity} · ${i.status}`, icon: Flame, href: '/incidents',
    })),
  ];

  const filtered = query.trim()
    ? allResults.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : PAGES;

  // Keyboard handler
  const handleKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(v => !v);
    }
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (open) {
      setQuery(''); setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const navigate = (result: SearchResult) => {
    if (result.href) router.push(result.href);
    if (result.action) result.action();
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      navigate(filtered[selectedIdx]);
    }
  };

  if (!open) return null;

  const grouped = {
    page: filtered.filter(r => r.type === 'page'),
    asset: filtered.filter(r => r.type === 'asset'),
    monitor: filtered.filter(r => r.type === 'monitor'),
    incident: filtered.filter(r => r.type === 'incident'),
  };

  let flatIdx = -1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
        <div className="w-full max-w-xl pointer-events-auto animate-scale-in" onClick={e => e.stopPropagation()}>
          <div className="bg-canvas-surface border border-edge-bright rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-edge">
              <Search size={18} className="text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('cmd.placeholder')}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
              <kbd className="px-2 py-1 rounded-md bg-canvas-elevated border border-edge text-[10px] font-mono text-slate-600">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Search size={24} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t('cmd.noResults')}</p>
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => {
                  if (!items.length) return null;
                  const labels: Record<string, string> = {
                    page: 'Səhifələr', asset: 'Aktivlər', monitor: 'Monitorlar', incident: 'Hadisələr',
                  };
                  return (
                    <div key={type}>
                      <p className="px-5 py-1.5 text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {labels[type]}
                      </p>
                      {items.map(result => {
                        flatIdx++;
                        const idx = flatIdx;
                        const Icon = result.icon;
                        return (
                          <button key={result.id}
                            onClick={() => navigate(result)}
                            onMouseEnter={() => setSelectedIdx(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors',
                              selectedIdx === idx
                                ? 'bg-cyan-500/10 text-cyan-400'
                                : 'text-slate-400 hover:bg-edge/30'
                            )}>
                            <Icon size={16} className="shrink-0 opacity-60" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-[10px] font-mono text-slate-600 truncate">{result.subtitle}</p>
                              )}
                            </div>
                            {selectedIdx === idx && (
                              <CornerDownLeft size={12} className="shrink-0 opacity-40" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-edge text-[10px] font-mono text-slate-600">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-canvas-elevated border border-edge">↑↓</kbd> naviqasiya</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-canvas-elevated border border-edge">↵</kbd> seç</span>
              </div>
              <span>{filtered.length} nəticə</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
