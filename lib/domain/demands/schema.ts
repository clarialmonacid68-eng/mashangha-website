import { z } from "zod";

const requiredText = (message: string, min = 1) =>
  z.string().trim().min(min, message);

export const demandProjectTypes = [
  "ai_app",
  "digital_employee",
  "mini_program",
  "website",
  "automation",
  "other",
] as const;

export const demandProjectTypeLabels: Record<
  (typeof demandProjectTypes)[number],
  string
> = {
  ai_app: "AI 应用",
  digital_employee: "数字员工定制",
  mini_program: "小程序",
  website: "网站建设",
  automation: "自动化工具",
  other: "其他",
};

export const cooperationModes = [
  "fixed_scope",
  "hourly",
  "consulting",
] as const;

export const demandInputSchema = z
  .object({
    title: requiredText("请填写需求标题", 4).max(120),
    projectType: z.enum(demandProjectTypes, {
      error: "请选择项目类型",
    }),
    description: requiredText("请填写详细描述", 20),
    budgetMinCents: z
      .number()
      .int("预算必须是整数")
      .positive("预算必须大于 0"),
    budgetMaxCents: z
      .number()
      .int("预算必须是整数")
      .positive("预算必须大于 0"),
    expectedDeliveryDays: z
      .number()
      .int("期望周期必须是整数")
      .positive("期望周期必须大于 0"),
    cooperationMode: z.enum(cooperationModes, {
      error: "请选择合作方式",
    }),
    attachments: z
      .array(
        z.object({
          fileName: requiredText("附件名称不能为空"),
          storagePath: requiredText("附件路径不能为空"),
          contentType: z.string().trim().optional().nullable(),
          sizeBytes: z.number().int().min(0, "附件大小不能小于 0"),
        }),
      )
      .max(10)
      .default([]),
  })
  .refine((value) => value.budgetMinCents <= value.budgetMaxCents, {
    message: "预算下限不能高于预算上限",
    path: ["budgetMaxCents"],
  });

export const demandFiltersSchema = z.object({
  projectType: z.enum(demandProjectTypes).optional(),
  budgetMaxCents: z.number().int().positive().optional(),
  maxDeliveryDays: z.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  publishedWithinDays: z.number().int().positive().optional(),
});

export type DemandInput = z.input<typeof demandInputSchema>;
export type DemandFilters = z.input<typeof demandFiltersSchema>;

export function parseDemandInput(input: DemandInput) {
  const result = demandInputSchema.safeParse(input);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "需求资料不完整");
  }

  return result.data;
}

export function parseDemandFilters(input: DemandFilters) {
  return demandFiltersSchema.parse(input);
}
