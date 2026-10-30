import "server-only";

type PgError = { code?: string; message?: string; details?: string | null } | null | undefined;

/** Traduce errores de Postgres/Supabase a mensajes comprensibles. */
export function friendlyError(error: PgError, fallback = "Ocurrió un error. Intenta de nuevo."): string {
  if (!error) return fallback;
  const msg = error.message ?? "";
  switch (error.code) {
    case "22023": // errores de negocio lanzados por las funciones
    case "P0002":
    case "23P01":
      return msg;
    case "23505":
      if (msg.includes("clients_email_unique")) return "Ya existe un cliente con ese correo electrónico.";
      if (msg.includes("spaces_name_key")) return "Ya existe un espacio con ese nombre.";
      if (msg.includes("items_slug_key")) return "Ya existe un artículo con un nombre equivalente.";
      if (msg.includes("menu_item_prices")) return "Ese artículo ya tiene un precio en ese menú con la misma variante.";
      return "El registro ya existe.";
    case "23503":
      return "No se puede eliminar: el registro está en uso.";
    case "42501":
      return "No tienes permiso para realizar esta acción.";
    case "PGRST202":
    case "42883":
      return "Falta aplicar las funciones de la base de datos (supabase/migrations). Revisa el README.";
    case "42P01":
    case "PGRST205":
      return "Falta aplicar las migraciones de la base de datos. Revisa el README.";
  }
  console.error("[supabase]", error);
  return fallback;
}
