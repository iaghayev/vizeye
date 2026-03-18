'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions:{ queries:{ staleTime:30000, retry:1 } } }));
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster position="bottom-right" theme="dark" toastOptions={{ style:{ background:'#111827', border:'1px solid #1A2740', color:'#E2E8F0', fontFamily:'DM Sans,sans-serif', fontSize:'13px' } }} />
    </QueryClientProvider>
  );
}
