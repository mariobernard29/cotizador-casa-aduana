-- Seguridad a nivel de fila: solo personal activo accede a los datos.
-- Configuración, espacios y usuarios solo los modifica un administrador.

alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.menus enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.menu_item_prices enable row level security;
alter table public.clients enable row level security;
alter table public.spaces enable row level security;
alter table public.quote_folio_counters enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_spaces enable row level security;
alter table public.quote_lines enable row level security;
alter table public.quote_status_history enable row level security;
alter table public.quote_revisions enable row level security;
alter table public.space_bookings enable row level security;
alter table public.calendar_blocks enable row level security;

-- Sin acceso anónimo a ninguna tabla.
revoke all on all tables in schema public from anon;

-- profiles
create policy "profiles: el personal ve los perfiles" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_staff()));
create policy "profiles: admin actualiza" on public.profiles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- business_settings
create policy "settings: lectura personal" on public.business_settings
  for select to authenticated using ((select public.is_staff()));
create policy "settings: admin actualiza" on public.business_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- spaces (lectura personal, escritura admin)
create policy "spaces: lectura" on public.spaces
  for select to authenticated using ((select public.is_staff()));
create policy "spaces: admin inserta" on public.spaces
  for insert to authenticated with check ((select public.is_admin()));
create policy "spaces: admin actualiza" on public.spaces
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "spaces: admin elimina" on public.spaces
  for delete to authenticated using ((select public.is_admin()));

-- Tablas operativas: acceso completo para el personal activo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'menus', 'categories', 'items', 'menu_item_prices', 'clients',
    'quotes', 'quote_spaces', 'quote_lines', 'quote_status_history',
    'quote_revisions', 'space_bookings', 'calendar_blocks'
  ] loop
    execute format('create policy "%1$s: personal lee" on public.%1$I for select to authenticated using ((select public.is_staff()))', t);
    execute format('create policy "%1$s: personal inserta" on public.%1$I for insert to authenticated with check ((select public.is_staff()))', t);
    -- El historial no se edita.
    if t <> 'quote_status_history' then
      execute format('create policy "%1$s: personal actualiza" on public.%1$I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    end if;
  end loop;
end $$;

-- Borrados permitidos solo donde tienen sentido (las cotizaciones se cancelan, no se borran).
create policy "quote_lines: personal elimina" on public.quote_lines
  for delete to authenticated using ((select public.is_staff()));
create policy "quote_spaces: personal elimina" on public.quote_spaces
  for delete to authenticated using ((select public.is_staff()));
create policy "space_bookings: personal elimina" on public.space_bookings
  for delete to authenticated using ((select public.is_staff()));
create policy "calendar_blocks: personal elimina" on public.calendar_blocks
  for delete to authenticated using ((select public.is_staff()));
create policy "menu_item_prices: personal elimina" on public.menu_item_prices
  for delete to authenticated using ((select public.is_staff()));
create policy "categories: personal elimina" on public.categories
  for delete to authenticated using ((select public.is_staff()));

-- quote_folio_counters: solo vía next_folio() (security definer). Sin políticas = sin acceso directo.

-- ---------------------------------------------------------------------------
-- Storage: PDFs de cotizaciones (bucket privado)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotes', 'quotes', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "quotes bucket: personal lee" on storage.objects
  for select to authenticated using (bucket_id = 'quotes' and (select public.is_staff()));
create policy "quotes bucket: personal sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'quotes' and (select public.is_staff()));
create policy "quotes bucket: personal reemplaza" on storage.objects
  for update to authenticated using (bucket_id = 'quotes' and (select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Vencimiento diario (07:00 UTC ≈ 00:00 en Mazatlán)
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule('expire-quotes-daily', '0 7 * * *', $$select public.expire_quotes()$$);
