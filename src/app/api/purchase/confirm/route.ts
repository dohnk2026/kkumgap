import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { transactionId, buyerId } = await request.json();

    if (!transactionId || !buyerId) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    const { error } = await supabase
      .from("transactions")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", transactionId)
      .eq("buyer_id", buyerId)
      .eq("status", "완료");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Purchase confirm error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
