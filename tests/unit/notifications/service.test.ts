import { describe, expect, it } from "vitest";

import {
  MemoryNotificationRepository,
  dispatchMarketplaceNotification,
} from "@/lib/notifications/service";
import type { NotificationAdapter } from "@/lib/notifications/types";

describe("marketplace notifications", () => {
  it("deduplicates in-app notifications by event and recipient", async () => {
    const repository = new MemoryNotificationRepository();

    const first = await dispatchMarketplaceNotification({
      event: {
        actorId: "actor-1",
        eventKey: "quote:quote-1:created",
        recipientId: "customer-1",
        title: "收到新报价",
        type: "quote_created",
      },
      repository,
    });
    const second = await dispatchMarketplaceNotification({
      event: {
        actorId: "actor-1",
        eventKey: "quote:quote-1:created",
        recipientId: "customer-1",
        title: "收到新报价",
        type: "quote_created",
      },
      repository,
    });

    expect(second.inApp.id).toBe(first.inApp.id);
    expect(repository.notifications).toHaveLength(1);
  });

  it("keeps in-app notification when email or sms adapters fail", async () => {
    const repository = new MemoryNotificationRepository();
    const failingAdapter: NotificationAdapter = {
      async send() {
        throw new Error("provider unavailable");
      },
    };

    const result = await dispatchMarketplaceNotification({
      adapters: {
        email: failingAdapter,
        sms: failingAdapter,
      },
      event: {
        actorId: "system",
        body: "订单已支付，开发者可以开始履约。",
        eventKey: "payment:order-1:succeeded",
        recipientId: "developer-1",
        title: "订单已支付",
        type: "payment_succeeded",
      },
      repository,
    });

    expect(result.inApp.title).toBe("订单已支付");
    expect(result.external).toEqual([
      {
        channel: "email",
        error: "provider unavailable",
        status: "failed",
      },
      {
        channel: "sms",
        error: "provider unavailable",
        status: "failed",
      },
    ]);
    expect(repository.notifications).toHaveLength(1);
  });

  it("uses configured external channels per marketplace event", async () => {
    const repository = new MemoryNotificationRepository();
    const sent: string[] = [];
    const adapter: NotificationAdapter = {
      async send(message) {
        sent.push(`${message.channel}:${message.title}`);
      },
    };

    await dispatchMarketplaceNotification({
      adapters: { email: adapter, sms: adapter },
      event: {
        actorId: "customer-1",
        eventKey: "delivery:order-1:submitted",
        recipientId: "customer-1",
        title: "开发者已提交交付",
        type: "delivery_submitted",
      },
      repository,
    });

    expect(sent).toEqual(["email:开发者已提交交付"]);
  });
});
