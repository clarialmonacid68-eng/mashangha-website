# 码上好交易平台工程审核报告

审核日期：2026-06-25  
审核分支：`feature/marketplace-platform`  
审核提交：`f6927a0a2bd17aab774b0df61b09d20b8efc4a43`  
审核范围：当前已提交实现，以及工作区内尚未提交的“数字员工”前台改动、腾讯云部署材料、审计报告改动和本地生成目录  
审核方法：差异审查、关键代码阅读、数据库约束核验、静态检查、TypeScript、Vitest、Next.js 构建、Playwright 尝试运行、仓库卫生检查

## 1. 审核结论

工程师当前已完成第一阶段模拟交易平台的大部分基础能力，并在此基础上新增了“定制数字员工”的获客入口：公开页面、导航、首页模块、需求市场筛选项、需求表单预填和项目类型展示均已接入。该新增方向整体复用了现有“发布需求 -> 审核 -> 报价 -> 下单 -> 交付验收”的平台闭环，产品定位上没有直接宣称开箱即用或真实支付能力，这一点是正确的。

但本次审核不能给出“完整正确、可交付上线”的结论。当前至少存在三个阻断级问题：

- 新增的 `digital_employee` 项目类型只改了应用层 schema 和页面选项，没有同步数据库约束；真实创建该类需求会被 `demands_project_type_known` check constraint 拒绝。
- 常规 `pnpm verify` 和默认 `pnpm test` 已被工作区内 `.worktrees/`、`.pnpm-store/` 污染，默认门禁不再可信。
- Playwright 端到端测试在本次审核中无法给出有效通过证据：沙箱内无法监听端口；提升权限后全量和公开页子集均长时间无输出，已人工中止。

因此，诚信判断如下：

| 范围 | 结论 |
|---|---|
| 第一阶段本地模拟交易平台 | 代码基础基本存在，但本次未取得完整默认门禁通过证据 |
| “数字员工”营销入口 | 页面/表单接入基本完成，但写库路径不完整 |
| 当前工作区可合并性 | 不通过，需要先修复数据库迁移和测试/忽略配置 |
| 公网或生产试运营 | 不通过，真实支付、域名、HTTPS、生产认证和运维门禁仍不能视为完成 |
| 真实资金交易 | 禁止上线，当前仍是 mock payment 阶段 |

## 2. Fresh Verification Evidence

以下命令均为本次审核重新运行，不引用旧报告结论。

| 验证项 | 结果 | 审核判断 |
|---|---:|---|
| `git status --short` | 多个 tracked 修改与 untracked 文件/目录 | 工作区未收敛，交付边界不完整 |
| `pnpm verify` | exit 1 | 默认门禁失败；ESLint 扫到 `.worktrees/production-domain-cutover/.next` 构建产物，产生 707 errors |
| `pnpm typecheck` | exit 0 | TypeScript 通过 |
| `pnpm exec eslint app components lib tests` | exit 0 | 根源码相关 lint 通过 |
| `pnpm test` | exit 1 | Vitest 扫到 `.worktrees/` 与 `.pnpm-store/` 测试副本，出现重复 Playwright 测试和 React invalid hook call |
| `pnpm exec vitest run --exclude .worktrees/** --exclude .pnpm-store/**` | exit 0；10 files passed，8 skipped；26 passed，32 skipped | 排除污染目录后，默认非数据库测试通过 |
| `pnpm build` | 沙箱内 exit 1；提升权限后 exit 0 | 沙箱内 Turbopack 绑定端口被拒；沙箱外构建通过，生成 37 个静态页面，包含 `/digital-employees` |
| Docker Postgres 约束查询 | exit 0 | `demands_project_type_known` 仍只允许 `ai_app/mini_program/website/automation/other` |
| `pnpm test:e2e` | 沙箱内 exit 1；提升权限后长时间无结果，人工 Ctrl-C，exit 130 | 本次无法证明 E2E 通过 |
| `playwright test tests/e2e/public-pages.spec.ts --workers=1 --timeout=30000` | 提升权限后长时间无结果，人工 Ctrl-C，exit 130 | 公开页 E2E 子集也未取得通过证据 |

## 3. 已完成工作核验

### 3.1 既有平台能力

从代码结构、测试和旧审计材料看，当前仓库已经具备以下第一阶段模拟交易平台能力：

- Next.js 16 + TypeScript + Supabase 的主工程结构。
- 公开站、工作台、后台、需求市场、开发者市场和规则页。
- 邮箱/手机号登录、本地同账号认证路径、角色切换。
- 开发者申请、后台审核、需求创建、需求审核发布、公开需求查询。
- 报价、选标、模拟支付、订单协作、交付、验收、评价、争议和模拟退款。
- 站内通知、订单文件授权、基础风控与审计。
- Supabase migrations、RLS、RPC 与本地测试覆盖。

