"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForms } from "@/components/auth/AuthForms";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleSuccess = () => {
    const safe = redirect.startsWith("/") ? redirect : "/";
    router.replace(safe);
  };

  return <AuthForms onSuccess={handleSuccess} />;
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
