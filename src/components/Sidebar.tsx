"use client";

import React from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import BusquedaGlobal from "@/components/BusquedaGlobal";
import NotificacionesBell from "@/components/NotificacionesBell";
import { NAV, OWNER_EMAIL, type NavItem } from "@/lib/nav";
import { useNavConfig } from "@/components/nav/NavConfigProvider";
import { EditInput, useSingleDoubleClick } from "@/components/nav/editable";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  area?: string | null;
}

interface SidebarProps {
  user: User;
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

// Identificador estable de un item para orden y drag-and-drop.
function itemId(item: NavItem): string {
  return item.key ?? item.href ?? item.label;
}

// Aplica el orden guardado; los items ausentes conservan su posición original.
function applyOrder(items: NavItem[], ids?: string[]): NavItem[] {
  if (!ids || ids.length === 0) return items;
  const idx = new Map(ids.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = idx.has(itemId(a)) ? (idx.get(itemId(a)) as number) : Infinity;
    const bi = idx.has(itemId(b)) ? (idx.get(itemId(b)) as number) : Infinity;
    return ai - bi;
  });
}

const FolderIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

// Fila editable + arrastrable para admins. Un clic navega/expande; doble clic
// renombra. El drag se activa tras mover 6px, para no romper el clic.
function AdminNavItem({
  item,
  label,
  active,
  badgeCount,
  editing,
  isOpen,
  childrenNode,
  onToggle,
  onNavigate,
  onStartEdit,
  onCommit,
  onCancel,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  badgeCount: number;
  editing: boolean;
  isOpen: boolean;
  childrenNode: React.ReactNode;
  onToggle: () => void;
  onNavigate: () => void;
  onStartEdit: () => void;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const isGroup = !!(item.children && !item.href);
  const canEdit = !!item.key;
  const Icon = item.icon;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: itemId(item) });
  const handleClick = useSingleDoubleClick(
    () => (isGroup ? onToggle() : onNavigate()),
    () => (canEdit ? onStartEdit() : isGroup ? onToggle() : onNavigate()),
  );
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const dragProps = editing
    ? {}
    : { ...attributes, ...listeners, onClick: handleClick, role: "button", tabIndex: 0 };

  if (isGroup) {
    return (
      <div ref={setNodeRef} style={style}>
        <div
          {...dragProps}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer select-none touch-none ${
            active ? "text-white font-semibold" : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
          }`}
        >
          <FolderIcon />
          {editing ? (
            <EditInput initial={label} onCommit={onCommit} onCancel={onCancel} />
          ) : (
            <>
              <span className="flex-1 text-left">{label}</span>
              <svg
                className={`w-3 h-3 transition-transform shrink-0 opacity-40 ${isOpen ? "rotate-90" : ""}`}
                fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </div>
        {isOpen && !editing && childrenNode}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...dragProps}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer select-none touch-none ${
          active ? "bg-[#1a1a1a] text-white font-semibold" : "text-[#8b8f97] hover:text-white hover:bg-[#161616]"
        }`}
      >
        {Icon
          ? <Icon strokeWidth={1.75} className={`w-[18px] h-[18px] shrink-0 ${active ? "text-[#B3985B]" : "opacity-70"}`} />
          : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-[#B3985B]" : "bg-[#333]"}`} />
        }
        {editing ? (
          <EditInput initial={label} onCommit={onCommit} onCancel={onCancel} />
        ) : (
          <>
            <span className="flex-1">{label}</span>
            {badgeCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ user, userModuleKeys }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "ADMIN";
  const isOwner = user.email === OWNER_EMAIL;
  const storageKey = `sidebar-state-${user.id}`;
  const [badges, setBadges] = useState<Record<string, number>>({});

  const { labels, order, saveLabel, saveOrder } = useNavConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set<string>());
  const [stateLoaded, setStateLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const stored = JSON.parse(raw) as { openGroups?: string[] };
        if (stored.openGroups)   setOpenGroups(new Set(stored.openGroups));
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
      }));
    } catch {}
  }, [openGroups, stateLoaded, storageKey]);

  // Fetch badge counts
  useEffect(() => {
    const load = () => {
      fetch("/api/seguimientos/badge").then(r => r.ok ? r.json() : null).then(d => {
        if (d) setBadges(prev => ({ ...prev, seguimientos: d.urgentes ?? 0, leads: d.leads ?? 0 }));
      }).catch(() => {});
      fetch("/api/verificacion/count").then(r => r.ok ? r.json() : null).then(d => {
        if (d) setBadges(prev => ({ ...prev, verificacion: d.count ?? 0 }));
      }).catch(() => {});
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const AREA_DASHBOARD: Record<string, string> = {
    DIRECCION:      "/dashboard/direccion",
    ADMINISTRACION: "/dashboard/administracion",
    MARKETING:      "/dashboard/marketing",
    VENTAS:         "/dashboard/ventas",
    PRODUCCION:     "/dashboard/produccion",
    RRHH:           "/dashboard/rrhh",
  };
  const dashboardHref = (!isAdmin && user.area && AREA_DASHBOARD[user.area])
    ? AREA_DASHBOARD[user.area]
    : "/dashboard";

  function isActive(href: string) {
    const path = href.split("?")[0];
    if (path === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    return pathname === path || pathname.startsWith(path + "/");
  }

  // Un módulo con pestañas (item con `href` + `children`) se resalta también
  // cuando la ruta actual es la de alguna de sus secciones hijas.
  function isItemActive(item: { href?: string; children?: { href: string }[] }) {
    if (item.href && isActive(item.href)) return true;
    if (item.children) return item.children.some((c) => isActive(c.href));
    return false;
  }

  function onSectionDragEnd(sectionKey: string, items: NavItem[], e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map(itemId);
    const next = arrayMove(
      ids,
      ids.indexOf(active.id as string),
      ids.indexOf(over.id as string),
    );
    saveOrder(sectionKey, next);
  }

  // Renderiza las sub-secciones de un item de tipo grupo (children && !href).
  function groupChildrenNode(item: NavItem) {
    return (
      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#1f1f1f] pl-3">
        {(item.children ?? [])
          .filter(c => (!c.adminOnly || isAdmin) && (canAccess(c.accessKey ?? c.key, isAdmin, userModuleKeys) || canAccess(item.key, isAdmin, userModuleKeys)))
          .map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                isActive(child.href) ? "text-white font-semibold" : "text-[#5a6370] hover:text-white"
              }`}
            >
              {resolveLabel(child.key, child.label, labels)}
            </Link>
          ))}
      </div>
    );
  }

  function renderStaticItem(item: NavItem) {
    const itemLabel = resolveLabel(item.key, item.label, labels);
    if (item.children && !item.href) {
      const groupKey = item.key ?? item.label;
      const isOpen = openGroups.has(groupKey);
      const isGroupActive = item.children.some((c) => isActive(c.href));
      return (
        <div key={groupKey}>
          <button
            onClick={() => toggleGroup(groupKey)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isGroupActive ? "text-white font-semibold" : "text-[#6b7280] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <FolderIcon />
            <span className="flex-1 text-left">{itemLabel}</span>
            <svg
              className={`w-3 h-3 transition-transform shrink-0 opacity-40 ${isOpen ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {isOpen && groupChildrenNode(item)}
        </div>
      );
    }
    const href = item.href === "/dashboard" ? dashboardHref : item.href!;
    const badgeCount = item.badge ? (badges[item.badge] ?? 0) : 0;
    const Icon = item.icon;
    const active = isItemActive(item);
    return (
      <Link
        key={item.href}
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          active ? "bg-[#1a1a1a] text-white font-semibold" : "text-[#8b8f97] hover:text-white hover:bg-[#161616]"
        }`}
      >
        {Icon
          ? <Icon strokeWidth={1.75} className={`w-[18px] h-[18px] shrink-0 ${active ? "text-[#B3985B]" : "opacity-70"}`} />
          : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-[#B3985B]" : "bg-[#333]"}`} />
        }
        <span className="flex-1">{itemLabel}</span>
        {badgeCount > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </Link>
    );
  }

  const navContent = (
    <>
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {NAV.map((section) => {
          const sectionLabel = resolveLabel(section.key, section.section, labels);
          const visibleItems = section.items.filter(item => {
            if (item.ownerOnly && !isOwner) return false;
            if (item.adminOnly && !isAdmin) return false;
            if (canAccess(item.accessKey ?? item.key, isAdmin, userModuleKeys)) return true;
            if (item.children) {
              return item.children.some(c => (!c.adminOnly || isAdmin) && (canAccess(c.accessKey ?? c.key, isAdmin, userModuleKeys) || canAccess(item.key, isAdmin, userModuleKeys)));
            }
            return false;
          });
          if (visibleItems.length === 0) return null;

          const orderedItems = applyOrder(visibleItems, order[section.key]);

          return (
            <div key={section.key} className={section.section ? "mb-1" : "mb-2 pb-3 border-b border-[#1a1a1a]"}>
              {section.section && (
                <p className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  {sectionLabel}
                </p>
              )}
              {isAdmin ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => onSectionDragEnd(section.key, orderedItems, e)}
                >
                  <SortableContext items={orderedItems.map(itemId)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {orderedItems.map((item) => {
                        const isGroup = !!(item.children && !item.href);
                        const groupKey = item.key ?? item.label;
                        const href = item.href === "/dashboard" ? dashboardHref : (item.href ?? "");
                        const id = itemId(item);
                        return (
                          <AdminNavItem
                            key={id}
                            item={item}
                            label={resolveLabel(item.key, item.label, labels)}
                            active={isItemActive(item)}
                            badgeCount={item.badge ? (badges[item.badge] ?? 0) : 0}
                            editing={editingId === id}
                            isOpen={openGroups.has(groupKey)}
                            childrenNode={isGroup ? groupChildrenNode(item) : null}
                            onToggle={() => toggleGroup(groupKey)}
                            onNavigate={() => href && router.push(href)}
                            onStartEdit={() => setEditingId(id)}
                            onCommit={(v) => {
                              if (item.key) saveLabel(item.key, v);
                              setEditingId(null);
                            }}
                            onCancel={() => setEditingId(null)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="space-y-0.5">
                  {orderedItems.map((item) => renderStaticItem(item))}
                </div>
              )}
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
      <aside className="hidden md:flex w-64 bg-[#0d0d0d] border-r border-[#1a1a1a] flex-col h-full shrink-0">
        <div className="px-4 py-4 border-b border-[#1a1a1a]">
          <Link href={dashboardHref} className="flex items-center gap-2 hover:opacity-80 transition-opacity mb-3">
            <Image src="/logo-icon.png" alt="Mainstage Pro" width={28} height={28} className="shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Mainstage Pro</p>
              <p className="text-[#555] text-[10px]">Sistema Operativo</p>
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
        <Link href={dashboardHref} className="flex-1 flex min-w-0 justify-end">
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
          <Link href={dashboardHref} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo-icon.png" alt="Mainstage Pro" width={28} height={28} className="shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Mainstage Pro</p>
              <p className="text-[#555] text-[10px]">Sistema Operativo</p>
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
