-- Funciones de negocio. La base de datos es la fuente de verdad de importes,
-- folios, transiciones de estado y conflictos de reserva.

-- ---------------------------------------------------------------------------
-- Autorización
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.role = 'admin');
$$;

create or replace function public.require_staff()
returns void
language plpgsql stable set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end;
$$;

-- Perfil automático (inactivo) para cada usuario de Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();
create trigger menu_item_prices_touch before update on public.menu_item_prices for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();
create trigger quotes_touch before update on public.quotes for each row execute function public.touch_updated_at();
create trigger space_bookings_touch before update on public.space_bookings for each row execute function public.touch_updated_at();
create trigger business_settings_touch before update on public.business_settings for each row execute function public.touch_updated_at();

create or replace function public.business_timezone()
returns text
language sql stable set search_path = ''
as $$
  select coalesce((select timezone from public.business_settings where id = 1), 'America/Mazatlan');
$$;

create or replace function public.business_today()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone public.business_timezone())::date;
$$;

-- Folio consecutivo por año: CA-2026-0001
create or replace function public.next_folio()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_year integer := extract(year from public.business_today());
  v_next integer;
  v_prefix text := coalesce((select folio_prefix from public.business_settings where id = 1), 'CA');
begin
  insert into public.quote_folio_counters (year, last_value) values (v_year, 1)
  on conflict (year) do update set last_value = public.quote_folio_counters.last_value + 1
  returning last_value into v_next;
  return format('%s-%s-%s', v_prefix, v_year, lpad(v_next::text, 4, '0'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Cálculo de importes (misma regla que src/lib/quote-calc.ts)
--   partida   = round(cantidad × precio)
--   descuento = % del subtotal o monto fijo (máx. subtotal)
--   IVA incluido: impuesto = base − round(base / (1 + tasa)); total = base
--   IVA añadido:  impuesto = round(base × tasa);             total = base + impuesto
-- ---------------------------------------------------------------------------
create or replace function public.recalc_quote(p_quote_id uuid)
returns void
language plpgsql set search_path = ''
as $$
declare
  q public.quotes%rowtype;
  v_subtotal bigint;
  v_discount bigint;
  v_base bigint;
  v_tax bigint;
  v_total bigint;
begin
  select * into q from public.quotes where id = p_quote_id for update;

  update public.quote_lines
     set line_total_cents = round(quantity * unit_price_cents)::bigint
   where quote_id = p_quote_id;

  select coalesce(sum(line_total_cents), 0) into v_subtotal from public.quote_lines where quote_id = p_quote_id;

  v_discount := case q.discount_type
    when 'percent' then least(round(v_subtotal * least(q.discount_value, 100) / 100)::bigint, v_subtotal)
    when 'amount' then least(round(q.discount_value * 100)::bigint, v_subtotal)
    else 0
  end;
  v_base := v_subtotal - v_discount;

  if q.tax_mode = 'included' then
    v_tax := v_base - round(v_base / (1 + q.tax_rate))::bigint;
    v_total := v_base;
  else
    v_tax := round(v_base * q.tax_rate)::bigint;
    v_total := v_base + v_tax;
  end if;

  update public.quotes
     set subtotal_cents = v_subtotal,
         discount_cents = v_discount,
         tax_cents = v_tax,
         total_cents = v_total
   where id = p_quote_id;
end;
$$;

-- Convierte fecha + horas locales a timestamptz. Si la hora final es menor o igual
-- a la inicial, el evento termina al día siguiente.
create or replace function public.event_period(p_date date, p_start time, p_end time)
returns tstzrange
language sql stable set search_path = ''
as $$
  select case
    when p_date is null or p_start is null or p_end is null then null
    else tstzrange(
      (p_date + p_start) at time zone public.business_timezone(),
      ((p_date + case when p_end <= p_start then 1 else 0 end) + p_end) at time zone public.business_timezone(),
      '[)'
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Disponibilidad
-- ---------------------------------------------------------------------------
create or replace function public.check_availability(
  p_space_ids uuid[],
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_quote uuid default null
)
returns table (
  kind text,           -- 'confirmed' | 'hold' | 'block'
  quote_id uuid,
  folio text,
  event_name text,
  space_id uuid,
  space_name text,
  start_at timestamptz,
  end_at timestamptz,
  reason text
)
language sql stable set search_path = ''
as $$
  select case b.status when 'confirmed' then 'confirmed' else 'hold' end,
         q.id, q.folio, q.event_name, s.id, s.name, lower(b.period), upper(b.period), null::text
    from public.space_bookings b
    join public.quotes q on q.id = b.quote_id
    join public.spaces s on s.id = b.space_id
   where b.status in ('hold', 'confirmed')
     and b.space_id = any (p_space_ids)
     and b.period && tstzrange(p_start, p_end, '[)')
     and (p_exclude_quote is null or b.quote_id <> p_exclude_quote)
  union all
  select 'block', null, null, null, s.id, coalesce(s.name, 'Todo el lugar'), lower(cb.period), upper(cb.period), cb.reason
    from public.calendar_blocks cb
    left join public.spaces s on s.id = cb.space_id
   where (cb.space_id is null or cb.space_id = any (p_space_ids))
     and cb.period && tstzrange(p_start, p_end, '[)')
  order by 7;
$$;

-- ---------------------------------------------------------------------------
-- Guardar cotización (crear o editar borrador) en una sola transacción.
-- Los importes enviados por el navegador se ignoran: se recalculan aquí.
-- ---------------------------------------------------------------------------
create or replace function public.save_quote(p jsonb)
returns uuid
language plpgsql set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_settings public.business_settings%rowtype;
  v_client public.clients%rowtype;
  v_existing public.quotes%rowtype;
  v_period tstzrange;
  v_line jsonb;
  v_pos integer := 0;
  v_space uuid;
begin
  perform public.require_staff();
  select * into v_settings from public.business_settings where id = 1;

  select * into v_client from public.clients where id = (p ->> 'client_id')::uuid;
  if not found then
    raise exception 'Selecciona un cliente válido' using errcode = '22023';
  end if;

  if coalesce(trim(p ->> 'event_name'), '') = '' then
    raise exception 'El nombre del evento es obligatorio' using errcode = '22023';
  end if;
  if nullif(p ->> 'event_date', '') is null then
    raise exception 'La fecha del evento es obligatoria' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p -> 'lines', '[]'::jsonb)) = 0 then
    raise exception 'Agrega al menos una partida' using errcode = '22023';
  end if;

  v_period := public.event_period(
    (p ->> 'event_date')::date,
    nullif(p ->> 'start_time', '')::time,
    nullif(p ->> 'end_time', '')::time
  );

  if v_id is null then
    insert into public.quotes (
      folio, client_id, client_name, client_email, client_phone, client_company,
      event_name, event_type, event_date, start_time, end_time, start_at, end_at, guests, menu_id,
      issued_on, valid_until, discount_type, discount_value, tax_rate, tax_mode, notes, terms, duplicated_from
    ) values (
      public.next_folio(), v_client.id, v_client.name, v_client.email, v_client.phone, v_client.company,
      trim(p ->> 'event_name'), nullif(p ->> 'event_type', ''), (p ->> 'event_date')::date,
      nullif(p ->> 'start_time', '')::time, nullif(p ->> 'end_time', '')::time,
      lower(v_period), upper(v_period),
      nullif(p ->> 'guests', '')::integer, nullif(p ->> 'menu_id', '')::uuid,
      public.business_today(),
      coalesce(nullif(p ->> 'valid_until', '')::date, public.business_today() + v_settings.default_validity_days),
      coalesce(nullif(p ->> 'discount_type', ''), 'none')::public.discount_type,
      coalesce(nullif(p ->> 'discount_value', '')::numeric, 0),
      v_settings.tax_rate, v_settings.tax_mode,
      nullif(p ->> 'notes', ''), nullif(p ->> 'terms', ''),
      nullif(p ->> 'duplicated_from', '')::uuid
    )
    returning id into v_id;

    insert into public.quote_status_history (quote_id, kind, from_status, to_status, note)
    values (v_id, 'quote', null, 'borrador', 'Cotización creada');
  else
    select * into v_existing from public.quotes where id = v_id for update;
    if not found then
      raise exception 'La cotización no existe' using errcode = 'P0002';
    end if;
    if v_existing.status <> 'borrador' then
      raise exception 'Solo se pueden editar cotizaciones en borrador' using errcode = '22023';
    end if;

    update public.quotes set
      client_id = v_client.id,
      client_name = v_client.name,
      client_email = v_client.email,
      client_phone = v_client.phone,
      client_company = v_client.company,
      event_name = trim(p ->> 'event_name'),
      event_type = nullif(p ->> 'event_type', ''),
      event_date = (p ->> 'event_date')::date,
      start_time = nullif(p ->> 'start_time', '')::time,
      end_time = nullif(p ->> 'end_time', '')::time,
      start_at = lower(v_period),
      end_at = upper(v_period),
      guests = nullif(p ->> 'guests', '')::integer,
      menu_id = nullif(p ->> 'menu_id', '')::uuid,
      valid_until = coalesce(nullif(p ->> 'valid_until', '')::date, v_existing.valid_until),
      discount_type = coalesce(nullif(p ->> 'discount_type', ''), 'none')::public.discount_type,
      discount_value = coalesce(nullif(p ->> 'discount_value', '')::numeric, 0),
      notes = nullif(p ->> 'notes', ''),
      terms = nullif(p ->> 'terms', '')
    where id = v_id;

    delete from public.quote_lines where quote_id = v_id;
    delete from public.quote_spaces where quote_id = v_id;
  end if;

  for v_line in select * from jsonb_array_elements(p -> 'lines') loop
    v_pos := v_pos + 1;
    if coalesce(trim(v_line ->> 'description'), '') = '' then
      raise exception 'La partida % no tiene descripción', v_pos using errcode = '22023';
    end if;
    insert into public.quote_lines (quote_id, position, item_id, menu_id, description, detail, unit, quantity, unit_price_cents, line_total_cents)
    values (
      v_id, v_pos,
      nullif(v_line ->> 'item_id', '')::uuid,
      nullif(v_line ->> 'menu_id', '')::uuid,
      trim(v_line ->> 'description'),
      nullif(v_line ->> 'detail', ''),
      nullif(v_line ->> 'unit', ''),
      (v_line ->> 'quantity')::numeric,
      (v_line ->> 'unit_price_cents')::bigint,
      0
    );
  end loop;

  for v_space in select (jsonb_array_elements_text(coalesce(p -> 'space_ids', '[]'::jsonb)))::uuid loop
    insert into public.quote_spaces (quote_id, space_id) values (v_id, v_space) on conflict do nothing;
  end loop;

  -- Si la fecha estaba apartada, el apartado sigue al nuevo horario y espacios.
  if exists (select 1 from public.quotes where id = v_id and reservation_status = 'apartado') then
    delete from public.space_bookings where quote_id = v_id;
    if v_period is not null then
      insert into public.space_bookings (space_id, quote_id, period, status)
      select qs.space_id, v_id, v_period, 'hold' from public.quote_spaces qs where qs.quote_id = v_id;
    end if;
  end if;

  perform public.recalc_quote(v_id);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Instantánea de una cotización (para revisiones)
-- ---------------------------------------------------------------------------
create or replace function public.quote_snapshot(p_quote_id uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  select to_jsonb(q) || jsonb_build_object(
    'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.position) from public.quote_lines l where l.quote_id = q.id), '[]'::jsonb),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.sort, s.name)
                          from public.quote_spaces qs join public.spaces s on s.id = qs.space_id where qs.quote_id = q.id), '[]'::jsonb)
  )
  from public.quotes q where q.id = p_quote_id;
