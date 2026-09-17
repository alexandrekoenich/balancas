-- Execute no SQL Editor do Supabase.
-- Substitua TODAS as ocorrências de SUBSTITUA_PELO_UUID_DO_USUARIO pelo ID da sua conta.
-- Mantém a coluna booleana status e adiciona situacao para o terceiro estado.

begin;

alter table public.balancas add column if not exists situacao text;

update public.balancas
set situacao = case when status is true then 'ativa' else 'inativa' end
where situacao is null;

alter table public.balancas alter column situacao set default 'ativa';
alter table public.balancas alter column situacao set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'balancas_situacao_valida'
      and conrelid = 'public.balancas'::regclass
  ) then
    alter table public.balancas
      add constraint balancas_situacao_valida
      check (situacao in ('ativa', 'inativa', 'manutencao'));
  end if;
end $$;

create unique index if not exists balancas_codigo_unico on public.balancas (codigo);
alter table public.balancas enable row level security;

grant select, insert on public.balancas to authenticated;
revoke update on public.balancas from authenticated;
grant update (setor, responsavel, status, situacao, ultima_manutencao)
on public.balancas to authenticated;

drop policy if exists "Cadastrar balancas - usuario autorizado" on public.balancas;
create policy "Cadastrar balancas - usuario autorizado"
on public.balancas for insert to authenticated
with check (auth.uid() = 'SUBSTITUA_PELO_UUID_DO_USUARIO'::uuid);

drop policy if exists "Consultar balancas - autenticado" on public.balancas;
create policy "Consultar balancas - autenticado"
on public.balancas for select to authenticated
using (true);

drop policy if exists "Atualizar situacao - usuario autorizado" on public.balancas;
drop policy if exists "Editar balancas - usuario autorizado" on public.balancas;
create policy "Editar balancas - usuario autorizado"
on public.balancas for update to authenticated
using (auth.uid() = 'SUBSTITUA_PELO_UUID_DO_USUARIO'::uuid)
with check (auth.uid() = 'SUBSTITUA_PELO_UUID_DO_USUARIO'::uuid);

commit;
