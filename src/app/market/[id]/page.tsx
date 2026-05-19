"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase, Dream } from "@/lib/supabase";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";

type DreamWithSeller = Dream & { users: { nickname: string } | null };

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function MarketDreamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [dream, setDream] = useState<DreamWithSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function fetchDream() {
      const { data, error } = await supabase
        .from("dreams")
        .select("*, users(nickname)")
        .eq("id", id)
        .single();
      if (!error && data) setDream(data as DreamWithSeller);
      setLoading(false);
    }
    fetchDream();
  }, [id]);

  useEffect(() => {
    if (!user || !id) { setHasPurchased(false); return; }
    supabase
      .from("transactions")
      .select("id")
      .eq("dream_id", id)
      .eq("buyer_id", user.id)
      .maybeSingle()
      .then(({ data }) => setHasPurchased(!!data));
  }, [user, id]);

  const handlePurchaseClick = () => {
    if (!user) { router.push("/login"); return; }
    setShowConfirm(true);
  };

  const confirmPurchase = async () => {
    if (!dream || !user) return;
    setShowConfirm(false);
    setPaying(true);
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = tossPayments.payment({ customerKey: user.id });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: dream.price },
        orderId: `kkumgap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        orderName: dream.title,
        successUrl: `${window.location.origin}/payment/success?dreamId=${dream.id}`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email ?? undefined,
        customerName: profile?.nickname ?? "구매자",
      });
    } catch {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#050210" }}>
        <p style={{ color: "#a78bfa" }}>불러오는 중...</p>
      </main>
    );
  }

  if (!dream) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#050210" }}>
        <p className="text-5xl mb-4">😔</p>
        <p className="text-white font-semibold mb-4">꿈을 찾을 수 없어요</p>
        <Link href="/market" className="text-sm" style={{ color: "#a78bfa" }}>← 꿈시장으로 돌아가기</Link>
      </main>
    );
  }

  const isSold = dream.status === "판매완료";
  const isSeller = dream.seller_id === user?.id;
  const showFull = hasPurchased || isSeller;
  const parts = dream.interpretation.split("\n\n");
  const traditional = parts[0] ?? "";
  const psychological = parts[1] ?? "";

  return (
    <main
      className="min-h-screen relative"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(76, 29, 149, 0.2) 0%, transparent 60%)" }}
      />

      <Header secondaryHref="/market" secondaryLabel="← 꿈시장" />

      <div className="relative z-10 max-w-2xl mx-auto px-5 pb-36">
        {/* 카테고리 + 등록일 */}
        <div className="flex items-center justify-between mt-4 mb-5">
          <div className="flex items-center gap-2">
            <span
              className="text-sm px-3 py-1 rounded-full font-medium"
              style={{ background: "rgba(124,58,237,0.25)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              {dream.category}
            </span>
            {hasPurchased && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                구매완료
              </span>
            )}
            {isSold && !hasPurchased && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                판매완료
              </span>
            )}
          </div>
          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
            {timeAgo(dream.created_at)}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1 leading-snug">{dream.title}</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(148,163,184,0.6)" }}>
          by {dream.users?.nickname ?? "익명"}
        </p>

        {/* 꿈 내용 */}
        <div className="glass-card rounded-2xl p-5 mb-5">
          <p className="text-xs font-medium mb-3" style={{ color: "rgba(167,139,250,0.7)" }}>📝 꿈 내용</p>
          <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0", whiteSpace: "pre-wrap" }}>
            {dream.content}
          </p>
        </div>

        {/* 해석 영역 */}
        {showFull ? (
          <div className="space-y-4 mb-8">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <h2 className="font-semibold text-white">전통 해몽</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                {traditional}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧠</span>
                <h2 className="font-semibold text-white">심리 해석</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                {psychological}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💰</span>
                <h2 className="font-semibold text-white">감정가</h2>
              </div>
              <p
                className="text-2xl font-bold"
                style={{
                  background: "linear-gradient(135deg, #fde68a, #fbbf24)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ₩{dream.price.toLocaleString("ko-KR")}
              </p>
            </div>

            {dream.lucky_numbers && dream.lucky_numbers.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🍀</span>
                  <h2 className="font-semibold text-white">행운의 숫자</h2>
                </div>
                <div className="flex gap-3">
                  {dream.lucky_numbers.map((n) => (
                    <span
                      key={n}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: "rgba(124,58,237,0.3)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.5)" }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 블러 미리보기 */
          <div className="glass-card rounded-2xl p-5 mb-8">
            <p className="text-xs font-medium mb-3" style={{ color: "rgba(167,139,250,0.7)" }}>🔮 해석 미리보기</p>
            <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "90px" }}>
              <p
                className="text-sm leading-relaxed p-3"
                style={{ color: "#cbd5e1", filter: "blur(7px)", userSelect: "none" }}
              >
                {dream.interpretation.slice(0, 80)}...
              </p>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl mb-1">🔒</p>
                <p className="text-sm font-medium" style={{ color: "#c4b5fd" }}>
                  구매 후 전체 해석을 확인하세요
                </p>
              </div>
            </div>
            <div
              className="mt-4 p-3 rounded-xl"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <p className="text-xs mb-2" style={{ color: "rgba(167,139,250,0.6)" }}>구매하면 볼 수 있는 내용</p>
              <div className="flex flex-wrap gap-1.5">
                {["🔮 전통 해몽", "🧠 심리 해석", "💰 감정가", "🍀 행운의 숫자"].map((item) => (
                  <span
                    key={item}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 px-5 pt-4 pb-6"
        style={{ background: "linear-gradient(to top, rgba(5,2,16,0.98) 75%, transparent)" }}
      >
        <div className="max-w-2xl mx-auto">
          {hasPurchased ? (
            <Link
              href="/mypage"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <span style={{ color: "#4ade80" }}>✓ 구매 완료</span>
              <span className="text-sm" style={{ color: "rgba(148,163,184,0.6)" }}>— 내 구매 목록 보기 →</span>
            </Link>
          ) : (
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, rgba(109,40,217,0.35), rgba(67,56,202,0.35))",
                border: "1px solid rgba(167,139,250,0.35)",
              }}
            >
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#c4b5fd" }}>
                  {isSold ? "판매 완료" : "판매가"}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{
                    background: isSold
                      ? "linear-gradient(135deg, #94a3b8, #64748b)"
                      : "linear-gradient(135deg, #fde68a, #fbbf24)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  ₩{dream.price.toLocaleString("ko-KR")}
                </p>
              </div>
              <button
                onClick={handlePurchaseClick}
                disabled={isSold || paying || isSeller}
                className="btn-glow px-6 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isSold || isSeller
                    ? "rgba(100,116,139,0.4)"
                    : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                }}
              >
                {paying ? "결제 중..." : isSeller ? "내 꿈" : isSold ? "판매 완료" : "이 꿈 구매하기"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 구매 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-3xl p-7 text-center"
            style={{
              background: "linear-gradient(135deg, #0a0428, #0f0840)",
              border: "1px solid rgba(124,58,237,0.5)",
            }}
          >
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-5 text-xl leading-none"
              style={{ color: "rgba(167,139,250,0.5)" }}
            >
              ✕
            </button>

            <p className="text-4xl mb-4" style={{ animation: "float 3s ease-in-out infinite" }}>🌙</p>
            <h2 className="text-white font-bold text-lg mb-1 leading-snug">{dream.title}</h2>
            <p className="text-sm mb-5" style={{ color: "#a78bfa" }}>이 꿈을 구매하시겠어요?</p>

            <div
              className="rounded-2xl p-4 mb-5"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
            >
              <p
                className="text-3xl font-black mb-1"
                style={{
                  background: "linear-gradient(135deg, #fde68a, #fbbf24)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ₩{dream.price.toLocaleString("ko-KR")}
              </p>
              <p className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>
                구매 후 전체 해몽 공개 · 테스트 모드
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={confirmPurchase}
                className="btn-glow w-full py-3.5 rounded-xl text-white font-semibold"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                결제하기
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 rounded-xl font-medium"
                style={{
                  background: "rgba(15,8,40,0.6)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "#a78bfa",
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
