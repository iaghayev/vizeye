'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, X, Shield, Mail, Clock, MoreVertical, UserPlus, Crown, Eye, Pencil } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { formatRelative, cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';

const roleConfig: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  admin:    { color:'text-red-400',    bg:'bg-red-500/10 border-red-500/20',    label:'Admin',    icon:Crown },
  engineer: { color:'text-cyan-400',   bg:'bg-cyan-500/10 border-cyan-500/20',  label:'Engineer', icon:Shield },
  viewer:   { color:'text-slate-400',  bg:'bg-slate-500/10 border-slate-500/20', label:'Viewer',  icon:Eye },
};

export default function TeamPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email:'', role:'engineer', firstName:'', lastName:'' });
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => apiGet<any>('/api/v1/users'),
    refetchInterval: 60000,
  });
  const users = Array.isArray(data) ? data : (data?.data ?? []);

  const inviteMut = useMutation({
    mutationFn: (d: any) => apiPost('/api/v1/users/invite', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-users'] });
      setShowInvite(false);
      setInviteForm({ email:'', role:'engineer', firstName:'', lastName:'' });
      toast.success(t('team.invited'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiPatch(`/api/v1/users/${id}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-users'] });
      setEditingUser(null);
      toast.success(t('common.success'));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-users'] }); toast.success(t('common.success')); },
  });

  const roleCounts = {
    admin: users.filter((u: any) => u.role === 'admin').length,
    engineer: users.filter((u: any) => u.role === 'engineer').length,
    viewer: users.filter((u: any) => u.role === 'viewer').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-slate-100">{t('team.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('team.subtitle')}</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/15 hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300">
          <UserPlus size={15} /> {t('team.invite')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 animate-slide-up stagger-1">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">{t('team.totalMembers')}</p>
          <p className="metric-value text-2xl text-cyan-400 animate-count-up">{users.length}</p>
        </div>
        {Object.entries(roleCounts).map(([role, count], i) => {
          const rc = roleConfig[role] || roleConfig.viewer;
          return (
            <div key={role} className={cn('card p-4 animate-slide-up', `stagger-${i + 2}`)}>
              <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">{rc.label}</p>
              <p className={cn('metric-value text-2xl animate-count-up', rc.color)}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="card p-6 card-glow-cyan animate-scale-in">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <UserPlus size={15} className="text-cyan-400" />
              </div>
              <h2 className="font-display font-semibold text-slate-200">{t('team.invite')}</h2>
            </div>
            <button onClick={() => setShowInvite(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-edge/50 transition-all">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-2">Email *</label>
              <input value={inviteForm.email} onChange={e => setInviteForm(f => ({...f, email:e.target.value}))}
                placeholder="engineer@company.com" type="email"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-canvas border border-edge text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            </div>
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-2">{t('team.role')}</label>
              <select value={inviteForm.role} onChange={e => setInviteForm(f => ({...f, role:e.target.value}))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-canvas border border-edge text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                <option value="engineer">Engineer</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-2">{t('settings.firstName')}</label>
              <input value={inviteForm.firstName} onChange={e => setInviteForm(f => ({...f, firstName:e.target.value}))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-canvas border border-edge text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            </div>
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-2">{t('settings.lastName')}</label>
              <input value={inviteForm.lastName} onChange={e => setInviteForm(f => ({...f, lastName:e.target.value}))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-canvas border border-edge text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-5 border-t border-edge/50">
            <button onClick={() => inviteMut.mutate(inviteForm)}
              disabled={!inviteForm.email || inviteMut.isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/15 transition-all duration-300 disabled:opacity-50">
              {inviteMut.isPending ? t('common.loading') : t('team.sendInvite')}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-300 hover:bg-edge/40 transition-all">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* User List */}
      {isLoading ? (
        <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <div className="card p-16 text-center animate-scale-in">
          <Users size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">{t('team.empty')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead><tr className="border-b border-edge">
              {[t('team.member'), 'Email', t('team.role'), t('assets.status'), t('assets.lastSeen'), t('common.actions')].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-[0.1em]">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {users.map((u: any, i: number) => {
                const rc = roleConfig[u.role] || roleConfig.viewer;
                const RoleIcon = rc.icon;
                return (
                  <tr key={u.id} className={cn('border-b border-edge/30 hover:bg-edge/15 transition-colors', i === users.length-1 && 'border-0')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-edge flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-cyan-400">
                            {u.firstName?.[0] || u.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs font-mono text-slate-500">{u.email}</span></td>
                    <td className="px-4 py-3">
                      {editingUser === u.id ? (
                        <select value={u.role} onChange={e => updateRoleMut.mutate({ id: u.id, role: e.target.value })}
                          className="px-2 py-1 rounded-lg text-xs bg-canvas border border-edge text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                          {['admin','engineer','viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg border', rc.bg, rc.color)}>
                          <RoleIcon size={10} /> {rc.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase px-2.5 py-1 rounded-lg border',
                        u.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                      )}>
                        {u.isActive !== false ? t('settings.active') : t('settings.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-slate-600">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : t('common.never')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title={t('common.edit')}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => { if(confirm(t('common.confirm')+'?')) deleteMut.mutate(u.id); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-mono text-red-500 hover:bg-red-500/10 transition-colors">
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
    </div>
  );
}
