import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave secreta. Ignora RLS: úsalo solo en el servidor y solo para
 * tareas administrativas (alta de usuarios). Nunca lo importes desde un componente cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta la variable SUPABASE_SECRET_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
