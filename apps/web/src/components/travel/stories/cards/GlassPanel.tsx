import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-lg",
        className
      )}
    >
      {children}
    </div>
  );
}
