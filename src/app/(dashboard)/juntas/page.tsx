"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  JUNTA_TEMPLATES,
  AREA_LABELS,
  AREA_COLORS,
  getLunesActual,
  combinarFechaHora,
  type AreaJunta,
} from "@/lib/junta-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

type Usuario = { id: string; name: string; area: string | null };

type JuntaResumen = {
  id: string;
  titulo: string;
  area: string;
  tipo: string;
  fecha: string;
  duracionMin: number;
  estado: string;
  facilitador: { id: string; name: string };
  participantes: { user: { id: string; name: string } }[];
  _count: { tareas: number; agendaItems: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
  });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  PROGRAMADA: { label: "Programada",  cls: "bg-blue-900/30 text-blue-400 border-blue-800/40" },
  EN_CURSO:   { label: "En curso",    cls: "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/40" },
  COMPLETADA: { label: "Completada",  cls: "bg-green-900/25 text-green-400 border-green-800/30" },
  CANCELADA:  { label: "Cancelada",   cls: "bg-red-900/25 text-red-400 border-red-800/30" },
};

// ─── Template selector cards ───────────────────────────────────────────────────

const TEMPLATE_CARDS = [
  { key: "GLOBAL_SEMANAL", label: "Global", sub: "Lunes 10:30 · Todo el equipo", area: "GLOBAL" as AreaJunta, tipo: "GLOBAL_SEMANAL" },
  { key: "ADMINISTRACION", label: "Administración", sub: "Área · 45 min", area: "ADMINISTRACION" as AreaJunta, tipo: "AREA_SEMANAL" },
  { key: "MARKETING",      label: "Marketing",      sub: "Área · 45 min", area: "MARKETING" as AreaJunta, tipo: "AREA_SEMANAL" },
  { key: "VENTAS",         label: "Ventas",          sub: "Área · 45 min", area: "VENTAS" as AreaJunta, tipo: "AREA_SEMANAL" },
  { key: "PRODUCCION",     label: "Producción",      sub: "Área · 45 min", area: "PRODUCCION" as AreaJunta, tipo: "AREA_SEMANAL" },
  { key: "DIRECCION",      label: "Dirección",       sub: "Estrategia · 45 min", area: "DIRECCION" as AreaJunta, tipo: "AREA_SEMANAL" },
  { key: "REVISION_MENSUAL", label: "Revisión mensual", sub: "Último viernes · 2 hrs", area: "GLOBAL" as AreaJunta, tipo: "REVISION_MENSUAL" },
  { key: "EXTRAORDINARIA",   label: "Extraordinaria", sub: "Convocada por evento",   area: "GLOBAL" as AreaJunta, tipo: "EXTRAORDINARIA" },
] as const;

// ─── Modal "Nueva Junta" ───────────────────────────────────────────────────────

