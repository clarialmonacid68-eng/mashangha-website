"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("密码至少 8 位。");
      return;
    }

    if (password !== confirm) {
      setMessage("两次输入的密码不一致。");
      return;
    }

    setPending(true);

    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setPending(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    // 邮箱确认关闭时 signUp 直接返回会话，可立即进入工作台；
    // 邮箱确认开启时无会话，需用户查收确认邮件后再登录。
    if (data.session) {
      window.location.assign("/workspace/settings");
      return;
    }

    setMessage("注册成功。请前往邮箱完成验证后再登录。");
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark">码</span>
          <span>码上好</span>
        </Link>
        <p className="eyebrow">注册账号</p>
        <h1>创建你的码上好账号</h1>
        <p className="auth-intro">
          一个账号即可作为客户发布需求，或申请成为开发者接单。
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="register-email">邮箱地址</label>
          <input
            autoComplete="email"
            id="register-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <label htmlFor="register-password">设置密码</label>
          <input
            autoComplete="new-password"
            id="register-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            required
            type="password"
            value={password}
          />
          <label htmlFor="register-confirm">确认密码</label>
          <input
            autoComplete="new-password"
            id="register-confirm"
            minLength={8}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="再次输入密码"
            required
            type="password"
            value={confirm}
          />
          <Button disabled={pending} type="submit">
            {pending ? "正在注册..." : "注册"}
          </Button>
        </form>

        {message ? <p className="auth-message">{message}</p> : null}

        <p className="auth-terms">
          已有账号？<Link href="/login">返回登录</Link>
        </p>
        <p className="auth-terms">注册即表示你同意平台服务规则与隐私政策。</p>
      </Card>
    </main>
  );
}
