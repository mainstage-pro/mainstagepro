"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import BusquedaGlobal from "@/components/BusquedaGlobal";
import NotificacionesBell from "@/components/NotificacionesBell";

interface NavChild {
  key?: string;
  label: string;
  href: string;
  adminOnly?: boolean;
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
  // ── ACCESO GLOBAL (siempre visible, sin encabezado) ────────────────────────
  {
    key: "seccion-top",
    section: "",
    items: [
      { label: "Mi Dashboard", href: "/dashboard" },
      { key: "operaciones", label: "Gestión operativa", href: "/operaciones" },
    ],
  },

  // ── DIRECCIÓN ──────────────────────────────────────────────────────────────
  {
    key: "seccion-direccion",
    section: "Dirección",
    items: [
      { key: "reportes", label: "Reportes semanales", href: "/reportes" },
      { key: "presentaciones", label: "Presentaciones", href: "/presentaciones" },
      {
        key: "calendario",
        label: "Calendario de eventos",
        children: [
          { key: "calendario-vista", label: "Vista mensual", href: "/calendario" },
          { key: "calendario-reporte", label: "Reporte", href: "/calendario/reporte" },
        ],
      },
      { key: "admin-usuarios", label: "Usuarios y accesos", href: "/admin/usuarios", adminOnly: true },
      { key: "configuracion", label: "Configuración", href: "/admin/configuracion", adminOnly: true },
    ],
  },

