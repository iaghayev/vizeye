'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { LangProvider } from '@/lib/i18n/lang-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime:30000, retry:1 } },
  }));
  return (
    <QueryClientProvider client={qc}>
      <LangProvider>
        {children}
        <Toaster position="bottom-right" theme="dark" toastOptions={{
          style:{
            background:'#0B0F1A',
            border:'1px solid #1A2240',
            color:'#E8ECF4',
            fontFamily:'DM Sans,sans-serif',
            fontSize:'13px',
            borderRadius:'12px',
            boxShadow:'0 8px 32px rgba(0,0,0,.5)',
          }
        }}/>
      </LangProvider>
    </QueryClientProvider>
  );
}
