"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { Calendar, ClipboardList } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSemanaISO(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionInfo { id: string; name: string; role: string; area: string | null; }

interface ReporteItem {
  id: string;
  semana: number;
  anio: number;
  bienestar: number;
  logros: string;
  estado: string;
  createdAt: string;
  tareas: { titulo: string; fechaVencimiento: string | null }[] | null;
  tareasOperaciones: { titulo: string; accion: string; fechaComprometida?: string }[] | null;
  compromisosPlan: { templateNombre: string; accion: string; fechaComprometida?: string }[] | null;
  user: { id: string; name: string; area: string | null };
}

const BIENESTAR_LABEL: Record<number, { label: string; color: string }> = {
  1:  { label: "Muy pesado",  color: "bg-red-900/40 text-red-400" },
  2:  { label: "Muy pesado",  color: "bg-red-900/40 text-red-400" },
  3:  { label: "Pesado",      color: "bg-orange-900/40 text-orange-400" },
  4:  { label: "Pesado",      color: "bg-orange-900/40 text-orange-400" },
  5:  { label: "Regular",     color: "bg-yellow-900/40 text-yellow-400" },
  6:  { label: "Regular",     color: "bg-yellow-900/40 text-yellow-400" },
  7:  { label: "Bien",        color: "bg-blue-900/40 text-blue-400" },
  8:  { label: "Bien",        color: "bg-blue-900/40 text-blue-400" },
  9:  { label: "Excelente",   color: "bg-green-900/40 text-green-400" },
  10: { label: "Excelente",   color: "bg-green-900/40 text-green-400" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReporteSemanalHistorialPage() {
  const toast = useToast();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ISO week for today
  const semanaActual = getSemanaISO();
  const anioActual = new Date().getFullYear();

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then(d => {
        if (d?.id) setSession({ id: d.id, name: d.name, role: d.role ?? "USER", area: d.area ?? null });
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    fetch("/api/formularios/reporte-semanal", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setReportes(d.reportes ?? []))
      .catch(() => toast.error("Error al cargar reportes"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  // Reports from current ISO week
  const reportesSemanaActual = reportes.filter(
    r => r.semana === semanaActual && r.anio === anioActual
  );

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/formularios/reporte-semanal/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReportes(prev => prev.filter(r => r.id !== id));
        toast.success("Reporte eliminado");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/formularios"
              className="text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors"
            >
              Formularios
            </Link>
            <span className="text-gray-700 text-[10px]">/</span>
            <span className="text-[10px] text-gray-500">Reporte General Semanal</span>
          </div>
          <h1 className="ms-h1">Archivo de Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {reportes.length > 0
              ? `${reportes.length} reporte${reportes.length !== 1 ? "s" : ""} registrado${reportes.length !== 1 ? "s" : ""}`
              : "Aún no hay reportes"}
          </p>
        </div>
        <Link
          href="/formularios/reporte-semanal/nuevo"
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo reporte
        </Link>
      </div>

      {/* ── Vista de Lunes ── solo admin, reportes de semana actual */}
      {session?.role === "ADMIN" && reportesSemanaActual.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[#B3985B] font-bold text-sm"><Calendar strokeWidth={1.75} className="w-3.5 h-3.5" /> Compromisos para esta semana</span>
            <span className="text-[10px] text-gray-600 border border-[#2a2a2a] px-2 py-0.5 rounded-full">
              S{semanaActual} · {reportesSemanaActual.length} reporte{reportesSemanaActual.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {reportesSemanaActual.map(r => {
              const tareas = (r.tareas as { titulo: string; fechaVencimiento: string | null }[]) ?? [];
              const tareasOp = (r.tareasOperaciones as { titulo: string; accion: string; fechaComprometida?: string }[] | null) ?? [];
              const compPlan = (r.compromisosPlan as { templateNombre: string; accion: string; fechaComprometida?: string }[] | null) ?? [];
              const reagendadasOp = tareasOp.filter(t => t.accion === "reagendada");
              const reagendasPlan = compPlan.filter(c => c.accion === "reagendada");
              const hasPendientes = reagendadasOp.length > 0 || reagendasPlan.length > 0;
              return (
                <div key={r.id} className="ms-card rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white text-sm font-semibold">{r.user.name.split(" ")[0]}</p>
                      <p className="text-[10px] text-gray-600">{r.user.area ?? ""}</p>
                    </div>
                    {hasPendientes && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-900/20 border border-orange-900/30 text-orange-400">Con reagendados</span>
                    )}
                  </div>

                  {/* Tareas próxima semana */}
                  {tareas.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Compromisos semana</p>
                      <ul className="space-y-1">
                        {tareas.slice(0, 5).map((t, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-[#B3985B] text-[10px] mt-0.5 shrink-0">·</span>
                            <span className="text-xs text-gray-400 leading-snug">{t.titulo}</span>
                            {t.fechaVencimiento && <span className="text-[9px] text-gray-600 shrink-0 ml-auto">{t.fechaVencimiento}</span>}
                          </li>
                        ))}
                        {tareas.length > 5 && <li className="text-[10px] text-gray-600">+{tareas.length - 5} más</li>}
                      </ul>
                    </div>
                  )}

                  {/* Reagendados */}
                  {(reagendadasOp.length > 0 || reagendasPlan.length > 0) && (
                    <div className="border-t border-[#1a1a1a] pt-2 mt-2">
                      <p className="text-[9px] text-orange-400/70 uppercase tracking-wider mb-1.5">Reagendados</p>
                      <ul className="space-y-1">
                        {[...reagendadasOp.map(t => t.titulo), ...reagendasPlan.map(c => c.templateNombre)].slice(0, 4).map((nombre, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-orange-400/50 text-[10px] mt-0.5 shrink-0">↺</span>
                            <span className="text-xs text-gray-500 leading-snug">{nombre}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ms-card p-5 animate-pulse h-24" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && reportes.length === 0 && (
        <div className="ms-card rounded-2xl p-12 text-center">
          <ClipboardList strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-white font-semibold mb-1">Sin reportes aún</p>
          <p className="text-gray-500 text-sm mb-6">
            Comparte el link del formulario con tu equipo para que empiecen a reportar.
          </p>
          <Link
            href="/formularios/reporte-semanal/nuevo"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black px-4 py-2 rounded-lg transition-colors"
          >
            Llenar el primero
          </Link>
        </div>
      )}

      {/* Lista de reportes — agrupada por usuario */}
      {!loading && reportes.length > 0 && (() => {
        // Agrupar por usuario preservando orden de aparición
        const grupos = Object.values(
          reportes.reduce<Record<string, { user: ReporteItem["user"]; items: ReporteItem[] }>>((acc, r) => {
            if (!acc[r.user.id]) acc[r.user.id] = { user: r.user, items: [] };
            acc[r.user.id].items.push(r);
            return acc;
          }, {})
        ).sort((a, b) =>
          // El grupo cuyo reporte más reciente va primero
          new Date(b.items[0].createdAt).getTime() - new Date(a.items[0].createdAt).getTime()
        );

        return (
          <div className="space-y-8">
            {grupos.map(({ user, items }) => (
              <div key={user.id}>
                {/* Encabezado de usuario */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#B3985B]/15 border border-[#B3985B]/25 flex items-center justify-center shrink-0">
                    <span className="text-[#B3985B] text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{user.name}</p>
                    {user.area && (
                      <span className="text-[10px] text-gray-600 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full shrink-0">
                        {user.area}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-700 shrink-0">
                      {items.length} reporte{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-[#1e1e1e]" />
                </div>

                {/* Reportes de este usuario */}
                <div className="space-y-1.5 pl-11">
                  {items.map((r) => {
                    const bw = BIENESTAR_LABEL[r.bienestar] ?? { label: `${r.bienestar}/10`, color: "bg-gray-800 text-gray-400" };
                    const preview = r.logros?.slice(0, 100);
                    const isConfirming = confirmDelete === r.id;
                    const isDeleting = deleting === r.id;
                    return (
                      <div
                        key={r.id}
                        className="group flex items-stretch ms-card-hover transition-all"
                      >
                        <Link
                          href={`/formularios/reporte-semanal/${r.id}`}
                          className="flex-1 min-w-0 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white text-sm font-medium">
                                  Semana {r.semana} · {r.anio}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${bw.color}`}>
                                  {bw.label} {r.bienestar}/10
                                </span>
                              </div>
                              {preview && (
                                <p className="text-gray-500 text-xs truncate max-w-lg mt-0.5">
                                  {preview}{r.logros.length > 100 ? "…" : ""}
                                </p>
                              )}
                              <p className="text-gray-700 text-[10px] mt-0.5">{fmtDate(r.createdAt)}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-700 group-hover:text-[#B3985B] shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>

                        {/* Botón eliminar — solo admins */}
                        {session?.role === "ADMIN" && (
                          <div className="flex items-center pr-3 pl-2 border-l border-[#1a1a1a] shrink-0">
                            {isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  disabled={isDeleting}
                                  className="text-[11px] text-red-400 bg-red-900/20 border border-red-900/30 hover:bg-red-900/30 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                                >
                                  {isDeleting ? "…" : "¿Eliminar?"}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(r.id)}
                                title="Eliminar reporte"
                                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/15 transition-all"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}


    </div>
  );
}
