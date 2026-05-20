"use client";

import { useEffect, useState } from "react";

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  status: "pending" | "processed" | "rejected";
  created_at: string;
  processed_at: string | null;
  users: { nickname: string; tag: string } | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "대기중",   color: "#fbbf24" },
  processed: { label: "처리완료", color: "#4ade80" },
  rejected:  { label: "반려",     color: "#f87171" },
};

export default function AdminWithdrawalsPage() {
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "processed" | "rejected">("pending");

  async function fetchData(key: string) {
    setLoading(true);
    const res = await fetch("/api/admin/withdrawals", {
      headers: { "x-admin-key": key },
    });
    if (res.status === 401) { setAuthed(false); setAdminKey(""); return; }
    const data = await res.json();
    setWithdrawals(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function handleLogin() {
    setAdminKey(keyInput);
    setAuthed(true);
    fetchData(keyInput);
  }

  useEffect(() => {
    if (authed && adminKey) fetchData(adminKey);
  }, [authed, adminKey]);

  async function handleAction(withdrawalId: string, status: "processed" | "rejected") {
    await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ withdrawalId, status }),
    });
    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === withdrawalId
          ? { ...w, status, processed_at: status === "processed" ? new Date().toISOString() : w.processed_at }
          : w
      )
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#050210" }}>
        <div className="w-full max-w-xs rounded-2xl p-6" style={{ background: "#0a0428", border: "1px solid rgba(124,58,237,0.4)" }}>
          <h1 className="text-white font-bold text-lg mb-4">관리자 로그인</h1>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="관리자 키"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none mb-3"
            style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }}
          />
          <button
            onClick={handleLogin}
            className="w-full py-2.5 rounded-xl text-white font-medium text-sm"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            확인
          </button>
        </div>
      </main>
    );
  }

  const filtered = filter === "all" ? withdrawals : withdrawals.filter((w) => w.status === filter);
  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;

  return (
    <main className="min-h-screen p-6" style={{ background: "#050210" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white font-bold text-2xl">출금 신청 관리</h1>
            {pendingCount > 0 && (
              <p className="text-sm mt-1" style={{ color: "#fbbf24" }}>대기 중 {pendingCount}건</p>
            )}
          </div>
          <button
            onClick={() => fetchData(adminKey)}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            새로고침
          </button>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-5">
          {(["pending", "all", "processed", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={
                filter === f
                  ? { background: "rgba(124,58,237,0.4)", color: "#c4b5fd" }
                  : { background: "rgba(15,8,40,0.6)", color: "rgba(167,139,250,0.5)", border: "1px solid rgba(124,58,237,0.2)" }
              }
            >
              {{ pending: "대기중", all: "전체", processed: "처리완료", rejected: "반려" }[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#a78bfa" }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "rgba(167,139,250,0.5)" }}>항목이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((w) => {
              const st = STATUS_LABEL[w.status];
              return (
                <div
                  key={w.id}
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-white font-semibold">
                        {w.users?.nickname ?? "알 수 없음"}
                        {w.users?.tag && <span className="text-xs font-normal ml-1" style={{ color: "rgba(167,139,250,0.5)" }}>#{w.users.tag}</span>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>
                        {new Date(w.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(15,8,40,0.6)", color: st.color, border: `1px solid ${st.color}40` }}>
                      {st.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "rgba(167,139,250,0.6)" }}>출금 금액</p>
                      <p className="font-bold" style={{ color: "#fde68a" }}>₩{w.amount.toLocaleString("ko-KR")}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "rgba(167,139,250,0.6)" }}>은행</p>
                      <p style={{ color: "#e2e8f0" }}>{w.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "rgba(167,139,250,0.6)" }}>계좌번호</p>
                      <p style={{ color: "#e2e8f0" }}>{w.account_number}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "rgba(167,139,250,0.6)" }}>예금주</p>
                      <p style={{ color: "#e2e8f0" }}>{w.account_holder}</p>
                    </div>
                  </div>

                  {w.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(w.id, "processed")}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
                      >
                        처리 완료
                      </button>
                      <button
                        onClick={() => handleAction(w.id, "rejected")}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
                      >
                        반려 (잔액 복구)
                      </button>
                    </div>
                  )}
                  {w.processed_at && (
                    <p className="text-xs mt-2" style={{ color: "rgba(148,163,184,0.4)" }}>
                      처리일시: {new Date(w.processed_at).toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
