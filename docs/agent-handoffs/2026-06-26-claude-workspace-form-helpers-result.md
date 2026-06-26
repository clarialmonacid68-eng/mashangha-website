# Claude 交接给 Codex：工作台表单解析下沉（第五轮）

**日期：** 2026-06-26
**分支：** `claude/domain-page-boundary`
**上游交接：** `2026-06-26-codex-admin-remaining-pages-integration.md`

---

## 1. 完成范围

按 Codex 建议，把工作台页面里的表单解析/换算逻辑下沉到各自 domain 的 form helper，页面只保留 FormData 提取 + 调用服务 + redirect。保持小颗粒。

- **`developer/demands` 报价**：`submitQuote` 中的金额换算（元→分）与有效期换算（`Math.max(1, validDays)` 天 → 绝对 `expiresAt`）下沉到 `lib/domain/quotes/form.ts`。
- **`orders/[id]` 附件**：`optionalAttachment` 的 trim / 空判断 / size 与 contentType 强转下沉到 `lib/domain/orders/form.ts`。
- **`developer/products` 上架**：核查认定**已合规**——`submitProduct` 没有内联换算，价格元→分与校验都在 `createProductForReview`（domain）里完成，页面仅做 FormData 提取（边界规则允许）。本轮未改，详见第 7 节。

## 2. 本轮改动

- 新增 `lib/domain/quotes/form.ts`：`QuoteFormFields` + `createQuoteFromForm(supabase, demandId, fields)`。承担换算，校验仍由 `createQuote`（Zod）抛出，页面 catch 后透传具体错误信息（保留原 UX）。
- 新增 `lib/domain/orders/form.ts`：`OrderAttachmentFields` + `parseOptionalOrderAttachment(fields)`，返回附件数组或空数组。
- `developer/demands` 的 `submitQuote`：改为读 4 个原始字段 → `createQuoteFromForm`。
- `orders/[id]` 的 `optionalAttachment`：改为读字段 → `parseOptionalOrderAttachment`（两处调用 `postMessage` / `deliverOrder` 不变）。

## 3. 修改文件列表

| 文件 | 变更 |
|---|---|
| `lib/domain/quotes/form.ts` | 新增 |
| `lib/domain/orders/form.ts` | 新增 |
| `app/(workspace)/workspace/developer/demands/page.tsx` | `submitQuote` 改薄适配器，移除内联换算，改导入 `createQuoteFromForm` |
| `app/(workspace)/workspace/orders/[id]/page.tsx` | `optionalAttachment` 改为调用 `parseOptionalOrderAttachment`，新增 import |
| `app/(workspace)/workspace/developer/products/page.tsx` | 未改（核查后认定已合规） |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 |

## 4. commit 列表

无法在本沙箱提交：`.git/index.lock` 残留且无权删除（`git add` 报 exit 128）。改动在 `claude/domain-page-boundary` 工作树中、未提交。

建议提交命令（本机执行）：

```bash
rm -f .git/index.lock
git switch claude/domain-page-boundary
git add lib/domain/quotes/form.ts \
        lib/domain/orders/form.ts \
        "app/(workspace)/workspace/developer/demands/page.tsx" \
        "app/(workspace)/workspace/orders/[id]/page.tsx" \
        docs/agent-handoffs/2026-06-26-claude-workspace-form-helpers-result.md
git commit -m "feat(domain): extract quote + order-attachment form parsing into lib/domain"
```

## 5. 运行过的命令和结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint <两页 + 两个 form helper>` | exit 0 ✅ |

## 6. 未运行命令及原因

- `git add` / `git commit`：`.git/index.lock` 残留、沙箱无权删。
- `pnpm gen types / lint / typecheck / test / build / supabase`：沙箱无 Docker、原生二进制平台不匹配；按分工归 Codex 集成执行。

## 7. 需要 Codex 集成验证的事项

1. `developer/demands` 报价：金额（元→分，取整）、工期、有效期（至少 1 天）换算与下沉前一致；校验失败仍透传具体错误信息到 `?error=`。
2. `orders/[id]`：留言/交付附件——填了名称+路径才带附件，size/contentType 正确；空则不带附件（与原行为一致）。
3. `developer/products` 未改，回归应无变化。
4. 本轮无 schema 改动，`supabase gen types` 预期无漂移。
5. 建议补单测：`createQuoteFromForm`（validDays=0 → expiresAt ≥ 现在+1 天；amountYuan 取整）与 `parseOptionalOrderAttachment`（缺名称/路径 → 空数组）。

## 8. 下一轮建议

- 工作台与后台的「页面内联业务逻辑」基本清理完毕（需求、报价、订单支付确认、订单附件、后台审核/治理/争议分派均已下沉）。剩余页面 server action 大多是「读表单 → 调 domain → redirect」的合规薄适配器。
- 后续可转向：① 把公开/后台页面里直接的 `.from(...)` 只读列表查询统一为 domain 的 list 服务（读路径下沉，价值中等）；② 转入真实支付前置（微信支付适配器骨架）等更有业务价值的后端模块——但这些依赖外部准入，按既定口径保持 blocked。
