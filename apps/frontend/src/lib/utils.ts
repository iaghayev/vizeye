import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
export const formatRelative = (d?: string|Date|null) => d ? dayjs(d).fromNow() : '—';
export const formatDateTime  = (d?: string|Date|null) => d ? dayjs(d).format('MMM D, YYYY HH:mm') : '—';
export const truncate = (s:string,n:number) => s.length<=n ? s : s.slice(0,n)+'…';
export const statusDotClass = (s?:string|null) => {
  if(s==='up') return 'status-dot up';
  if(s==='down'||s==='error') return 'status-dot down';
  if(s==='degraded'||s==='timeout') return 'status-dot degraded';
  return 'status-dot unknown';
};
export const severityColor = (s:string) => ({critical:'text-red-400',warning:'text-yellow-400',high:'text-yellow-400',info:'text-blue-400',medium:'text-blue-400',low:'text-slate-400'}[s]||'text-slate-400');
export const severityBg = (s:string) => ({critical:'bg-red-500/10 text-red-400 border border-red-500/20',warning:'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',high:'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',info:'bg-blue-500/10 text-blue-400 border border-blue-500/20',medium:'bg-blue-500/10 text-blue-400 border border-blue-500/20',low:'bg-slate-700/30 text-slate-400 border border-slate-600/20'}[s]||'bg-slate-800 text-slate-400');
