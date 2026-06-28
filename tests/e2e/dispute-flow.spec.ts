import { expect, test } from "@playwright/test";

import { openOrderDispute, resolveDisputeAsFullRefund } from "@/lib/domain/disputes/service";
import { rejectOrderDelivery } from "@/lib/domain/orders/service";
import {
  approveDeveloper,
  createAdminClient,
  createDirectOrder,
  createSignedInUser,
} from "./marketplace-flow-helpers";

test("customer rejects delivery, opens dispute and admin resolves full refund", async () => {
  const admin = createAdminClient();
  const customer = await createSignedInUser(admin, "customer");
  const developer = await createSignedInUser(admin, "developer");
  await approveDeveloper(admin, developer.userId);
  const order = await createDirectOrder(admin, {
    customerId: customer.userId,
    developerId: developer.userId,
    status: "delivered",
  });

  const rejected = await rejectOrderDelivery(
    customer.client,
    order.id,
    "交付缺少部署说明，请补充后重新提交。",
  );
  await admin.from("orders").update({ status: "delivered" }).eq("id", order.id);
  const dispute = await openOrderDispute(customer.client, order.id, {
    reason: "重新交付后仍缺少关键部署说明，要求全额退款。",
    requestedResolution: "refund",
  });
  const resolution = await resolveDisputeAsFullRefund(admin, dispute.id, {
    adminId: customer.userId,
    notes: "证据支持客户诉求，裁决全额退款。",
  });

  expect(rejected.status).toBe("in_progress");
  expect(dispute.status).toBe("open");
  expect(resolution.dispute.status).toBe("resolved_refund");
  expect(resolution.order.status).toBe("refund_review");
});
