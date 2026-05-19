"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dream.trim()) return;

    setIsLoading(true);
    router.push(`/interpret?dream=${encodeURIComponent(dream.trim())}`);
  };

  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      {/* 별 배경 */}
      <StarField />

      {/* 배경 네뷸라 효과 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(76, 29, 149, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(49, 46, 129, 0.12) 0%, transparent 50%)",
        }}
      />

      <Header />

      {/* 히어로 섹션 */}
      <section className="relative z-10 flex flex-col items-center justify-center px-4 pt-12 pb-20">
        {/* 달 */}
        <div
          className="moon-glow mb-10 rounded-full"
          style={{
            width: "80px",
            height: "80px",
            background: "linear-gradient(135deg, #fef9c3, #fde68a, #fbbf24)",
            animation: "float 6s ease-in-out infinite",
          }}
        />

        {/* 타이틀 */}
        <h1 className="text-4xl md:text-6xl font-bold text-center leading-tight mb-5">
          <span className="gradient-text">당신의 꿈은</span>
          <br />
          <span className="text-white">얼마인가요?</span>
        </h1>

        <p
          className="text-center text-base md:text-lg mb-12 max-w-md leading-relaxed"
          style={{ color: "#a78bfa" }}
        >
          꿈을 입력하면 전통해몽 · 심리해석 · 감정가를 알려드려요.
          <br />
          해석된 꿈을 시장에 올려 판매해보세요.
        </p>

        {/* 꿈 입력 폼 */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative">
            <textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              placeholder="오늘 꾼 꿈을 자세히 적어주세요...&#10;&#10;예: 하늘을 날아다니다가 갑자기 바다에 빠졌는데..."
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
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                꿈을 해석하는 중...
              </span>
            ) : (
              "✨ 꿈 해석하기"
            )}
          </button>
        </form>

        {/* 통계 */}
        <div className="mt-16 flex gap-10 text-center">
          {[
            { label: "해석된 꿈", value: "1,284개" },
            { label: "거래된 꿈", value: "392개" },
            { label: "총 거래액", value: "₩2,180,000" },
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
              icon: "🔮",
              title: "AI 해몽",
              desc: "전통해몽 + 심리해석을 결합한 정밀 분석",
            },
            {
              icon: "💰",
              title: "감정가 산정",
              desc: "꿈의 희귀성과 감성 지수를 기반으로 가격 책정",
            },
            {
              icon: "🌙",
              title: "꿈 거래",
              desc: "해석된 꿈을 시장에 올려 수익 창출",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="glass-card rounded-xl p-5 text-center"
            >
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
