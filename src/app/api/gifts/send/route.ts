import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dreamId, senderId, recipientId, message, giftType } = await request.json();

    if (!dreamId || !senderId || !recipientId || !giftType) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    if (senderId === recipientId) {
      return NextResponse.json({ error: "자신에게는 선물할 수 없습니다." }, { status: 400 });
    }

    if (giftType === "free_share") {
      const { data: dream } = await supabase
        .from("dreams")
        .select("seller_id")
        .eq("id", dreamId)
        .single();

      if (!dream || dream.seller_id !== senderId) {
        return NextResponse.json({ error: "선물 권한이 없습니다." }, { status: 403 });
      }

      const { data: existing } = await supabase
        .from("gifts")
        .select("id")
        .eq("dream_id", dreamId)
        .eq("recipient_id", recipientId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "이미 이 꿈을 선물한 유저예요." }, { status: 409 });
      }
    }

    const { error } = await supabase.from("gifts").insert({
      dream_id: dreamId,
      sender_id: senderId,
      recipient_id: recipientId,
      message: message || null,
      gift_type: giftType,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("gift send error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
