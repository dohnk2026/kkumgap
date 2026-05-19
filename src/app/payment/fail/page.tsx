"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function FailContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "알 수 없는 오류가 발생했습니다.";
  const code = searchParams.get("code");

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(76, 29, 149, 0.15) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 text-center max-w-sm w-full">
        <p className="text-6xl mb-6" style={{ animation: "float 3s ease-in-out infinite" }}>😢</p>
        <h1 className="text-2xl font-bold text-white mb-2">결제에 실패했어요</h1>
        <p className="text-sm mb-2" style={{ color: "#a78bfa" }}>{message}</p>
        {code && (
          <p className="text-xs mb-8" style={{ color: "rgba(167, 139, 250, 0.4)" }}>
            오류 코드: {code}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/market"
            className="block w-full py-3.5 rounded-xl text-white font-semibold text-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            꿈시장으로 돌아가기
          </Link>
          <Link
            href="/"
            className="block w-full py-3 rounded-xl font-medium text-center"
            style={{
              background: "rgba(15, 8, 40, 0.6)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              color: "#a78bfa",
            }}
          >
            내 꿈 해석하러 가기
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#050210" }} />}>
      <FailContent />
    </Suspense>
  );
}
