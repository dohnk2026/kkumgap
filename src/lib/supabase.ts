import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string | null;
  nickname: string;
  created_at: string;
};

export type Dream = {
  id: string;
  seller_id: string | null;
  title: string;
  content: string;
  interpretation: string;
  image_url: string | null;
  price: number;
  category: string;
  status: "판매중" | "판매완료" | "비공개";
  created_at: string;
  users?: { nickname: string } | null;
};

export type Transaction = {
  id: string;
  dream_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  fee: number;
  seller_amount: number;
  status: "완료" | "취소";
  created_at: string;
};