$$;

-- Libera los apartados/reservas de una cotización.
create or replace function public.release_bookings(p_quote_id uuid, p_note text)
returns void
language plpgsql set search_path = ''
as $$
declare
  v_prev public.reservation_status;
begin
  select reservation_status into v_prev from public.quotes where id = p_quote_id;
  if v_prev in ('apartado', 'confirmada') then
    update public.space_bookings set status = 'released' where quote_id = p_quote_id;
    update public.quotes set reservation_status = 'liberada' where id = p_quote_id;
    insert into public.quote_status_history (quote_id, kind, from_status, to_status, note)
    values (p_quote_id, 'reservation', v_prev::text, 'liberada', p_note);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Transiciones de estado de la cotización
-- ---------------------------------------------------------------------------
create or replace function public.quote_transition_allowed(p_from public.quote_status, p_to public.quote_status)
returns boolean
language sql immutable set search_path = ''
as $$
  select (p_from, p_to) in (
    ('borrador'::public.quote_status, 'enviada'::public.quote_status),
    ('borrador', 'cancelada'),
    ('enviada', 'aceptada'),
    ('enviada', 'rechazada'),
    ('enviada', 'vencida'),
    ('enviada', 'cancelada'),
    ('enviada', 'borrador'),
    ('aceptada', 'cancelada'),
    ('vencida', 'borrador'),
    ('rechazada', 'borrador')
  );
