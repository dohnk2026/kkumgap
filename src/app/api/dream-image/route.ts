import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

fal.config({ credentials: process.env.FAL_KEY! });

export async function POST(request: NextRequest) {
  const { dreamId } = await request.json();
  if (!dreamId) return NextResponse.json({ error: "dreamId가 필요합니다." }, { status: 400 });

  const { data: dream } = await supabase
    .from("dreams")
    .select("image_prompt, image_url")
    .eq("id", dreamId)
    .single();

  if (!dream) return NextResponse.json({ error: "꿈을 찾을 수 없습니다." }, { status: 404 });
  if (dream.image_url) return NextResponse.json({ imageUrl: dream.image_url });
  if (!dream.image_prompt) return NextResponse.json({ error: "이미지 프롬프트가 없습니다." }, { status: 400 });

  try {
    const result = await fal.subscribe("fal-ai/stable-diffusion-v35-large", {
      input: {
        prompt: dream.image_prompt,
        image_size: "square_hd",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        output_format: "jpeg",
      },
    }) as { images?: Array<{ url: string }> };

    const falImageUrl = result.images?.[0]?.url;
    if (!falImageUrl) throw new Error("이미지 URL을 받지 못했습니다.");

    const imageRes = await fetch(falImageUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    const fileName = `${dreamId}.jpg`;
    await supabase.storage
      .from("dream-images")
      .upload(fileName, Buffer.from(imageBuffer), {
        contentType: "image/jpeg",
        upsert: true,
      });

    const { data: { publicUrl } } = supabase.storage
      .from("dream-images")
      .getPublicUrl(fileName);

    await supabase.from("dreams").update({ image_url: publicUrl }).eq("id", dreamId);

    return NextResponse.json({ imageUrl: publicUrl });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json({ error: "이미지 생성에 실패했습니다." }, { status: 500 });
  }
}
