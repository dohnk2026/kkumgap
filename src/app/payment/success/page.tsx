"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import CertificateCard from "@/components/CertificateCard";

interface DreamData {
  title: string;
  content: string;
  interpretation: string;
  category: string;
  price: number;
  lucky_numbers: number[] | null;
  users: { nickname: string; tag: string } | null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount") ?? 0);
  const dreamId = searchParams.get("dreamId") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [dream, setDream] = useState<DreamData | null>(null);
  const [fee, setFee] = useState(0);
  const [sellerAmount, setSellerAmount] = useState(0);
  const [transactionId, setTransactionId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientNickname, setRecipientNickname] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

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
        const storedGift = localStorage.getItem(`gift-info-${orderId}`);
        const giftData = storedGift ? JSON.parse(storedGift) : null;

        const res = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey, orderId, amount, dreamId, buyerId: user!.id,
            ...(giftData && { giftRecipientId: giftData.recipientId, giftMessage: giftData.message }),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (giftData) localStorage.removeItem(`gift-info-${orderId}`);

        setFee(data.fee);
        setSellerAmount(data.sellerAmount);
        if (data.transactionId) setTransactionId(data.transactionId);
        if (data.isGift) {
          setIsGift(true);
          setRecipientNickname(data.recipientNickname ?? giftData?.recipientNickname ?? "상대방");
        }

        if (data.dream) setDream(data.dream as DreamData);
        setStatus("success");

