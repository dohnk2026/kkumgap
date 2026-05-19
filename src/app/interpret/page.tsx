"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import RegisterDreamModal from "@/components/RegisterDreamModal";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";

interface Interpretation {
  category: string;
  traditional: string;
  psychological: string;
  advice: string;
  price: number;
  luckyNumbers: number[];
  marketQuestion: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  재물운: "💰",
  성공운: "🚀",
  연애운: "💕",
  경고몽: "⚠️",
  태몽: "👶",
  건강운: "💚",
  관계운: "🤝",
  자아성장: "🌱",
  기타: "🌙",
};

type PageStatus = "loading" | "success" | "login_required" | "daily_limit" | "error";

function InterpretContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dream = searchParams.get("dream") || "";

  const { user, loading: authLoading } = useAuth();
  const [result, setResult] = useState<Interpretation | null>(null);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!dream.trim()) {
      router.replace("/");
      return;
    }
    if (authLoading) return;

    if (!user) {
      setPageStatus("login_required");
      return;
    }

    let cancelled = false;

    async function fetchInterpretation() {
      setPageStatus("loading");
      setError(null);
      try {
        const res = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dream, userId: user!.id }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (data.error === "login_required" || res.status === 401) {
          setPageStatus("login_required");
        } else if (data.error === "daily_limit" || res.status === 429) {
          setPageStatus("daily_limit");
        } else if (!res.ok) {
          setError(data.error || "해석 실패");
          setPageStatus("error");
        } else {
          setResult(data);
          setPageStatus("success");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
          setPageStatus("error");
        }
      }
    }

    fetchInterpretation();
    return () => { cancelled = true; };
  }, [dream, router, user, authLoading]);

  const handlePaidInterpret = async () => {
    if (!user || paying) return;
    setPaying(true);
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = tossPayments.payment({ customerKey: user.id });
      const orderId = `interpret-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem(`interpret-dream-${orderId}`, dream);
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: 1000 },
        orderId,
        orderName: "꿈 해석 (유료)",
        successUrl: `${window.location.origin}/payment/interpret-success?orderId=${orderId}&amount=1000`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email ?? undefined,
      });
    } catch {
      setPaying(false);
    }
  };

  const bgMain = { background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" };

  if (pageStatus === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={bgMain}>
        <div className="text-center px-6">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(67, 56, 202, 0.3))",
              border: "1px solid rgba(167, 139, 250, 0.4)",
              animation: "float 2s ease-in-out infinite",
            }}
          >
            🔮
          </div>
          <p className="text-lg font-medium text-white mb-2">몽해 할머니가 꿈을 풀어보는 중...</p>
          <p className="text-sm" style={{ color: "#a78bfa" }}>잠시만 기다려주세요</p>
        </div>
      </main>
    );
  }

  if (pageStatus === "login_required") {
    return (
      <main className="min-h-screen flex items-center justify-center px-5" style={bgMain}>
        <div className="text-center max-w-sm w-full">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-white font-bold text-xl mb-2">로그인이 필요해요</p>
          <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>
            무료 해석은 하루 1회, 로그인 후 이용할 수 있어요.
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem("pending-dream", dream);
              router.push("/login");
            }}
            className="btn-glow w-full py-4 rounded-xl text-white font-semibold mb-3"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            로그인하고 무료 해석받기
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl font-medium"
            style={{ background: "rgba(15,8,40,0.6)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
          >
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (pageStatus === "daily_limit") {
    return (
      <main className="min-h-screen flex items-center justify-center px-5" style={bgMain}>
        <div className="text-center max-w-sm w-full">
          <p className="text-5xl mb-4">🌙</p>
          <p className="text-white font-bold text-xl mb-2">오늘 무료 해석을 이미 사용했어요</p>
          <p className="text-sm mb-1" style={{ color: "#a78bfa" }}>무료 해석은 하루 1회예요.</p>
          <p className="text-sm mb-6" style={{ color: "rgba(167,139,250,0.6)" }}>
            자정(KST)에 다시 무료로 해석받을 수 있어요.
          </p>
          <button
            onClick={handlePaidInterpret}
            disabled={paying}
            className="btn-glow w-full py-4 rounded-xl text-white font-semibold mb-3 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            {paying ? "결제 중..." : "✨ 유료 해석받기 · ₩1,000"}
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl font-medium"
            style={{ background: "rgba(15,8,40,0.6)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
          >
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (pageStatus === "error" || !result) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={bgMain}>
        <div className="text-center px-6">
          <p className="text-5xl mb-4">😔</p>
          <p className="text-white font-semibold mb-2">해석에 실패했어요</p>
          <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl text-white font-medium"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            다시 시도하기
          </button>
        </div>
      </main>
    );
  }

  const emoji = CATEGORY_EMOJI[result.category] ?? "🌙";
  const formattedPrice = result.price.toLocaleString("ko-KR");

  return (
    <main
      className="min-h-screen relative"
      style={bgMain}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(76, 29, 149, 0.2) 0%, transparent 60%)",
        }}
      />

      <Header secondaryHref="/market" secondaryLabel="꿈 시장 →" />

      <div className="relative z-10 max-w-2xl mx-auto px-5 pb-24">
        <div className="flex justify-center mt-6 mb-8">
          <span
            className="px-4 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: "rgba(124, 58, 237, 0.25)",
              color: "#c4b5fd",
              border: "1px solid rgba(124, 58, 237, 0.4)",
            }}
          >
            {emoji} {result.category}
          </span>
        </div>

        <div className="glass-card rounded-2xl p-5 mb-6">
          <p className="text-xs font-medium mb-3" style={{ color: "rgba(167, 139, 250, 0.7)" }}>
            📝 당신의 꿈
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0", whiteSpace: "pre-wrap" }}>
            {dream}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏮</span>
              <h2 className="font-semibold text-white">전통 해몽</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
              {result.traditional}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧠</span>
              <h2 className="font-semibold text-white">심리 해석</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
              {result.psychological}
            </p>
          </div>

          {result.advice && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <h2 className="font-semibold text-white">몽해 할머니의 조언</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
                {result.advice}
              </p>
            </div>
          )}

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🍀</span>
              <h2 className="font-semibold text-white">행운의 숫자</h2>
            </div>
            <div className="flex gap-3">
              {result.luckyNumbers.map((num, i) => (
                <span
                  key={i}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: "rgba(124, 58, 237, 0.3)",
                    color: "#c4b5fd",
                    border: "1px solid rgba(124, 58, 237, 0.5)",
                  }}
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 mb-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(109, 40, 217, 0.4), rgba(67, 56, 202, 0.4))",
            border: "1px solid rgba(167, 139, 250, 0.5)",
            boxShadow: "0 0 40px rgba(124, 58, 237, 0.2)",
          }}
        >
          <p className="text-xs font-medium mb-3 tracking-widest uppercase" style={{ color: "rgba(196, 181, 253, 0.7)" }}>
            몽해 할머니의 감정가
          </p>
          <p
            className="font-black mb-1 leading-none"
            style={{
              fontSize: "clamp(2.5rem, 10vw, 4rem)",
              background: "linear-gradient(135deg, #fef08a, #fbbf24, #f59e0b)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ₩{formattedPrice}
          </p>
          <p className="text-xs mb-4" style={{ color: "rgba(167, 139, 250, 0.6)" }}>
            꿈의 희귀성 · 감성 지수 · 해석 깊이를 종합한 결과
          </p>
          {result.marketQuestion && (
            <p
              className="text-sm px-4 py-2.5 rounded-xl"
              style={{
                background: "rgba(124, 58, 237, 0.15)",
                color: "#c4b5fd",
                border: "1px solid rgba(124, 58, 237, 0.25)",
              }}
            >
              💬 &ldquo;{result.marketQuestion}&rdquo;
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            className="btn-glow w-full py-4 rounded-xl text-white font-semibold transition-all text-base"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            onClick={() => user ? setShowModal(true) : router.push("/login")}
          >
            {user ? `🌙 꿈시장에 올리기 · ₩${formattedPrice}` : "🔒 로그인 후 꿈시장에 올리기"}
          </button>

          {showModal && result && (
            <RegisterDreamModal
              dream={dream}
              result={result}
              onClose={() => setShowModal(false)}
            />
          )}
          <button
            className="w-full py-3.5 rounded-xl font-medium transition-all"
            style={{
              background: "rgba(15, 8, 40, 0.6)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              color: "#a78bfa",
            }}
            onClick={() => router.push("/")}
          >
            다른 꿈 해석하기
          </button>
          <Link
            href="/market"
            className="block w-full py-3.5 rounded-xl font-medium text-center transition-all"
            style={{
              background: "rgba(15, 8, 40, 0.6)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              color: "#a78bfa",
            }}
          >
            꿈 시장 구경하기 →
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function InterpretPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#050210" }}
        >
          <p style={{ color: "#a78bfa" }}>불러오는 중...</p>
        </div>
      }
    >
      <InterpretContent />
    </Suspense>
  );
}
