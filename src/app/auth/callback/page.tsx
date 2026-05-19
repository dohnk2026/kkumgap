"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(() => router.replace("/"))
        .catch(() => router.replace("/login?error=auth"));
    } else {
      router.replace("/");
    }
  }, [router, searchParams]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="w-16 h-16 rounded-full mb-6 flex items-center justify-center text-2xl"
        style={{
          background: "rgba(124, 58, 237, 0.2)",
          border: "1px solid rgba(124, 58, 237, 0.4)",
          animation: "float 2s ease-in-out infinite",
        }}
      >
        🔮
      </div>
      <p className="text-white font-medium">로그인 처리 중...</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#050210" }} />}>
      <CallbackHandler />
    </Suspense>
  );
}
