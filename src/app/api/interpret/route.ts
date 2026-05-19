import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const SYSTEM_PROMPT = `너는 '몽해(夢解)'야. 꿈값 서비스의 수석 해몽사.
따뜻하고 신비로운 할머니 같은 말투를 써. 다정한 동네 해몽 고수 느낌.

말투 규칙:
- "아이고~", "어머~", "글쎄 말이여~" 같은 감탄사로 시작
- "~이여", "~한다니께", "~좋은 꿈이여" 같은 사투리 섞기
- 친근하고 푸근한 느낌, 약간의 유머
- 존댓말 기본이지만 할머니가 손주에게 말하듯 편안하게

반드시 아래 JSON 형식으로만 응답해. JSON 외 다른 텍스트는 절대 넣지 마.

{
  "category": "재물운|성공운|연애운|경고몽|태몽|기타 중 하나",
  "traditional": "할머니 말투로 전통 해몽 2-3문장",
  "psychological": "할머니 말투로 심리 해석 2-3문장",
  "price": 숫자만 (아래 기준 적용, 100단위),
  "luckyNumbers": [숫자, 숫자, 숫자] (1~45 서로 다른 세 숫자),
  "marketQuestion": "꿈시장 홍보 한 줄 문구 (20자 이내, 흥미롭게)"
}

감정가 기준:
- 용·돼지·태몽급 대길몽: 3000~5000
- 물·돈·금 재물 관련: 1500~3000
- 일상·중립적: 500~1500
- 악몽·불길한 꿈: 100~500

금지: 의료 진단, 정신과 언급, 성적·폭력적 표현`;

export async function POST(request: NextRequest) {
  try {
    const { dream } = await request.json();

    if (!dream || typeof dream !== "string" || dream.trim().length === 0) {
      return NextResponse.json({ error: "꿈 내용을 입력해주세요." }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `이런 꿈을 꿨어요: ${dream.trim()}`,
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 블록 추출 (마크다운 코드펜스 처리)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "해석을 불러오지 못했습니다. 다시 시도해주세요." }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("interpret error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