这些能力仍应被表述为“模拟交易闭环”或“第一阶段本地闭环”，不能表述为真实资金担保交易平台。

### 3.2 本次新增的“数字员工”能力

本次工作区新增/修改显示工程师已完成：

- 新增 `/digital-employees` 营销页，列出 AI 客服、AI 销售助理、AI 运营助手、AI 数据处理员等定制入口。
- 首页增加“定制数字员工”区块。
- Header 增加“数字员工”导航。
- Sitemap 增加 `/digital-employees`。
- 需求创建页支持 `?type=digital_employee` 和 `?title=...` 预填。
- 需求市场筛选增加“数字员工定制”选项。
- 需求详情页使用 `demandProjectTypeLabels` 显示中文项目类型。
- Footer 增加备案号链接。

产品方向本身合理，但工程实现没有完整闭合到数据库层。

## 4. 主要问题

### P0-1：`digital_employee` 没有数据库迁移，新增需求类型真实落库会失败

**证据**

- 应用层 `lib/domain/demands/schema.ts` 已把 `digital_employee` 加入 `demandProjectTypes`。
- 页面层 `app/(workspace)/workspace/customer/demands/new/page.tsx` 已允许该类型作为 `<select>` 选项和 URL 预填值。
- 本地数据库约束查询结果：

```sql
CHECK ((project_type = ANY (ARRAY[
  'ai_app'::text,
  'mini_program'::text,
  'website'::text,
  'automation'::text,
  'other'::text
])))
```

**影响**

用户从 `/digital-employees` 点击“定制这个数字员工”后，表单会提交 `projectType=digital_employee`。应用层校验会通过，但数据库 insert/update 会被 check constraint 拒绝，用户看到的是提交失败。该功能不能算完成。

**建议**

新增 Supabase migration，安全更新 `demands_project_type_known` 约束，把 `digital_employee` 纳入允许值；同时增加集成测试覆盖 `createDemandDraft(... projectType: "digital_employee")`。若生产库已手工执行过迁移，还需同步生产约束和迁移历史。

### P1-1：默认验证门禁被 `.worktrees/` 和 `.pnpm-store/` 污染

**证据**

- `pnpm verify` 在 ESLint 阶段扫描 `.worktrees/production-domain-cutover/.next`，报出构建产物中的 `no-require-imports`、`no-this-alias`、`ban-ts-comment` 等错误，exit 1。
- `pnpm test` 和显式 `vitest run tests...` 仍扫描 `.worktrees/production-domain-cutover/tests` 与 `.pnpm-store/v11/projects/.../tests`，导致重复测试、Playwright 测试被 Vitest 误收集、React invalid hook call。
- `.gitignore` 已包含 `.worktrees/`，但 ESLint/Vitest 不会自动把 gitignore 当作测试发现排除规则；`.pnpm-store/` 当前未忽略。

**影响**

工程师无法用默认命令判断当前代码是否可交付；CI 如果复用这些命令，也会因本地目录污染失败。更严重的是，真实失败和污染失败混在一起，会降低团队对测试信号的信任。

**建议**

在 `eslint.config.mjs` 与 `vitest.config.ts` 显式排除 `.worktrees/**`、`.pnpm-store/**`、`.next/**`、`playwright-report/**`、`test-results/**`；把 `.pnpm-store/` 加入 `.gitignore`。之后重新运行默认 `pnpm verify`，必须 exit 0 才能称为门禁恢复。

### P1-2：Playwright 本次没有通过证据

**证据**

- 沙箱内 `pnpm test:e2e` 因 `listen EPERM: operation not permitted 0.0.0.0:3000` 无法启动 dev server。
- 提升权限后 `pnpm test:e2e` 长时间无输出、无退出，人工 Ctrl-C，exit 130。
- 提升权限后公开页子集 `tests/e2e/public-pages.spec.ts --workers=1 --timeout=30000` 同样长时间无输出，人工 Ctrl-C，exit 130。

**影响**

本次审核不能证明浏览器端到端链路可用。即便 Next.js build 通过，也不能据此推断登录、需求发布、数字员工公开页、选标和订单流在浏览器中稳定可用。

**建议**

先确认 Playwright webServer 是否复用了已挂起的 `pnpm dev`，清理旧进程和报告目录；改用 `reporter=list` 或 `--debug` 获取实时输出；为公开页新增 `/digital-employees` 断言后单独跑通；再恢复全量 E2E。

