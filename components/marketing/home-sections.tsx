import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  ["01", "说清需求", "描述目标、预算和交付时间，提交后等待平台审核。"],
  ["02", "比较报价", "查看开发者方案、价格、工期和公开资料。"],
  ["03", "全额付款", "确认开发者后按订单金额一次性付款，再开始履约。"],
  ["04", "交付验收", "在订单中接收交付物，选择验收或发起争议处理。"],
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

