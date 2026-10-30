"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, FilePlus2, FileText, LayoutDashboard, MapPin, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/cotizaciones/nueva", label: "Nueva cotización", icon: FilePlus2 },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
  { href: "/espacios", label: "Espacios", icon: MapPin },
  { href: "/configuracion", label: "Configuración", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/cotizaciones") return pathname.startsWith("/cotizaciones") && !pathname.startsWith("/cotizaciones/nueva");
  return pathname.startsWith(href);
}

export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5" aria-label="Principal">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              href === "/cotizaciones/nueva" && !active && "text-sidebar-primary",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
