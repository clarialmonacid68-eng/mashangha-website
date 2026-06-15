import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { resolveWorkspaceRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/auth/server";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    throw new Error("无法读取账号角色");
  }

  const cookieStore = await cookies();
  const role = resolveWorkspaceRole(
    roleRows.map(({ role }) => role),
    cookieStore.get("workspace-role")?.value,
  );

  if (!role) {
    redirect("/login");
  }

  return <WorkspaceShell role={role}>{children}</WorkspaceShell>;
}

