"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import CertificateCard from "@/components/CertificateCard";
import { useAuth } from "@/lib/auth-context";
import { supabase, Dream } from "@/lib/supabase";

type PurchasedItem = {
  id: string;
  price: number;
  created_at: string;
  confirmed_at: string | null;
  dreams: { id: string; title: string; category: string; image_url: string | null; users: { nickname: string; tag: string } | null } | null;
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

type WithdrawForm = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: string;
};

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  판매중:   { label: "For Sale",  bg: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "rgba(34,197,94,0.3)" },
  판매완료: { label: "Sold",      bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" },
  비공개:   { label: "Private",   bg: "rgba(234,179,8,0.15)",  color: "#fbbf24", border: "rgba(234,179,8,0.3)" },
};

const PURGE_BADGE = { label: "🔥 Purged", bg: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "rgba(239,68,68,0.3)" };

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function MyPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#050210" }} />}>
      <MyPage />
    </Suspense>
  );
}

function MyPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("tab") as Tab | null) ?? "selling";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [certItem, setCertItem] = useState<PurchasedItem | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState("");
  const [myDreams, setMyDreams] = useState<Dream[]>([]);
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<ReceivedGift[]>([]);
  const [sentGifts, setSentGifts] = useState<SentGift[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState<WithdrawForm>({ bankName: "", accountNumber: "", accountHolder: "", amount: "" });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";

    const purchasesApiRes = await fetch("/api/mypage/purchases", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const purchasesApiData = purchasesApiRes.ok ? await purchasesApiRes.json() : { purchases: [] };

    const [dreamsRes, salesRes, receivedRes, sentRes, balanceRes] = await Promise.all([
        supabase
          .from("dreams")
          .select("*")
          .eq("seller_id", user!.id)
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
        supabase
          .from("users")
          .select("balance")
          .eq("id", user!.id)
          .single(),
      ]);

      setMyDreams(dreamsRes.data ?? []);
      setPurchases(purchasesApiData.purchases as PurchasedItem[]);
      setTotalRevenue(
        (salesRes.data ?? []).reduce((sum, t) => sum + (t.seller_amount ?? 0), 0)
      );
      setBalance(balanceRes.data?.balance ?? 0);

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
        sender_nickname: g.sender?.nickname ?? "Unknown",
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
        recipient_nickname: g.recipient?.nickname ?? "Unknown",
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
          <p style={{ color: "#a78bfa" }}>Loading...</p>
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

  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { setNicknameError("Please enter a username."); return; }
    if (trimmed.length > 10) { setNicknameError("Max 10 characters."); return; }
    setNicknameSaving(true);
    setNicknameError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/user/nickname", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ nickname: trimmed }),
    });
    if (!res.ok) {
      const data = await res.json();
      setNicknameError(data.error ?? "Failed to save.");
    } else {
      setEditingNickname(false);
      window.location.reload();
    }
    setNicknameSaving(false);
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawForm.amount);
    if (!withdrawForm.bankName || !withdrawForm.accountNumber || !withdrawForm.accountHolder || !withdrawForm.amount) {
      setWithdrawError("Please fill in all fields."); return;
    }
    if (isNaN(amount) || amount < 1000) { setWithdrawError("Minimum withdrawal is ₩1,000."); return; }
    if (amount > balance) { setWithdrawError("Insufficient balance."); return; }
    setWithdrawing(true);
    setWithdrawError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({
        amount,
        bankName: withdrawForm.bankName,
        accountNumber: withdrawForm.accountNumber,
        accountHolder: withdrawForm.accountHolder,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setWithdrawError(data.error ?? "Withdrawal request failed.");
    } else {
      setBalance((prev) => prev - amount);
      setWithdrawSuccess(true);
    }
    setWithdrawing(false);
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
    { key: "selling",  label: "My Dreams",      count: myDreams.length },
    { key: "bought",   label: "Purchases",       count: purchases.length },
    { key: "received", label: "Gifts Received",  count: receivedGifts.length },
    { key: "sent",     label: "Gifts Sent",      count: sentGifts.length },
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
            <div className="flex-1 min-w-0">
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value.slice(0, 10))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleNicknameSave(); if (e.key === "Escape") setEditingNickname(false); }}
                    placeholder="New username"
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm text-white outline-none"
                    style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.5)" }}
                  />
                  <button onClick={handleNicknameSave} disabled={nicknameSaving} className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: "rgba(124,58,237,0.4)", color: "#c4b5fd" }}>
                    {nicknameSaving ? "..." : "Save"}
                  </button>
                  <button onClick={() => setEditingNickname(false)} className="text-xs px-2 py-1.5 rounded-lg" style={{ color: "rgba(167,139,250,0.5)" }}>✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-lg">
                    {profile?.nickname ?? "Anonymous"}
                    {profile?.tag && <span className="font-normal text-sm" style={{ color: "rgba(167,139,250,0.5)" }}> #{profile.tag}</span>}
                  </p>
                  <button
                    onClick={() => { setNicknameInput(profile?.nickname ?? ""); setNicknameError(""); setEditingNickname(true); }}
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{ color: "rgba(167,139,250,0.5)", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    Edit
                  </button>
                </div>
              )}
              {nicknameError && <p className="text-xs mt-1" style={{ color: "#f87171" }}>{nicknameError}</p>}
              <p className="text-sm" style={{ color: "rgba(167,139,250,0.7)" }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Dreams Listed", value: `${myDreams.length}` },
            { label: "Sold",          value: `${soldCount}` },
            { label: "Total Revenue", value: `₩${totalRevenue.toLocaleString("ko-KR")}` },
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

        {/* 잔액 카드 */}
        <div
          className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4"
          style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(253,230,138,0.2)" }}
        >
          <div>
            <p className="text-xs mb-1" style={{ color: "rgba(167,139,250,0.7)" }}>Available Balance</p>
            <p
              className="text-2xl font-bold"
              style={{
                background: "linear-gradient(135deg, #fde68a, #fbbf24)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ₩{balance.toLocaleString("ko-KR")}
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>Added after purchase confirmation</p>
          </div>
          <button
            onClick={() => { setWithdrawModal(true); setWithdrawSuccess(false); setWithdrawError(""); setWithdrawForm({ bankName: "", accountNumber: "", accountHolder: "", amount: "" }); }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium shrink-0"
            style={{ background: "rgba(253,230,138,0.1)", border: "1px solid rgba(253,230,138,0.3)", color: "#fde68a" }}
          >
            Withdraw
          </button>
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
            <EmptyState emoji="🌙" title="No dreams listed yet" desc="Interpret a dream and list it on the market!" href="/" btnLabel="✨ Analyze my dream" />
          ) : (
            <div className="space-y-3">
              {myDreams.map((dream) => {
                const st = STATUS_STYLE[dream.status] ?? STATUS_STYLE["판매중"];
                return (
                  <Link key={dream.id} href={`/market/${dream.id}`} className="block">
                    <div className="rounded-2xl p-4 transition-all hover:border-violet-500/40" style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-1 flex-1" style={{ color: "#f1f5f9" }}>{dream.title}</h3>
                        <div className="flex gap-1 shrink-0">
                          {(dream as Dream & { purged_at?: string | null }).purged_at && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: PURGE_BADGE.bg, color: PURGE_BADGE.color, border: `1px solid ${PURGE_BADGE.border}` }}>{PURGE_BADGE.label}</span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                        </div>
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
            <EmptyState emoji="🛒" title="No purchases yet" desc="Find a dream you love on the Dream Market!" href="/market" btnLabel="Browse Dream Market" />
          ) : (
            <div className="space-y-3">
              {purchases.map((item) => (
                <div key={item.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  {item.dreams?.image_url && (
                    <div
                      className="cursor-pointer"
                      onClick={() => router.push(item.dreams ? `/market/${item.dreams.id}` : "/market")}
                    >
                      <img
                        src={item.dreams.image_url}
                        alt={item.dreams.title}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                  <div className="cursor-pointer" onClick={() => router.push(item.dreams ? `/market/${item.dreams.id}` : "/market")}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-1 flex-1" style={{ color: "#f1f5f9" }}>{item.dreams?.title ?? "Deleted dream"}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={item.confirmed_at ? { background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" } : { background: "rgba(234,179,8,0.1)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" }}>
                        {item.confirmed_at ? "Confirmed" : "Pending"}
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
                  <div className="flex gap-2 mt-3">
                    {!item.confirmed_at && (
                      <button onClick={() => handleConfirmPurchase(item.id)} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white" }}>
                        Confirm Purchase
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setCertItem(item); }}
                      className="px-4 py-2 rounded-xl text-sm font-medium shrink-0"
                      style={{ background: "rgba(253,230,138,0.08)", border: "1px solid rgba(253,230,138,0.25)", color: "#fde68a" }}
                    >
                      Certificate
                    </button>
                  </div>
                </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 받은 선물 */}
        {activeTab === "received" && (
          receivedGifts.length === 0 ? (
            <EmptyState emoji="🎁" title="No gifts received yet" desc="Ask a friend to gift you a dream!" href="/market" btnLabel="Browse Dream Market" />
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
                      {gift.dreams?.title ?? "Deleted dream"}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={gift.claimed_at
                        ? { background: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.3)" }
                        : { background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.4)" }
                      }
                    >
                      {gift.claimed_at ? "Opened" : "🎁 New Gift"}
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
            <EmptyState emoji="📤" title="No gifts sent yet" desc="Gift a dream to a friend from the Dream Market!" href="/market" btnLabel="Browse Dream Market" />
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
                      {gift.dreams?.title ?? "Deleted dream"}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={gift.claimed_at
                        ? { background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
                        : { background: "rgba(234,179,8,0.1)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" }
                      }
                    >
                      {gift.claimed_at ? "Received" : "Pending"}
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
                        {gift.gift_type === "free_share" ? "Free Gift" : "Purchased Gift"}
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

      {/* 출금 신청 모달 */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setWithdrawModal(false)} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#0a0428", border: "1px solid rgba(124,58,237,0.4)" }}
          >
            <button
              onClick={() => setWithdrawModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ color: "rgba(167,139,250,0.5)", background: "rgba(124,58,237,0.1)" }}
            >
              ✕
            </button>
            <h2 className="text-white font-bold text-lg mb-1">Withdraw Funds</h2>
            <p className="text-xs mb-5" style={{ color: "#a78bfa" }}>
              Available: ₩{balance.toLocaleString("ko-KR")}
            </p>

            {withdrawSuccess ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-3">✅</p>
                <p className="font-semibold text-white mb-1">Request submitted!</p>
                <p className="text-sm" style={{ color: "rgba(167,139,250,0.7)" }}>
                  Funds will arrive within 1–2 business days
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: "bankName" as const, label: "Bank Name", placeholder: "e.g. Chase, Wells Fargo" },
                  { key: "accountNumber" as const, label: "Account Number", placeholder: "Numbers only" },
                  { key: "accountHolder" as const, label: "Account Holder", placeholder: "Your legal name" },
                  { key: "amount" as const, label: "Amount (₩)", placeholder: "Min ₩1,000" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs mb-1" style={{ color: "rgba(167,139,250,0.7)" }}>{label}</label>
                    <input
                      type={key === "amount" ? "number" : "text"}
                      value={withdrawForm[key]}
                      onChange={(e) => setWithdrawForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }}
                    />
                  </div>
                ))}
                {withdrawError && (
                  <p className="text-xs" style={{ color: "#f87171" }}>{withdrawError}</p>
                )}
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm mt-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                >
                  {withdrawing ? "Processing..." : "Submit"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 인증서 모달 */}
      {certItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCertItem(null)} />
          <div className="relative w-full max-w-sm">
            <CertificateCard
              dreamTitle={certItem.dreams?.title ?? "Deleted dream"}
              buyerNickname={profile?.nickname ?? ""}
              buyerTag={profile?.tag}
              sellerNickname={certItem.dreams?.users?.nickname ?? ""}
              sellerTag={certItem.dreams?.users?.tag ?? undefined}
              amount={certItem.price}
              date={certItem.created_at}
              transactionId={certItem.id}
            />
            <button
              onClick={() => setCertItem(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "rgba(15,8,40,0.95)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
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