$$;

create or replace function public.transition_quote(p_quote_id uuid, p_to public.quote_status, p_note text default null)
returns public.quotes
language plpgsql set search_path = ''
as $$
declare
  q public.quotes%rowtype;
begin
  perform public.require_staff();
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'La cotización no existe' using errcode = 'P0002';
  end if;
  if not public.quote_transition_allowed(q.status, p_to) then
    raise exception 'No se puede cambiar de "%" a "%"', q.status, p_to using errcode = '22023';
  end if;

  if p_to = 'enviada' then
    update public.quotes set status = 'enviada', sent_at = now() where id = p_quote_id;
    insert into public.quote_revisions (quote_id, version, snapshot)
    values (p_quote_id, q.version, public.quote_snapshot(p_quote_id))
    on conflict (quote_id, version) do update set snapshot = excluded.snapshot, created_at = now(), pdf_path = null;
  elsif p_to = 'borrador' then
    -- Reabrir genera una nueva versión; si estaba vencida o rechazada se renueva la vigencia.
    update public.quotes
       set status = 'borrador',
           version = version + 1,
           valid_until = case when q.status in ('vencida', 'rechazada') or q.valid_until < public.business_today()
                              then public.business_today() + coalesce((select default_validity_days from public.business_settings where id = 1), 15)
                              else valid_until end
     where id = p_quote_id;
  elsif p_to = 'aceptada' then
    update public.quotes set status = 'aceptada', accepted_at = now() where id = p_quote_id;
  else
    update public.quotes set status = p_to where id = p_quote_id;
    if p_to in ('cancelada', 'rechazada', 'vencida') then
      perform public.release_bookings(p_quote_id, 'Liberada automáticamente: cotización ' || p_to::text);
    end if;
  end if;

  insert into public.quote_status_history (quote_id, kind, from_status, to_status, note)
  values (p_quote_id, 'quote', q.status::text, p_to::text, p_note);

  select * into q from public.quotes where id = p_quote_id;
  return q;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reserva de espacios (independiente del estado comercial)
