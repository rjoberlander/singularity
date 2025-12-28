export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Singularity</h1>
          <p className="text-muted-foreground mt-2">
            AI-Powered Health Protocol Tracking
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
