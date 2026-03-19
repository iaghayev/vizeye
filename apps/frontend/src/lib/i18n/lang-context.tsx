'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations, rtlLangs } from './translations';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LangContext = createContext<LangCtx>({
  lang:'az', setLang:()=>{}, t:(k)=>k, isRTL:false,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('az');

  useEffect(() => {
    const saved = localStorage.getItem('vizeye-lang') as Lang;
    if (saved && translations[saved]) {
      setLangState(saved);
      document.documentElement.dir = rtlLangs.includes(saved) ? 'rtl' : 'ltr';
      document.documentElement.lang = saved;
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('vizeye-lang', l);
    document.documentElement.dir = rtlLangs.includes(l) ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  const t = (key: string): string =>
    translations[lang]?.[key] ?? translations['en']?.[key] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRTL: rtlLangs.includes(lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
