import type {
  ExternalNotificationResult,
  InAppNotification,
  MarketplaceNotificationEvent,
  NotificationAdapter,
  NotificationChannel,
  NotificationRepository,
} from "@/lib/notifications/types";

const channelsByEvent: Record<
  MarketplaceNotificationEvent["type"],
  Exclude<NotificationChannel, "in_app">[]
> = {
  delivery_accepted: ["email"],
  delivery_submitted: ["email"],
  demand_reviewed: ["email"],
  dispute_opened: ["email", "sms"],
  message_created: [],
  payment_succeeded: ["email", "sms"],
  profit_share_updated: ["email"],
  quote_created: ["email"],
  quote_selected: ["email", "sms"],
  refund_updated: ["email", "sms"],
};

export class MemoryNotificationRepository implements NotificationRepository {
  readonly notifications: InAppNotification[] = [];

  async createInApp(
    event: MarketplaceNotificationEvent,
  ): Promise<InAppNotification> {
    const existing = this.notifications.find(
      (notification) =>
        notification.eventKey === event.eventKey &&
        notification.recipientId === event.recipientId,
    );

    if (existing) {
      return existing;
    }

    const notification: InAppNotification = {
      ...event,
      actorId: event.actorId ?? null,
      body: event.body ?? null,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      readAt: null,
    };
    this.notifications.push(notification);
    return notification;
  }
}

export async function dispatchMarketplaceNotification(input: {
  adapters?: Partial<
    Record<Exclude<NotificationChannel, "in_app">, NotificationAdapter>
  >;
  event: MarketplaceNotificationEvent;
  repository: NotificationRepository;
}) {
  const inApp = await input.repository.createInApp(input.event);
  const external: ExternalNotificationResult[] = [];

  for (const channel of channelsByEvent[input.event.type]) {
    const adapter = input.adapters?.[channel];

    if (!adapter) {
      external.push({ channel, status: "skipped" });
      continue;
    }

    try {
      await adapter.send({ ...input.event, channel });
      external.push({ channel, status: "sent" });
    } catch (error) {
      external.push({
        channel,
        error: error instanceof Error ? error.message : "通知发送失败",
        status: "failed",
      });
    }
  }

  return { external, inApp };
}
