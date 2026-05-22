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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });

    const body = await request.json();
    const { title, content, interpretation, price, lucky_numbers, image_prompt, is_bad, purge_type, purge_reason } = body;

    const VALID_CATEGORIES = ["재물운", "성공운", "연애운", "경고몽", "태몽"];
    const category = VALID_CATEGORIES.includes(body.category) ? body.category : "성공운";

    if (!title || !content) return NextResponse.json({ error: "필수 항목이 없습니다." }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("dreams")
      .insert({
        seller_id: user.id,
        title,
        content,
        interpretation,
        category,
        price,
        lucky_numbers,
        image_prompt: image_prompt ?? null,
        is_bad: is_bad ?? false,
        purge_type: purge_type ?? null,
        purge_reason: purge_reason ?? null,
        status: "판매중",
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Dream register error:", err);
    return NextResponse.json({ error: "등록에 실패했습니다." }, { status: 500 });
  }
}
