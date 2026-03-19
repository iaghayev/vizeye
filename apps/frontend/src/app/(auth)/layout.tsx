export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/5 blur-[120px] animate-pulse-slow" />
      <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] blur-[150px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="w-full max-w-sm relative z-10">{children}</div>
    </div>
  );
}