--   sin_reserva/liberada → apartado  (fecha tentativa; puede coincidir con otros apartados)
--   apartado → confirmada            (requiere cotización aceptada y sin conflictos)
--   apartado/confirmada → liberada
-- ---------------------------------------------------------------------------
create or replace function public.set_reservation(p_quote_id uuid, p_to public.reservation_status, p_note text default null)
returns public.quotes
language plpgsql set search_path = ''
as $$
declare
  q public.quotes%rowtype;
  v_period tstzrange;
  v_conflict record;
begin
  perform public.require_staff();
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'La cotización no existe' using errcode = 'P0002';
  end if;

  if p_to = q.reservation_status then
    return q;
  end if;

  if p_to = 'liberada' then
    if q.reservation_status not in ('apartado', 'confirmada') then
      raise exception 'No hay una reserva que liberar' using errcode = '22023';
    end if;
    perform public.release_bookings(p_quote_id, coalesce(p_note, 'Reserva liberada'));
    select * into q from public.quotes where id = p_quote_id;
    return q;
  end if;

  if p_to = 'sin_reserva' then
    raise exception 'Usa "liberar" para quitar una reserva' using errcode = '22023';
  end if;

  v_period := public.event_period(q.event_date, q.start_time, q.end_time);
  if v_period is null then
    raise exception 'Define la hora de inicio y fin del evento antes de reservar' using errcode = '22023';
  end if;
  if not exists (select 1 from public.quote_spaces where quote_id = p_quote_id) then
    raise exception 'Selecciona al menos un espacio antes de reservar' using errcode = '22023';
  end if;

  if p_to = 'apartado' then
    if q.status not in ('borrador', 'enviada', 'aceptada') then
      raise exception 'No se puede apartar una cotización %', q.status using errcode = '22023';
    end if;
    if q.reservation_status = 'confirmada' then
      raise exception 'La reserva ya está confirmada' using errcode = '22023';
    end if;
    delete from public.space_bookings where quote_id = p_quote_id;
    insert into public.space_bookings (space_id, quote_id, period, status)
    select qs.space_id, p_quote_id, v_period, 'hold' from public.quote_spaces qs where qs.quote_id = p_quote_id;

  elsif p_to = 'confirmada' then
    if q.status <> 'aceptada' then
      raise exception 'Solo se puede confirmar la reserva de una cotización aceptada' using errcode = '22023';
    end if;

    -- Bloqueos de calendario
    select * into v_conflict
      from public.check_availability(array(select space_id from public.quote_spaces where quote_id = p_quote_id),
                                     lower(v_period), upper(v_period), p_quote_id) c
     where c.kind in ('confirmed', 'block')
     limit 1;
    if found then
      if v_conflict.kind = 'block' then
        raise exception 'Conflicto: % está bloqueado (%)', v_conflict.space_name, v_conflict.reason using errcode = '23P01';
      else
        raise exception 'Conflicto: % ya está reservado para % (%)', v_conflict.space_name, v_conflict.event_name, v_conflict.folio using errcode = '23P01';
      end if;
    end if;

    delete from public.space_bookings where quote_id = p_quote_id;
    begin
      insert into public.space_bookings (space_id, quote_id, period, status)
      select qs.space_id, p_quote_id, v_period, 'confirmed' from public.quote_spaces qs where qs.quote_id = p_quote_id;
    exception when exclusion_violation then
      raise exception 'Conflicto: otro evento confirmó ese espacio y horario al mismo tiempo. Actualiza y revisa la disponibilidad.' using errcode = '23P01';
    end;
  end if;

  update public.quotes set reservation_status = p_to where id = p_quote_id;
  insert into public.quote_status_history (quote_id, kind, from_status, to_status, note)
  values (p_quote_id, 'reservation', q.reservation_status::text, p_to::text, p_note);

  select * into q from public.quotes where id = p_quote_id;
  return q;