### P1-3：工作区未收敛，交付物边界不清

**证据**

当前 `git status --short` 显示：

- tracked 修改：`.gitignore`、多个 marketing/workspace 页面、`app/globals.css`、`app/sitemap.ts`、`components/marketing/*`、`docs/reviews/2026-06-16-marketplace-platform-audit.md`、`lib/domain/demands/schema.ts`。
- untracked：`.deployignore`、`.env.production.example`、`.pnpm-store/`、`app/(marketing)/digital-employees/`、`commit-session.sh`、`docs/deployment/`、`docs/reviews/2026-06-19-marketplace-platform-audit.md`、`ecosystem.config.cjs`。

**影响**

无法从当前 HEAD 重建工程师声称完成的状态；部署材料、报告和功能改动尚未形成可审计提交。`.pnpm-store/` 是本地依赖缓存，不应进入交付边界。

**建议**

按功能拆分提交：先修复并提交数字员工完整闭环，再提交部署材料，再提交审计/文档；清理或忽略本地缓存目录。提交前必须重新跑默认门禁。

### P1-4：`commit-session.sh` 的说明不可信，且会误导提交

**证据**

- 脚本称“数字员工无新迁移，无需 supabase db reset”，但本次已确认新增类型必须有数据库迁移。
- 脚本会批量提交部署材料和报告，但当前部署材料仍有旧审计指出的生产迁移、IP 登录、runbook 状态不一致风险。
- 脚本结尾声称剩余项应只剩 `.claude/`、`__pycache__/`、`next-env.d.ts` 等，和当前实际 `.pnpm-store/`、多项 untracked 文件不符。

**影响**

如果工程师直接运行脚本，可能把不完整功能和未验证部署材料一次性提交，形成错误历史。

**建议**

在修复迁移与门禁前不要运行该脚本；要么删除，要么改成只打印待处理项，不自动提交。

### P2-1：README 和旧审计/部署文档仍需统一事实源

此前旧报告已指出 README 与当前 Next.js/Supabase 工程严重不一致，部署文档也存在 IP、域名、生产 Supabase 状态互相矛盾的问题。本次工作区仍保留旧审计报告修改和未跟踪部署文档，说明文档事实源尚未完全收敛。

**建议**

把 README 改成当前工程入口：技术栈、环境变量、Supabase reset、测试命令、部署入口、mock payment 限制、生产未完成项。部署 runbook 应按“已完成/已验证/未完成/阻塞”重写。

### P2-2：生产真实支付和生产运维仍未完成

当前支付 provider 类型和实现仍是 mock；真实微信支付下单、回调验签、退款、分账、对账、生产监控、告警、备份恢复、HTTPS、域名解析、生产 Auth 回调均不能视为已完成。本报告没有发现可以改变这一结论的新证据。

## 5. 正向发现

- 数字员工定位没有绕开现有交易闭环，而是复用需求、报价、订单、交付流程，产品架构方向正确。
- 新增页面文案明确“定制开发”“真实支付上线前仅开放需求登记与模拟订单流程”，没有把 mock 阶段包装成真实支付。
- 根源码相关 `eslint app components lib tests` 通过。
- `pnpm typecheck` 通过。
- 排除污染目录后，默认非数据库 Vitest 通过：10 files passed，8 skipped；26 passed，32 skipped。
- 提升权限后 `pnpm build` 通过，Next.js 生成 37 个静态页面，新增 `/digital-employees` 已进入构建产物。
- `.env.production.example` 仍是占位模板，未在本次检查中发现它包含真实生产密钥。

## 6. 建议修复顺序

1. 立即补 `digital_employee` 数据库迁移和集成测试。
2. 在 ESLint/Vitest 配置中排除 `.worktrees/**`、`.pnpm-store/**` 等本地/生成目录，并把 `.pnpm-store/` 加入 `.gitignore`。
3. 清理本地挂起 dev/playwright 进程，恢复 `pnpm test:e2e` 可观察输出，并至少跑通公开页和主交易流。
4. 重新运行默认 `pnpm verify`，必须拿到 exit 0。
5. 更新 README、部署 runbook 和旧审计报告，消除与当前状态不一致的描述。
6. 审核后再分组提交数字员工功能、部署材料和文档，不要使用当前 `commit-session.sh` 直接批量提交。

## 7. 诚信声明

本报告没有把“构建通过”扩大解释成“端到端通过”，也没有把“页面选项存在”扩大解释成“功能完成”。本次发现的 `digital_employee` 数据库约束缺口会直接影响真实用户提交需求，必须作为阻断问题处理。报告未修改业务代码、未提交或推送任何变更；本文件是本次审核新增的仓库内报告。
