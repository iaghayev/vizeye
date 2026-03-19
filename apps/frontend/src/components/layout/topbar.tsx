'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, Search, Command } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { useLang } from '@/lib/i18n/lang-context';
import { LangSwitcher } from '@/components/ui/lang-switcher';
import { NotificationCenter } from '@/components/ui/notification-center';
import { useSocket } from '@/lib/hooks/use-socket';

const PAGE_KEYS: Record<string,string> = {
  '/dashboard':'nav.dashboard','/assets':'nav.assets','/monitors':'nav.monitors',
  '/alerts':'nav.alerts','/incidents':'nav.incidents','/settings':'nav.settings',
  '/events':'nav.events','/maintenance':'nav.maintenance','/discovery':'nav.discovery',
  '/deploy':'nav.deploy','/snmp-devices':'nav.snmp','/team':'nav.team','/audit':'nav.audit',
};

export function Topbar() {
  const path = usePathname();
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const { connected } = useSocket();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const titleKey = Object.entries(PAGE_KEYS).find(([k])=>path===k||path.startsWith(k+'/'))?.[1]||'nav.dashboard';
  const { refetch } = useQuery({ queryKey:['alert-summary'], queryFn:dashboardApi.getAlertSummary, refetchInterval:15000 });

  const handleRefresh = () => { refetch(); qc.invalidateQueries(); };

  return (
    <header className="h-14 flex items-center gap-3 px-6 border-b border-edge bg-canvas-surface/80 backdrop-blur-xl shrink-0 relative z-10">
      <h1 className="font-display font-semibold text-[15px] text-slate-200">{t(titleKey)}</h1>

      {/* Live */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold',
        connected
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
      )}>
        <span className={cn('relative w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-400' : 'bg-yellow-400')}>
          {connected && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />}
        </span>
        {connected ? 'Live' : 'Reconnecting...'}
      </div>

      <div className="flex-1"/>

      {/* ⌘K trigger */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key:'k', metaKey:true }))}
        className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-edge bg-canvas/50 hover:bg-canvas-elevated text-slate-500 hover:text-slate-300 transition-all text-xs cursor-pointer group">
        <Search size={13} className="group-hover:text-cyan-400 transition-colors" />
        <span>{t('common.search')}...</span>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-canvas-elevated border border-edge text-[10px] font-mono text-slate-600">
          <Command size={9}/>K
        </kbd>
      </button>

      {/* Clock */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-canvas/50 border border-edge/60">
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {now.toLocaleDateString(lang === 'az' ? 'az-AZ' : 'en-US', { day:'2-digit', month:'short' })}
        </span>
        <span className="w-px h-3 bg-edge" />
        <span className="font-mono text-xs text-cyan-400 tabular-nums font-semibold">
          {now.toLocaleTimeString(lang === 'az' ? 'az-AZ' : 'en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })}
        </span>
      </div>

      <LangSwitcher/>

      <button onClick={handleRefresh} title={t('common.refresh')}
        className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all">
        <RefreshCw size={14}/>
      </button>

      <NotificationCenter />
    </header>
  );
}
