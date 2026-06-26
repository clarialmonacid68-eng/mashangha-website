"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setPending(false);

    if (error) {
      setMessage("邮箱或密码不正确，请重试。");
      return;
    }

    window.location.assign("/workspace/settings");
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark">码</span>
          <span>码上好</span>
        </Link>
        <p className="eyebrow">账号登录</p>
        <h1>一个账号，切换客户与开发者身份</h1>
        <p className="auth-intro">
          登录后可发布需求、提交报价，并在同一工作台管理订单。
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">邮箱地址</label>
          <input
            autoComplete="email"
            id="login-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <label htmlFor="login-password">密码</label>
          <input
            autoComplete="current-password"
            id="login-password"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            required
            type="password"
            value={password}
          />
          <Button disabled={pending} type="submit">
            {pending ? "正在登录..." : "登录"}
          </Button>
        </form>

        {message ? <p className="auth-message">{message}</p> : null}

        <p className="auth-terms">
          还没有账号？<Link href="/register">注册新账号</Link>
        </p>
        <p className="auth-terms">继续即表示你同意平台服务规则与隐私政策。</p>
      </Card>
    </main>
  );
}
