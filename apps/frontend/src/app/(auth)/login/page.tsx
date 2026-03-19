'use client';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLang } from '@/lib/i18n/lang-context';

export default function LoginPage() {
  const { t } = useLang();
  const { login, isLoginPending } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) login({ email, password });
  };

  return (
    <div className="animate-scale-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/20">
          <Eye size={26} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="font-display font-bold text-2xl tracking-tight text-slate-100">
          Viz<span className="text-cyan-400">Eye</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t('auth.loginSubtitle')}</p>
      </div>

      {/* Form */}
      <div className="p-6 rounded-2xl bg-canvas-surface/80 backdrop-blur-xl border border-edge shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-slate-500 block mb-2">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@acme.local" required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-canvas border border-edge text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-slate-500 block mb-2">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-canvas border border-edge text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoginPending || !email || !password}
            className={cn(
              'w-full py-2.5 rounded-xl text-sm font-semibold',
              'bg-gradient-to-r from-cyan-500 to-blue-600 text-white',
              'shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30',
              'hover:from-cyan-400 hover:to-blue-500',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/40',
              'transition-all duration-300',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2 group',
            )}>
            {isLoginPending ? <Loader2 size={16} className="animate-spin" /> : (
              <>{t('auth.signIn')}<ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-edge/60 text-center">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">Demo</p>
          <p className="text-[11px] font-mono text-slate-500">
            admin@acme.local / <span className="text-cyan-500/70">Demo1234!</span>
          </p>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-600 mt-6">
        Powered by <span className="font-semibold text-slate-500">VizEye</span> <span className="text-slate-700">v1.0</span>
      </p>
    </div>
  );
}
