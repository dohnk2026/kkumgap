"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface Props {
  secondaryHref?: string;
  secondaryLabel?: string;
}

export default function Header({ secondaryHref, secondaryLabel }: Props) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="relative z-10 flex justify-between items-center px-6 py-5">
      <Link
        href="/"
        className="text-2xl font-bold shrink-0"
        style={{
          background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Vanishd
      </Link>

      <nav className="flex items-center gap-3">
        {secondaryHref && secondaryLabel && (
          <Link href={secondaryHref} className="text-sm hidden sm:block" style={{ color: "rgba(196, 181, 253, 0.7)" }}>
            {secondaryLabel}
          </Link>
        )}

        <Link href="/market" className="text-sm" style={{ color: "rgba(196, 181, 253, 0.8)" }}>
          Dream Market
        </Link>

        {!loading && (
          user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/mypage"
                className="text-sm px-3 py-1.5 rounded-full transition-all"
                style={{ background: "rgba(124, 58, 237, 0.15)", color: "#c4b5fd", border: "1px solid rgba(124, 58, 237, 0.25)" }}
              >
                {profile?.nickname ?? "My Page"}{profile?.tag && <span style={{ opacity: 0.55, fontSize: "0.7em" }}> #{profile.tag}</span>}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ background: "rgba(15, 8, 40, 0.6)", color: "rgba(167, 139, 250, 0.8)", border: "1px solid rgba(124, 58, 237, 0.25)" }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm px-4 py-1.5 rounded-full transition-all"
              style={{ background: "rgba(124, 58, 237, 0.2)", color: "#c4b5fd", border: "1px solid rgba(124, 58, 237, 0.4)" }}
            >
              Sign In
            </Link>
          )
        )}
      </nav>
    </header>
  );
}
