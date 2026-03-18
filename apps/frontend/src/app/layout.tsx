import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
export const metadata: Metadata = { title:{ template:'%s — VizEye', default:'VizEye — Infrastructure Monitoring' }, description:'Enterprise IT infrastructure monitoring' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-canvas text-slate-200 antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
