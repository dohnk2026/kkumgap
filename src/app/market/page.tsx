"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, Dream } from "@/lib/supabase";
import Header from "@/components/Header";

const CATEGORIES = ["All", "Fortune", "Success", "Romance", "Warning", "Birth Dream"];
const CATEGORY_DB: Record<string, string> = {
  Fortune: "재물운", Success: "성공운", Romance: "연애운", Warning: "경고몽", "Birth Dream": "태몽",
};

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

function DreamCard({ dream }: { dream: DreamWithSeller }) {
  return (
    <Link href={`/market/${dream.id}`} className="block group">
      <div
        className="rounded-2xl overflow-hidden h-full transition-transform duration-300 group-hover:-translate-y-1"
        style={{
          background: "rgba(15, 8, 40, 0.8)",
          border: "1px solid rgba(124, 58, 237, 0.2)",
        }}
      >
        {/* 상단: 카테고리 + 시간 */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
              style={{
                background: "rgba(124, 58, 237, 0.2)",
                color: "#c4b5fd",
                border: "1px solid rgba(124, 58, 237, 0.3)",
              }}
            >
              {dream.category}
            </span>
            {dream.status === "판매완료" && (
              <span
                className="text-xs px-2 py-1 rounded-full font-medium shrink-0"
                style={{ background: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.3)" }}
              >
                Sold
              </span>
            )}
          </div>
          <span className="text-xs truncate shrink-0" style={{ color: "rgba(148, 163, 184, 0.5)" }}>
            {timeAgo(dream.created_at)}
          </span>
        </div>

        {/* 제목 */}
        <div className="px-4 pb-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: "#f1f5f9" }}>
            {dream.title}
          </h3>
        </div>

        {/* 꿈 미리보기 */}
        <div className="px-4 pb-4">
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#94a3b8" }}>
            {dream.content}
          </p>
        </div>

        {/* 하단: 가격 + 판매자 */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(124, 58, 237, 0.1)" }}
        >
          <p
            className="font-bold text-base"
            style={{
              background: "linear-gradient(135deg, #fde68a, #fbbf24)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ₩{dream.price.toLocaleString("ko-KR")}
          </p>
          <p className="text-xs" style={{ color: "rgba(148, 163, 184, 0.6)" }}>
            by {dream.users?.nickname ?? "익명"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function MarketPage() {
  const [dreams, setDreams] = useState<DreamWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    async function fetchDreams() {
      setLoading(true);

      let query = supabase
        .from("dreams")
        .select("*, users(nickname)")
        .in("status", ["판매중", "판매완료"]);

      if (activeCategory !== "All") {
        query = query.eq("category", CATEGORY_DB[activeCategory] ?? activeCategory);
      }

      if (sortBy === "price_high") {
        query = query.order("price", { ascending: false });
      } else if (sortBy === "price_low") {
        query = query.order("price", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data) setDreams(data as DreamWithSeller[]);
      setLoading(false);
    }

    fetchDreams();
  }, [activeCategory, sortBy]);

  return (
    <main
      className="min-h-screen relative"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(76, 29, 149, 0.15) 0%, transparent 60%)",
        }}
      />

      <Header secondaryHref="/" secondaryLabel="내 꿈 해석하기" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 pb-20">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🌙 Dream Market</h1>
          <p className="text-sm" style={{ color: "#a78bfa" }}>
            Buy dreams from other dreamers
          </p>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all"
              style={
                activeCategory === cat
                  ? { background: "rgba(124,58,237,0.3)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.5)" }
                  : { background: "rgba(15,8,40,0.6)", color: "rgba(167,139,250,0.6)", border: "1px solid rgba(124,58,237,0.15)" }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className="flex justify-end mb-5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg outline-none"
            style={{ background: "rgba(15,8,40,0.8)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <option value="newest">Newest</option>
            <option value="price_high">Price: High to Low</option>
            <option value="price_low">Price: Low to High</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-24">
            <p style={{ color: "#a78bfa" }}>Loading dreams...</p>
          </div>
        ) : dreams.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🌙</p>
            <p className="text-white font-semibold mb-2">No dreams listed yet</p>
            <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>
              Be the first to list your dream!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl text-white font-medium text-sm"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              ✨ Analyze my dream
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dreams.map((dream) => (
                <DreamCard key={dream.id} dream={dream} />
              ))}
            </div>

            <div
              className="mt-12 rounded-2xl p-6 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(109,40,217,0.3), rgba(67,56,202,0.3))",
                border: "1px solid rgba(167,139,250,0.3)",
              }}
            >
              <p className="text-white font-semibold mb-2">Want to sell your dream?</p>
              <p className="text-sm mb-4" style={{ color: "#a78bfa" }}>
                Enter your dream and AI will read it and set a price
              </p>
              <Link
                href="/"
                className="btn-glow inline-block px-6 py-3 rounded-xl text-white font-medium text-sm"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                ✨ Analyze my dream
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
