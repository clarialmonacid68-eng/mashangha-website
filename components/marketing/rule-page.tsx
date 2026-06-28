import type { ReactNode } from "react";

export function RulePage({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="marketing-page">
      <article className="rule-document">
        <span className="eyebrow">平台规则</span>
        <h1>{title}</h1>
        <p className="rule-lead">{description}</p>
        {children}
        <p className="rule-updated">更新日期：2026 年 6 月 15 日</p>
      </article>
    </main>
  );
}

