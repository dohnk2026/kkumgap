import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { paymentKey, orderId, amount, userId, dream, interpretResult } = await request.json();

  if (!paymentKey || !orderId || !amount || !userId || !dream || !interpretResult) {
    return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
  }

  const encodedKey = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64");
  const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: { Authorization: `Basic ${encodedKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!tossRes.ok) {
    const err = await tossRes.json();
    return NextResponse.json({ error: err.message || "결제 검증 실패" }, { status: 400 });
  }

  const { data: newDream, error: dreamErr } = await supabase
    .from("dreams")
    .insert({
      seller_id: userId,
      title: interpretResult.marketQuestion || "소각된 꿈",
      content: dream,
      interpretation: `${interpretResult.traditional}\n\n${interpretResult.psychological}${interpretResult.advice ? "\n\n" + interpretResult.advice : ""}`,
      category: interpretResult.category,
      price: interpretResult.price,
      lucky_numbers: interpretResult.luckyNumbers,
      image_prompt: interpretResult.image_prompt ?? null,
      is_bad: true,
      purge_type: interpretResult.purge_type,
      purge_reason: interpretResult.purge_reason,
      status: "비공개",
    })
    .select("id")
    .single();

  if (dreamErr || !newDream) {
    return NextResponse.json({ error: "꿈 기록 생성 실패" }, { status: 500 });
  }

  await supabase.from("purge_logs").insert({
    dream_id: newDream.id,
    user_id: userId,
    amount,
    purge_type: interpretResult.purge_type,
  });

  return NextResponse.json({
    success: true,
    dreamId: newDream.id,
    purge_type: interpretResult.purge_type,
    purge_reason: interpretResult.purge_reason,
  });
}
