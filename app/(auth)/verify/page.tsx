"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/auth/client";

function VerifyForm() {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const verificationType =
    searchParams.get("type") === "phone_change" ? "phone_change" : "sms";
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const { error } = await createClient().auth.verifyOtp({
      phone,
      token: token.trim(),
      type: verificationType,
    });

    setPending(false);

    if (error) {
      setMessage(error.message);
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
        <p className="eyebrow">验证手机号</p>
        <h1>输入短信验证码</h1>
        <p className="auth-intro">验证码已发送至 {phone || "你的手机号"}。</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="otp">6 位验证码</label>
          <input
            autoComplete="one-time-code"
            id="otp"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setToken(event.target.value)}
            pattern="[0-9]{6}"
            required
            value={token}
          />
          <Button disabled={pending || !phone} type="submit">
            {pending
              ? "正在验证..."
              : verificationType === "phone_change"
                ? "完成绑定"
                : "完成登录"}
          </Button>
        </form>

        {message ? <p className="auth-message">{message}</p> : null}
        <Link className="auth-back-link" href="/login">
          返回重新发送
        </Link>
      </Card>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <Card className="auth-card">正在加载验证页面...</Card>
        </main>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
