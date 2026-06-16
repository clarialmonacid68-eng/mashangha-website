import type { NotificationAdapter } from "@/lib/notifications/types";

export class SmsNotificationAdapter implements NotificationAdapter {
  async send() {
    return;
  }
}
