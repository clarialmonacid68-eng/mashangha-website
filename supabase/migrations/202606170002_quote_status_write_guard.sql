-- Restrict quote UPDATE policy so developers can only withdraw their own active quotes.
-- Previously the with check only verified ownership, allowing status to be set to any
-- value including 'selected' — bypassing the select_quote_for_order RPC entirely.
drop policy if exists "developers can update their active quotes" on public.quotes;

create policy "developers can withdraw their active quotes"
on public.quotes for update
to authenticated
using (developer_id = auth.uid() and status = 'active')
with check (developer_id = auth.uid() and status = 'withdrawn');
