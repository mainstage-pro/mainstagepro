"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    section: "DIRECCIÓN",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Calendario de eventos", href: "/calendario" },
      { label: "Usuarios y accesos", href: "/admin/usuarios" },
    ],
  },
  {
    section: "ADMINISTRACIÓN",
    items: [
      {
        label: "Finanzas",
        children: [
          { label: "Movimientos", href: "/finanzas/movimientos" },
          { label: "Por cobrar", href: "/finanzas/cxc" },
          { label: "Por pagar", href: "/finanzas/cxp" },
          { label: "Cuentas bancarias", href: "/finanzas/cuentas" },
          { label: "Categorías", href: "/finanzas/categorias" },
        ],
      },
      {
        label: "RR.HH.",
        children: [
          { label: "Personal", href: "/rrhh/personal" },
          { label: "Nómina", href: "/rrhh/nomina" },
        ],
      },
      {
        label: "Base de datos",
        children: [
          { label: "Roles técnicos", href: "/catalogo/roles" },
          { label: "Técnicos", href: "/catalogo/tecnicos" },
          { label: "Proveedores", href: "/catalogo/proveedores" },
        ],
      },
    ],
  },
  {
    section: "MARKETING",
    items: [
      { label: "Calendario de contenido", href: "/marketing/calendario" },
      { label: "Tipos de contenido", href: "/marketing/contenidos" },
    ],
  },
  {
    section: "VENTAS",
    items: [
      {
        label: "CRM",
        children: [
          { label: "Pipeline", href: "/crm/pipeline" },
          { label: "Tratos", href: "/crm/tratos" },
          { label: "Clientes", href: "/crm/clientes" },
        ],
      },
      { label: "Cotizaciones", href: "/cotizaciones" },
      {
        label: "Comisiones",
        children: [
          { label: "Pipeline", href: "/ventas" },
          { label: "Reporte", href: "/ventas/reporte" },
          { label: "Vendedores", href: "/ventas/vendedores" },
          { label: "Configuración", href: "/ventas/config" },
        ],
      },
    ],
  },
  {
    section: "PRODUCCIÓN",
    items: [
      { label: "Proyectos", href: "/proyectos" },
      {
        label: "Inventario",
        children: [
          { label: "Disponibilidad", href: "/inventario/disponibilidad" },
          { label: "Inv. de equipos", href: "/catalogo/equipos" },
          { label: "Mantenimiento", href: "/inventario/mantenimiento" },
          { label: "Bodega", href: "/inventario/bodega" },
        ],
      },
      {
        label: "RR.HH.",
        children: [
          { label: "Personal", href: "/rrhh/personal" },
          { label: "Nómina", href: "/rrhh/nomina" },
        ],
      },
    ],
  },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function getInitialOpen(pathname: string): Set<string> {
  const open = new Set<string>();
  if (pathname.startsWith("/crm")) open.add("CRM");
  if (pathname.startsWith("/ventas")) open.add("Comisiones");
  if (pathname.startsWith("/inventario") || pathname.startsWith("/catalogo/equipos")) open.add("Inventario");
  if (pathname.startsWith("/finanzas")) open.add("Finanzas");
  if (pathname.startsWith("/catalogo/roles") || pathname.startsWith("/catalogo/tecnicos") || pathname.startsWith("/catalogo/proveedores")) open.add("Base de datos");
  if (pathname.startsWith("/rrhh")) open.add("RR.HH.");
  if (pathname.startsWith("/marketing")) open.add("MARKETING");
  return open;
}

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => getInitialOpen(pathname));

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-56 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="Mainstage Pro" width={28} height={28} className="shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Mainstage Pro</p>
            <p className="text-[#555] text-[10px]">Sistema operativo</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map((section) => (
          <div key={section.section} className="mb-3">
            <p className="text-[#3a3a3a] text-[9px] font-bold uppercase tracking-widest px-3 mb-1">{section.section}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                if (item.children) {
                  const isOpen = openGroups.has(item.label);
                  const isGroupActive = item.children.some((c) => isActive(c.href));
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleGroup(item.label)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                          isGroupActive
                            ? "text-[#B3985B]"
                            : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`text-[9px] transition-transform opacity-40 ${isOpen ? "rotate-90" : ""}`}>▶</span>
                      </button>
                      {isOpen && (
                        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#1f1f1f] pl-3">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`block px-2 py-1 rounded text-xs transition-colors ${
                                isActive(child.href)
                                  ? "text-[#B3985B] font-medium"
                                  : "text-[#5a6370] hover:text-white"
                              }`}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive(item.href!)
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
            <span className="text-[#B3985B] text-xs font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.name}</p>
            <p className="text-[#555] text-[10px]">
              {user.role === "ADMIN" ? "Administrador" : user.role === "VENDEDOR" ? "Vendedor" : "Usuario"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-[#555] hover:text-red-400 text-xs px-1 py-1 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
