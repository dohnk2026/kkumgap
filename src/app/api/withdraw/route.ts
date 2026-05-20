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

  const { amount, bankName, accountNumber, accountHolder } = await request.json();

  if (!amount || !bankName || !accountNumber || !accountHolder) {
    return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
  }

  const parsedAmount = parseInt(amount);
  if (isNaN(parsedAmount) || parsedAmount < 1000) {
    return NextResponse.json({ error: "최소 출금액은 1,000원입니다." }, { status: 400 });
  }

  const { data: userData } = await serviceSupabase
    .from("users")
    .select("balance")
    .eq("id", user.id)
    .single();

  if (!userData || userData.balance < parsedAmount) {
    return NextResponse.json({ error: "잔액이 부족합니다." }, { status: 400 });
  }

  const deductRes = await serviceSupabase.rpc("decrement_balance", {
    p_user_id: user.id,
    p_amount: parsedAmount,
  });
  if (deductRes.error) return NextResponse.json({ error: deductRes.error.message }, { status: 500 });

  const { data: withdrawal, error: withdrawErr } = await serviceSupabase
    .from("withdrawals")
    .insert({
      user_id: user.id,
      amount: parsedAmount,
      bank_name: bankName,
      account_number: accountNumber,
      account_holder: accountHolder,
    })
    .select("id")
    .single();

  if (withdrawErr) {
    // 실패 시 잔액 복구
    await serviceSupabase.rpc("increment_balance", { p_user_id: user.id, p_amount: parsedAmount });
    return NextResponse.json({ error: withdrawErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, withdrawalId: withdrawal.id });
}
