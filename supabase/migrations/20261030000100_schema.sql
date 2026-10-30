-- Casa Aduana · Cotizador y gestión de eventos
-- Esquema base. Montos en centavos (bigint). Fechas de evento en America/Mazatlan.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'staff');
create type public.quote_status as enum ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida', 'cancelada');
create type public.reservation_status as enum ('sin_reserva', 'apartado', 'confirmada', 'liberada');
create type public.booking_status as enum ('hold', 'confirmed', 'released');
create type public.tax_mode as enum ('included', 'added');
create type public.discount_type as enum ('none', 'percent', 'amount');
create type public.item_kind as enum ('food', 'drink', 'extra', 'modifier', 'service');

-- ---------------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role public.user_role not null default 'staff',
  -- Un usuario nuevo queda inactivo hasta que un administrador lo habilite.
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Configuración del negocio (fila única)
-- ---------------------------------------------------------------------------
create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Casa Aduana',
  tagline text,
  legal_name text,
  tax_id text,
  address text,
  phone text,
  email text,
  email_verified boolean not null default false,
  website text,
  instagram text,
  facebook text,
  timezone text not null default 'America/Mazatlan',
  currency text not null default 'MXN',
  tax_rate numeric(5, 4) not null default 0.16 check (tax_rate >= 0 and tax_rate < 1),
  tax_mode public.tax_mode not null default 'included',
  default_validity_days integer not null default 15 check (default_validity_days between 1 and 365),
  default_terms text,
  event_start_time time not null default '09:00',
  event_end_time time not null default '23:30',
  min_lead_days integer not null default 7 check (min_lead_days >= 0),
  folio_prefix text not null default 'CA',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  source_file text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  unique (menu_id, name)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  unit text not null default 'pieza',
  kind public.item_kind not null default 'food',
  active boolean not null default true,
  needs_review boolean not null default false,
  review_note text,
  source text not null default 'manual' check (source in ('import', 'manual', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Precio de un artículo dentro de un menú. Un artículo puede estar en varios menús
-- con precios distintos, y tener variantes (p. ej. tres tipos de waffle).
create table public.menu_item_prices (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  variant_label text not null default '',
  description text,
  -- null = precio pendiente de revisión
  price_cents bigint check (price_cents is null or price_cents >= 0),
  sort integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (menu_id, item_id, variant_label)
);
create index menu_item_prices_item_idx on public.menu_item_prices (item_id);
create index menu_item_prices_category_idx on public.menu_item_prices (category_id);

-- ---------------------------------------------------------------------------
-- Clientes y espacios
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  email text,
  phone text,
  phone_digits text generated always as (nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')) stored,
  company text,
  notes text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index clients_email_unique on public.clients (lower(email)) where email is not null and email <> '';
create index clients_phone_idx on public.clients (phone_digits);
create index clients_name_idx on public.clients (lower(name));

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  capacity integer check (capacity is null or capacity > 0),
  base_hours numeric(4, 1) check (base_hours is null or base_hours > 0),
  color text not null default '#2f6f8a',
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cotizaciones
-- ---------------------------------------------------------------------------
create table public.quote_folio_counters (
  year integer primary key,
  last_value integer not null default 0
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  client_id uuid not null references public.clients (id) on delete restrict,
  -- Copia de los datos del cliente al momento de cotizar (para el PDF histórico)
  client_name text not null,
  client_email text,
  client_phone text,
  client_company text,
  event_name text not null,
  event_type text,
  event_date date not null,
  start_time time,
  end_time time,
  start_at timestamptz,
  end_at timestamptz,
  guests integer check (guests is null or guests > 0),
  menu_id uuid references public.menus (id) on delete set null,
  issued_on date not null,
  valid_until date not null,
  status public.quote_status not null default 'borrador',
  reservation_status public.reservation_status not null default 'sin_reserva',
  discount_type public.discount_type not null default 'none',
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  tax_rate numeric(5, 4) not null,
  tax_mode public.tax_mode not null,
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  notes text,
  terms text,
  version integer not null default 1,
  duplicated_from uuid references public.quotes (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  check (valid_until >= issued_on),
  check (end_at is null or start_at is null or end_at > start_at)
);
create index quotes_client_idx on public.quotes (client_id);
create index quotes_status_idx on public.quotes (status);
create index quotes_event_date_idx on public.quotes (event_date);
create index quotes_created_at_idx on public.quotes (created_at desc);
create index quotes_menu_idx on public.quotes (menu_id);
create index quotes_duplicated_from_idx on public.quotes (duplicated_from);

create table public.quote_spaces (
  quote_id uuid not null references public.quotes (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete restrict,
  primary key (quote_id, space_id)
);
create index quote_spaces_space_idx on public.quote_spaces (space_id);

-- Partidas: copia histórica. Cambios del catálogo no las modifican.
create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position integer not null,
  item_id uuid references public.items (id) on delete set null,
  menu_id uuid references public.menus (id) on delete set null,
  description text not null check (length(trim(description)) > 0),
  detail text,
  unit text,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  line_total_cents bigint not null
);
create index quote_lines_quote_idx on public.quote_lines (quote_id, position);
create index quote_lines_item_idx on public.quote_lines (item_id);
create index quote_lines_menu_idx on public.quote_lines (menu_id);

create table public.quote_status_history (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  kind text not null check (kind in ('quote', 'reservation')),
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null default auth.uid(),
  changed_at timestamptz not null default now()
);
create index quote_status_history_quote_idx on public.quote_status_history (quote_id, changed_at);

create table public.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  pdf_path text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (quote_id, version)
);

-- ---------------------------------------------------------------------------
-- Reservas y bloqueos
-- ---------------------------------------------------------------------------
create table public.space_bookings (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete restrict,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  period tstzrange not null check (not isempty(period)),
  status public.booking_status not null default 'hold',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, space_id),
  -- Garantía en base de datos: dos reservas confirmadas no pueden traslaparse en el mismo espacio.
  constraint space_bookings_no_overlap exclude using gist (
    space_id with =,
    period with &&
  ) where (status = 'confirmed')
);
create index space_bookings_period_idx on public.space_bookings using gist (period);
create index space_bookings_quote_idx on public.space_bookings (quote_id);

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces (id) on delete cascade, -- null = todo el lugar
  period tstzrange not null check (not isempty(period)),
  reason text not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index calendar_blocks_period_idx on public.calendar_blocks using gist (period);
create index calendar_blocks_space_idx on public.calendar_blocks (space_id);
