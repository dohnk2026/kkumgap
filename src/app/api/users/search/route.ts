import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const exclude = searchParams.get("exclude") ?? "";

  if (q.length < 1) return NextResponse.json({ users: [] });

  let query = supabase
    .from("users")
    .select("id, nickname")
    .ilike("nickname", `%${q}%`)
    .limit(5);

  if (exclude) query = query.neq("id", exclude);

  const { data, error } = await query;
  if (error) return NextResponse.json({ users: [] });

  return NextResponse.json({ users: data ?? [] });
}
