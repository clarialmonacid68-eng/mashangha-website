import { z } from "zod";

const requiredText = (message: string, min = 1) =>
  z.string().trim().min(min, message);

export const developerApplicationSchema = z.object({
  displayName: requiredText("请填写姓名或品牌名", 2).max(80),
  city: requiredText("请填写所在城市", 2).max(80),
  bio: requiredText("请填写简介", 20).max(800),
  skills: z
    .array(requiredText("技能不能为空").max(40))
    .min(1, "请至少填写一项技能")
    .max(12),
  serviceScopes: z
    .array(requiredText("服务范围不能为空").max(60))
    .min(1, "请至少填写一项服务范围")
    .max(12),
  startingPriceCents: z
    .number()
    .int("起步价必须是整数")
    .min(0, "起步价不能小于 0"),
  portfolio: z.object({
    title: requiredText("请填写作品标题", 2).max(120),
    description: requiredText("请填写作品说明", 10).max(500),
    url: z.url("作品链接格式不正确"),
    imageUrl: z.url("作品图片链接格式不正确"),
  }),
  contact: requiredText("请填写联系方式", 3).max(120),
  payoutSubjectType: z.enum(["individual", "company"], {
    error: "请选择收款主体类型",
  }),
  payoutSubjectName: requiredText("请填写收款主体名称", 2).max(120),
});

export type DeveloperApplicationInput = z.input<
  typeof developerApplicationSchema
>;
export type DeveloperApplication = z.output<
  typeof developerApplicationSchema
>;

export function parseDeveloperApplication(input: DeveloperApplicationInput) {
  const result = developerApplicationSchema.safeParse(input);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "开发者资料不完整");
  }

  return result.data;
}
