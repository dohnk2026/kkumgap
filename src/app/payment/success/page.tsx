"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

interface DreamData {
  title: string;
  interpretation: string;
  category: string;
  price: number;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount") ?? 0);
  const dreamId = searchParams.get("dreamId") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [dream, setDream] = useState<DreamData | null>(null);
  const [fee, setFee] = useState(0);
  const [sellerAmount, setSellerAmount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (!paymentKey || !orderId || !amount || !dreamId) {
      router.replace("/market");
      return;
    }

    let ran = false;
    async function confirm() {
      if (ran) return;
      ran = true;

      try {
        const res = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount, dreamId, buyerId: user!.id }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setFee(data.fee);
        setSellerAmount(data.sellerAmount);

        const { data: dreamData } = await supabase
          .from("dreams")
          .select("title, interpretation, category, price")
          .eq("id", dreamId)
          .single();

        if (dreamData) setDream(dreamData);
        setStatus("success");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "결제 처리 중 오류가 발생했습니다.");
        setStatus("error");
      }
    }

    confirm();
  }, [authLoading, user, paymentKey, orderId, amount, dreamId, router]);

  if (status === "loading") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-6"
          style={{
            background: "rgba(124, 58, 237, 0.2)",
            border: "1px solid rgba(124, 58, 237, 0.4)",
            animation: "float 2s ease-in-out infinite",
          }}
        >
          🔮
        </div>
        <p className="text-white font-medium mb-1">결제를 처리하는 중...</p>
        <p className="text-sm" style={{ color: "#a78bfa" }}>잠시만 기다려주세요</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
      >
        <p className="text-5xl mb-4">😔</p>
        <h1 className="text-xl font-bold text-white mb-2">결제 처리에 실패했어요</h1>
        <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>{errorMsg}</p>
        <Link
          href="/market"
          className="px-6 py-3 rounded-xl text-white font-medium"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          꿈시장으로 돌아가기
        </Link>
      </main>
    );
  }

  const interpretationParts = dream?.interpretation.split("\n\n") ?? [];

  return (
    <main
      className="min-h-screen relative"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 10%, rgba(76, 29, 149, 0.25) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-12 pb-20">
        {/* 축하 헤더 */}
        <div className="text-center mb-10">
          <div
            className="text-6xl mb-4 inline-block"
            style={{ animation: "float 3s ease-in-out infinite" }}
          >
            🎉
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">꿈 구매 완료!</h1>
          <p className="text-sm" style={{ color: "#a78bfa" }}>
            이제 전체 해석을 볼 수 있어요
          </p>
        </div>

        {/* 결제 영수증 */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: "rgba(15, 8, 40, 0.8)", border: "1px solid rgba(124, 58, 237, 0.2)" }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: "rgba(167, 139, 250, 0.7)" }}>
            💳 결제 내역
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span style={{ color: "#94a3b8" }}>결제 금액</span>
              <span
                className="font-bold text-base"
                style={{
                  background: "linear-gradient(135deg, #fde68a, #fbbf24)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ₩{amount.toLocaleString("ko-KR")}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#94a3b8" }}>플랫폼 수수료 (20%)</span>
              <span style={{ color: "rgba(148, 163, 184, 0.7)" }}>₩{fee.toLocaleString("ko-KR")}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#94a3b8" }}>판매자 수령액</span>
              <span style={{ color: "rgba(148, 163, 184, 0.7)" }}>₩{sellerAmount.toLocaleString("ko-KR")}</span>
            </div>
          </div>
        </div>

        {/* 전체 해석 */}
        {dream && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: "rgba(124, 58, 237, 0.2)",
                  color: "#c4b5fd",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                }}
              >
                {dream.category}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-6 leading-snug">{dream.title}</h2>

            <div className="space-y-4 mb-8">
              {interpretationParts.map((part, i) => (
                <div key={i} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{i === 0 ? "🏮" : "🧠"}</span>
                    <h3 className="font-semibold text-white">
                      {i === 0 ? "전통 해몽" : "심리 해석"}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                    {part}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 하단 버튼 */}
        <div className="space-y-3">
          <Link
            href="/market"
            className="block w-full py-3.5 rounded-xl text-white font-semibold text-center btn-glow"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            꿈시장 더 구경하기
          </Link>
          <Link
            href="/"
            className="block w-full py-3.5 rounded-xl font-medium text-center"
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#050210" }} />}>
      <SuccessContent />
    </Suspense>
  );
}
