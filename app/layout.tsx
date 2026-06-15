import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "码上好",
  description: "AI 开发者服务与交易平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
