"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, NativeSelect } from "@/components/form";
import { Section } from "@/components/page-header";
import { createStaffUser, updateStaffUser } from "@/server/actions/settings";
import type { Profile } from "@/lib/types";

export function UsersManager({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "staff" as "admin" | "staff" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function update(id: string, patch: { role?: "admin" | "staff"; active?: boolean }) {
    start(async () => {
      const res = await updateStaffUser(id, patch);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Usuario actualizado");
      router.refresh();
    });
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createStaffUser(form);
      if (!res.ok) return setError(res.error);
      toast.success("Usuario creado");
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "staff" });
      router.refresh();
    });
  }

  return (
    <Section
      title="Usuarios"
      bodyClassName="p-0"
      actions={
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <UserPlus /> Nuevo usuario
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Nombre</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead className="pr-4 text-right">Activo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="pl-4">
                <div className="font-medium">{u.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </TableCell>
              <TableCell>
                <NativeSelect
                  className="w-36"
                  value={u.role}
                  disabled={pending || u.id === currentUserId}
                  onChange={(e) => update(u.id, { role: e.target.value as "admin" | "staff" })}
                  aria-label="Rol"
                >
                  <option value="staff">Personal</option>
                  <option value="admin">Administrador</option>
                </NativeSelect>
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Switch
                  checked={u.active}
                  disabled={pending || u.id === currentUserId}
                  onCheckedChange={(v) => update(u.id, { active: v })}
                  aria-label="Activo"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Comparte la contraseña temporal de forma segura; el usuario podrá iniciar sesión de inmediato.</DialogDescription>
          </DialogHeader>
          <form id="user-form" onSubmit={create} className="grid gap-4">
            <Field label="Nombre" required><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></Field>
            <Field label="Correo" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label="Contraseña temporal" hint="Mínimo 10 caracteres." required>
              <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={10} />
            </Field>
            <Field label="Rol">
              <NativeSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "staff" })}>
                <option value="staff">Personal</option>
                <option value="admin">Administrador</option>
              </NativeSelect>
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="user-form" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Crear usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
