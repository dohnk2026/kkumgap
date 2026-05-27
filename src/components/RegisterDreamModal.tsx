"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface Interpretation {
  category: string;
  traditional: string;
  psychological: string;
  advice: string;
  price: number;
  luckyNumbers: number[];
  marketQuestion: string;
  image_prompt?: string;
  is_bad?: boolean;
  purge_type?: string;
  purge_reason?: string;
}

interface Props {
  dream: string;
  result: Interpretation;
  onClose: () => void;
}

export default function RegisterDreamModal({ dream, result, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(result.price);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dreamId, setDreamId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Please enter a title."); return; }
    if (!user) { setError("You need to sign in."); return; }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/dreams/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: dream,
          interpretation: `${result.traditional}\n\n${result.psychological}${result.advice ? "\n\n" + result.advice : ""}`,
          category: result.category,
          price,
          lucky_numbers: result.luckyNumbers,
          image_prompt: result.image_prompt ?? null,
          is_bad: result.is_bad ?? false,
          purge_type: result.purge_type ?? null,
          purge_reason: result.purge_reason ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDreamId(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to list dream.");
    } finally {
      setLoading(false);
    }
  };

  if (dreamId) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-3xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, #0a0428, #0f0840)", border: "1px solid rgba(124, 58, 237, 0.5)" }}>
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-white font-bold text-lg mb-1">Your dream is listed!</p>
          <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>
            Grandma Mong says it&apos;ll sell fast~
          </p>
          <div className="space-y-2">
            <button onClick={() => router.push(`/market/${dreamId}`)}
              className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              View my dream
            </button>
            <button onClick={() => router.push("/market")}
              className="w-full py-3 rounded-xl font-medium"
              style={{ background: "rgba(15,8,40,0.6)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
              Browse Dream Market
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl p-6"
        style={{ background: "linear-gradient(135deg, #0a0428, #0f0840)", border: "1px solid rgba(124, 58, 237, 0.5)" }}>
        <button onClick={onClose} className="absolute top-4 right-5 text-xl leading-none"
          style={{ color: "rgba(167, 139, 250, 0.5)" }}>✕</button>

        <h2 className="text-white font-bold text-lg mb-1">List on Dream Market</h2>
        <p className="text-sm mb-5" style={{ color: "#a78bfa" }}>
          Grandma Mong says this one&apos;s a keeper — list it!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4b5fd" }}>
              Dream title{" "}
              <span style={{ color: "rgba(167,139,250,0.5)" }}>({title.length}/20)</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 20))}
              placeholder={result.marketQuestion || "Give your dream a title"}
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4b5fd" }}>
              Price{"  "}
              <span className="font-bold" style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ₩{price.toLocaleString()}
              </span>
              <span className="ml-1" style={{ color: "rgba(167,139,250,0.45)", fontWeight: 400 }}>
                (AI suggested ₩{result.price.toLocaleString()})
              </span>
            </label>
            <input type="range" min={100} max={5000} step={100} value={price}
              onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs mt-1" style={{ color: "rgba(167,139,250,0.4)" }}>
              <span>₩100</span><span>₩5,000</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full"
              style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>
              {result.category}
            </span>
            <span className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>AI category</span>
          </div>

          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

          <button type="submit" disabled={loading || !title.trim()}
            className="w-full py-3.5 rounded-xl text-white font-semibold transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            {loading ? "Listing..." : "🌙 List on Dream Market"}
          </button>
        </form>
      </div>
    </div>
  );
}
