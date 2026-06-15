import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ContactBinding } from "@/components/account/contact-binding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  canAccessWorkspace,
  resolveWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/guards";
import { createClient } from "@/lib/auth/server";

async function switchRole(formData: FormData) {
  "use server";

  const requestedRole = formData.get("role");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = roleRows?.map(({ role }) => role) ?? [];

  if (!canAccessWorkspace(roles, requestedRole)) {
    redirect("/workspace/settings?error=role_not_allowed");
  }

  const cookieStore = await cookies();
  cookieStore.set("workspace-role", requestedRole, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect("/workspace/settings");
}

async function applyForDeveloper() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("apply_for_developer");

  if (error) {
    redirect("/workspace/settings?error=developer_application_failed");
  }

  redirect("/workspace/settings");
}

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = roleRows?.map(({ role }) => role) ?? [];
  const { data: developerProfile } = await supabase
    .from("developer_profiles")
    .select("review_status")
    .eq("user_id", user.id)
    .maybeSingle();
  const cookieStore = await cookies();
  const currentRole = resolveWorkspaceRole(
    roles,
    cookieStore.get("workspace-role")?.value,
  );

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">账号设置</p>
        <h1>工作台身份</h1>
        <p className="auth-intro">
          切换只改变当前工作台视角，不会创建第二个账号。
        </p>
      </div>

      <Card className="settings-card">
        <p className="application-label">当前身份</p>
        <strong>{currentRole === "developer" ? "开发者" : "客户"}</strong>
        <div className="role-options">
          {(["customer", "developer"] as WorkspaceRole[]).map((role) => {
            const enabled = roles.includes(role);
            return (
              <form action={switchRole} key={role}>
                <input name="role" type="hidden" value={role} />
                <Button
                  disabled={!enabled || currentRole === role}
                  type="submit"
                  variant={currentRole === role ? "secondary" : "primary"}
                >
                  {role === "customer" ? "切换为客户" : "切换为开发者"}
                </Button>
              </form>
            );
          })}
        </div>
        {!roles.includes("developer") ? (
          <>
            <p className="auth-message">
              提交申请后可切换开发者工作台，审核通过前不能报价。
            </p>
            <form action={applyForDeveloper}>
              <Button type="submit" variant="secondary">
                申请开发者认证
              </Button>
            </form>
          </>
        ) : developerProfile ? (
          <p className="auth-message">
            认证状态：
            {developerProfile.review_status === "approved"
              ? "已通过"
              : developerProfile.review_status === "rejected"
                ? "未通过"
                : developerProfile.review_status === "pending"
                  ? "审核中"
                  : "待提交资料"}
          </p>
        ) : null}
      </Card>

      <Card className="settings-card">
        <p className="application-label">账号标识</p>
        <code className="account-id" data-testid="account-id">
          {user.id}
        </code>
        <ContactBinding email={user.email} phone={user.phone} />
      </Card>
    </div>
  );
}
