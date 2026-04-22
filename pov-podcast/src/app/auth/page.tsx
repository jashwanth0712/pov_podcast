"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuthForms } from "@/components/auth/AuthForms";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleSuccess = () => {
    const safe = redirect.startsWith("/") ? redirect : "/";
    router.replace(safe);
  };

  return <AuthForms onSuccess={handleSuccess} />;
}
