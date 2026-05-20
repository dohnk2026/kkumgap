import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { transactionId, buyerId } = await request.json();

    if (!transactionId || !buyerId) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("seller_id, seller_amount, confirmed_at")
      .eq("id", transactionId)
      .eq("buyer_id", buyerId)
      .eq("status", "완료")
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "거래를 찾을 수 없습니다." }, { status: 404 });
    }

    if (tx.confirmed_at) {
      return NextResponse.json({ success: true });
    }

    const [confirmRes, balanceRes] = await Promise.all([
      supabase
        .from("transactions")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("id", transactionId),
      supabase.rpc("increment_balance", {
        p_user_id: tx.seller_id,
        p_amount: tx.seller_amount,
      }),
    ]);

    if (confirmRes.error) throw confirmRes.error;
    if (balanceRes.error) throw balanceRes.error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Purchase confirm error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
