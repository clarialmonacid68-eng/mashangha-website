-- Allow service-role admin workflows to review and publish products.
--
-- The product marketplace uses normal RLS for buyers and sellers. Admin review
-- actions run through the server-side service client, so PostgREST still needs
-- explicit table privileges even though RLS is bypassed for service_role.
grant select, update on public.products to service_role;
