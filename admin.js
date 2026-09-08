create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text not null,
  servico text not null,
  barbeiro text default 'Rian',
  data date not null,
  turno text not null,
  status text default 'pendente',
  criado_em timestamp with time zone default now()
);

alter table agendamentos enable row level security;

create policy "Qualquer um pode agendar" on agendamentos
for insert to anon with check (true);

create policy "Qualquer um pode ver agendamentos" on agendamentos
for select to anon using (true);

create policy "Admin logado pode atualizar" on agendamentos
for update to authenticated using (true);

create policy "Admin logado pode excluir" on agendamentos
for delete to authenticated using (true);