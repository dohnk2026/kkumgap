"use client";

interface Props {
  dreamTitle: string;
  buyerNickname: string;
  sellerNickname: string;
  amount: number;
  date: string;
  transactionId?: string;
}

export default function CertificateCard({ dreamTitle, buyerNickname, sellerNickname, amount, date, transactionId }: Props) {
  const formattedDate = new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div
      className="rounded-3xl p-px"
      style={{ background: "linear-gradient(135deg, #fde68a 0%, #a78bfa 50%, #fde68a 100%)" }}
    >
      <div
        className="rounded-3xl px-6 py-7 text-center"
        style={{ background: "linear-gradient(160deg, #0a0428 0%, #0f0840 100%)" }}
      >
        <p className="text-xs font-medium tracking-widest mb-5" style={{ color: "rgba(253,230,138,0.55)" }}>
          ✦ &nbsp; 꿈값 공식 인증서 &nbsp; ✦
        </p>

        <p className="text-base font-semibold text-white mb-1">꿈 소유권 증명서</p>

        <div
          className="w-16 h-px mx-auto my-4"
          style={{ background: "linear-gradient(90deg, transparent, rgba(253,230,138,0.4), transparent)" }}
        />

        <p className="text-3xl mb-2" style={{ animation: "float 3s ease-in-out infinite" }}>🌙</p>
        <p className="text-lg font-bold text-white mb-5 leading-snug px-2">{dreamTitle}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-left mb-5 px-2">
          <div>
            <p className="text-xs mb-0.5" style={{ color: "rgba(253,230,138,0.5)" }}>구매자</p>
            <p className="text-sm font-semibold text-white">{buyerNickname || "—"}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "rgba(253,230,138,0.5)" }}>판매자</p>
            <p className="text-sm font-semibold text-white">{sellerNickname || "—"}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "rgba(253,230,138,0.5)" }}>거래일</p>
            <p className="text-sm font-semibold text-white">{formattedDate}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "rgba(253,230,138,0.5)" }}>결제금액</p>
            <p
              className="text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #fde68a, #fbbf24)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ₩{amount.toLocaleString("ko-KR")}
            </p>
          </div>
        </div>

        <div
          className="w-16 h-px mx-auto mb-4"
          style={{ background: "linear-gradient(90deg, transparent, rgba(253,230,138,0.4), transparent)" }}
        />

        <div
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "rgba(253,230,138,0.08)", border: "1px solid rgba(253,230,138,0.25)", color: "#fde68a" }}
        >
          ✦ &nbsp; 꿈값 공식 인증
        </div>

        {transactionId && (
          <p className="text-xs mt-3" style={{ color: "rgba(148,163,184,0.3)" }}>
            # {transactionId.slice(-12).toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}
