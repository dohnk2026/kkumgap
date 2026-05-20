import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUniqueTag(supabase: SupabaseClient, nickname: string, excludeId: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const tag = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const { data } = await supabase.from("users").select("id").eq("nickname", nickname).eq("tag", tag).neq("id", excludeId).maybeSingle();
    if (!data) return tag;
  }
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nickname } = await request.json();
  const trimmed = (nickname ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "닉네임을 입력해주세요." }, { status: 400 });
  if (trimmed.length > 10) return NextResponse.json({ error: "10자 이내로 입력해주세요." }, { status: 400 });

  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await anonSupabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 닉네임이 바뀌면 새 태그 발급, 같으면 기존 태그 유지
  const { data: current } = await serviceSupabase.from("users").select("nickname, tag").eq("id", user.id).single();
  const tag = (current && current.nickname === trimmed) ? current.tag : await getUniqueTag(serviceSupabase, trimmed, user.id);

  const { error } = await serviceSupabase
    .from("users")
    .update({ nickname: trimmed, tag })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, tag });
}
