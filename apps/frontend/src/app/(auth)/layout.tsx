export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