end;
$$;

-- ---------------------------------------------------------------------------
-- Duplicar: nuevo folio, borrador, sin reserva.
-- ---------------------------------------------------------------------------
create or replace function public.duplicate_quote(p_quote_id uuid)
returns uuid
language plpgsql set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  perform public.require_staff();
  select jsonb_build_object(
           'client_id', q.client_id,
           'event_name', q.event_name,
           'event_type', q.event_type,
           'event_date', q.event_date,
           'start_time', q.start_time,
           'end_time', q.end_time,
           'guests', q.guests,
           'menu_id', q.menu_id,
           'discount_type', q.discount_type,
           'discount_value', q.discount_value,
           'notes', q.notes,
           'terms', q.terms,
           'duplicated_from', q.id,
           'space_ids', coalesce((select jsonb_agg(space_id) from public.quote_spaces where quote_id = q.id), '[]'::jsonb),
           'lines', coalesce((select jsonb_agg(jsonb_build_object(
                       'item_id', l.item_id, 'menu_id', l.menu_id, 'description', l.description, 'detail', l.detail,
                       'unit', l.unit, 'quantity', l.quantity, 'unit_price_cents', l.unit_price_cents) order by l.position)
                     from public.quote_lines l where l.quote_id = q.id), '[]'::jsonb)
         )
    into v_payload
    from public.quotes q where q.id = p_quote_id;

  if v_payload is null then
    raise exception 'La cotización no existe' using errcode = 'P0002';
  end if;
  return public.save_quote(v_payload);
end;
$$;

-- ---------------------------------------------------------------------------
-- Vencimiento automático
-- ---------------------------------------------------------------------------
create or replace function public.expire_quotes()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id from public.quotes
     where status = 'enviada' and valid_until < public.business_today()
     for update skip locked
  loop
    update public.quotes set status = 'vencida' where id = r.id;
    insert into public.quote_status_history (quote_id, kind, from_status, to_status, note, changed_by)
    values (r.id, 'quote', 'enviada', 'vencida', 'Vencida automáticamente', null);
    perform public.release_bookings(r.id, 'Liberada automáticamente: cotización vencida');
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución: solo usuarios autenticados.
-- ---------------------------------------------------------------------------
-- Las funciones de negocio validan is_staff() y las tablas tienen RLS.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.handle_new_user() from authenticated;
