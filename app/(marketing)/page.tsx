import type { Metadata } from "next";

import { HomeSections } from "@/components/marketing/home-sections";

export const metadata: Metadata = {
  title: "码上好 | AI 开发服务交易平台",
  description: "连接真实软件需求与经过认证的 AI 开发者，记录报价、履约和验收过程。",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeSections />;
}

