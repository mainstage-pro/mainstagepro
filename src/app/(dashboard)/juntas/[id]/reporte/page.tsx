"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AREA_LABELS, AREA_COLORS, TIPO_AGENDA_LABELS, type AreaJunta, type TipoAgenda } from "@/lib/junta-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgendaItem = {
  id: string;
  orden: number;
  tipo: string;
  titulo: string;
  respuesta: string | null;
  completado: boolean;
};

type TemaAdicional = {
  id: string;
  titulo: string;
  notas: string | null;
  cubierto: boolean;
  pasadoSiguienteSemana: boolean;
};

type TareaJunta = {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
  proyectoTarea: { id: string; nombre: string } | null;
};

type Junta = {
  id: string;
  titulo: string;
  area: string;
  fecha: string;
  duracionMin: number;
  estado: string;
  notas: string | null;
  resumen: string | null;
  facilitador: { id: string; name: string };
  agendaItems: AgendaItem[];
  temasAdicionales: TemaAdicional[];
  participantes: { user: { id: string; name: string } }[];
  tareas: TareaJunta[];
};

type TareaContexto = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  estado: string;
  fechaVencimiento: string | null;
  asignadoA: { name: string } | null;
};

type ContextoJunta = {
  temasJunta: TareaContexto[];
  observaciones: TareaContexto[];
  tareasPendientes: TareaContexto[];
};

type ProyectoAgenda = {
  id: string;
  nombre: string;
  fechaEvento: string | null;
  lugarEvento: string | null;
  cliente: { nombre: string; empresa: string | null } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtVenc(iso: string | null): { label: string; cls: string } | null {
  if (!iso) return null;
  const d = new Date(iso); d.setHours(0,0,0,0);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (d < hoy) return { label: new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }), cls: "text-red-400" };
  return { label: new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }), cls: "text-gray-500" };
}

const PRIORIDAD_COLORS: Record<string, string> = {
  URGENTE: "text-red-400 bg-red-950/20 border-red-900/30",
  ALTA:    "text-orange-400 bg-orange-950/20 border-orange-900/30",
  MEDIA:   "text-[#B3985B] bg-yellow-950/10 border-yellow-900/20",
  BAJA:    "text-gray-500 bg-[#111] border-[#1e1e1e]",
};

const PRIO_DOT: Record<string, string> = {
  URGENTE: "bg-red-500", ALTA: "bg-orange-500", MEDIA: "bg-[#B3985B]", BAJA: "bg-gray-600",
};

