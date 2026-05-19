import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount, dreamId, buyerId } = await request.json();

    if (!paymentKey || !orderId || !amount || !dreamId || !buyerId) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    // 꿈 정보 조회
    const { data: dream, error: dreamErr } = await supabase
      .from("dreams")
      .select("seller_id, price, status")
      .eq("id", dreamId)
      .single();

    if (dreamErr || !dream) {
      return NextResponse.json({ error: "꿈 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    // 이미 처리된 결제인지 확인 (페이지 새로고침 대응)
    if (dream.status === "판매완료") {
      const { data: tx } = await supabase
        .from("transactions")
        .select("fee, seller_amount")
        .eq("dream_id", dreamId)
        .eq("buyer_id", buyerId)
        .single();
      if (tx) return NextResponse.json({ success: true, fee: tx.fee, sellerAmount: tx.seller_amount });
      return NextResponse.json({ error: "이미 판매된 꿈입니다." }, { status: 409 });
    }

    // 금액 검증
    if (dream.price !== amount) {
      return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
    }

    // Toss 결제 검증
    const encodedKey = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64");
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!tossRes.ok) {
      const err = await tossRes.json();
      return NextResponse.json(
        { error: err.message || "결제 검증에 실패했습니다." },
        { status: 400 }
      );
    }

    const fee = Math.round(amount * 0.2);
    const sellerAmount = amount - fee;

    // 거래 기록
    const { data: tx } = await supabase.from("transactions").insert({
      dream_id: dreamId,
      buyer_id: buyerId,
      seller_id: dream.seller_id,
      price: amount,
      fee,
      seller_amount: sellerAmount,
      status: "완료",
    }).select("id").single();

    // 꿈 상태 변경
    await supabase.from("dreams").update({ status: "판매완료" }).eq("id", dreamId);

    return NextResponse.json({ success: true, fee, sellerAmount, transactionId: tx?.id ?? null });
  } catch (err) {
    console.error("Payment confirm error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
