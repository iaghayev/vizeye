'use client';
import { useState } from 'react';
import { useLang } from '@/lib/i18n/lang-context';
import { Lang, langNames, langFlags } from '@/lib/i18n/translations';
import { ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LangSwitcher() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const langs: Lang[] = ['az','en','ru','tr','ar'];

  return (
    <div className="relative">
      <button onClick={() => setOpen(v=>!v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-edge/40 border border-edge hover:border-edge-bright text-slate-400 hover:text-slate-300 transition-all text-xs font-mono">
        <Globe size={13}/>
        <span>{langFlags[lang]}</span>
        <span className="hidden sm:block">{langNames[lang]}</span>
        <ChevronDown size={11} className={cn('transition-transform duration-200', open && 'rotate-180')}/>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-canvas-elevated border border-edge-bright rounded-lg shadow-xl overflow-hidden animate-fade-in">
            <div className="px-3 py-2 border-b border-edge">
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">{t('lang.select')}</p>
            </div>
            {langs.map(l => (
              <button key={l} onClick={() => { setLang(l); setOpen(false); }}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-edge/50',
                  lang===l ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-400')}>
                <span className="text-base">{langFlags[l]}</span>
                <span className="font-medium">{langNames[l]}</span>
                {lang===l && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400"/>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
