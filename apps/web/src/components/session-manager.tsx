"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Manages session persistence based on "Remember me" preference.
 * When "Remember me" is unchecked, clears session on browser close.
 */
export function SessionManager() {
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const shouldClear = sessionStorage.getItem('clearSessionOnClose');
      if (shouldClear === 'true') {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    };

    // Only trigger on actual browser/tab close, not on navigation
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return null;
}
