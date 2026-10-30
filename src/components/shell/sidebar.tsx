"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { Nav } from "./nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/server/actions/auth";

interface Props {
  businessName: string;
  userName: string;
  role: "admin" | "staff";
}

function SidebarBody({ businessName, userName, role, onNavigate }: Props & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pt-6 pb-6">
        <span className="grid size-11 place-items-center rounded-lg bg-[oklch(0.985_0.006_85)] p-1">
          <Image src="/brand/logo.png" alt="" width={40} height={41} />
        </span>
        <span className="leading-tight">
          <span className="block font-heading text-xl tracking-wide">{businessName}</span>
          <span className="block text-[11px] tracking-[0.2em] text-sidebar-foreground/60 uppercase">Cotizador</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3">
        <Nav onNavigate={onNavigate} />
      </div>
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="text-xs text-sidebar-foreground/60">{role === "admin" ? "Administrador" : "Personal"}</p>
        <form action={signOut} className="mt-3">
          <button type="submit" className="flex items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <LogOut className="size-3.5" /> Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block print:hidden">
        <SidebarBody {...props} />
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden print:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menú" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-0 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <SidebarBody {...props} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Image src="/brand/logo.png" alt="" width={28} height={29} />
        <span className="font-heading text-lg">{props.businessName}</span>
      </header>
    </>
  );
}
