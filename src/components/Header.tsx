"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface Props {
  /** 헤더 오른쪽에 보조 링크가 필요한 경우 */
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
        꿈값
      </Link>

      <nav className="flex items-center gap-3">
        {/* 보조 링크 (페이지별 커스텀) */}
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="text-sm hidden sm:block"
            style={{ color: "rgba(196, 181, 253, 0.7)" }}
          >
            {secondaryLabel}
          </Link>
        )}

        {/* 꿈시장 고정 링크 */}
        <Link
          href="/market"
          className="text-sm"
          style={{ color: "rgba(196, 181, 253, 0.8)" }}
        >
          꿈시장
        </Link>

        {/* 인증 영역 */}
        {!loading && (
          user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm hidden sm:block" style={{ color: "#c4b5fd" }}>
                {profile?.nickname}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: "rgba(15, 8, 40, 0.6)",
                  color: "rgba(167, 139, 250, 0.8)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                }}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm px-4 py-1.5 rounded-full transition-all"
              style={{
                background: "rgba(124, 58, 237, 0.2)",
                color: "#c4b5fd",
                border: "1px solid rgba(124, 58, 237, 0.4)",
              }}
            >
              로그인
            </Link>
          )
        )}
      </nav>
    </header>
  );
}
