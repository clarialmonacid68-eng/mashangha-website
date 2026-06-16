import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { selectQuoteForOrder } from "@/lib/domain/quotes/service";
import { createClient } from "@/lib/auth/server";

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

async function selectQuote(formData: FormData) {
  "use server";

  const quoteId = String(formData.get("quoteId") ?? "");
  const demandId = String(formData.get("demandId") ?? "");
  const supabase = await createClient();

  try {
    await selectQuoteForOrder(supabase, quoteId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "选择报价失败";
    redirect(
      `/workspace/customer/demands/${demandId}/quotes?error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/workspace/customer/demands/${demandId}/quotes?selected=1`);
}

export default async function CustomerDemandQuotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; selected?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: demand } = await supabase
    .from("demands")
    .select("id, title, status")
    .eq("id", id)
    .single();

  if (!demand) {
    redirect("/workspace/settings");
  }

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, amount_cents, delivery_days, proposal, status, developer_id")
    .eq("demand_id", id)
    .order("amount_cents", { ascending: true });

  return (
    <div className="workspace-page">
      <div>
        <p className="eyebrow">客户工作台</p>
        <h1>收到的报价</h1>
        <p className="auth-intro">{demand.title}</p>
      </div>

      {query.error ? (
        <p className="auth-message">{decodeURIComponent(query.error)}</p>
      ) : null}
      {query.selected ? <p className="auth-message">已选择报价。</p> : null}

      {quotes?.length ? (
        <div className="workspace-list">
          {quotes.map((quote) => (
            <Card className="settings-card" key={quote.id}>
              <span className="status-badge">{quote.status}</span>
              <p>{quote.proposal}</p>
              <p>
                {currency.format(quote.amount_cents / 100)} /{" "}
                {quote.delivery_days} 天
              </p>
              {demand.status === "published" && quote.status === "active" ? (
                <form action={selectQuote}>
                  <input name="demandId" type="hidden" value={id} />
                  <input name="quoteId" type="hidden" value={quote.id} />
                  <Button type="submit">选择此报价</Button>
                </form>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="settings-card">
          <h2>还没有收到报价</h2>
          <p>需求发布后，开发者提交的方案会显示在这里。</p>
        </Card>
      )}
    </div>
  );
}
