'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, Radio, BellRing, Flame,
  Settings, LogOut, Radar, Terminal, Activity, Wrench,
  Eye, ChevronLeft, ChevronRight, Users, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLang } from '@/lib/i18n/lang-context';
import { useState } from 'react';
import { useSocket } from '@/lib/hooks/use-socket';

export function Sidebar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLang();
  const { connected } = useSocket();
  const [collapsed, setCollapsed] = useState(false);

  const mainNav = [
    { key:'nav.dashboard',  href:'/dashboard',    icon:LayoutDashboard },
    { key:'nav.assets',     href:'/assets',       icon:Server          },
    { key:'nav.monitors',   href:'/monitors',     icon:Radio           },
    { key:'nav.alerts',     href:'/alerts',       icon:BellRing        },
    { key:'nav.incidents',  href:'/incidents',    icon:Flame           },
    { key:'nav.events',     href:'/events',       icon:Activity        },
  ];

  const toolsNav = [
    { key:'nav.maintenance',href:'/maintenance',  icon:Wrench          },
    { key:'nav.discovery',  href:'/discovery',    icon:Radar           },
    { key:'nav.deploy',     href:'/deploy',       icon:Terminal        },
  ];

  const adminNav = [
    { key:'nav.team',       href:'/team',         icon:Users           },
    { key:'nav.audit',      href:'/audit',        icon:FileText        },
    { key:'nav.settings',   href:'/settings',     icon:Settings        },
  ];

  const NavSection = ({ label, items }: { label: string; items: typeof mainNav }) => (
    <div>
      {!collapsed && (
        <p className="px-3 mb-2 mt-4 text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-600/70">
          {label}
        </p>
      )}
      {items.map(item => {
        const active = item.href === '/dashboard' ? path === '/dashboard' : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              'flex items-center gap-3 py-2 rounded-lg text-[13px] transition-all group',
              collapsed ? 'px-0 justify-center' : 'px-3',
              active
                ? 'nav-item-active font-medium'
                : 'text-slate-500 hover:text-slate-300 hover:bg-edge/40 border-l-2 border-transparent'
            )}
            title={collapsed ? t(item.key) : undefined}>
            <div className="relative">
              <item.icon size={16} className={cn('shrink-0 transition-colors',
                active ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400')} />
              {active && <div className="absolute inset-0 blur-md bg-cyan-400/25 rounded-full" />}
            </div>
            {!collapsed && t(item.key)}
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 border-r border-edge bg-canvas-surface',
        'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
      )}
      style={{ width: collapsed ? 68 : 240, height: '100vh' }}>

      {/* Logo */}
      <div className={cn('h-14 flex items-center gap-3 border-b border-edge shrink-0', collapsed ? 'px-4 justify-center' : 'px-5')}>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Eye size={17} className="text-white" strokeWidth={2.5} />
          </div>
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-canvas-surface',
            connected ? 'bg-green-400' : 'bg-slate-500'
          )}>
            {connected && <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40" />}
          </span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <span className="font-display font-bold text-[15px] text-slate-100">
              Viz<span className="text-cyan-400">Eye</span>
            </span>
            <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-slate-600 -mt-0.5">
              {connected ? t('nav.live') : 'OFFLINE'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
        <NavSection label="Monitor" items={mainNav} />
        <NavSection label="Tools" items={toolsNav} />
        <NavSection label="Admin" items={adminNav} />
      </nav>

      {/* Collapse */}
      <div className="shrink-0 px-3 py-2 border-t border-edge/60">
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-edge/30 transition-all">
          {collapsed ? <ChevronRight size={14}/> : <><ChevronLeft size={14}/><span>Collapse</span></>}
        </button>
      </div>

      {/* User */}
      <div className="shrink-0 border-t border-edge p-3">
        {user && (
          <div className={cn('flex items-center gap-2.5 px-2 py-2', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/15">
              <span className="text-[11px] font-bold text-white">
                {user.firstName?.[0] || user.email[0].toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName||''}`.trim() : user.email}
                  </p>
                  <p className="text-[10px] font-mono text-slate-600 capitalize">{user.role}</p>
                </div>
                <button onClick={logout} title={t('auth.signOut')}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <LogOut size={13}/>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
