import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const exclude = searchParams.get("exclude") ?? "";

  if (q.length < 1) return NextResponse.json({ users: [] });

  let data, error;

  if (q.includes("#")) {
    // 정확히 nickname#tag 형식으로 검색
    const [namePart, tagPart] = q.split("#");
    const name = namePart.trim();
    const tag = tagPart.trim().padStart(4, "0");

    let query = supabase
      .from("users")
      .select("id, nickname, tag")
      .eq("nickname", name)
      .eq("tag", tag)
      .limit(1);

    if (exclude) query = query.neq("id", exclude);
    ({ data, error } = await query);
  } else {
    // 닉네임으로 부분 검색
    let query = supabase
      .from("users")
      .select("id, nickname, tag")
      .ilike("nickname", `%${q}%`)
      .limit(8);

    if (exclude) query = query.neq("id", exclude);
    ({ data, error } = await query);
  }

  if (error) return NextResponse.json({ users: [] });
  return NextResponse.json({ users: data ?? [] });
}
