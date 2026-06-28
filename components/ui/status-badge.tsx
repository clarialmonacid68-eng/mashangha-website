const statusLabels = {
  pending_payment: "待付款",
  in_progress: "履约中",
  delivered: "待验收",
  accepted: "待结算",
  sharing: "结算中",
  completed: "已完成",
  closed: "已关闭",
  refund_review: "退款审核中",
  refunding: "退款处理中",
  refunded: "已退款",
  disputed: "争议中",
  share_failed: "结算失败",
} as const;

export type OrderStatus = keyof typeof statusLabels;

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`status-badge status-badge-${status}`}
      data-status={status}
    >
      {statusLabels[status]}
    </span>
  );
}
