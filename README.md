# 꿈값 (Kkumgap)

꿈 해석 & 거래 플랫폼. 꿈을 AI로 해석하고 꿈시장에서 사고팔 수 있어요.

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend**: Supabase (DB + Auth), Next.js Route Handlers
- **AI**: Anthropic Claude (claude-haiku-4-5) — 몽해 캐릭터
- **결제**: Toss Payments SDK

## 주요 기능

- 꿈 내용 입력 → AI 해석 (전통 해몽 + 심리 해석 + 감정가 산정)
- 꿈시장에 꿈 등록 및 판매
- 카드 결제 (Toss Payments) → 판매자 80% / 플랫폼 20% 수수료
- 구글 OAuth / 이메일 회원가입·로그인
- 마이페이지 (등록한 꿈, 구매한 꿈, 수익 통계)

## 시작하기

```bash
npm install
cp .env.example .env.local
# .env.local에 실제 키 입력
npm run dev
```

## 환경변수

`.env.example` 참고. 필요한 서비스:

1. **Supabase** — 프로젝트 생성 후 URL + anon key
2. **Anthropic** — API 키 발급
3. **Toss Payments** — 개발자 센터에서 테스트 키 발급

## Supabase 테이블

```sql
-- users (auth.users 연동)
create table users (
  id uuid primary key references auth.users(id),
  email text,
  nickname text not null,
  created_at timestamptz default now()
);

-- dreams
create table dreams (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id),
  title text not null,
  content text not null,
  interpretation text not null,
  image_url text,
  price integer not null,
  category text not null check (category in ('재물운','성공운','연애운','경고몽','태몽','기타')),
  status text not null default '판매중' check (status in ('판매중','판매완료','비공개')),
  created_at timestamptz default now()
);

-- transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  dream_id uuid references dreams(id),
  buyer_id uuid references auth.users(id),
  seller_id uuid references auth.users(id),
  price integer not null,
  fee integer not null,
  seller_amount integer not null,
  status text not null default '완료' check (status in ('완료','취소')),
  created_at timestamptz default now()
);
```

## 배포

Vercel 권장. 환경변수를 Vercel 프로젝트 설정에 추가하면 됩니다.

Toss Payments 실서비스 전환 시 `test_ck_` / `test_sk_` 키를 `live_ck_` / `live_sk_` 키로 교체하세요.
