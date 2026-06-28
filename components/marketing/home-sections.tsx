import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  ["01", "说清需求", "描述目标、预算和交付时间，提交后等待平台审核。"],
  ["02", "比较报价", "查看开发者方案、价格、工期和公开资料。"],
  ["03", "全额付款", "确认开发者后按订单金额一次性付款，再开始履约。"],
  ["04", "交付验收", "在订单中接收交付物，选择验收或发起争议处理。"],
];

const digitalEmployees = [
  ["AI 客服员工", "接待咨询、回答产品问题、收集线索并转交人工。"],
  ["AI 销售助理", "跟进意向客户、整理沟通记录、生成跟进提醒。"],
  ["AI 运营助手", "生成内容初稿、汇总数据、产出日报周报。"],
  ["AI 数据处理员", "从单据、表格、邮件中抽取结构化数据并入库。"],
];

const entries: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}[] = [
  {
    eyebrow: "找开发者定制",
    title: "雇佣 AI 开发者",
    description:
      "发布软件、小程序、网站需求，由认证开发者报价并定制开发，全过程在订单内留痕。",
    href: "/workspace/customer/demands/new",
    cta: "发布开发需求",
  },
  {
    eyebrow: "按岗位定制",
    title: "定制 AI 数字员工",
    description:
      "定制你的 AI 销售员工、AI 客服员工、AI 运营员工等，由认证开发者按业务实现。",
    href: "/digital-employees",
    cta: "了解数字员工",
  },
  {
    eyebrow: "即买即用",
    title: "AI 应用市场",
    description:
      "选购开发者上架、经平台审核的现成 AI 应用与工具，付款后获取授权码或访问链接。",
    href: "/products",
    cta: "逛 AI 应用市场",
  },
];

export function HomeSections() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">AI 开发服务交易平台</span>
          <h1>
            找到靠谱开发者，
            <span>把程序真正做出来。</span>
          </h1>
          <p>
            从需求审核、方案报价到交付验收，码上好把软件项目的关键过程留在同一个订单里。
          </p>
          <div className="hero-actions">
            <Button href="/workspace/customer/demands/new">发布开发需求</Button>
            <Button href="/developers" variant="secondary">
              浏览开发者
            </Button>
          </div>
          <div className="trust-row">
            <span>需求先审核</span>
            <span>开发者需认证</span>
            <span>订单过程留痕</span>
          </div>
        </div>

        <Card className="hero-panel">
          <div className="hero-panel-header">
            <span>合作流程示意</span>
            <span className="live-dot">规则透明</span>
          </div>
          <div className="project-summary">
            <span className="project-icon">AI</span>
            <div>
              <strong>需求、报价与交付集中管理</strong>
              <p>示意界面，不代表真实成交订单</p>
            </div>
          </div>
          <div className="process-preview">
            <span>需求已审核</span>
            <span>选择有效报价</span>
            <span>订单内完成交付</span>
            <span>客户确认验收</span>
          </div>
          <p className="panel-note">
            平台支付能力上线前，仅开放内容浏览和模拟订单联调。
          </p>
        </Card>
      </section>

      <section className="content-section" id="entries">
        <div className="section-heading">
          <div>
            <span className="eyebrow">三种主流方式</span>
            <h2>无论定制还是即用，都能在这里开始</h2>
          </div>
          <p>找开发者定制、按岗位定制数字员工，或直接选购现成 AI 应用。</p>
        </div>
        <div className="step-grid">
          {entries.map((entry) => (
            <Card className="step-card" key={entry.title}>
              <span className="eyebrow">{entry.eyebrow}</span>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <Button href={entry.href}>{entry.cta}</Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="content-section" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">清楚的合作流程</span>
            <h2>每一步都知道接下来做什么</h2>
          </div>
          <p>首版坚持全额付款、一次正式验收和一次结算，让交易规则保持简单。</p>
        </div>
        <div className="step-grid">
          {steps.map(([number, title, description]) => (
            <Card className="step-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="content-section" id="digital-employees">
        <div className="section-heading">
          <div>
            <span className="eyebrow">定制数字员工</span>
            <h2>把重复工作交给定制的数字员工</h2>
          </div>
          <p>
            描述你想要的岗位，由认证开发者按业务定制实现，仍走需求审核、报价、下单和交付验收流程。
          </p>
        </div>
        <div className="step-grid">
          {digitalEmployees.map(([name, description]) => (
            <Card className="step-card" key={name}>
              <h3>{name}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
        <div className="hero-actions">
          <Button href="/digital-employees">了解定制数字员工</Button>
          <Button
            href="/workspace/customer/demands/new?type=digital_employee"
            variant="secondary"
          >
            直接定制
          </Button>
        </div>
      </section>

      <section className="content-section audience-section">
        <Card className="audience-card audience-card-customer">
          <span className="eyebrow">我要找开发者</span>
          <h2>有想法，但不想被技术细节绕晕</h2>
          <p>发布需求后比较方案与报价，在订单内查看沟通、文件和交付记录。</p>
          <Button href="/workspace/customer/demands/new">开始发布需求</Button>
        </Card>
        <Card className="audience-card audience-card-developer">
          <span className="eyebrow">我要接项目</span>
          <h2>让 AI 开发能力变成可信的服务</h2>
          <p>完善公开资料、提交报价、管理履约，并在客户验收后等待结算。</p>
          <Button href="/workspace/settings" variant="secondary">
            申请开发者认证
          </Button>
        </Card>
      </section>
    </main>
  );
}