function ModalNuevaJunta({
  usuarios,
  onClose,
  onCreated,
}: {
  usuarios: Usuario[];
  onClose: () => void;
  onCreated: (junta: JuntaResumen) => void;
}) {
  const lunes = getLunesActual();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [fecha, setFecha] = useState(lunes.toISOString().slice(0, 10));
  const [hora, setHora] = useState("10:30");
  const [participanteIds, setParticipanteIds] = useState<string[]>([]);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const template = selectedKey ? JUNTA_TEMPLATES[selectedKey] : null;
  const card = selectedKey ? TEMPLATE_CARDS.find((c) => c.key === selectedKey) : null;

  function toggleParticipante(uid: string) {
    setParticipanteIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  }

  async function handleCreate() {
    if (!selectedKey || !template) return;
    setSaving(true);
    const isoFecha = combinarFechaHora(new Date(fecha + "T12:00:00"), hora);
    const res = await fetch("/api/juntas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo:             card?.tipo ?? "EXTRAORDINARIA",
        area:             template.area,
        fecha:            isoFecha,
        duracionMin:      template.duracionMin,
        participanteIds,
        notas:            notas || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { junta } = await res.json();
      onCreated(junta);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <div>
            <p className="text-white font-semibold">Nueva junta</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {step === 1 ? "Selecciona el tipo de junta" : `${template?.nombre ?? selectedKey}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {step === 1 ? (
            /* ── Paso 1: seleccionar template ── */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATE_CARDS.map((tc) => {
                const colors = AREA_COLORS[tc.area];
                const isSelected = selectedKey === tc.key;
                return (
                  <button
                    key={tc.key}
                    onClick={() => { setSelectedKey(tc.key); const t = JUNTA_TEMPLATES[tc.key]; if (t) setHora(t.horaDefault); setStep(2); }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.border} border`
                        : "bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#333]"
                    }`}
                  >
                    <p className={`text-xs font-semibold ${isSelected ? colors.text : "text-white"}`}>{tc.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{tc.sub}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Paso 2: detalles ── */
            <>
              <button onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-white transition-colors">
                ← Cambiar tipo
              </button>

              {/* Fecha + hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Hora</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              </div>

              {/* Participantes */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">Participantes</label>
                <div className="flex flex-wrap gap-2">
                  {usuarios.map((u) => {
                    const sel = participanteIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleParticipante(u.id)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${
                          sel
                            ? "bg-[#B3985B]/20 border-[#B3985B]/50 text-[#B3985B]"
                            : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-400 hover:border-[#444]"
                        }`}
                      >
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notas previas */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notas previas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="¿Hay algo específico que quieras incluir en esta junta?"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none"
                />
              </div>

              {/* Agenda preview */}
              {template && (
                <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Agenda ({template.agendaItems.length} puntos)</p>
                  <div className="space-y-1">
                    {template.agendaItems.map((item) => (
                      <p key={item.orden} className="text-xs text-gray-400">
                        <span className="text-gray-600">{item.orden}.</span> {item.titulo}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:border-[#444] transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50 transition-colors"
                >
                  {saving ? "Creando..." : "Crear junta →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Junta Card ────────────────────────────────────────────────────────────────

function HistorialRow({ junta, colors, onDelete }: {
  junta: JuntaResumen;
  colors: { bg: string; text: string; border: string };
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmando) { setConfirmando(true); return; }
    await fetch(`/api/juntas/${junta.id}`, { method: "DELETE" });
    onDelete(junta.id);
  }

  return (
    <div
      onClick={() => router.push(`/juntas/${junta.id}/reporte`)}
      className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl hover:border-[#2a2a2a] cursor-pointer transition-colors"
    >
      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
        {AREA_LABELS[junta.area as AreaJunta]?.slice(0, 4).toUpperCase() ?? junta.area}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{junta.titulo}</p>
        <p className="text-[11px] text-gray-500">{fmtFecha(junta.fecha)}</p>
      </div>
      {junta._count.tareas > 0 && (
        <span className="text-[10px] text-gray-600 shrink-0">{junta._count.tareas} tareas</span>
      )}
      <button
        onClick={handleDelete}
        onBlur={() => setConfirmando(false)}
        className={`shrink-0 text-[10px] px-2 py-0.5 rounded transition-colors ${
          confirmando
            ? "bg-red-900/40 text-red-400 border border-red-800/50"
            : "text-gray-700 hover:text-red-400"
        }`}
      >
        {confirmando ? "¿Eliminar?" : "✕"}
      </button>
    </div>
  );
}

function JuntaCard({ junta, onInicio, onDelete }: {
  junta: JuntaResumen;
  onInicio?: () => void;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const colors = AREA_COLORS[junta.area as AreaJunta] ?? AREA_COLORS.GLOBAL;
  const badge = ESTADO_BADGE[junta.estado] ?? ESTADO_BADGE.PROGRAMADA;
  const esProgramada = junta.estado === "PROGRAMADA";
  const esEnCurso    = junta.estado === "EN_CURSO";

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmando) { setConfirmando(true); return; }
    await fetch(`/api/juntas/${junta.id}`, { method: "DELETE" });
    onDelete?.(junta.id);
  }

  return (
    <div
      onClick={() => router.push(`/juntas/${junta.id}`)}
      className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
            {AREA_LABELS[junta.area as AreaJunta] ?? junta.area}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[11px] text-gray-500">{fmtFecha(junta.fecha)} · {fmtHora(junta.fecha)}</p>
          <button
            onClick={handleDelete}
            onBlur={() => setConfirmando(false)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              confirmando
                ? "bg-red-900/40 text-red-400 border border-red-800/50"
                : "text-gray-700 hover:text-red-400"
            }`}
          >
            {confirmando ? "¿Eliminar?" : "✕"}
          </button>
        </div>
      </div>

      <p className="text-white text-sm font-medium mb-1 group-hover:text-[#B3985B] transition-colors">{junta.titulo}</p>
      <p className="text-gray-500 text-xs">{junta.duracionMin} min · {junta.facilitador.name}</p>

      {junta._count.tareas > 0 && (
        <p className="text-xs text-gray-600 mt-2">
          {junta._count.tareas} tarea{junta._count.tareas !== 1 ? "s" : ""} generada{junta._count.tareas !== 1 ? "s" : ""}
        </p>
      )}

      {(esProgramada || esEnCurso) && (
        <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
          <button
            onClick={(e) => { e.stopPropagation(); onInicio?.(); router.push(`/juntas/${junta.id}`); }}
            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              esEnCurso
                ? "bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/30 hover:bg-[#B3985B]/30"
                : "bg-[#1a1a1a] text-white hover:bg-[#222] border border-[#2a2a2a]"
            }`}
          >
            {esEnCurso ? "▶ Continuar junta" : "Iniciar junta →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JuntasPage() {
  const router = useRouter();
  const [juntas, setJuntas]       = useState<JuntaResumen[]>([]);
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtroArea, setFiltroArea] = useState<string>("TODOS");

  const cargar = useCallback(async () => {
    setLoading(true);
    const [jRes, uRes] = await Promise.all([
      fetch("/api/juntas").then((r) => r.json()),
      fetch("/api/usuarios-activos").then((r) => r.json()),
    ]);
    setJuntas(jRes.juntas ?? []);
    setUsuarios(uRes.usuarios ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const proximas   = juntas.filter((j) => j.estado === "PROGRAMADA" || j.estado === "EN_CURSO");
  const historial  = juntas.filter((j) => j.estado === "COMPLETADA" || j.estado === "CANCELADA");
  const histFiltro = filtroArea === "TODOS" ? historial : historial.filter((j) => j.area === filtroArea);

  // Semana actual en texto
  const lunes   = getLunesActual();
  const viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4);
  const semanaLabel = `${lunes.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${viernes.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Juntas</h1>
            <p className="text-gray-500 text-sm mt-1">Semana: {semanaLabel}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-[#B3985B] text-black font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-[#c9a96a] transition-colors"
          >
            <span className="text-base leading-none">+</span> Nueva junta
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-600 text-sm">Cargando juntas...</div>
      ) : (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Columna izquierda: Próximas ── */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Próximas / En curso</p>
            {proximas.length === 0 ? (
              <div className="bg-[#0d0d0d] border border-dashed border-[#1a1a1a] rounded-xl p-8 text-center">
                <p className="text-gray-600 text-sm">No hay juntas programadas</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-3 text-xs text-[#B3985B] hover:underline"
                >
                  Crear la primera →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {proximas.map((j) => (
                  <JuntaCard key={j.id} junta={j} onDelete={(id) => setJuntas((prev) => prev.filter((x) => x.id !== id))} />
                ))}
              </div>
            )}
          </div>

          {/* ── Columna derecha: Historial ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Historial</p>
              <select
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
                className="text-xs bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1 text-gray-400 focus:outline-none"
              >
                <option value="TODOS">Todas las áreas</option>
                {Object.entries(AREA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {histFiltro.length === 0 ? (
              <div className="bg-[#0d0d0d] border border-dashed border-[#1a1a1a] rounded-xl p-8 text-center">
                <p className="text-gray-600 text-sm">Sin historial aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {histFiltro.slice(0, 20).map((j) => {
                  const colors = AREA_COLORS[j.area as AreaJunta] ?? AREA_COLORS.GLOBAL;
                  return (
                    <HistorialRow
                      key={j.id}
                      junta={j}
                      colors={colors}
                      onDelete={(id) => setJuntas((prev) => prev.filter((x) => x.id !== id))}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <ModalNuevaJunta
          usuarios={usuarios}
          onClose={() => setModalOpen(false)}
          onCreated={(j) => {
            setModalOpen(false);
            router.push(`/juntas/${j.id}`);
          }}
        />
      )}
    </div>
  );
}
