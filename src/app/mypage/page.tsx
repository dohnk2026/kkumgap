"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { supabase, Dream } from "@/lib/supabase";

type PurchasedItem = {
  id: string;
  price: number;
  created_at: string;
  confirmed_at: string | null;
  dreams: { id: string; title: string; category: string } | null;
};

type ReceivedGift = {
  id: string;
  created_at: string;
  claimed_at: string | null;
  message: string | null;
  gift_type: string;
  dreams: { id: string; title: string; category: string } | null;
  sender_nickname: string;
};

type SentGift = {
  id: string;
  created_at: string;
  claimed_at: string | null;
  gift_type: string;
  dreams: { id: string; title: string; category: string } | null;
  recipient_nickname: string;
};

type Tab = "selling" | "bought" | "received" | "sent";

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  판매중:   { label: "판매중",   bg: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "rgba(34,197,94,0.3)" },
  판매완료: { label: "판매완료", bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" },
  비공개:   { label: "비공개",   bg: "rgba(234,179,8,0.15)",  color: "#fbbf24", border: "rgba(234,179,8,0.3)" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

export default function MyPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("selling");
  const [myDreams, setMyDreams] = useState<Dream[]>([]);
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<ReceivedGift[]>([]);
  const [sentGifts, setSentGifts] = useState<SentGift[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    async function loadData() {
      const [dreamsRes, purchasesRes, salesRes, receivedRes, sentRes] = await Promise.all([
        supabase
          .from("dreams")
          .select("*")
          .eq("seller_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("transactions")
          .select("id, price, created_at, confirmed_at, dreams(id, title, category)")
          .eq("buyer_id", user!.id)
          .eq("status", "완료")
          .order("created_at", { ascending: false }),
        supabase
          .from("transactions")
          .select("seller_amount")
          .eq("seller_id", user!.id)
          .eq("status", "완료"),
        supabase
          .from("gifts")
          .select("id, created_at, claimed_at, message, gift_type, dreams(id, title, category), sender:users!sender_id(nickname)")
          .eq("recipient_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("gifts")
          .select("id, created_at, claimed_at, gift_type, dreams(id, title, category), recipient:users!recipient_id(nickname)")
          .eq("sender_id", user!.id)
          .order("created_at", { ascending: false }),
      ]);

      setMyDreams(dreamsRes.data ?? []);
      setPurchases((purchasesRes.data ?? []) as unknown as PurchasedItem[]);
      setTotalRevenue(
        (salesRes.data ?? []).reduce((sum, t) => sum + (t.seller_amount ?? 0), 0)
      );

      // Received gifts: extract sender nickname from join
      const received = ((receivedRes.data ?? []) as unknown as Array<{
        id: string; created_at: string; claimed_at: string | null; message: string | null;
        gift_type: string;
        dreams: { id: string; title: string; category: string } | null;
        sender: { nickname: string } | null;
      }>).map((g) => ({
        id: g.id,
        created_at: g.created_at,
        claimed_at: g.claimed_at,
        message: g.message,
        gift_type: g.gift_type,
        dreams: g.dreams,
        sender_nickname: g.sender?.nickname ?? "알 수 없음",
      }));
      setReceivedGifts(received);

      // Sent gifts: extract recipient nickname from join
      const sent = ((sentRes.data ?? []) as unknown as Array<{
        id: string; created_at: string; claimed_at: string | null;
        gift_type: string;
        dreams: { id: string; title: string; category: string } | null;
        recipient: { nickname: string } | null;
      }>).map((g) => ({
        id: g.id,
        created_at: g.created_at,
        claimed_at: g.claimed_at,
        gift_type: g.gift_type,
        dreams: g.dreams,
        recipient_nickname: g.recipient?.nickname ?? "알 수 없음",
      }));
      setSentGifts(sent);

      setLoading(false);
    }

    loadData();
  }, [authLoading, user, router]);

  if (authLoading || (loading && !myDreams.length && !purchases.length)) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", animation: "float 2s ease-in-out infinite" }}
          >
            🌙
          </div>
          <p style={{ color: "#a78bfa" }}>불러오는 중...</p>
        </div>
      </main>
    );
  }

  const soldCount = myDreams.filter((d) => d.status === "판매완료").length;
  const newGiftCount = receivedGifts.filter((g) => !g.claimed_at).length;

  const handleConfirmPurchase = async (transactionId: string) => {
    if (!user) return;
    const res = await fetch("/api/purchase/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, buyerId: user.id }),
    });
    if (res.ok) {
      setPurchases((prev) =>
        prev.map((p) => p.id === transactionId ? { ...p, confirmed_at: new Date().toISOString() } : p)
      );
    }
  };

  const handleClaimGift = async (giftId: string, dreamId: string, alreadyClaimed: boolean) => {
    if (!alreadyClaimed) {
      await supabase
        .from("gifts")
        .update({ claimed_at: new Date().toISOString() })
        .eq("id", giftId)
        .eq("recipient_id", user!.id);
      setReceivedGifts((prev) =>
        prev.map((g) => g.id === giftId ? { ...g, claimed_at: new Date().toISOString() } : g)
      );
    }
    router.push(`/market/${dreamId}`);
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "selling",  label: "내 꿈",    count: myDreams.length },
    { key: "bought",   label: "구매",     count: purchases.length },
    { key: "received", label: "받은 선물", count: receivedGifts.length },
    { key: "sent",     label: "보낸 선물", count: sentGifts.length },
  ];

  return (
    <main
      className="min-h-screen relative"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(76,29,149,0.15) 0%, transparent 60%)" }}
      />

      <Header />

      <div className="relative z-10 max-w-2xl mx-auto px-5 pb-20">
        {/* 프로필 카드 */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.25), rgba(67,56,202,0.25))",
            border: "1px solid rgba(167,139,250,0.3)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
              style={{ background: "rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              🌙
            </div>
            <div>
              <p className="font-bold text-white text-lg">{profile?.nickname ?? "익명"}</p>
              <p className="text-sm" style={{ color: "rgba(167,139,250,0.7)" }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "등록한 꿈", value: `${myDreams.length}개` },
            { label: "판매 완료", value: `${soldCount}건` },
            { label: "총 수익",   value: `₩${totalRevenue.toLocaleString("ko-KR")}` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
            >
              <p
                className="font-bold text-base mb-0.5"
                style={{
                  background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* 탭 (4개) */}
        <div
          className="flex rounded-xl p-1 mb-5 gap-0.5"
          style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
        >
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="relative flex-1 py-2 text-xs font-medium rounded-lg transition-all"
              style={
                activeTab === key
                  ? { background: "rgba(124,58,237,0.35)", color: "#c4b5fd" }
                  : { color: "rgba(167,139,250,0.5)" }
              }
            >
              {label}
              {key === "received" && newGiftCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: "#7c3aed", color: "white", fontSize: "10px" }}
                >
                  {newGiftCount}
                </span>
              )}
              <span className="ml-1" style={{ opacity: 0.6 }}>({count})</span>
            </button>
          ))}
        </div>

        {/* 내 꿈 목록 */}
        {activeTab === "selling" && (
          myDreams.length === 0 ? (
            <EmptyState emoji="🌙" title="아직 등록한 꿈이 없어요" desc="꿈을 해석하고 시장에 올려보세요!" href="/" btnLabel="✨ 꿈 해석하러 가기" />
          ) : (
            <div className="space-y-3">
              {myDreams.map((dream) => {
                const st = STATUS_STYLE[dream.status] ?? STATUS_STYLE["판매중"];
                return (
                  <Link key={dream.id} href={`/market/${dream.id}`} className="block">
                    <div className="rounded-2xl p-4 transition-all hover:border-violet-500/40" style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-1 flex-1" style={{ color: "#f1f5f9" }}>{dream.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "rgba(196,181,253,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>{dream.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm" style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₩{dream.price.toLocaleString("ko-KR")}</span>
                          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{timeAgo(dream.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}

        {/* 구매한 꿈 목록 */}
        {activeTab === "bought" && (
          purchases.length === 0 ? (
            <EmptyState emoji="🛒" title="아직 구매한 꿈이 없어요" desc="꿈시장에서 마음에 드는 꿈을 구매해보세요!" href="/market" btnLabel="꿈시장 구경하기" />
          ) : (
            <div className="space-y-3">
              {purchases.map((item) => (
                <div key={item.id} className="rounded-2xl p-4" style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <div className="cursor-pointer" onClick={() => router.push(item.dreams ? `/market/${item.dreams.id}` : "/market")}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-1 flex-1" style={{ color: "#f1f5f9" }}>{item.dreams?.title ?? "삭제된 꿈"}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={item.confirmed_at ? { background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" } : { background: "rgba(234,179,8,0.1)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" }}>
                        {item.confirmed_at ? "구매 확정" : "확정 대기"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {item.dreams?.category && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "rgba(196,181,253,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>{item.dreams.category}</span>}
                      <div className="flex items-center gap-3 ml-auto">
                        <span className="font-bold text-sm" style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₩{item.price.toLocaleString("ko-KR")}</span>
                        <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{timeAgo(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {!item.confirmed_at && (
                    <button onClick={() => handleConfirmPurchase(item.id)} className="w-full mt-3 py-2 rounded-xl text-sm font-medium" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white" }}>
                      구매 확정하기
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* 받은 선물 */}
        {activeTab === "received" && (
          receivedGifts.length === 0 ? (
            <EmptyState emoji="🎁" title="아직 받은 선물이 없어요" desc="친구에게 꿈 선물을 요청해보세요!" href="/market" btnLabel="꿈시장 구경하기" />
          ) : (
            <div className="space-y-3">
              {receivedGifts.map((gift) => (
                <div
                  key={gift.id}
                  className="rounded-2xl p-4 cursor-pointer transition-all hover:border-violet-500/40"
                  style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}
                  onClick={() => gift.dreams && handleClaimGift(gift.id, gift.dreams.id, !!gift.claimed_at)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-1 flex-1" style={{ color: "#f1f5f9" }}>
                      {gift.dreams?.title ?? "삭제된 꿈"}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={gift.claimed_at
                        ? { background: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.3)" }
                        : { background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.4)" }
                      }
                    >
                      {gift.claimed_at ? "열람 완료" : "🎁 새 선물"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    {gift.dreams?.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "rgba(196,181,253,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>
                        {gift.dreams.category}
                      </span>
                    )}
                    <div className="flex items-center gap-2 ml-auto text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                      <span>from {gift.sender_nickname}</span>
                      <span>·</span>
                      <span>{timeAgo(gift.created_at)}</span>
                    </div>
                  </div>
                  {gift.message && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(124,58,237,0.08)", color: "rgba(196,181,253,0.7)", border: "1px solid rgba(124,58,237,0.15)" }}>
                      💌 {gift.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* 보낸 선물 */}
        {activeTab === "sent" && (
          sentGifts.length === 0 ? (
            <EmptyState emoji="📤" title="아직 보낸 선물이 없어요" desc="꿈시장에서 친구에게 꿈을 선물해보세요!" href="/market" btnLabel="꿈시장 구경하기" />
          ) : (
            <div className="space-y-3">
              {sentGifts.map((gift) => (
                <div
                  key={gift.id}
                  className="rounded-2xl p-4 cursor-pointer transition-all hover:border-violet-500/40"
                  style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}
                  onClick={() => gift.dreams && router.push(`/market/${gift.dreams.id}`)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-1 flex-1" style={{ color: "#f1f5f9" }}>
                      {gift.dreams?.title ?? "삭제된 꿈"}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={gift.claimed_at
                        ? { background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
                        : { background: "rgba(234,179,8,0.1)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" }
                      }
                    >
                      {gift.claimed_at ? "수령 완료" : "미수령"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {gift.dreams?.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "rgba(196,181,253,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>
                          {gift.dreams.category}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "rgba(124,58,237,0.7)" }}>
                        {gift.gift_type === "free_share" ? "무료 선물" : "구매 선물"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                      <span>to {gift.recipient_nickname}</span>
                      <span>·</span>
                      <span>{timeAgo(gift.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}

function EmptyState({
  emoji, title, desc, href, btnLabel,
}: {
  emoji: string; title: string; desc: string; href: string; btnLabel: string;
}) {
  return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4">{emoji}</p>
      <p className="text-white font-semibold mb-2">{title}</p>
      <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>{desc}</p>
      <Link href={href} className="inline-block px-6 py-3 rounded-xl text-white font-medium text-sm" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
        {btnLabel}
      </Link>
    </div>
  );
}
