# Claude 交接给 Codex：需求页边界重构结果

**日期：** 2026-06-26
**作者：** Claude
**对应任务书：** `docs/agent-handoffs/2026-06-26-claude-domain-refactor.md`
**契约文档：** `docs/api/2026-06-26-demand-domain-boundary.md`
**分支：** `claude/domain-page-boundary`

---

## 1. 完成范围

把「需求发布」和「需求详情」这条边界上的业务逻辑从页面抽到 `lib/domain/demands/**`，页面只保留薄适配器。未碰 schema、迁移、类型、组件、部署、产品页。

- 需求创建：解析 / 校验 / 建草稿 / 提交审核 → `lib/domain/demands/form.ts`
- 需求详情：published + 未暂停可见性规则 → `lib/domain/demands/service.ts`
- 两个页面降为 thin adapter；API 路由 `app/api/demands/route.ts` 本就合规，未改

## 2. 分支

- `claude/domain-page-boundary` 已创建并切换（`git switch -c` 成功）。
- 改动均在工作树中、**尚未提交**（原因见第 6 节）。

## 3. commit 列表

无。提交被 `.git/index.lock` 阻塞，详见第 6 节。

## 4. 变更文件

| 文件 | 变更 | 对本任务是否干净 |
|---|---|---|
| `lib/domain/demands/form.ts` | 新增：`DemandFormFields`、`CreateDemandFromFormResult`、`createAndSubmitDemandFromForm` | 干净（新文件） |
| `lib/domain/demands/service.ts` | 新增 `getPublishedDemandDetail`（+27 行）；vs HEAD 为纯增量 | 干净 |
| `app/(workspace)/workspace/customer/demands/new/page.tsx` | server action 改为薄适配器，删除 5 个解析 helper | **夹带旧改动**（含上一轮 digital_employee 预填） |
| `app/(marketing)/demands/[id]/page.tsx` | 改为调用 `getPublishedDemandDetail`，不再直接查 Supabase | **夹带旧改动**（含上一轮 digital_employee 标签） |
| `app/api/demands/route.ts` | 未改 | — |
| `lib/db/types.ts`、`supabase/migrations/**` | 未改 | — |
| `docs/api/2026-06-26-demand-domain-boundary.md` | 新增契约文档 | 干净（新文件） |

## 5. 运行过的命令与结果

| 命令 | 结果 |
|---|---|
| `node_modules/.bin/tsc --noEmit` | exit 0 ✅ |
| `node_modules/.bin/eslint <4 个改动文件>` | exit 0 ✅ |

## 6. 跳过的命令及原因

- `git add` / `git commit`：被 `.git/index.lock` 阻塞。`git add` 报
  `fatal: Unable to create '.git/index.lock': File exists`；`rm -f .git/index.lock`
  在本沙箱返回 `Operation not permitted`，无法删除。需在可删 lock 的环境提交。
- `pnpm exec supabase gen types` / `lint` / `typecheck` / `test` / `build` / `supabase db reset`：
  本沙箱无 Docker、原生二进制平台不匹配，无法运行；按分工归 Codex 在集成阶段执行。

## 7. 已知风险与假设

1. **提交隔离（重要）**：工作树本就带着上一轮大量未提交改动（登录改密码、AI 应用市场、数字员工等）。其中 `new/page.tsx` 与 `[id]/page.tsx` 同时包含旧的 digital_employee 改动 + 本次边界重构；直接 `git add` 会一并带入。建议：**先落定基线（参考根目录 `commit-session.sh`），再单独提交本任务的干净文件**：`form.ts`、`service.ts`、`docs/api/2026-06-26-demand-domain-boundary.md`，以及两个页面文件（接受其夹带旧改动，或在基线已含 digital_employee 后页面 diff 即变干净）。
2. **行为等价**：发需求的校验规则与错误重定向（`?error=invalid` / `?error=create_failed` / `/login` / `?submitted=1`）与原页面逐项一致；预算非正数仍由下游 Zod 归为 `create_failed`，行为未变。
3. **类型无漂移假设**：本任务无 schema 改动，`supabase gen types` 预期与现状一致，请在集成时确认。
4. **边界遵守**：仅改 server action 体与 `lib/domain/demands/**`，未碰 JSX、样式、组件、部署、产品页。

## 8. 建议的 Codex 接手步骤

```bash
# 1. 清除残留锁（在本机/有权限环境）
rm -f .git/index.lock

# 2. 先落定基线（见根目录 commit-session.sh），使工作树回到干净起点

# 3. 在本分支提交本任务干净文件
git switch claude/domain-page-boundary
git add lib/domain/demands/form.ts \
        lib/domain/demands/service.ts \
        docs/api/2026-06-26-demand-domain-boundary.md \
        "app/(workspace)/workspace/customer/demands/new/page.tsx" \
        "app/(marketing)/demands/[id]/page.tsx"
git commit -m "feat(domain): extract demand publish + detail logic into lib/domain"

# 4. 集成检查
pnpm exec supabase gen types typescript --local > lib/db/types.ts
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

集成验收建议手动核对：发需求成功/校验失败/未登录跳转、需求详情对已发布可见、对未发布/已暂停/不存在返回 notFound、digital_employee 入口仍预选类型。
