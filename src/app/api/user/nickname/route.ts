import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nickname } = await request.json();
  const trimmed = (nickname ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "닉네임을 입력해주세요." }, { status: 400 });
  if (trimmed.length > 10) return NextResponse.json({ error: "10자 이내로 입력해주세요." }, { status: 400 });

  // Verify caller identity using their JWT
  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await anonSupabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use service role to bypass RLS
  const { error } = await serviceSupabase
    .from("users")
    .update({ nickname: trimmed })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
