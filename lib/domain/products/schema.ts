import { z } from "zod";

export const productCategories = [
  "ai_assistant",
  "ai_agent",
  "automation_tool",
  "template",
  "other",
] as const;

export const productCategoryLabels: Record<
  (typeof productCategories)[number],
  string
> = {
  ai_assistant: "AI 助手",
  ai_agent: "AI 智能体",
  automation_tool: "自动化工具",
  template: "模板 / 方案",
  other: "其他",
};

const requiredText = (message: string, min = 1) =>
  z.string().trim().min(min, message);

export const productInputSchema = z.object({
  title: requiredText("请填写产品标题", 4).max(120),
  summary: requiredText("请填写一句话简介", 4).max(200),
  description: requiredText("请填写详细介绍", 20),
  category: z.enum(productCategories, { error: "请选择产品类别" }),
  priceYuan: z.number().positive("价格必须大于 0"),
  // 交付内容：授权码或访问链接。仅卖家与购买者可见。
  fulfillment: requiredText("请填写交付内容（授权码或访问链接）"),
});

export type ProductInput = z.input<typeof productInputSchema>;

export function parseProductInput(input: ProductInput) {
  const result = productInputSchema.safeParse(input);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "产品资料不完整");
  }

  return result.data;
}
