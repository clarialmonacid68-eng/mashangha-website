"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/client";

type LoginMethod = "phone" | "email";

export default function LoginPage() {
  const [method, setMethod] = useState<LoginMethod>("phone");
  const [value, setValue] = useState("+86");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const result =
      method === "email"
        ? await supabase.auth.signInWithOtp({
            email: value.trim(),
            options: { emailRedirectTo: redirectTo },
          })
        : await supabase.auth.signInWithOtp({
            phone: value.trim(),
          });

    setPending(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (method === "phone") {
      window.location.assign(
        `/verify?phone=${encodeURIComponent(value.trim())}`,
      );
      return;
    }

    setMessage("登录链接已发送，请前往邮箱完成验证。");
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

        <div className="auth-tabs" role="tablist" aria-label="登录方式">
          <button
            aria-selected={method === "phone"}
            className={method === "phone" ? "is-active" : ""}
            onClick={() => {
              setMethod("phone");
              setValue("+86");
              setMessage("");
            }}
            role="tab"
            type="button"
          >
            手机验证码
          </button>
          <button
            aria-selected={method === "email"}
            className={method === "email" ? "is-active" : ""}
            onClick={() => {
              setMethod("email");
              setValue("");
              setMessage("");
            }}
            role="tab"
            type="button"
          >
            邮箱登录
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-identifier">
            {method === "phone" ? "手机号" : "邮箱地址"}
          </label>
          <input
            autoComplete={method === "phone" ? "tel" : "email"}
            id="login-identifier"
            inputMode={method === "phone" ? "tel" : "email"}
            onChange={(event) => setValue(event.target.value)}
            placeholder={method === "phone" ? "+8613800138000" : "you@example.com"}
            required
            type={method === "phone" ? "tel" : "email"}
            value={value}
          />
          <Button disabled={pending} type="submit">
            {pending
              ? "正在发送..."
              : method === "phone"
                ? "发送验证码"
                : "发送登录链接"}
          </Button>
        </form>

        {message ? <p className="auth-message">{message}</p> : null}
        <p className="auth-terms">
          继续即表示你同意平台服务规则与隐私政策。
        </p>
      </Card>
    </main>
  );
}
