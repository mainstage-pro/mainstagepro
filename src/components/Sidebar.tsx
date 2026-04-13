"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface NavChild {
  key?: string;
  label: string;
  href: string;
}

interface NavItem {
  key?: string;
  label: string;
  href?: string;
  adminOnly?: boolean;
  children?: NavChild[];
}

interface NavSection {
  key: string;
  section: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  // ── DIRECCIÓN ──────────────────────────────────────────────────────────────
  {
    key: "seccion-direccion",
    section: "DIRECCIÓN",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/dashboard" },
      { key: "admin-usuarios", label: "Usuarios y accesos", href: "/admin/usuarios", adminOnly: true },
      { key: "configuracion", label: "Configuración", href: "/admin/configuracion", adminOnly: true },
    ],
  },

  // ── COMERCIAL ──────────────────────────────────────────────────────────────
  {
    key: "seccion-comercial",
    section: "COMERCIAL",
    items: [
      { key: "crm-clientes", label: "Clientes", href: "/crm/clientes" },
      { key: "crm-tratos", label: "Tratos", href: "/crm/tratos" },
      { key: "cotizaciones", label: "Cotizaciones", href: "/cotizaciones" },
      {
        key: "comisiones",
        label: "Comisiones",
        children: [
          { key: "comisiones-pipeline", label: "Pipeline", href: "/ventas" },
          { key: "comisiones-vendedores", label: "Vendedores", href: "/ventas/vendedores" },
          { key: "comisiones-reporte", label: "Reporte", href: "/ventas/reporte" },
          { key: "comisiones-config", label: "Configuración", href: "/ventas/config" },
        ],
      },
    ],
  },

  // ── PRODUCCIÓN ─────────────────────────────────────────────────────────────
  {
    key: "seccion-produccion",
    section: "PRODUCCIÓN",
    items: [
      { key: "operaciones", label: "Gestión Operativa", href: "/operaciones" },
      { key: "proyectos", label: "Proyectos", href: "/proyectos" },
      {
        key: "calendario",
        label: "Calendario de eventos",
        children: [
          { key: "calendario-vista", label: "Vista mensual", href: "/calendario" },
          { key: "calendario-reporte", label: "Reporte", href: "/calendario/reporte" },
        ],
      },
    ],
  },

  // ── INVENTARIO ─────────────────────────────────────────────────────────────
  {
    key: "seccion-inventario",
    section: "INVENTARIO",
    items: [
      { key: "inv-equipos", label: "Equipos", href: "/inventario/equipos" },
      { key: "inv-disponibilidad", label: "Disponibilidad", href: "/inventario/disponibilidad" },
      { key: "inv-mantenimiento", label: "Mantenimiento", href: "/inventario/mantenimiento" },
      { key: "inv-checklist", label: "Checklist semanal", href: "/inventario/checklist" },
      { key: "inv-plantillas", label: "Plantillas de equipo", href: "/inventario/bodega/templates" },
      { key: "bd-proveedores", label: "Proveedores", href: "/catalogo/proveedores" },
    ],
  },

  // ── FINANZAS ───────────────────────────────────────────────────────────────
  {
    key: "seccion-finanzas",
    section: "FINANZAS",
    items: [
      {
        key: "finanzas",
        label: "Finanzas",
        children: [
          { key: "finanzas-pagos", label: "Pagos de la semana", href: "/finanzas/pagos" },
          { key: "finanzas-gastos-op", label: "Gastos operativos", href: "/finanzas/gastos-operativos" },
          { key: "finanzas-movimientos", label: "Movimientos", href: "/finanzas/movimientos" },
          { key: "finanzas-cobros-pagos", label: "Cobros y pagos", href: "/finanzas/cobros-pagos" },
          { key: "finanzas-cuentas", label: "Cuentas bancarias", href: "/finanzas/cuentas" },
          { key: "finanzas-categorias", label: "Categorías", href: "/finanzas/categorias" },
          { key: "finanzas-reporte", label: "Reporte", href: "/finanzas/reporte" },
        ],
      },
    ],
  },

  // ── EQUIPO ─────────────────────────────────────────────────────────────────
  {
    key: "seccion-equipo",
    section: "EQUIPO",
    items: [
      {
        key: "rrhh",
        label: "Recursos Humanos",
        children: [
          { key: "rrhh-personal", label: "Personal interno", href: "/rrhh/personal" },
          { key: "bd-tecnicos", label: "Técnicos freelance", href: "/catalogo/tecnicos" },
          { key: "rrhh-nomina", label: "Nómina", href: "/rrhh/nomina" },
          { key: "rrhh-asistencia", label: "Asistencia", href: "/rrhh/asistencia" },
          { key: "rrhh-incidencias", label: "Incidencias", href: "/rrhh/incidencias" },
          { key: "rrhh-evaluaciones", label: "Evaluaciones", href: "/rrhh/evaluaciones" },
          { key: "bd-roles", label: "Roles técnicos", href: "/catalogo/roles" },
        ],
      },
      {
        key: "ats",
        label: "Reclutamiento",
        children: [
          { key: "rrhh-candidatos", label: "Candidatos", href: "/rrhh/candidatos" },
          { key: "rrhh-puestos", label: "Puestos ideales", href: "/rrhh/puestos" },
        ],
      },
    ],
  },

  // ── MARKETING ──────────────────────────────────────────────────────────────
  {
    key: "seccion-marketing",
    section: "MARKETING",
    items: [
      {
        key: "contenido-organico",
        label: "Contenido orgánico",
        children: [
          { key: "mkt-calendario", label: "Calendario", href: "/marketing/calendario" },
          { key: "mkt-contenidos", label: "Tipos de contenido", href: "/marketing/contenidos" },
          { key: "mkt-reporte", label: "Reporte", href: "/marketing/reporte" },
        ],
      },
      {
        key: "publicidad",
        label: "Publicidad",
        children: [
          { key: "mkt-campanas", label: "Campañas", href: "/marketing/campanas" },
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

interface SidebarProps {
  user: User;
  labels: Record<string, string>;
  privateModules: string[];
  userModuleKeys: string[] | null; // null = admin (all access)
}

function resolveLabel(key: string | undefined, defaultLabel: string, labels: Record<string, string>): string {
  if (key && labels[key]) return labels[key];
  return defaultLabel;
}

function canAccess(key: string | undefined, isAdmin: boolean, privateModules: string[], userModuleKeys: string[] | null): boolean {
  if (!key) return true;
  if (isAdmin) return true;
  if (!privateModules.includes(key)) return true;
  if (userModuleKeys === null) return true;
  return userModuleKeys.includes(key);
}

function getInitialOpen(pathname: string): Set<string> {
  const open = new Set<string>();
  if (pathname.startsWith("/ventas")) open.add("comisiones");
  if (pathname.startsWith("/finanzas")) open.add("finanzas");
  if (pathname.startsWith("/rrhh") || pathname.startsWith("/catalogo/tecnicos") || pathname.startsWith("/catalogo/roles")) open.add("rrhh");
  if (pathname.startsWith("/rrhh/candidatos") || pathname.startsWith("/rrhh/puestos")) open.add("ats");
  if (pathname.startsWith("/calendario")) open.add("calendario");
  if (pathname.startsWith("/marketing/campanas")) open.add("publicidad");
  if (pathname.startsWith("/marketing")) open.add("contenido-organico");
  return open;
}

export default function Sidebar({ user, labels, privateModules, userModuleKeys }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "ADMIN";
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => getInitialOpen(pathname));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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

  const navContent = (
    <>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map((section) => {
          const sectionLabel = resolveLabel(section.key, section.section, labels);
          const visibleItems = section.items.filter(item => {
            if (item.adminOnly && !isAdmin) return false;
            return canAccess(item.key, isAdmin, privateModules, userModuleKeys);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.key} className="mb-4">
              <p className="text-[#3a3a3a] text-[11px] font-bold uppercase tracking-widest px-3 mb-1.5">
                {sectionLabel}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const itemLabel = resolveLabel(item.key, item.label, labels);
                  if (item.children) {
                    const groupKey = item.key ?? item.label;
                    const isOpen = openGroups.has(groupKey);
                    const isGroupActive = item.children.some((c) => isActive(c.href));
                    return (
                      <div key={groupKey}>
                        <button
                          onClick={() => toggleGroup(groupKey)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                            isGroupActive
                              ? "text-[#B3985B]"
                              : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
                          }`}
                        >
                          <span>{itemLabel}</span>
                          <span className={`text-[9px] transition-transform opacity-40 ${isOpen ? "rotate-90" : ""}`}>▶</span>
                        </button>
                        {isOpen && (
                          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#1f1f1f] pl-3">
                            {item.children.map((child) => {
                              const childLabel = resolveLabel(child.key, child.label, labels);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                                    isActive(child.href)
                                      ? "text-[#B3985B] font-medium"
                                      : "text-[#5a6370] hover:text-white"
                                  }`}
                                >
                                  {childLabel}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive(item.href!)
                          ? "bg-[#1a1a1a] text-white"
                          : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
                      }`}
                    >
                      {itemLabel}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
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
    </>
  );

  return (
    <>
      {/* DESKTOP */}
      <aside className="hidden md:flex w-56 bg-[#0d0d0d] border-r border-[#1a1a1a] flex-col h-full shrink-0">
        <div className="px-4 py-4 border-b border-[#1a1a1a]">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo-icon.png" alt="Mainstage Pro" width={28} height={28} className="shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Mainstage Pro</p>
              <p className="text-[#555] text-[10px]">Sistema operativo</p>
            </div>
          </Link>
        </div>
        {navContent}
      </aside>

      {/* MOBILE: barra superior */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#0d0d0d] border-b border-[#1a1a1a] flex items-center px-3 gap-2">
        {/* Botón regresar — solo cuando no estamos en /dashboard */}
        {pathname !== "/dashboard" && (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-md text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors shrink-0"
            aria-label="Regresar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        {/* Logo — centrado cuando hay botón de regreso, a la izquierda cuando no */}
        <Link href="/dashboard" className={`flex-1 flex ${pathname !== "/dashboard" ? "justify-center" : "justify-start"}`}>
          <Image src="/logo-white.png" alt="Mainstage Pro" width={100} height={26} className="object-contain hover:opacity-80 transition-opacity" />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors shrink-0"
          aria-label="Abrir menú"
        >
          <span className="w-5 h-px bg-[#888] block" />
          <span className="w-5 h-px bg-[#888] block" />
          <span className="w-5 h-px bg-[#888] block" />
        </button>
      </header>

      {/* MOBILE: backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/70 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* MOBILE: drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo-icon.png" alt="Mainstage Pro" width={28} height={28} className="shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Mainstage Pro</p>
              <p className="text-[#555] text-[10px]">Sistema operativo</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors text-lg"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
        {navContent}
      </aside>
    </>
  );
}
