import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { securityLog } from "@/lib/observability/logger";
import type {
  InAppNotification,
  MarketplaceNotificationEvent,
  NotificationRepository,
} from "@/lib/notifications/types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

function toInAppNotification(row: NotificationRow): InAppNotification {
  return {
    actorId: row.actor_id,
    body: row.body,
    createdAt: row.created_at,
    eventKey: row.event_key,
    id: row.id,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    readAt: row.read_at,
    recipientId: row.recipient_id,
    title: row.title,
    type: row.event_type as MarketplaceNotificationEvent["type"],
  };
}

export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async createInApp(
    event: MarketplaceNotificationEvent,
  ): Promise<InAppNotification> {
    const { data, error } = await this.supabase
      .from("notifications")
      .upsert(
        {
          actor_id: event.actorId ?? null,
          body: event.body ?? null,
          event_key: event.eventKey,
          event_type: event.type,
          metadata: (event.metadata ?? {}) as NotificationInsert["metadata"],
          recipient_id: event.recipientId,
          title: event.title,
        },
        { onConflict: "recipient_id,event_key" },
      )
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toInAppNotification(data);
  }
}

export function createServiceNotificationRepository() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return new SupabaseNotificationRepository(
    createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  );
}

export async function createServiceInAppNotification(
  event: MarketplaceNotificationEvent,
) {
  const repository = createServiceNotificationRepository();

  if (!repository) {
    return;
  }

  try {
    await repository.createInApp(event);
  } catch (error) {
    securityLog("notification.create_failed", {
      error: error instanceof Error ? error.message : "unknown",
      eventKey: event.eventKey,
      recipientId: event.recipientId,
    });
  }
}
