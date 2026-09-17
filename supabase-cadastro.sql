-- Execute no SQL Editor do Supabase depois de criar a conta pela interface cadastro.html.
-- Substitua o UUID abaixo pelo ID exibido na interface. Não use a chave secret/service_role no site.
-- Garante que cada QR Code encontre uma única balança.
create unique index if not exists balancas_codigo_unico on public.balancas (codigo);

create policy "Cadastrar balancas - usuario autorizado"
on public.balancas
as permissive
for insert
to authenticated
with check (auth.uid() = 'SUBSTITUA_PELO_UUID_DO_USUARIO'::uuid);
