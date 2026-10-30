-- PENDIENTE: pegar en Supabase > SQL Editor y ejecutar una vez.
-- Lo demás (tablas, funciones restantes, RLS, storage, cron y catálogo) ya está aplicado.

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

-- Políticas de borrado
create policy "spaces: admin elimina" on public.spaces
  for delete to authenticated using ((select public.is_admin()));
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

-- Sin acceso anónimo; funciones solo para usuarios autenticados
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.handle_new_user() from authenticated;

-- Función interna de Supabase (si existe): no debe ser invocable desde la API
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;
end $$;
