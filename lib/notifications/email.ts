import type { NotificationAdapter } from "@/lib/notifications/types";

export class EmailNotificationAdapter implements NotificationAdapter {
  async send() {
    return;
  }
}
