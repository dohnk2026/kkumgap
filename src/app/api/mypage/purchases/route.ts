import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("id, price, created_at, confirmed_at, dreams(id, title, category, image_url, users(nickname, tag))")
      .eq("buyer_id", user.id)
      .eq("status", "완료")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ purchases: data ?? [] });
  } catch (err) {
    console.error("Purchases fetch error:", err);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}