        if (!giftData) {
          generateDreamImage(dreamId);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "결제 처리 중 오류가 발생했습니다.");
        setStatus("error");
      }
    }

    confirm();
  }, [authLoading, user, paymentKey, orderId, amount, dreamId, router]);

  async function generateDreamImage(id: string) {
    setImageLoading(true);
    setImageError(false);
    try {
      const res = await fetch("/api/dream-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamId: id }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        setImageError(true);
      }
    } catch {
      setImageError(true);
    } finally {
      setImageLoading(false);
    }
  }

  const handleConfirm = async () => {
    if (!transactionId || !user) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/purchase/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, buyerId: user.id }),
      });
      if (res.ok) setConfirmed(true);
    } finally {
      setConfirming(false);
    }
  };

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

  const parts = dream?.interpretation.split("\n\n") ?? [];
  const traditional = parts[0] ?? "";
  const psychological = parts[1] ?? "";
  const advice = parts[2] ?? "";

  return (
    <main
      className="min-h-screen relative"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 10%, rgba(76, 29, 149, 0.25) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-12 pb-20">
        {/* 축하 헤더 */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 inline-block" style={{ animation: "float 3s ease-in-out infinite" }}>
            {isGift ? "🎁" : "🎉"}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isGift ? "선물 완료!" : "꿈 구매 완료!"}
          </h1>
          <p className="text-sm" style={{ color: "#a78bfa" }}>
            {isGift
              ? `${recipientNickname}님에게 꿈을 선물했어요`
              : "이제 전체 해석을 볼 수 있어요"}
          </p>
        </div>

        {/* 선물 완료 시: 간단한 완료 화면만 보여줌 */}
        {isGift && (
          <div className="space-y-3">
            <div
              className="rounded-2xl p-5 mb-2 text-center"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              <p className="text-white font-semibold mb-1">🌙 {dream?.title}</p>
              <p className="text-sm mb-3" style={{ color: "rgba(167,139,250,0.7)" }}>
                {recipientNickname}님이 전체 해석을 열람할 수 있어요
              </p>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                결제 ₩{amount.toLocaleString("ko-KR")} · 수수료 20% ₩{fee.toLocaleString("ko-KR")} · 판매자 수익 ₩{sellerAmount.toLocaleString("ko-KR")}
              </p>
            </div>
            <Link
              href="/mypage"
              className="block w-full py-3.5 rounded-xl text-white font-semibold text-center btn-glow"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              보낸 선물함 보기
            </Link>
            <Link
              href="/market"
              className="block w-full py-3.5 rounded-xl font-medium text-center"
              style={{ background: "rgba(15,8,40,0.6)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
            >
              꿈시장 더 구경하기
            </Link>
          </div>
        )}

        {!isGift && (<>

        {/* AI 꿈 그림 */}
        <div className="mb-6">
          {imageLoading && (
            <div
              className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.2), rgba(67,56,202,0.2))", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ background: "rgba(124,58,237,0.2)", animation: "float 2s ease-in-out infinite" }}
              >
                🎨
              </div>
              <p className="text-sm font-medium" style={{ color: "#c4b5fd" }}>꿈의 장면을 그리는 중...</p>
              <p className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>약 20~30초 소요됩니다</p>
            </div>
          )}
          {!imageLoading && imageUrl && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.3)" }}>
              <img src={imageUrl} alt="AI가 그린 꿈 장면" className="w-full aspect-square object-cover" />
              <div className="px-4 py-2 text-center" style={{ background: "rgba(15,8,40,0.8)" }}>
                <p className="text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>🎨 AI가 그린 꿈의 장면</p>
              </div>
            </div>
          )}
          {!imageLoading && imageError && (
            <div
              className="w-full py-8 rounded-2xl flex flex-col items-center gap-3"
              style={{ background: "rgba(15,8,40,0.6)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <p className="text-sm" style={{ color: "rgba(167,139,250,0.6)" }}>이미지 생성에 실패했습니다</p>
              <button
                onClick={() => generateDreamImage(dreamId)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
              >
                다시 생성
              </button>
            </div>
          )}
        </div>

        {/* 인증서 */}
        <div className="mb-6">
          <CertificateCard
            dreamTitle={dream?.title ?? ""}
            buyerNickname={profile?.nickname ?? ""}
            buyerTag={profile?.tag}
            sellerNickname={dream?.users?.nickname ?? ""}
            sellerTag={dream?.users?.tag}
            amount={amount}
            date={new Date().toISOString()}
            transactionId={transactionId}
          />
        </div>

        {dream && (
          <>
            {/* 꿈 정보 헤더 */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
              >
                {dream.category}
              </span>
              <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                by {dream.users?.nickname ?? "익명"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-5 leading-snug">{dream.title}</h2>

            {/* 꿈 내용 */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: "rgba(167,139,250,0.7)" }}>📝 꿈 내용</p>
              <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0", whiteSpace: "pre-wrap" }}>
                {dream.content}
              </p>
            </div>

            {/* 전통 해몽 */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <h3 className="font-semibold text-white">전통 해몽</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                {traditional}
              </p>
            </div>

            {/* 심리 해석 */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧠</span>
                <h3 className="font-semibold text-white">심리 해석</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                {psychological}
              </p>
            </div>

            {/* 조언 */}
            {advice && (
              <div
                className="rounded-2xl p-5 mb-4"
                style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎯</span>
                  <h3 className="font-semibold text-white">몽해 할머니의 조언</h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                  {advice}
                </p>
              </div>
            )}

            {/* 감정가 */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💰</span>
                <h3 className="font-semibold text-white">감정가</h3>
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

            {/* 행운의 숫자 */}
            {dream.lucky_numbers && dream.lucky_numbers.length > 0 && (
              <div
                className="rounded-2xl p-5 mb-6"
                style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🍀</span>
                  <h3 className="font-semibold text-white">행운의 숫자</h3>
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
          </>
        )}

        {/* 구매 확정 */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <p className="text-sm font-medium text-white mb-1">구매 확정</p>
          <p className="text-xs mb-4" style={{ color: "rgba(167,139,250,0.6)" }}>
            꿈 해석에 만족하셨나요? 구매를 확정하면 판매자에게 수익이 지급됩니다.
          </p>
          {confirmed ? (
            <div
              className="w-full py-3 rounded-xl text-center text-sm font-medium"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}
            >
              ✓ 구매가 확정되었습니다!
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={confirming || !transactionId}
              className="w-full py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              {confirming ? "처리 중..." : "구매 확정하기"}
            </button>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="space-y-3">
          <Link
            href={`/market/${dreamId}`}
            className="block w-full py-3.5 rounded-xl text-white font-semibold text-center btn-glow"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            구매한 꿈 보러가기
          </Link>
          <Link
            href="/mypage"
            className="block w-full py-3.5 rounded-xl font-medium text-center"
            style={{
              background: "rgba(15,8,40,0.6)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#a78bfa",
            }}
          >
            내 구매 목록 보기
          </Link>
          <Link
            href="/market"
            className="block w-full py-3.5 rounded-xl font-medium text-center"
            style={{
              background: "rgba(15,8,40,0.6)",
              border: "1px solid rgba(124,58,237,0.25)",
              color: "rgba(167,139,250,0.6)",
            }}
          >
            꿈시장 더 구경하기
          </Link>
        </div>
        </>)}
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
