"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function StarField() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        duration: Math.random() * 3 + 1.5,
        delay: Math.random() * 4,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [dream, setDream] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      const pending = sessionStorage.getItem("pending-dream");
      if (pending) {
        sessionStorage.removeItem("pending-dream");
        setDream(pending);
      }
    }
  }, [user, authLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dream.trim()) return;

    if (!user) {
      sessionStorage.setItem("pending-dream", dream.trim());
      router.push("/login");
      return;
    }

    setIsLoading(true);
    router.push(`/interpret?dream=${encodeURIComponent(dream.trim())}`);
  };

  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <StarField />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(76, 29, 149, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(49, 46, 129, 0.12) 0%, transparent 50%)",
        }}
      />

      <Header />

      <section className="relative z-10 flex flex-col items-center justify-center px-4 pt-10 pb-20">
        {/* 아이콘 */}
        <div
          className="mb-8 rounded-full flex items-center justify-center text-4xl"
          style={{
            width: "88px",
            height: "88px",
            background: "linear-gradient(135deg, rgba(220,38,38,0.25), rgba(124,58,237,0.25))",
            border: "1px solid rgba(239,68,68,0.3)",
            animation: "float 6s ease-in-out infinite",
          }}
        >
          🔥
        </div>

        {/* 타이틀 */}
        <h1 className="text-4xl md:text-6xl font-bold text-center leading-tight mb-4">
          <span className="text-white">악몽이</span>
          <br />
          <span className="gradient-text">당신을 괴롭히나요?</span>
        </h1>

        <p
          className="text-center text-base md:text-lg mb-3 max-w-md leading-relaxed"
          style={{ color: "#a78bfa" }}
        >
          꿈을 입력하면 악몽인지 분석하고
          <br />
          몽해 할머니의 정화 의식으로 없애드려요.
        </p>
        <p
          className="text-center text-sm mb-10"
          style={{ color: "rgba(167,139,250,0.5)" }}
        >
          좋은 꿈이라면 꿈시장에 올려 판매할 수 있어요
        </p>

        {/* 꿈 입력 폼 */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative">
            <textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              placeholder="오늘 꾼 꿈을 자세히 적어주세요...&#10;&#10;예: 누군가에게 쫓기다가 낭떠러지에서 떨어지는 꿈을 꿨어요..."
              disabled={isLoading}
              maxLength={1000}
              rows={6}
              className="dream-input glass-card w-full rounded-2xl p-5 text-white resize-none transition-all"
              style={{
                color: "#f3f4f6",
                fontSize: "0.95rem",
                lineHeight: "1.7",
              }}
            />
            <span
              className="absolute bottom-4 right-4 text-xs"
              style={{ color: "rgba(167, 139, 250, 0.5)" }}
            >
              {dream.length}/1000
            </span>
          </div>

          <button
            type="submit"
            disabled={!dream.trim() || isLoading}
            className="btn-glow mt-4 w-full py-4 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isLoading
                ? "linear-gradient(135deg, #5b21b6, #3730a3)"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                꿈을 분석하는 중...
              </span>
            ) : !authLoading && !user ? (
              "🔒 로그인하고 무료 분석받기"
            ) : (
              "🔥 꿈 분석하기"
            )}
          </button>
        </form>

        {/* 통계 */}
        <div className="mt-14 flex gap-10 text-center">
          {[
            { label: "소각된 악몽", value: "847건" },
            { label: "분석된 꿈", value: "1,284개" },
            { label: "꿈 거래액", value: "₩2,180,000" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(167, 139, 250, 0.6)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 하단 안내 */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: "🔥",
              title: "악몽 감지",
              desc: "AI가 꿈을 분석해 불길한 기운과 경고 신호를 찾아내요",
            },
            {
              icon: "🌀",
              title: "정화 의식",
              desc: "몽해 할머니가 불·물·바람·공허 중 맞는 방식으로 악몽을 소각해요",
            },
            {
              icon: "🌙",
              title: "꿈 거래",
              desc: "좋은 꿈이라면 꿈시장에 올려 다른 사람에게 팔 수 있어요",
            },
          ].map((item) => (
            <div key={item.title} className="glass-card rounded-xl p-5 text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-white mb-1.5">{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#a78bfa" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
