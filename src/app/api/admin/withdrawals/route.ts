import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function checkAdminAuth(request: NextRequest) {
  const key = request.headers.get("x-admin-key");
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("withdrawals")
    .select("*, users(nickname, tag)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { withdrawalId, status } = await request.json();
  if (!withdrawalId || !status) {
    return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "processed") updateData.processed_at = new Date().toISOString();

  // rejected면 잔액 복구
  if (status === "rejected") {
    const { data: w } = await supabase
      .from("withdrawals")
      .select("user_id, amount")
      .eq("id", withdrawalId)
      .single();
    if (w) {
      await supabase.rpc("increment_balance", { p_user_id: w.user_id, p_amount: w.amount });
    }
  }

  const { error } = await supabase
    .from("withdrawals")
    .update(updateData)
    .eq("id", withdrawalId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
