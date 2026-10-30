"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Download, Eye, Loader2, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { duplicateQuote, transitionQuote } from "@/server/actions/quotes";
import { QUOTE_STATUS_LABEL, QUOTE_TRANSITIONS, TRANSITION_ACTION_LABEL, type QuoteStatus } from "@/lib/quote-status";

const CONFIRM_TEXT: Partial<Record<QuoteStatus, string>> = {
  enviada: "Se guardará una copia del PDF de esta versión. Para modificarla después tendrás que reabrirla (se creará una nueva versión).",
  aceptada: "Aceptar la cotización no confirma la reserva. Confirma la fecha por separado cuando se cumplan los requisitos comerciales.",
  rechazada: "Si la fecha estaba apartada, se liberará.",
  cancelada: "Si la fecha estaba apartada o confirmada, se liberará. Esta acción no se puede deshacer.",
  vencida: "Si la fecha estaba apartada, se liberará.",
  borrador: "La cotización volverá a borrador con un nuevo número de versión para que puedas editarla.",
};

/** Confirmación y ejecución de un cambio de estado. */
export function useQuoteTransition() {
  const router = useRouter();
  const [target, setTarget] = useState<{ id: string; folio: string; to: QuoteStatus } | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function confirm() {
    if (!target) return;
    start(async () => {
      const res = await transitionQuote(target.id, target.to, note);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${target.folio}: ${QUOTE_STATUS_LABEL[target.to].toLowerCase()}`);
      setTarget(null);
      setNote("");
      if (target.to === "borrador") router.push(`/cotizaciones/${target.id}/editar`);
      else router.refresh();
    });
  }

  const dialog = (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target ? `${TRANSITION_ACTION_LABEL[target.to]} · ${target.folio}` : ""}</AlertDialogTitle>
          <AlertDialogDescription>{target ? CONFIRM_TEXT[target.to] : ""}</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota para el historial (opcional)" rows={2} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
            disabled={pending}
            variant={target?.to === "cancelada" || target?.to === "rechazada" ? "destructive" : "default"}
          >
            {pending && <Loader2 className="animate-spin" />} Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { request: (id: string, folio: string, to: QuoteStatus) => setTarget({ id, folio, to }), dialog };
}

export function useDuplicate() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return {
    pending,
    duplicate: (id: string) =>
      start(async () => {
        const res = await duplicateQuote(id);
        if (!res.ok) return void toast.error(res.error);
        toast.success("Cotización duplicada. Ajusta fecha, cliente y partidas.");
        router.push(`/cotizaciones/${res.data.id}/editar`);
      }),
  };
}

/** Menú de acciones de una fila del listado. */
export function QuoteRowActions({ id, folio, status }: { id: string; folio: string; status: QuoteStatus }) {
  const transition = useQuoteTransition();
  const dup = useDuplicate();
  const next = QUOTE_TRANSITIONS[status];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Acciones de ${folio}`} />}>
          {dup.pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href={`/cotizaciones/${id}`} />}>
              <Eye /> Abrir
            </DropdownMenuItem>
            {status === "borrador" && (
              <DropdownMenuItem render={<Link href={`/cotizaciones/${id}/editar`} />}>
                <Pencil /> Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => dup.duplicate(id)}>
              <Copy /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem render={<a href={`/api/cotizaciones/${id}/pdf?download=1`} />}>
              <Download /> Descargar PDF
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {next.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                {next.map((to) => (
                  <DropdownMenuItem key={to} variant={to === "cancelada" ? "destructive" : "default"} onClick={() => transition.request(id, folio, to)}>
                    {TRANSITION_ACTION_LABEL[to]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {transition.dialog}
    </>
  );
}
