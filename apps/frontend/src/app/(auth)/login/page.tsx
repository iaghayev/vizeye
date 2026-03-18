'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';

const schema = z.object({ email:z.string().email(), password:z.string().min(1) });
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, isLoginPending } = useAuth();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState:{errors} } = useForm<Form>({ resolver:zodResolver(schema) });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-6">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="rgba(6,182,212,0.12)"/>
            <rect width="32" height="32" rx="6" stroke="rgba(6,182,212,0.3)" strokeWidth="1"/>
            <circle cx="16" cy="16" r="5" stroke="#22D3EE" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="2" fill="#22D3EE"/>
          </svg>
          <span className="font-display font-bold text-lg text-slate-100">VizEye</span>
        </div>
        <h2 className="font-display font-bold text-2xl text-slate-100 mb-1">Sign in</h2>
        <p className="text-slate-500 text-sm">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit((d)=>login(d))} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Email</label>
          <input {...register('email')} type="email" placeholder="you@company.com"
            className={cn('w-full px-3.5 py-2.5 rounded-md text-sm bg-canvas-elevated border text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors',
              errors.email?'border-red-500/50':'border-edge hover:border-edge-bright')} />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Password</label>
          <div className="relative">
            <input {...register('password')} type={show?'text':'password'} placeholder="••••••••"
              className={cn('w-full px-3.5 py-2.5 pr-10 rounded-md text-sm bg-canvas-elevated border text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors',
                errors.password?'border-red-500/50':'border-edge hover:border-edge-bright')} />
            <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400">
              {show?<EyeOff size={15}/>:<Eye size={15}/>}
            </button>
          </div>
        </div>

        <div className="rounded-md bg-cyan-500/5 border border-cyan-500/15 px-3 py-2.5">
          <p className="text-xs font-mono text-cyan-600">Demo: admin@acme.local / Demo1234!</p>
        </div>

        <button type="submit" disabled={isLoginPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500 transition-all disabled:opacity-50">
          {isLoginPending?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</>:<><LogIn size={15}/>Sign in</>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        No account? <Link href="/register" className="text-cyan-500 hover:text-cyan-400">Create organization</Link>
      </p>
    </div>
  );
}
