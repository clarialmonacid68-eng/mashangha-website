"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/auth/client";

export function ContactBinding({
  email,
  phone,
}: {
  email?: string;
  phone?: string;
}) {
  const [emailValue, setEmailValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("+86");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function bindPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const value = phoneValue.trim();
    const { error } = await createClient().auth.updateUser({ phone: value });
    setPending(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.assign(
      `/verify?phone=${encodeURIComponent(value)}&type=phone_change`,
    );
  }

  async function bindEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const value = emailValue.trim();
    const redirectTo = `${window.location.origin}/auth/callback?next=/workspace/settings`;
    const { error } = await createClient().auth.updateUser(
      { email: value },
      { emailRedirectTo: redirectTo },
    );
    setPending(false);

    setMessage(
      error ? error.message : "确认链接已发送，请前往新邮箱完成绑定。",
    );
  }

  return (
    <section className="contact-binding">
      <div>
        <p className="application-label">登录邮箱</p>
        {email ? (
          <strong>{email}</strong>
        ) : (
          <form className="auth-form compact-form" onSubmit={bindEmail}>
            <label htmlFor="binding-email">绑定邮箱</label>
            <input
              id="binding-email"
              onChange={(event) => setEmailValue(event.target.value)}
              required
              type="email"
              value={emailValue}
            />
            <Button disabled={pending} type="submit" variant="secondary">
              发送邮箱确认链接
            </Button>
          </form>
        )}
      </div>

      <div>
        <p className="application-label">登录手机号</p>
        {phone ? (
          <strong>{phone}</strong>
        ) : (
          <form className="auth-form compact-form" onSubmit={bindPhone}>
            <label htmlFor="binding-phone">绑定手机号</label>
            <input
              id="binding-phone"
              inputMode="tel"
              onChange={(event) => setPhoneValue(event.target.value)}
              pattern="\+[1-9][0-9]{7,14}"
              required
              type="tel"
              value={phoneValue}
            />
            <Button disabled={pending} type="submit" variant="secondary">
              发送绑定验证码
            </Button>
          </form>
        )}
      </div>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  );
}

