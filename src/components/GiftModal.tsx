"use client";

import { useState, useEffect, useRef } from "react";

interface UserResult {
  id: string;
  nickname: string;
  tag: string;
}

interface GiftModalProps {
  dream: { id: string; title: string; price: number };
  giftType: "free_share" | "purchased";
  senderId: string;
  onClose: () => void;
  onFreeSent?: () => void;
  onProceedPayment?: (recipientId: string, recipientNickname: string, message: string) => void;
}

export default function GiftModal({
  dream,
  giftType,
  senderId,
  onClose,
  onFreeSent,
  onProceedPayment,
}: GiftModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&exclude=${senderId}`);
        const data = await res.json();
        setResults(data.users ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, senderId]);

  const handleSelectUser = (u: UserResult) => {
    setSelected(u);
    setQuery(`${u.nickname}#${u.tag}`);
    setResults([]);
    setError(null);
  };

  const handleSend = async () => {
    if (!selected) { setError("받는 사람을 선택해주세요."); return; }

    if (giftType === "purchased") {
      onProceedPayment?.(selected.id, `${selected.nickname}#${selected.tag}`, message);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/gifts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dreamId: dream.id,
          senderId,
          recipientId: selected.id,
          message: message || null,
          giftType: "free_share",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "선물 전송에 실패했어요."); return; }
      setSent(true);
      setTimeout(() => { onFreeSent?.(); onClose(); }, 2200);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-3xl p-6"
        style={{ background: "linear-gradient(135deg, #0a0428, #0f0840)", border: "1px solid rgba(124,58,237,0.5)" }}
      >
        {sent ? (
          <div className="text-center py-4">
            <p className="text-5xl mb-4" style={{ animation: "float 2s ease-in-out infinite" }}>🎁</p>
            <p className="text-white font-bold text-lg mb-1">선물 완료!</p>
            <p className="text-sm" style={{ color: "#a78bfa" }}>
              {selected?.nickname}#{selected?.tag}님에게 꿈을 선물했어요
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={onClose}
              className="absolute top-4 right-5 text-xl leading-none"
              style={{ color: "rgba(167,139,250,0.5)" }}
            >
              ✕
            </button>

            <div className="mb-5">
              <p className="text-lg mb-0.5">🎁</p>
              <h2 className="text-white font-bold text-lg mb-1">꿈 선물하기</h2>
              <p className="text-xs" style={{ color: "#a78bfa" }}>
                {giftType === "purchased"
                  ? `₩${dream.price.toLocaleString("ko-KR")} 결제 후 친구에게 선물해요`
                  : "내 꿈을 친구에게 무료로 공유해요"}
              </p>
            </div>

            {/* 꿈 제목 */}
            <div
              className="rounded-xl px-4 py-2.5 mb-4 text-sm"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#c4b5fd" }}
            >
              🌙 {dream.title}
            </div>

            {/* 닉네임 검색 */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4b5fd" }}>
                받는 사람 <span style={{ color: "rgba(167,139,250,0.5)", fontWeight: 400 }}>닉네임 또는 닉네임#태그</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                  placeholder="꿈꾸미 또는 꿈꾸미#1234"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "rgba(15,8,40,0.8)", border: `1px solid ${selected ? "rgba(124,58,237,0.6)" : "rgba(124,58,237,0.3)"}` }}
                />
                {selected && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.3)", color: "#c4b5fd" }}>
                    ✓ 선택됨
                  </span>
                )}
              </div>

              {/* 검색 결과 드롭다운 */}
              {(results.length > 0 || searching) && !selected && (
                <div
                  className="mt-1 rounded-xl overflow-hidden"
                  style={{ background: "rgba(15,8,40,0.95)", border: "1px solid rgba(124,58,237,0.3)" }}
                >
                  {searching ? (
                    <p className="px-4 py-3 text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>검색 중...</p>
                  ) : results.length === 0 ? (
                    <p className="px-4 py-3 text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>검색 결과가 없어요</p>
                  ) : (
                    results.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className="w-full px-4 py-3 text-left text-sm transition-all flex items-center justify-between"
                        style={{ color: "#e2e8f0", borderBottom: "1px solid rgba(124,58,237,0.1)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span>🌙 {u.nickname}</span>
                        <span className="text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>#{u.tag}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 메시지 */}
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4b5fd" }}>
                메시지 (선택) <span style={{ color: "rgba(167,139,250,0.5)" }}>{message.length}/100</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                placeholder="함께 보낼 메시지를 적어주세요..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }}
              />
            </div>

            {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}

            <button
              onClick={handleSend}
              disabled={sending || !selected}
              className="w-full py-3.5 rounded-xl text-white font-semibold transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              {sending
                ? "전송 중..."
                : giftType === "purchased"
                ? `결제하기 · ₩${dream.price.toLocaleString("ko-KR")}`
                : "🎁 선물하기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
