"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NAV } from "@/lib/nav";
import { Pencil, Plus, X, Check, ChevronLeft, ChevronRight, Star } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = React.ComponentType<any>;

interface Mod {
  id: string; // href, identificador estable
  label: string;
  href: string;
  Icon: IconType;
  areaKey: string;
  area: string;
  accent: string;
}

// Metadatos por área: nombre visible y color de diferenciación.
const AREA_META: Record<string, { label: string; accent: string }> = {
  "seccion-top":            { label: "Inicio",         accent: "#B3985B" },
  "seccion-proyectos":      { label: "Proyectos",      accent: "#6366f1" },
  "seccion-direccion":      { label: "Dirección",      accent: "#a855f7" },
  "seccion-administracion": { label: "Administración", accent: "#10b981" },
  "seccion-marketing":      { label: "Marketing",      accent: "#ec4899" },
  "seccion-ventas":         { label: "Comercial",      accent: "#f59e0b" },
  "seccion-produccion":     { label: "Producción",     accent: "#06b6d4" },
  "seccion-config":         { label: "Configuración",  accent: "#64748b" },
};

// Catálogo de módulos derivado del mismo NAV del sidebar (items de primer nivel,
// con su icono original). Excluye la propia página de inicio.
const CATALOG: Mod[] = NAV.flatMap((section) => {
  const meta = AREA_META[section.key] ?? { label: section.section || "General", accent: "#B3985B" };
  return section.items
    .filter((it) => it.href && it.href !== "/inicio" && it.icon)
    .map<Mod>((it) => ({
      id: it.href!,
      label: it.label,
      href: it.href!,
      Icon: it.icon!,
      areaKey: section.key,
      area: meta.label,
      accent: meta.accent,
    }));
});

const BY_ID: Record<string, Mod> = Object.fromEntries(CATALOG.map((m) => [m.id, m]));

// Áreas en el mismo orden del sidebar, cada una con sus módulos.
const AREAS = NAV
  .map((s) => {
    const meta = AREA_META[s.key] ?? { label: s.section || "General", accent: "#B3985B" };
    return { key: s.key, label: meta.label, accent: meta.accent, mods: CATALOG.filter((m) => m.areaKey === s.key) };
  })
  .filter((a) => a.mods.length > 0);

// Accesos frecuentes por defecto (orden del sidebar): Dashboard, Gestión
// Operativa, Ventas, Equipos, Finanzas.
const DEFAULT_FAVS = ["/dashboard", "/gestion", "/crm/tratos", "/equipos", "/finanzas"];
const STORAGE_KEY = "inicio-favoritos-v1";

export default function InicioHome({ userName }: { userName: string }) {
  const [favs, setFavs] = useState<string[]>(DEFAULT_FAVS);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [greeting, setGreeting] = useState("Hola");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) setFavs(arr.filter((id) => BY_ID[id]));
      }
    } catch { /* ignore */ }
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(favs)); } catch { /* ignore */ }
  }, [favs, loaded]);

  const favMods = favs.map((id) => BY_ID[id]).filter(Boolean) as Mod[];

  function toggleFav(id: string) {
    setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function move(id: string, dir: -1 | 1) {
    setFavs((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const firstName = userName?.split(" ")[0] ?? "";

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
        {/* ── Encabezado ── */}
        <header className="mb-9 text-center">
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.18em] mb-1.5">Mainstage Pro</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-white/40 text-sm mt-1">Tus accesos frecuentes en un solo lugar.</p>
        </header>

        {/* ── Accesos frecuentes (editables) ── */}
        <section>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Star strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
              <h2 className="text-sm font-semibold tracking-wide">Accesos frecuentes</h2>
            </div>
            <div className="flex items-center gap-2">
              {editing && (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              )}
              <button
                onClick={() => setEditing((e) => !e)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  editing
                    ? "border-[#B3985B]/40 text-[#B3985B] bg-[#B3985B]/10"
                    : "border-[#222] text-white/50 hover:text-white hover:border-[#333]"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" /> {editing ? "Listo" : "Editar"}
              </button>
            </div>
          </div>

          {favMods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#222] p-8 text-center text-white/40 text-sm">
              Sin accesos. Usa <span className="text-[#B3985B]">Editar → Agregar</span> para elegir tus módulos frecuentes.
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {favMods.map((m, idx) => (
                <div key={m.id} className="relative group w-[150px] sm:w-[160px]">
                  <Link
                    href={m.href}
                    className={`flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl bg-gradient-to-b from-[#151515] to-[#0e0e0e] border border-[#1f1f1f] transition-all hover:-translate-y-0.5 hover:border-[#B3985B]/45 ${
                      editing ? "pointer-events-none opacity-90" : ""
                    }`}
                  >
                    <span
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${m.accent}1f`, color: m.accent }}
                    >
                      <m.Icon strokeWidth={1.75} className="w-[22px] h-[22px]" />
                    </span>
                    <span className="text-[13px] text-gray-200 text-center leading-tight">{m.label}</span>
                  </Link>

                  {editing && (
                    <div className="absolute inset-x-0 -bottom-3 flex items-center justify-center gap-1">
                      <button
                        onClick={() => move(m.id, -1)}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30"
                        title="Mover a la izquierda"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleFav(m.id)}
                        className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/25"
                        title="Quitar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => move(m.id, 1)}
                        disabled={idx === favMods.length - 1}
                        className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30"
                        title="Mover a la derecha"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Selector de accesos frecuentes ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-[#0d0d0d] border border-[#1f1f1f] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] shrink-0">
              <div>
                <h3 className="text-sm font-semibold">Elegir accesos frecuentes</h3>
                <p className="text-white/40 text-xs mt-0.5">Toca un módulo para agregarlo o quitarlo de la barra.</p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-[#1a1a1a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {AREAS.map((area) => (
                <div key={area.key}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: area.accent }} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/60">{area.label}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {area.mods.map((m) => {
                      const on = favs.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleFav(m.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors ${
                            on ? "border-[#B3985B]/50 bg-[#B3985B]/10" : "border-[#1a1a1a] bg-[#0f0f0f] hover:border-[#2a2a2a]"
                          }`}
                        >
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${area.accent}14`, color: area.accent }}
                          >
                            <m.Icon strokeWidth={1.75} className="w-4 h-4" />
                          </span>
                          <span className="text-xs text-gray-200 flex-1 leading-tight truncate">{m.label}</span>
                          {on && <Check className="w-4 h-4 text-[#B3985B] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3.5 border-t border-[#1a1a1a] flex items-center justify-between shrink-0">
              <span className="text-white/40 text-xs">{favs.length} seleccionados</span>
              <button
                onClick={() => setPickerOpen(false)}
                className="text-xs px-4 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black font-medium transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
