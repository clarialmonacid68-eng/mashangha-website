import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  ["01", "说清需求", "描述目标、预算和交付时间，平台先审核需求。"],
  ["02", "比较报价", "查看开发者方案、价格、工期和过往案例。"],
  ["03", "全额付款", "确认开发者后一次性付款，订单进入履约。"],
  ["04", "验收结算", "收到交付物并验收，通过后完成开发者结算。"],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
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
              <Button href="/demands/new">发布开发需求</Button>
              <Button href="/developers" variant="secondary">
                浏览开发者
              </Button>
            </div>
            <div className="trust-row">
              <span>需求先审核</span>
              <span>开发者需认证</span>
              <span>订单全程留痕</span>
            </div>
          </div>

          <Card className="hero-panel">
            <div className="hero-panel-header">
              <span>项目进度</span>
              <span className="live-dot">履约中</span>
            </div>
            <div className="project-summary">
              <span className="project-icon">AI</span>
              <div>
                <strong>企业知识库助手</strong>
                <p>Web 应用 · 预计 14 天</p>
              </div>
            </div>
            <div className="progress-track">
              <span />
            </div>
            <div className="project-metrics">
              <div>
                <span>已确认报价</span>
                <strong>¥ 8,800</strong>
              </div>
              <div>
                <span>最近更新</span>
                <strong>今天 14:30</strong>
              </div>
            </div>
            <div className="message-preview">
              <span className="avatar">周</span>
              <p>核心检索功能已完成，今天提交第一版演示。</p>
            </div>
          </Card>
        </section>

        <section className="content-section" id="how-it-works">
          <div className="section-heading">
            <div>
              <span className="eyebrow">清楚的合作流程</span>
              <h2>每一步都知道接下来做什么</h2>
            </div>
            <p>首版坚持全额付款、一次验收、一次结算，让交易规则足够简单。</p>
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

        <section className="content-section audience-section">
          <Card className="audience-card audience-card-customer">
            <span className="eyebrow">我要找开发者</span>
            <h2>有想法，但不想被技术细节绕晕</h2>
            <p>发布需求后比较方案与报价，在订单内查看沟通、文件和交付记录。</p>
            <Button href="/demands/new">开始发布需求</Button>
          </Card>
          <Card className="audience-card audience-card-developer">
            <span className="eyebrow">我要接项目</span>
            <h2>让 AI 开发能力变成可信的服务</h2>
            <p>展示作品、提交报价、管理履约，并在客户验收后获得结算。</p>
            <Button href="/developer/apply" variant="secondary">
              申请开发者认证
            </Button>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
