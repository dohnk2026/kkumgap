"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Phase = "confirming" | "ready" | "loading" | "ritual" | "animating" | "done";
type PurgeType = "fire" | "water" | "wind" | "void";

const PURGE_INFO: Record<PurgeType, { emoji: string; label: string; color: string; desc: string }> = {
  fire: { emoji: "🔥", label: "Flame Purge", color: "#f97316", desc: "Burned to ashes and returned to the void" },
  water: { emoji: "💧", label: "Water Purge", color: "#38bdf8", desc: "Released into the river, carried to the sea" },
  wind: { emoji: "🌬️", label: "Wind Purge", color: "#a3e635", desc: "Scattered by the wind, dissolved into the sky" },
  void: { emoji: "🌑", label: "Void Seal", color: "#818cf8", desc: "Sealed deep within the darkness" },
};

const ANIMATION_STYLES = `
@keyframes fireRise {
  0% { transform: translateY(100%) scaleX(1); opacity: 0.9; }
  50% { transform: translateY(20%) scaleX(1.1); opacity: 1; }
  100% { transform: translateY(-10%) scaleX(0.95); opacity: 0; }
}
@keyframes waterFlow {
  0% { transform: translateY(-100%); opacity: 0.8; }
  60% { transform: translateY(20%); opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}
@keyframes windBlow {
  0% { transform: translateX(-100%) skewY(-3deg); opacity: 0.8; }
  60% { transform: translateX(10%) skewY(-3deg); opacity: 1; }
  100% { transform: translateX(120%) skewY(-3deg); opacity: 0; }
}
@keyframes voidExpand {
  0% { transform: scale(0); opacity: 1; }
  70% { transform: scale(1.5); opacity: 1; }
  100% { transform: scale(3); opacity: 0; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes stampIn {
  0% { transform: rotate(-12deg) scale(2); opacity: 0; }
  60% { transform: rotate(-12deg) scale(0.95); opacity: 1; }
  75% { transform: rotate(-12deg) scale(1.05); opacity: 1; }
  100% { transform: rotate(-12deg) scale(1); opacity: 1; }
}
`;

function PurgeAnimation({ purgeType }: { purgeType: PurgeType }) {
  const config = {
    fire: {
      bg: "linear-gradient(to top, #7c2d12, #ea580c, #fb923c, transparent)",
      animation: "fireRise 4s ease-in forwards",
    },
    water: {
      bg: "linear-gradient(to bottom, transparent, #0369a1, #38bdf8, #0369a1, transparent)",
      animation: "waterFlow 4s ease-in-out forwards",
    },
    wind: {
      bg: "linear-gradient(to right, transparent, #d9f99d, #84cc16, #d9f99d, transparent)",
      animation: "windBlow 4s ease-in-out forwards",
    },
    void: {
      bg: "radial-gradient(circle, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, transparent 100%)",
      animation: "voidExpand 4s ease-in-out forwards",
    },
  }[purgeType];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{ background: config.bg, animation: config.animation }}
      />
    </div>
  );
}

function PurgeSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const amount = parseInt(searchParams.get("amount") ?? "0");

  const [phase, setPhase] = useState<Phase>("confirming");
  const [dreamId, setDreamId] = useState("");
  const [purgeType, setPurgeType] = useState<PurgeType>("fire");
  const [purgeReason, setPurgeReason] = useState("");
  const [ritualLines, setRitualLines] = useState<string[]>([]);
  const [visibleLines, setVisibleLines] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!paymentKey || !orderId || !amount || !user) return;

    const stored = localStorage.getItem(`purge-info-${orderId}`);
    if (!stored) { setErrorMsg("Payment information not found."); setPhase("done"); return; }

    const { dream, interpretResult } = JSON.parse(stored);

    async function confirmPayment() {
      const res = await fetch("/api/payment/purge-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey, orderId, amount, userId: user!.id, dream, interpretResult }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Payment confirmation failed."); setPhase("done"); return; }

      setDreamId(data.dreamId);
      setPurgeType(data.purge_type as PurgeType);
      setPurgeReason(data.purge_reason ?? "");
      setPhase("ready");
      localStorage.removeItem(`purge-info-${orderId}`);
    }

    confirmPayment();
  }, [paymentKey, orderId, amount, user]);

  async function startRitual() {
    setPhase("loading");
    const res = await fetch("/api/purge/ritual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dreamId }),
    });
    const data = await res.json();
    if (!res.ok) { setErrorMsg(data.error ?? "Failed to create ritual."); setPhase("done"); return; }

    setRitualLines(data.lines);
    setPhase("ritual");

    // 의식 텍스트 순차 표시 (2초 간격)
    data.lines.forEach((_: string, i: number) => {
      timerRef.current = setTimeout(() => setVisibleLines(i + 1), i * 2200);
    });

    // 텍스트 다 나오면 애니메이션 시작
    timerRef.current = setTimeout(() => {
      setPhase("animating");
      setShowAnimation(true);
      // 5초 후 완료
      timerRef.current = setTimeout(() => {
        setShowAnimation(false);
        setPhase("done");
      }, 5000);
    }, data.lines.length * 2200 + 800);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const info = PURGE_INFO[purgeType];
  const bg = { background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" };

  // 확인 중
  if (phase === "confirming") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={bg}>
        <style>{ANIMATION_STYLES}</style>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: "rgba(124,58,237,0.2)", animation: "pulse-glow 1.5s ease-in-out infinite" }}>
            🔮
          </div>
          <p style={{ color: "#a78bfa" }}>Confirming payment...</p>
        </div>
      </main>
    );
  }

  // 에러 또는 완료
  if (phase === "done") {
    if (errorMsg) {
      return (
        <main className="min-h-screen flex items-center justify-center px-5" style={bg}>
          <style>{ANIMATION_STYLES}</style>
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">😔</p>
            <p className="text-white font-semibold mb-2">An error occurred</p>
            <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>{errorMsg}</p>
            <button onClick={() => router.push("/")} className="px-6 py-3 rounded-xl text-white font-medium"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              Go home
            </button>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center px-5" style={bg}>
        <style>{ANIMATION_STYLES}</style>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6" style={{ animation: "fadeInUp 0.8s ease forwards" }}>
            {info.emoji}
          </div>
          <p className="text-2xl font-bold text-white mb-3" style={{ animation: "fadeInUp 0.8s 0.2s ease both" }}>
            This dream has vanished
          </p>
          <p className="text-sm mb-8" style={{ color: "rgba(167,139,250,0.7)", animation: "fadeInUp 0.8s 0.4s ease both" }}>
            {info.desc}
          </p>
          <div className="space-y-2" style={{ animation: "fadeInUp 0.8s 0.6s ease both" }}>
            <button onClick={() => router.push("/mypage")} className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              View in My Page
            </button>
            <button onClick={() => router.push("/")} className="w-full py-3 rounded-xl font-medium"
              style={{ background: "rgba(15,8,40,0.6)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
              Go home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 소각 방식 확인 화면
  if (phase === "ready") {
    return (
      <main className="min-h-screen flex items-center justify-center px-5" style={bg}>
        <style>{ANIMATION_STYLES}</style>
        <div className="w-full max-w-sm">
          <p className="text-center text-4xl mb-6">{info.emoji}</p>
          <div className="rounded-2xl p-6 mb-6"
            style={{ background: "rgba(15,8,40,0.8)", border: `1px solid ${info.color}30` }}>
            <p className="text-xs mb-2 font-medium" style={{ color: `${info.color}` }}>{info.label}</p>
            <p className="text-white font-semibold text-lg mb-3">{info.desc}</p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(167,139,250,0.7)" }}>
              {purgeReason}
            </p>
          </div>
          <p className="text-center text-xs mb-5" style={{ color: "rgba(148,163,184,0.5)" }}>
            Once the ritual begins, it cannot be undone
          </p>
          <button onClick={startRitual} className="w-full py-4 rounded-xl text-white font-semibold text-base"
            style={{ background: `linear-gradient(135deg, ${info.color}99, ${info.color}66)`, border: `1px solid ${info.color}60` }}>
            Begin the Ritual
          </button>
        </div>
      </main>
    );
  }

  // Claude 텍스트 생성 중
  if (phase === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={bg}>
        <style>{ANIMATION_STYLES}</style>
        <div className="text-center">
          <div className="text-4xl mb-4" style={{ animation: "pulse-glow 1s ease-in-out infinite" }}>
            {info.emoji}
          </div>
          <p style={{ color: "#a78bfa" }}>Grandma Mong is preparing the ritual...</p>
        </div>
      </main>
    );
  }

  // 의식 진행 + 애니메이션
  return (
    <main className="min-h-screen flex items-center justify-center px-5 overflow-hidden" style={bg}>
      <style>{ANIMATION_STYLES}</style>

      {showAnimation && <PurgeAnimation purgeType={purgeType} />}

      <div className="w-full max-w-sm text-center relative z-10">
        {/* 의식 텍스트 */}
        <div className="space-y-4 mb-8">
          {ritualLines.map((line, i) => (
            <p
              key={i}
              className="text-lg font-medium"
              style={{
                color: info.color,
                opacity: visibleLines > i ? 1 : 0,
                transform: visibleLines > i ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.8s ease, transform 0.8s ease",
                textShadow: `0 0 20px ${info.color}60`,
              }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* 꿈 소각 시각화 */}
        {phase === "animating" && (
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl"
            style={{
              background: `radial-gradient(circle, ${info.color}40, transparent)`,
              border: `2px solid ${info.color}60`,
              animation: "pulse-glow 0.5s ease-in-out infinite",
            }}
          >
            {info.emoji}
          </div>
        )}
      </div>
    </main>
  );
}

export default function PurgeSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050210" }}>
        <p style={{ color: "#a78bfa" }}>Loading...</p>
      </div>
    }>
      <PurgeSuccessContent />
    </Suspense>
  );
}
