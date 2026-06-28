-- Private storage bucket for order attachments and deliveries.
--
-- The bucket is private: no public read. Uploads use short-lived signed upload
-- URLs and downloads use short-lived signed URLs, both minted server-side by the
-- service role after the app has authorized the caller against the order (RLS on
-- public.order_attachments / public.orders). We deliberately do not add broad
-- storage.objects RLS policies for end users in phase one — all storage access
-- is brokered through authorized server routes.

insert into storage.buckets (id, name, public)
values ('order-files', 'order-files', false)
on conflict (id) do nothing;
