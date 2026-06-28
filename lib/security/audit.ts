import { redirect } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/auth/server";
import type { Json } from "@/lib/db/types";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!role) {
    redirect("/workspace/settings");
  }

  return user;
}

export async function writeAuditLog(input: {
  action: string;
  actorId: string;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceClient();
  const { error } = await service.from("audit_logs").insert({
    action: input.action,
    actor_id: input.actorId,
    entity_id: input.entityId,
    entity_type: input.entityType,
    metadata: (input.metadata ?? {}) as Json,
  });

  if (error) {
    throw new Error(error.message);
  }
}
