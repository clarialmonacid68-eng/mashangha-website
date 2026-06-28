export type NotificationEventType =
  | "demand_reviewed"
  | "quote_created"
  | "quote_selected"
  | "payment_succeeded"
  | "message_created"
  | "delivery_submitted"
  | "delivery_accepted"
  | "refund_updated"
  | "dispute_opened"
  | "profit_share_updated";

export type NotificationChannel = "email" | "in_app" | "sms";

export type MarketplaceNotificationEvent = {
  actorId?: string | null;
  body?: string | null;
  eventKey: string;
  metadata?: Record<string, unknown>;
  recipientId: string;
  title: string;
  type: NotificationEventType;
};

export type InAppNotification = MarketplaceNotificationEvent & {
  createdAt: string;
  id: string;
  readAt: string | null;
};

export type NotificationMessage = MarketplaceNotificationEvent & {
  channel: Exclude<NotificationChannel, "in_app">;
};

export type NotificationAdapter = {
  send(message: NotificationMessage): Promise<void>;
};

export type ExternalNotificationResult = {
  channel: Exclude<NotificationChannel, "in_app">;
  error?: string;
  status: "sent" | "failed" | "skipped";
};

export type NotificationRepository = {
  createInApp(
    event: MarketplaceNotificationEvent,
  ): Promise<InAppNotification>;
};
