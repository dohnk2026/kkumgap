import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await anonSupabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nickname =
    user.user_metadata?.nickname ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "꿈꾸미";

  const { data, error } = await serviceSupabase
    .from("users")
    .upsert({ id: user.id, email: user.email ?? null, nickname }, { onConflict: "id" })
    .select("nickname")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ nickname: data.nickname });
}
