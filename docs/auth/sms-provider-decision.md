# OTP 与短信服务决策

**状态：** 有条件通过  
**日期：** 2026-06-15

## 认证产品要求

- 同一账号支持手机号 OTP 和邮箱 OTP。
- 手机号按 E.164 保存，中国号码 UI 默认 `+86`。
- 手机号和邮箱可以绑定到同一内部用户。
- 验证码接口必须限流、记录错误码并接入 CAPTCHA。
- 业务表只引用内部用户 ID，不直接使用手机号或邮箱作为主键。

## Supabase 托管 Phone Auth 结论

Supabase 官方 Phone Login 文档要求配置短信供应商，当前列出的托管供应商为 MessageBird、Twilio、Vonage 和 TextLocal。

因此：

- 可以把 Supabase Auth 作为开发候选。
- 不能假设其托管 Phone Auth 满足中国大陆短信实名、签名、模板和运营商报备要求。
- 在完成真实号码测试前，不把 Supabase Phone Auth 作为生产定案。

## 国内短信候选

首选验证腾讯云短信，原因是当前公司主体可以按国内短信流程申请：

1. 企业账号实名认证。
2. 创建短信实名资质。
3. 创建公司或已注册商标签名。
4. 创建验证码正文模板。
5. 等待云平台审核和运营商实名报备。
6. 使用移动、联通、电信号码做小流量测试。

腾讯云官方说明：

- 签名和模板的云平台审核通常约 2 小时。
- 新签名运营商报备据观察一般为 7–10 个工作日，实际可能更久。
- 签名长期不使用可能失效，需要重新报备。

## 推荐实现

认证层使用内部适配器：

```ts
export interface OtpProvider {
  sendPhoneOtp(phone: string, purpose: "login" | "bind"): Promise<SendOtpResult>;
  verifyPhoneOtp(phone: string, code: string, purpose: "login" | "bind"): Promise<VerifyOtpResult>;
  sendEmailOtp(email: string, purpose: "login" | "bind"): Promise<SendOtpResult>;
  verifyEmailOtp(email: string, code: string, purpose: "login" | "bind"): Promise<VerifyOtpResult>;
}
```

生产选择：

- 若 Supabase Phone Auth 的中国号码实测通过，可使用 Supabase 统一会话。
- 若不通过，手机号 OTP 使用国内短信服务，验证成功后由服务端签发或链接到统一账号会话。
- 邮箱 OTP 使用自有 SMTP，不依赖开发环境默认邮件额度。

## 尚未完成

- 企业短信实名资质申请。
- “码上好”短信签名是否以公司名还是注册商标申请。
- 验证码模板审核。
- 三网真实号码发送测试。
- QQ、163、企业邮箱到达率测试。

## 参考

- [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login)
- [腾讯云国内短信快速入门](https://cloud.tencent.com/document/product/382/37745)
- [腾讯云短信签名审核标准](https://cloud.tencent.com/document/product/382/39022)
- [腾讯云短信正文模板审核标准](https://cloud.tencent.com/document/product/382/39023)

