'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard,Server,Radio,BellRing,Flame,BarChart3,Settings,LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';

const nav = [
  { label:'Dashboard', href:'/dashboard',  icon:LayoutDashboard },
  { label:'Assets',    href:'/assets',     icon:Server },
  { label:'Monitors',  href:'/monitors',   icon:Radio },
  { label:'Alerts',    href:'/alerts',     icon:BellRing },
  { label:'Incidents', href:'/incidents',  icon:Flame },
  { label:'Settings',  href:'/settings',   icon:Settings },
];

export function Sidebar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  return (
    <aside className="hidden md:flex flex-col w-[220px] xl:w-[240px] shrink-0 border-r border-edge bg-canvas-surface" style={{height:'100vh'}}>
      <div className="h-14 flex items-center gap-3 px-5 border-b border-edge shrink-0">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="6" fill="rgba(6,182,212,0.1)"/>
          <rect width="32" height="32" rx="6" stroke="rgba(6,182,212,0.25)" strokeWidth="1"/>
          <circle cx="16" cy="16" r="5" stroke="#22D3EE" strokeWidth="1.5"/>
          <circle cx="16" cy="16" r="2" fill="#22D3EE"/>
          <line x1="16" y1="4" x2="16" y2="8" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="16" y1="24" x2="16" y2="28" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="4" y1="16" x2="8" y2="16" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="24" y1="16" x2="28" y2="16" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="font-display font-bold text-[15px] text-slate-100">VizEye</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>
          <span className="text-[10px] font-mono text-green-500/70 uppercase tracking-wider">live</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map(item=>{
          const active = item.href==='/dashboard'?path==='/dashboard':path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group',
                active?'nav-item-active font-medium':'text-slate-500 hover:text-slate-300 hover:bg-edge/50 border-l-2 border-transparent')}>
              <item.icon size={15} className={cn('shrink-0',active?'text-cyan-400':'text-slate-600 group-hover:text-slate-400')}/>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-edge p-3">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-md bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
              <span className="text-xs font-mono text-cyan-400">{user.firstName?.[0]||user.email[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user.firstName?`${user.firstName} ${user.lastName||''}`.trim():user.email}</p>
              <p className="text-[10px] font-mono text-slate-600 capitalize">{user.role}</p>
            </div>
            <button onClick={logout} className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Sign out">
              <LogOut size={13}/>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
