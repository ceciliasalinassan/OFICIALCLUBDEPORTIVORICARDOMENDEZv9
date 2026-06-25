-- Visitas públicas actualizadas en cada carga de página
-- Ejecutar en Supabase SQL Editor solo si la tabla site_visits no permite INSERT/SELECT público.
alter table if exists public.site_visits enable row level security;

drop policy if exists "Public can insert visits" on public.site_visits;
create policy "Public can insert visits"
on public.site_visits for insert
to anon
with check (true);

drop policy if exists "Public can count visits" on public.site_visits;
create policy "Public can count visits"
on public.site_visits for select
to anon
using (true);
