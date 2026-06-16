import { expect, test } from "@playwright/test";

import {
  acceptOrderDelivery,
  createOrderMessage,
  createOrderReview,
  submitOrderDelivery,
} from "@/lib/domain/orders/service";
import {
  approveDeveloper,
  createAdminClient,
  createDirectOrder,
  createSignedInUser,
} from "./marketplace-flow-helpers";

test("developer messages, delivers and customer accepts with review", async () => {
  const admin = createAdminClient();
  const customer = await createSignedInUser(admin, "customer");
  const developer = await createSignedInUser(admin, "developer");
  await approveDeveloper(admin, developer.userId);
  const order = await createDirectOrder(admin, {
    customerId: customer.userId,
    developerId: developer.userId,
    status: "in_progress",
  });

  await createOrderMessage(developer.client, order.id, {
    body: "我已经开始开发，会先提交一个可测试版本。",
  });
  const delivery = await submitOrderDelivery(developer.client, order.id, {
    deliveryUrl: "https://example.com/release",
    notes: "正式交付，包含源码、部署说明和测试账号。",
  });
  const accepted = await acceptOrderDelivery(customer.client, order.id);

  await admin
    .from("orders")
    .update({ completed_at: new Date().toISOString(), status: "completed" })
    .eq("id", order.id);
  const review = await createOrderReview(customer.client, order.id, {
    body: "交付清楚，沟通顺畅。",
    isPublic: true,
    rating: 5,
  });

  expect(delivery.version).toBe(1);
  expect(accepted.status).toBe("accepted");
  expect(review.rating).toBe(5);
});
