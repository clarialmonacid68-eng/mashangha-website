import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { resolveWorkspaceRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/auth/server";
import { listCurrentUserRoles } from "@/lib/domain/settings/queries";

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

  const roles = await listCurrentUserRoles(supabase, user.id);

  const cookieStore = await cookies();
  const role = resolveWorkspaceRole(
    roles,
    cookieStore.get("workspace-role")?.value,
  );

  if (!role) {
    redirect("/login");
  }

  return <WorkspaceShell role={role}>{children}</WorkspaceShell>;
}
