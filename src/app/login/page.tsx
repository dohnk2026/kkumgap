"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않아요.");
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(76, 29, 149, 0.2) 0%, transparent 60%)",
        }}
      />

      <header className="relative z-10 px-6 py-5">
        <Link
          href="/"
          className="text-2xl font-bold"
          style={{
            background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          꿈값
        </Link>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {/* 아이콘 + 타이틀 */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(67,56,202,0.3))",
                border: "1px solid rgba(124,58,237,0.4)",
              }}
            >
              🌙
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">다시 만났네요</h1>
            <p className="text-sm" style={{ color: "#a78bfa" }}>꿈값에 오신 걸 환영해요</p>
          </div>

          {/* 구글 로그인 (메인) */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl mb-6 font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#fff", color: "#1f2937", boxShadow: "0 2px 16px rgba(0,0,0,0.5)" }}
          >
            <GoogleIcon />
            구글로 시작하기
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ background: "rgba(124,58,237,0.2)" }} />
            <span className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>또는</span>
            <div className="flex-1 h-px" style={{ background: "rgba(124,58,237,0.2)" }} />
          </div>

          {/* 이메일 로그인 */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }}
            />

            {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              {loading ? "로그인 중..." : "이메일로 로그인"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "rgba(167,139,250,0.6)" }}>
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" style={{ color: "#c4b5fd" }} className="font-medium">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
