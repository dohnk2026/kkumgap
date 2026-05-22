import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic();

const PURGE_STYLES: Record<string, string> = {
  fire: "불꽃으로 태워 재로 돌려보내는",
  water: "강물에 흘려보내 바다로 돌아가게 하는",
  wind: "바람에 흩어 하늘로 사라지게 하는",
  void: "어둠 속으로 침잠시켜 봉인하는",
};

export async function POST(request: NextRequest) {
  const { dreamId } = await request.json();
  if (!dreamId) return NextResponse.json({ error: "dreamId가 필요합니다." }, { status: 400 });

  const { data: dream } = await supabase
    .from("dreams")
    .select("content, purge_type, purge_reason")
    .eq("id", dreamId)
    .single();

  if (!dream) return NextResponse.json({ error: "꿈을 찾을 수 없습니다." }, { status: 404 });

  const style = PURGE_STYLES[dream.purge_type ?? "fire"] ?? "소각하는";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `너는 40년 경력의 몽해 할머니. 사용자의 나쁜 꿈을 ${style} 소각 의식을 진행한다.

꿈 내용: ${dream.content}
소각 이유: ${dream.purge_reason ?? ""}

반드시 아래 JSON 형식으로만 응답해. 의식 주문 4줄. 할머니 말투(~이여, ~한다니께 등). 신비롭고 진중하게. 각 줄은 15~30자 사이.
{"lines": ["첫째 줄", "둘째 줄", "셋째 줄", "넷째 줄"]}`,
    }],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "의식 텍스트 생성 실패" }, { status: 500 });

  const { lines } = JSON.parse(jsonMatch[0]);

  await Promise.all([
    supabase.from("dreams").update({ purged_at: new Date().toISOString() }).eq("id", dreamId),
    supabase.from("purge_logs").update({ ritual_text: lines.join("\n") }).eq("dream_id", dreamId),
  ]);

  return NextResponse.json({ lines });
}
