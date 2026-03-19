'use client';
import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { cn, formatRelative } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
}

// In-memory notification store (could be upgraded to zustand)
let _notifications: Notification[] = [];
let _listeners: (() => void)[] = [];

export function pushNotification(n: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  _notifications.unshift({
    ...n,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date(),
    read: false,
  });
  if (_notifications.length > 50) _notifications = _notifications.slice(0, 50);
  _listeners.forEach(l => l());
}

function useNotifications() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender(v => v + 1);
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, []);
  return _notifications;
}

export function NotificationCenter() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const notifications = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    _notifications.forEach(n => n.read = true);
    _listeners.forEach(l => l());
  };

  const clearAll = () => {
    _notifications = [];
    _listeners.forEach(l => l());
  };

  const iconMap = {
    critical: <AlertCircle size={14} className="text-red-400" />,
    warning: <AlertTriangle size={14} className="text-yellow-400" />,
    info: <Info size={14} className="text-blue-400" />,
    success: <CheckCircle size={14} className="text-emerald-400" />,
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(v => !v); if (!open) markAllRead(); }}
        className={cn(
          'relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all',
          unreadCount > 0
            ? 'bg-red-500/10 border border-red-500/25 text-red-400'
            : 'bg-canvas/50 border border-edge text-slate-500 hover:text-slate-300'
        )}>
        <Bell size={13} className={unreadCount > 0 ? 'animate-pulse' : ''} />
        <span className="font-semibold">{unreadCount}</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-400 animate-ping opacity-60" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-96 bg-canvas-elevated border border-edge-bright rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
              <span className="text-sm font-semibold text-slate-200">{t('notif.title')}</span>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] font-mono text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1">
                    <Trash2 size={10} /> {t('notif.clearAll')}
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded text-slate-500 hover:text-slate-300">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={24} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-600">{t('notif.empty')}</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b border-edge/50',
                    'hover:bg-edge/20 transition-colors',
                    !n.read && 'bg-cyan-500/[0.03]'
                  )}>
                    <div className="mt-0.5 shrink-0">{iconMap[n.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300">{n.title}</p>
                      {n.message && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{n.message}</p>}
                      <p className="text-[10px] font-mono text-slate-600 mt-1">{formatRelative(n.timestamp)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
