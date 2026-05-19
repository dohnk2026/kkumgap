import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runInterpretation } from "@/app/api/interpret/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount, dream, userId } = await request.json();

    if (!paymentKey || !orderId || !amount || !dream || !userId) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

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

    const result = await runInterpretation(dream);

    await supabase.from("interpretation_logs").insert({
      user_id: userId,
      is_paid: true,
      payment_amount: amount,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("interpret-confirm error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
