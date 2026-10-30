import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Usuario autenticado y su perfil. Memorizado por petición. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { userId: null, email: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  return { userId, email: (claims?.claims?.email as string | undefined) ?? null, profile: profile ?? null };
});

/** Exige un usuario activo del personal; si no, redirige. */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user.userId) redirect("/login");
  if (!user.profile?.active) redirect("/sin-acceso");
  return { ...user, profile: user.profile };
}

export async function requireAdmin() {
  const user = await requireStaff();
  if (user.profile.role !== "admin") redirect("/");
  return user;
}

/** Para Server Actions: devuelve un error en lugar de redirigir. */
export async function assertStaff(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user.userId) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (!user.profile?.active) return "Tu usuario no tiene acceso. Pide a un administrador que lo active.";
  return null;
}

export async function assertAdmin(): Promise<string | null> {
  const err = await assertStaff();
  if (err) return err;
  const user = await getCurrentUser();
  return user.profile?.role === "admin" ? null : "Solo un administrador puede hacer este cambio.";
}
