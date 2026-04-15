"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActivitySquare, CalendarDays, LayoutDashboard, Megaphone, Settings2, Users2, Headset, UserCog } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useBarbershopStore } from "@/lib/store";
import { Button, Card, Badge } from "./ui";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users2 },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
  { href: "/estadisticas", label: "Estadísticas", icon: ActivitySquare },
  { href: "/configuracion", label: "Configuración", icon: Settings2 }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { settings, role, setRole } = useBarbershopStore();
  const supportLink = buildWhatsAppLink(settings.supportPhone, "Hola, necesito soporte con la plataforma de barbería.");

  return (
    <div className="min-h-screen bg-hero text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl lg:flex">
          <div className="rounded-[24px] border border-white/10 bg-panel/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">MVP Comercial</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">{settings.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Gestión integral de agenda, clientes, campañas y finanzas.</p>
            <div className="mt-4 flex items-center gap-2">
              <Badge tone={role === "owner" ? "success" : "warning"}>{role === "owner" ? "Dueño" : "Empleado"}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setRole(role === "owner" ? "employee" : "owner")}>
                <UserCog className="h-4 w-4" /> Cambiar rol
              </Button>
            </div>
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/6 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
          </nav>

          <Card className="mt-auto bg-panel/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Soporte inmediato</p>
                <p className="mt-1 text-xs text-slate-400">Abre WhatsApp con mensaje prellenado.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.open(supportLink, "_blank", "noopener,noreferrer")}>
                <Headset className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </aside>

        <main className="min-w-0 flex-1 pb-8">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-lg lg:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Barbería inteligente</p>
              <p className="text-sm text-slate-400">Dashboard premium listo para demo y escalado.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={role === "owner" ? "success" : "warning"}>{role}</Badge>
              <Link href="/agenda" className="rounded-2xl bg-white/8 px-4 py-2 text-sm font-semibold text-white hover:bg-white/12">
                Ir a agenda
              </Link>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}