  // ── ADMINISTRACIÓN ─────────────────────────────────────────────────────────
  {
    key: "seccion-administracion",
    section: "Administración",
    items: [
      {
        key: "finanzas",
        label: "Finanzas",
        children: [
          { key: "finanzas-cobros", label: "Cobros y pagos", href: "/finanzas/cobros-pagos" },
          { key: "finanzas-pagos-personal", label: "Pagos a personal", href: "/finanzas/pagos-personal" },
          { key: "finanzas-movimientos", label: "Movimientos", href: "/finanzas/movimientos" },
          { key: "finanzas-caja-chica", label: "Caja chica", href: "/finanzas/caja-chica" },
          { key: "finanzas-gastos-op", label: "Gastos operativos", href: "/finanzas/gastos-operativos" },
          { key: "finanzas-reporte", label: "Reporte y rentabilidad", href: "/finanzas/reporte" },
          { key: "finanzas-flujo", label: "Flujo proyectado", href: "/finanzas/flujo" },
        ],
      },
      {
        key: "rrhh",
        label: "Recursos Humanos",
        children: [
          { key: "rrhh-personal", label: "Personal interno", href: "/rrhh/personal" },
          { key: "rrhh-nomina", label: "Nómina", href: "/rrhh/nomina" },
          { key: "rrhh-asistencia", label: "Asistencia", href: "/rrhh/asistencia" },
          { key: "rrhh-incidencias", label: "Incidencias", href: "/rrhh/incidencias" },
          { key: "rrhh-evaluaciones", label: "Evaluaciones", href: "/rrhh/evaluaciones" },
          { key: "rrhh-onboarding", label: "Integración / Onboarding", href: "/rrhh/onboarding" },
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
      {
        key: "inversiones",
        label: "Inversiones y Socios",
        children: [
          { key: "inversiones-capital", label: "Estructura de Capital", href: "/finanzas/hervam" },
          { key: "inversiones-socios", label: "Socios de Activos", href: "/socios" },
        ],
      },
      { key: "tabulador", label: "Tabulador Freelancers", href: "/catalogo/roles" },
      { key: "inv-maestro", label: "Inventario maestro", href: "/inventario/maestro", adminOnly: true },
      { key: "grupos-equipo", label: "Grupos de equipo", href: "/admin/grupos-equipo", adminOnly: true },
    ],
  },

  // ── MARKETING ──────────────────────────────────────────────────────────────
  {
    key: "seccion-marketing",
    section: "Marketing",
    items: [
      {
        key: "contenido-organico",
        label: "Contenido orgánico",
        children: [
          { key: "mkt-calendario", label: "Calendario", href: "/marketing/calendario" },
          { key: "mkt-kanban", label: "Pipeline / Kanban", href: "/marketing/kanban" },
          { key: "mkt-levantamientos", label: "Levantamientos", href: "/marketing/levantamientos" },
          { key: "mkt-metricas", label: "Métricas orgánicas", href: "/marketing/metricas" },
          { key: "mkt-contenidos", label: "Tipos de contenido", href: "/marketing/contenidos" },
          { key: "mkt-reporte", label: "Reporte", href: "/marketing/reporte" },
        ],
      },
      {
        key: "publicidad",
        label: "Publicidad",
        children: [
          { key: "mkt-campanas-cal", label: "Calendario", href: "/marketing/campanas/calendario" },
          { key: "mkt-campanas", label: "Tipos de campaña", href: "/marketing/campanas" },
          { key: "mkt-meta-ads", label: "Meta Ads", href: "/marketing/meta-ads" },
        ],
      },
    ],
  },

  // ── VENTAS ─────────────────────────────────────────────────────────────────
  {
    key: "seccion-ventas",
    section: "Ventas",
    items: [
      { key: "crm-clientes",   label: "Clientes",            href: "/crm/clientes" },
      { key: "prospectos",      label: "Prospectos en frío",  href: "/prospectos" },
      { key: "crm-tratos",     label: "Tratos",              href: "/crm/tratos" },
      { key: "cotizaciones-plantillas", label: "Plantillas", href: "/cotizaciones/plantillas" },
      {
        key: "comisiones",
        label: "Comisiones",
        children: [
          { key: "comisiones-pipeline", label: "Pipeline", href: "/ventas" },
          { key: "comisiones-metas", label: "Metas outbound", href: "/ventas/metas" },
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
    section: "Producción",
    items: [
      { key: "proyectos", label: "Proyectos", href: "/proyectos" },
      { key: "ordenes-compra", label: "Órdenes de compra", href: "/operaciones/ordenes-compra" },
      {
        key: "inventario",
        label: "Inventario",
        children: [
          { key: "inv-equipos", label: "Equipos", href: "/inventario/equipos" },
          { key: "inv-disponibilidad", label: "Disponibilidad", href: "/inventario/disponibilidad" },
          { key: "inv-recolecciones", label: "Recolecciones", href: "/inventario/recolecciones" },
          { key: "inv-mantenimiento", label: "Mantenimiento", href: "/inventario/mantenimiento" },
          { key: "inv-checklist", label: "Checklist semanal", href: "/inventario/checklist" },
          { key: "inv-vehiculos", label: "Vehículos", href: "/catalogo/vehiculos" },
          { key: "inv-analisis", label: "Análisis de uso", href: "/inventario/analisis" },
        ],
      },
      {
        key: "catalogo",
        label: "Catálogo",
        children: [
          { key: "bd-empresas", label: "Empresas", href: "/catalogo/empresas" },
          { key: "bd-proveedores", label: "Proveedores", href: "/catalogo/proveedores" },
          { key: "bd-tecnicos", label: "Técnicos freelance", href: "/catalogo/tecnicos" },
          { key: "bd-venues", label: "Venues", href: "/catalogo/venues" },
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
  userModuleKeys: string[] | null; // null = admin (all access)
}

function resolveLabel(key: string | undefined, defaultLabel: string, labels: Record<string, string>): string {
  if (key && labels[key]) return labels[key];
  return defaultLabel;
}

function canAccess(key: string | undefined, isAdmin: boolean, userModuleKeys: string[] | null): boolean {
  if (!key) return true;
  if (isAdmin) return true;
  if (userModuleKeys === null) return true;
  return userModuleKeys.includes(key);
}

function getInitialOpen(pathname: string): Set<string> {
  const open = new Set<string>();
  if (pathname.startsWith("/ventas")) open.add("comisiones");
  if (pathname.startsWith("/finanzas")) open.add("finanzas");
  if (pathname.startsWith("/rrhh")) open.add("rrhh");
  if (pathname.startsWith("/rrhh/candidatos") || pathname.startsWith("/rrhh/puestos")) open.add("ats");
  if (pathname.startsWith("/socios")) open.add("socios");
  if (pathname.startsWith("/calendario")) open.add("calendario");
  if (pathname.startsWith("/inventario")) open.add("inventario");
  if (pathname.startsWith("/catalogo")) open.add("catalogo");
  if (pathname.startsWith("/marketing/campanas") || pathname.startsWith("/marketing/meta-ads")) open.add("publicidad");
  if (pathname.startsWith("/marketing")) open.add("contenido-organico");
  return open;
}

function getActiveSectionKey(pathname: string): string | null {
  if (pathname.startsWith("/reportes") || pathname.startsWith("/presentaciones") || pathname.startsWith("/calendario") || pathname.startsWith("/admin")) return "seccion-direccion";
  if (pathname.startsWith("/finanzas") || pathname.startsWith("/rrhh") || pathname.startsWith("/socios") || pathname.startsWith("/catalogo/roles")) return "seccion-administracion";
  if (pathname.startsWith("/marketing")) return "seccion-marketing";
  if (pathname.startsWith("/crm") || pathname.startsWith("/cotizaciones") || pathname.startsWith("/ventas") || pathname.startsWith("/prospectos")) return "seccion-ventas";
  if (pathname.startsWith("/proyectos") || pathname.startsWith("/inventario") || pathname.startsWith("/operaciones") || pathname.startsWith("/catalogo")) return "seccion-produccion";
  return null;
}

const ALL_SECTION_KEYS = NAV.filter(s => s.section).map(s => s.key);

export default function Sidebar({ user, labels, userModuleKeys }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "ADMIN";
  const storageKey = `sidebar-state-${user.id}`;

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => getInitialOpen(pathname));
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set<string>());
  const [stateLoaded, setStateLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const stored = JSON.parse(raw) as { openGroups?: string[]; openSections?: string[] };
        if (stored.openGroups)   setOpenGroups(new Set(stored.openGroups));
        if (stored.openSections) setOpenSections(new Set(stored.openSections));
      }
    } catch {}
    setStateLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist whenever state changes (after initial load)
  useEffect(() => {
    if (!stateLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        openGroups:   [...openGroups],
        openSections: [...openSections],
      }));
    } catch {}
  }, [openGroups, openSections, stateLoaded, storageKey]);

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

  function toggleSection(key: string) {
    setOpenSections(prev => {
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
            return canAccess(item.key, isAdmin, userModuleKeys);
          });
          if (visibleItems.length === 0) return null;

          const isSectionOpen = !section.section || openSections.has(section.key);
          const isSectionActive = section.section ? getActiveSectionKey(pathname) === section.key : false;

          return (
            <div key={section.key} className={section.section ? "mb-1" : "mb-2 pb-2 border-b border-[#1a1a1a]"}>
              {section.section && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-3 py-2 mb-0.5 rounded-md group hover:bg-[#151515] transition-colors"
                >
                  <span className={`text-sm font-semibold tracking-wide transition-colors ${
                    isSectionActive && !isSectionOpen ? "text-white" : "text-white/50 group-hover:text-white/80"
                  }`}>
                    {sectionLabel}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-transform shrink-0 ${isSectionOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {isSectionOpen && <div className="space-y-0.5">
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
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            isGroupActive
                              ? "text-white font-semibold"
                              : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
                          }`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                          <span className="flex-1 text-left">{itemLabel}</span>
                          <svg
                            className={`w-3 h-3 transition-transform shrink-0 opacity-40 ${isOpen ? "rotate-90" : ""}`}
                            fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#1f1f1f] pl-3">
                            {item.children.filter(c => !c.adminOnly || isAdmin).map((child) => {
                              const childLabel = resolveLabel(child.key, child.label, labels);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                                    isActive(child.href)
                                      ? "text-white font-semibold"
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive(item.href!)
                          ? "bg-[#1a1a1a] text-white font-semibold"
                          : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive(item.href!) ? "bg-[#B3985B]" : "bg-[#333]"}`} />
                      {itemLabel}
                    </Link>
                  );
                })}
              </div>}
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
              {user.role === "ADMIN" ? "Administrador" : user.role === "READONLY" ? "Solo lectura" : "Usuario"}
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
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity mb-3">
            <Image src="/logo-icon.png" alt="Mainstage Pro" width={28} height={28} className="shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Mainstage Pro</p>
              <p className="text-[#555] text-[10px]">Sistema operativo</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1"><BusquedaGlobal /></div>
            <NotificacionesBell />
          </div>
        </div>
        {navContent}
        <div className="px-3 py-3 border-t border-[#1a1a1a] shrink-0 space-y-1">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-full-task"))}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#B3985B] hover:bg-[#c9a96a] active:scale-95 text-black font-semibold text-sm transition-all"
            title="Nueva tarea"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva tarea
          </button>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[#444] hover:text-gray-400 hover:bg-[#1a1a1a] transition-colors text-xs"
            title="Ver atajos de teclado"
          >
            <span className="font-mono bg-[#1a1a1a] border border-[#333] rounded px-1 text-[10px]">?</span>
            <span>Atajos de teclado</span>
          </button>
        </div>
      </aside>

      {/* MOBILE: barra superior */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[60] h-14 bg-[#0d0d0d] border-b border-[#1a1a1a] flex items-center px-2 gap-1.5 max-w-full">
        {/* LEFT: menu + notifications */}
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors shrink-0"
          aria-label="Abrir menú"
        >
          <span className="w-5 h-px bg-[#888] block" />
          <span className="w-5 h-px bg-[#888] block" />
          <span className="w-5 h-px bg-[#888] block" />
        </button>
        <NotificacionesBell />
        {/* RIGHT: logo + new task */}
        <Link href="/dashboard" className="flex-1 flex min-w-0 justify-end">
          <Image src="/logo-white.png" alt="Mainstage Pro" width={88} height={22} className="object-contain hover:opacity-80 transition-opacity shrink-0" />
        </Link>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-full-task"))}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#B3985B] hover:bg-[#c9a96a] active:scale-95 text-black transition-all shrink-0"
          aria-label="Nueva tarea"
          title="Nueva tarea"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
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
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-[min(288px,90vw)] bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col transition-transform duration-300 ${
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
