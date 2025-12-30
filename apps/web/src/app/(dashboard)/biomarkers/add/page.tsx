"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to main biomarkers page - manual add is now a modal
export default function AddBiomarkerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/biomarkers");
  }, [router]);

  return null;
}
