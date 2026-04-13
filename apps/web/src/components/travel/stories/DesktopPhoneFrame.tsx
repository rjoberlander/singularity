import { X } from "lucide-react";
import Link from "next/link";

interface DesktopPhoneFrameProps {
  children: React.ReactNode;
  tripId: string;
}

export function DesktopPhoneFrame({ children, tripId }: DesktopPhoneFrameProps) {
  const closeHref = `/travel/${tripId}/browse`;

  return (
    // Fixed overlay — covers the entire viewport including layout chrome
    <div className="fixed inset-0 z-50 bg-black">
      {/* Mobile: full screen, no frame */}
      <div className="md:hidden h-[100dvh] w-full">
        {children}
        <CloseButton href={closeHref} />
      </div>

      {/* Desktop: centered phone mockup */}
      <div className="hidden md:flex items-center justify-center h-[100dvh] bg-gray-950">
        <div className="relative w-[430px] h-[calc(100dvh-4rem)] max-h-[932px] rounded-[3rem] border-[8px] border-gray-800 bg-black shadow-2xl overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-800 rounded-b-2xl z-50" />
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-gray-600 rounded-full z-50" />
          {/* Content */}
          <div className="h-full w-full overflow-hidden">{children}</div>
        </div>
        {/* Close button outside the phone on desktop */}
        <Link
          href={closeHref}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

function CloseButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="absolute top-3 right-3 z-40 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
    >
      <X className="h-4 w-4" />
    </Link>
  );
}