function normalizarReconocimientos(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return (parsed as string[]).filter(Boolean);
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, string>;
      return Object.keys(obj).sort().map((k) => obj[k]).filter(Boolean);
    }
  } catch {}
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-[10px] font-bold text-[#B3985B] uppercase tracking-widest">{label}</p>
      {count !== undefined && (
        <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function TareaRow({ t }: { t: TareaContexto }) {
  const venc = fmtVenc(t.fechaVencimiento);
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 border-b border-[#1a1a1a] last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIO_DOT[t.prioridad] ?? "bg-gray-600"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white leading-snug">{t.titulo}</p>
        {t.descripcion && <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{t.descripcion}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {t.asignadoA && <span className="text-[10px] text-gray-500">{t.asignadoA.name}</span>}
          {venc && <span className={`text-[10px] ${venc.cls}`}>{venc.label}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Panel por tipo de agenda en el REPORTE ───────────────────────────────────

function PanelAgendaReporte({
  item,
  contexto,
  proyectosAgenda,
}: {
  item: AgendaItem;
  contexto: ContextoJunta | null;
  proyectosAgenda: { proximos: ProyectoAgenda[]; recientes: ProyectoAgenda[] } | null;
}) {
  const respuesta = item.respuesta;

  switch (item.tipo) {

    case "MODALIDAD": {
      if (!respuesta) return <p className="text-gray-700 text-xs italic">Sin modalidad registrada</p>;
      const MOD_MAP: Record<string, { emoji: string; label: string; sub: string }> = {
        PRESENCIAL: { emoji: "🟢", label: "Presencial",      sub: "Todos en el mismo espacio" },
        VIRTUAL:    { emoji: "🔵", label: "Virtual",         sub: "Por videollamada" },
        DOCUMENTO:  { emoji: "📄", label: "Solo documento",  sub: "Se comparte sin junta en vivo" },
      };
      const mod = MOD_MAP[respuesta];
      if (!mod) return <p className="text-gray-300 text-sm">{respuesta}</p>;
      return (
        <div className="inline-flex items-center gap-2 bg-[#141414] border border-[#222] rounded-lg px-3 py-2">
          <span className="text-base">{mod.emoji}</span>
          <div>
            <p className="text-sm text-white font-medium">{mod.label}</p>
            <p className="text-[10px] text-gray-600">{mod.sub}</p>
          </div>
        </div>
      );
    }

    case "RECONOCIMIENTO": {
      const recs = normalizarReconocimientos(respuesta);
      if (recs && recs.length > 0) {
        return (
          <ul className="space-y-1.5">
            {recs.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-[#B3985B] font-bold shrink-0">★</span>
                <span className="text-gray-300">{r}</span>
              </li>
            ))}
          </ul>
        );
      }
      return <p className="text-gray-700 text-xs italic">Sin reconocimientos registrados</p>;
    }

    case "EVENTOS_SEMANA": {
      const recientes = proyectosAgenda?.recientes ?? [];
      return (
        <div className="space-y-3">
          {/* Tabla de eventos recientes */}
          <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
            {recientes.length === 0 ? (
              <p className="text-gray-600 text-[11px] text-center py-4">Sin eventos cerrados esta semana</p>
            ) : (
              recientes.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1a1a1a] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{p.nombre}</p>
                    {p.lugarEvento && <p className="text-[10px] text-gray-600 truncate">{p.lugarEvento}</p>}
                  </div>
                  <p className="text-[10px] text-gray-600 shrink-0">
                    {p.fechaEvento ? new Date(p.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : ""}
                  </p>
                </div>
              ))
            )}
          </div>
          {/* Notas */}
          {respuesta && <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{respuesta}</p>}
        </div>
      );
    }

    case "PRIORIDADES_SEMANA": {
      const proximos = proyectosAgenda?.proximos ?? [];
      return (
        <div className="space-y-3">
          {proximos.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Eventos próximos</p>
              <div className="space-y-1.5">
                {proximos.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs leading-snug">{p.nombre}</p>
                      {p.cliente && (
                        <p className="text-gray-500 text-[10px]">{p.cliente.nombre}{p.cliente.empresa ? ` · ${p.cliente.empresa}` : ""}</p>
                      )}
                      <p className="text-[#C9A84C] text-[10px]">
                        {p.fechaEvento ? new Date(p.fechaEvento).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {respuesta && <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{respuesta}</p>}
        </div>
      );
    }

    case "TEMAS_JUNTA": {
      const items = contexto?.temasJunta ?? [];
      return (
        <div className="rounded-lg border border-[#1a1a1a] overflow-hidden">
          {items.length === 0 ? (
            <p className="text-gray-600 text-[11px] text-center py-5">Sin temas pendientes registrados</p>
          ) : (
            items.map((t) => <TareaRow key={t.id} t={t} />)
          )}
        </div>
      );
    }

    case "TAREAS_PENDIENTES": {
      const rawItems = contexto?.tareasPendientes ?? [];
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const tomorrow = new Date(hoy); tomorrow.setDate(hoy.getDate() + 1);
      const endOfWeek = new Date(hoy); endOfWeek.setDate(hoy.getDate() + 7);

      const groups = [
        { label: "Vencidas",    items: rawItems.filter((t) => t.fechaVencimiento && new Date(t.fechaVencimiento) < hoy), color: "text-red-400", dot: "bg-red-500" },
        { label: "Hoy",         items: rawItems.filter((t) => { if (!t.fechaVencimiento) return false; const d = new Date(t.fechaVencimiento); return d >= hoy && d < tomorrow; }), color: "text-yellow-400", dot: "bg-yellow-500" },
        { label: "Esta semana", items: rawItems.filter((t) => { if (!t.fechaVencimiento) return false; const d = new Date(t.fechaVencimiento); return d >= tomorrow && d <= endOfWeek; }), color: "text-gray-400", dot: "bg-gray-500" },
        { label: "Próximas",    items: rawItems.filter((t) => { if (!t.fechaVencimiento) return false; return new Date(t.fechaVencimiento) > endOfWeek; }), color: "text-gray-500", dot: "bg-gray-600" },
        { label: "Sin fecha",   items: rawItems.filter((t) => !t.fechaVencimiento), color: "text-gray-600", dot: "bg-gray-700" },
      ].filter((g) => g.items.length > 0);

      return (
        <div className="rounded-lg border border-[#1a1a1a] overflow-hidden">
          {groups.length === 0 ? (
            <p className="text-gray-600 text-[11px] text-center py-5">Sin tareas pendientes</p>
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0a] border-b border-[#1a1a1a]">
                  <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${g.color}`}>{g.label}</span>
                  <span className="text-[9px] text-gray-700 ml-1">({g.items.length})</span>
                </div>
                {g.items.map((t) => <TareaRow key={t.id} t={t} />)}
              </div>
            ))
          )}
        </div>
      );
    }

    case "OBSERVACIONES_OPERATIVAS": {
      const items = contexto?.observaciones ?? [];
      return (
        <div className="rounded-lg border border-[#1a1a1a] overflow-hidden">
          {items.length === 0 ? (
            <p className="text-gray-600 text-[11px] text-center py-5">Sin observaciones operativas</p>
          ) : (
            items.map((t) => <TareaRow key={t.id} t={t} />)
          )}
        </div>
      );
    }

    default:
      if (!respuesta) return <p className="text-gray-700 text-xs italic">Sin respuesta registrada</p>;
      return <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{respuesta}</p>;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReporteJuntaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [junta, setJunta]                   = useState<Junta | null>(null);
  const [loading, setLoading]               = useState(true);
  const [contexto, setContexto]             = useState<ContextoJunta | null>(null);
  const [proyectosAgenda, setProyectosAgenda] = useState<{ proximos: ProyectoAgenda[]; recientes: ProyectoAgenda[] } | null>(null);

  useEffect(() => {
    fetch(`/api/juntas/${id}`)
      .then((r) => r.json())
      .then((d) => { setJunta(d.junta ?? null); setLoading(false); });
  }, [id]);

  // Fetch contexto y agenda (mismos datos que el borrador)
  useEffect(() => {
    fetch(`/api/juntas/${id}/contexto`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setContexto(d); })
      .catch(() => {});
    fetch("/api/proyectos/agenda")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setProyectosAgenda(d); })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-600 text-sm">
        Cargando reporte...
      </div>
    );
  }

  if (!junta) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white">Junta no encontrada. <Link href="/juntas" className="text-[#B3985B]">Volver</Link></p>
      </div>
    );
  }

  const colors    = AREA_COLORS[junta.area as AreaJunta] ?? AREA_COLORS.GLOBAL;
  const areaLabel = AREA_LABELS[junta.area as AreaJunta] ?? junta.area;
  const participantesStr = junta.participantes.map((p) => p.user.name).join(", ") || "—";

  const itemsCubiertos   = junta.agendaItems.filter((i) => i.completado);
  const itemsSinCubrir   = junta.agendaItems.filter((i) => !i.completado);
  const temasCubiertos   = junta.temasAdicionales?.filter((t) => t.cubierto) ?? [];
  const temasNoCubiertos = junta.temasAdicionales?.filter((t) => !t.cubierto) ?? [];

  // Parsear notas en secciones si usan "## Título"
  function parseNotas(notas: string): { titulo: string; contenido: string }[] {
    const seccionRegex = /^#{1,3}\s+(.+)$/m;
    if (seccionRegex.test(notas)) {
      const bloques = notas.split(/^#{1,3}\s+/m).filter(Boolean);
      return bloques.map((bloque) => {
        const lineas = bloque.trim().split("\n");
        return { titulo: lineas[0].trim(), contenido: lineas.slice(1).join("\n").trim() };
      });
    }
    return [{ titulo: "", contenido: notas }];
  }

  const notasSecciones = junta.notas ? parseNotas(junta.notas) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white print:bg-white print:text-black">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#1a1a1a] flex items-center gap-4 flex-wrap print:hidden">
        <Link href="/juntas" className="text-gray-600 hover:text-white text-sm transition-colors">
          ← Juntas
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
              {areaLabel}
            </span>
            <span className="text-xs text-gray-600">REPORTE</span>
          </div>
          <h1 className="text-lg font-bold truncate">{junta.titulo}</h1>
          <p className="text-gray-500 text-xs">
            {fmtFecha(junta.fecha)} · {fmtHora(junta.fecha)} · {junta.facilitador.name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/juntas/${id}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:border-[#444] transition-colors"
          >
            ← Editar junta
          </Link>
          <button
            onClick={() => window.print()}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Duración",          val: `${junta.duracionMin} min` },
            { label: "Facilitador",       val: junta.facilitador.name },
            { label: "Agenda cubierta",   val: `${itemsCubiertos.length}/${junta.agendaItems.length}` },
            { label: "Tareas generadas",  val: String(junta.tareas.length) },
          ].map((item) => (
            <div key={item.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
              <p className="text-white font-semibold mt-1">{item.val}</p>
            </div>
          ))}
        </div>

        {participantesStr !== "—" && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Participantes</p>
            <p className="text-gray-300 text-sm">{participantesStr}</p>
          </div>
        )}

        {/* ── Agenda completa en orden (con contenido) ── */}
        <div>
          <SectionHeader label="Agenda" count={junta.agendaItems.length} />
          <div className="space-y-3">
            {[...junta.agendaItems]
              .sort((a, b) => a.orden - b.orden)
              .map((item) => {
                const tipoLabel = TIPO_AGENDA_LABELS[item.tipo as TipoAgenda] ?? item.tipo;
                const tieneContenido = !!item.respuesta;
                return (
                  <div key={item.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0d0d0d]">
                      <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                        item.completado ? 'text-emerald-500' : 'text-gray-600'
                      }`}>
                        {item.completado ? '✓' : '○'} {tipoLabel}
                      </span>
                      <p className="text-sm font-medium text-white">{item.titulo}</p>
                    </div>
                    <div className="px-4 py-3">
                      <PanelAgendaReporte
                        item={item}
                        contexto={contexto}
                        proyectosAgenda={proyectosAgenda}
                      />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* ── Temas adicionales cubiertos ── */}
        {temasCubiertos.length > 0 && (
          <div>
            <SectionHeader label="Temas adicionales tratados" count={temasCubiertos.length} />
            <div className="space-y-2">
              {temasCubiertos.map((t) => (
                <div key={t.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl px-4 py-3">
                  <p className="text-sm font-medium text-white">{t.titulo}</p>
                  {t.notas && <p className="text-gray-400 text-sm mt-1 whitespace-pre-wrap leading-relaxed">{t.notas}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Temas no tratados ── */}
        {temasNoCubiertos.length > 0 && (
          <div>
            <SectionHeader label="Pasan a siguiente semana" count={temasNoCubiertos.length} />
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden divide-y divide-[#0d0d0d]">
              {temasNoCubiertos.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="text-[10px] text-gray-600">→</span>
                  <p className="text-sm text-gray-500">{t.titulo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tareas generadas ── */}
        {junta.tareas.length > 0 && (
          <div>
            <SectionHeader label="Tareas generadas" count={junta.tareas.length} />
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-[#0d0d0d]">
                <span className="text-[10px] text-gray-600 uppercase">Tarea</span>
                <span className="text-[10px] text-gray-600 uppercase">Asignado</span>
                <span className="text-[10px] text-gray-600 uppercase">Prioridad</span>
                <span className="text-[10px] text-gray-600 uppercase">Fecha</span>
              </div>
              {junta.tareas.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-[#0d0d0d] last:border-0 hover:bg-[#0d0d0d] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{t.titulo}</p>
                    {t.proyectoTarea && <p className="text-[10px] text-gray-600 truncate">{t.proyectoTarea.nombre}</p>}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{t.asignadoA?.name ?? "—"}</span>
                  <span className={`text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded border ${PRIORIDAD_COLORS[t.prioridad] ?? "text-gray-500 bg-[#111] border-[#1e1e1e]"}`}>
                    {t.prioridad}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {t.fechaVencimiento ? new Date(t.fechaVencimiento).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Notas generales ── */}
        {junta.notas && (
          <div>
            <SectionHeader label="Notas de la junta" />
            <div className="space-y-3">
              {notasSecciones.map((sec, i) => (
                <div key={i} className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
                  {sec.titulo && (
                    <div className="px-4 py-2.5 border-b border-[#0d0d0d] bg-[#0d0d0d]">
                      <p className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">{sec.titulo}</p>
                    </div>
                  )}
                  <div className="px-4 py-4">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {sec.contenido || sec.titulo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#1a1a1a] pt-6 text-center">
          <p className="text-gray-700 text-xs">
            Reporte de junta · Mainstage Pro · {new Date().toLocaleDateString("es-MX")}
          </p>
          <Link href="/juntas" className="text-xs text-[#B3985B] hover:underline mt-1 inline-block">
            ← Ver todas las juntas
          </Link>
        </div>
      </div>
    </div>
  );
}
