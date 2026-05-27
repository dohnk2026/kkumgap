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

export default function SignupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: nickname.trim() } },
    });

    if (signUpError) {
      setError(signUpError.message.includes("already registered") ? "This email is already registered." : "Sign up failed. Please try again.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setEmailSent(true);
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  if (emailSent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5"
        style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}>
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">📬</p>
          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-sm mb-6" style={{ color: "#a78bfa" }}>
            We sent a verification link to <span style={{ color: "#c4b5fd" }}>{email}</span>.
            <br />Click the link to complete sign up.
          </p>
          <Link href="/login" className="text-sm font-medium" style={{ color: "#c4b5fd" }}>
            Go to Sign In →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "linear-gradient(to bottom, #050210, #0a0428, #050210)" }}>
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(76, 29, 149, 0.2) 0%, transparent 60%)" }} />

      <header className="relative z-10 px-6 py-5">
        <Link href="/" className="text-2xl font-bold"
          style={{ background: "linear-gradient(135deg, #c4b5fd, #818cf8)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Vanishd
        </Link>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(67,56,202,0.3))", border: "1px solid rgba(124,58,237,0.4)" }}>
              ✨
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-sm" style={{ color: "#a78bfa" }}>Erase nightmares. Sell good dreams.</p>
          </div>

          <button onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl mb-6 font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#fff", color: "#1f2937", boxShadow: "0 2px 16px rgba(0,0,0,0.5)" }}>
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ background: "rgba(124,58,237,0.2)" }} />
            <span className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>or sign up with email</span>
            <div className="flex-1 h-px" style={{ background: "rgba(124,58,237,0.2)" }} />
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-3">
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 12))}
              placeholder="Username (max 12 chars)" required
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" required
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)" required
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(15,8,40,0.8)", border: "1px solid rgba(124,58,237,0.3)" }} />
            {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "rgba(167,139,250,0.6)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#c4b5fd" }} className="font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
