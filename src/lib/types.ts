import type { QuoteStatus, ReservationStatus } from "./quote-status";
import type { DiscountType, TaxMode } from "./quote-calc";

export type UserRole = "admin" | "staff";
export type ItemKind = "food" | "drink" | "extra" | "modifier" | "service";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface BusinessSettings {
  id: number;
  name: string;
  tagline: string | null;
  legal_name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  email_verified: boolean;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  timezone: string;
  currency: string;
  tax_rate: number;
  tax_mode: TaxMode;
  default_validity_days: number;
  default_terms: string | null;
  event_start_time: string;
  event_end_time: string;
  min_lead_days: number;
  folio_prefix: string;
}

export interface Menu {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  source_file: string | null;
  sort: number;
  active: boolean;
}

export interface Category {
  id: string;
  menu_id: string;
  name: string;
  sort: number;
}

export interface Item {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  unit: string;
  kind: ItemKind;
  active: boolean;
  needs_review: boolean;
  review_note: string | null;
  source: "import" | "manual" | "custom";
}

export interface MenuItemPrice {
  id: string;
  menu_id: string;
  item_id: string;
  category_id: string | null;
  variant_label: string;
  description: string | null;
  price_cents: number | null;
  sort: number;
  active: boolean;
}

/** Fila plana para buscar artículos en el editor y en el catálogo. */
export interface CatalogEntry {
  price_id: string;
  item_id: string;
  menu_id: string;
  menu_name: string;
  category_id: string | null;
  category_name: string | null;
  name: string;
  variant_label: string;
  /** Descripción a mostrar: la del precio (variante) o, si no hay, la del artículo. */
  description: string | null;
  item_description: string | null;
  price_description: string | null;
  unit: string;
  kind: ItemKind;
  price_cents: number | null;
  active: boolean;
  item_active: boolean;
  item_needs_review: boolean;
  needs_review: boolean;
  review_note: string | null;
  sort: number;
  category_sort: number;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  base_hours: number | null;
  color: string;
  sort: number;
  active: boolean;
}

export interface Quote {
  id: string;
  folio: string;
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_company: string | null;
  event_name: string;
  event_type: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  start_at: string | null;
  end_at: string | null;
  guests: number | null;
  menu_id: string | null;
  issued_on: string;
  valid_until: string;
  status: QuoteStatus;
  reservation_status: ReservationStatus;
  discount_type: DiscountType;
  discount_value: number;
  tax_rate: number;
  tax_mode: TaxMode;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  notes: string | null;
  terms: string | null;
  version: number;
  duplicated_from: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  accepted_at: string | null;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  position: number;
  item_id: string | null;
  menu_id: string | null;
  description: string;
  detail: string | null;
  unit: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface QuoteHistoryEntry {
  id: number;
  quote_id: string;
  kind: "quote" | "reservation";
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  version: number;
  pdf_path: string | null;
  created_at: string;
}

export interface AvailabilityConflict {
  kind: "confirmed" | "hold" | "block";
  quote_id: string | null;
  folio: string | null;
  event_name: string | null;
  space_id: string | null;
  space_name: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
}

export interface CalendarBlock {
  id: string;
  space_id: string | null;
  period: string;
  reason: string;
}

export const EVENT_TYPES = [
  "Boda",
  "Pedida de mano",
  "Entrega de anillo",
  "Cumpleaños",
  "Despedida de soltera",
  "Aniversario",
  "Empresarial",
  "Fiesta de compromiso",
  "Bautizo",
  "Baby Shower",
  "Otro",
] as const;

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  food: "Alimento",
  drink: "Bebida",
  extra: "Extra / guarnición",
  modifier: "Preparación",
  service: "Servicio",
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
