"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  EVAL_SECCIONES,
  CALIF_DIMENSIONES,
  SECCION_CALIF_COLOR,
  SECCION_MEJORA_COLOR,
  emptyEvalData,
  contarRespondidos,
  contarIncidencias,
  promedioCalificaciones,
  nivelResultado,
  type EvalPostEventoData,
  type EvalItem,
  type RespValor,
} from "@/lib/evaluacion-post-evento";

type MiembroEquipo = { id: string; nombre: string; rol: string | null };

const OPCIONES: Record<"si-no" | "si-no-na", { valor: RespValor; label: string }[]> = {
  "si-no": [
    { valor: "si", label: "Sí" },
    { valor: "no", label: "No" },
  ],
  "si-no-na": [
    { valor: "si", label: "Sí" },
    { valor: "no", label: "No" },
    { valor: "na", label: "No fue necesario" },
  ],
};

function OpcionBtn({ activo, tono, label, onClick }: { activo: boolean; tono: "si" | "no" | "na"; label: string; onClick: () => void }) {
  const sel: Record<string, string> = {
    si: "bg-green-900/50 border-green-600 text-green-300",
    no: "bg-red-900/50 border-red-600 text-red-300",
    na: "bg-[#1a1a1a] border-[#3a3a3a] text-gray-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
        activo ? sel[tono] : "border-[#2a2a2a] text-[#666] hover:border-[#3a3a3a] hover:text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

function Estrellas({ valor, onChange, size = 22 }: { valor: number | null; onChange: (n: number | null) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const activa = (valor ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(valor === n ? null : n)}
            className="transition-transform hover:scale-110"
            aria-label={`${n} de 5`}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={activa ? "#FACC15" : "none"} stroke={activa ? "#FACC15" : "#3a3a3a"} strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function SeccionHeader({ titulo, descripcion, color, numero }: { titulo: string; descripcion?: string; color: string; numero: number }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {numero}
        </span>
        <h2 className="text-xl font-bold tracking-tight" style={{ color }}>{titulo}</h2>
        <div className="flex-1 h-px" style={{ backgroundColor: `${color}33` }} />
      </div>
      {descripcion && <p className="text-[#777] text-xs mt-2 ml-10">{descripcion}</p>}
    </div>
  );
}

export default function EvaluacionPostEventoPage() {
  const { id } = useParams<{ id: string }>();

  const [proyecto, setProyecto] = useState<{
    nombre: string; numeroProyecto: string; fechaEvento: string;
    lugarEvento?: string | null; estado: string; tipoServicio: string | null;
    cliente: { nombre: string };
  } | null>(null);
  const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);
  const [data, setData] = useState<EvalPostEventoData>(emptyEvalData());
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<"idle" | "saving" | "saved">("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async () => {
    const [resP, resE] = await Promise.all([
      fetch(`/api/proyectos/${id}`, { cache: "no-store" }),
      fetch(`/api/proyectos/${id}/evaluacion-post-evento`, { cache: "no-store" }),
    ]);
    const dp = await resP.json();
    const de = await resE.json();
    const p = dp.proyecto;
    setProyecto(p);

    // Equipo del proyecto (técnicos, sin duplicados por jornada).
    const vistos = new Set<string>();
    const miembros: MiembroEquipo[] = [];
    for (const per of p?.personal ?? []) {
      const t = per.tecnico;
      if (!t || vistos.has(t.id)) continue;
      vistos.add(t.id);
      miembros.push({ id: t.id, nombre: t.nombre, rol: per.rolTecnico?.nombre ?? t.rol?.nombre ?? null });
    }
    setEquipo(miembros);

    if (de.evaluacion) setData({ ...emptyEvalData(), ...de.evaluacion });
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const persistir = useCallback(async (next: EvalPostEventoData) => {
    setEstado("saving");
    const r = await fetch(`/api/proyectos/${id}/evaluacion-post-evento`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llenadoPorId: next.llenadoPorId,
        llenadoPorNombre: next.llenadoPorNombre,
        items: next.items,
        calificaciones: next.calificaciones,
        calificacionFinal: next.calificacionFinal,
        propuestasMejora: next.propuestasMejora,
        comentariosFinales: next.comentariosFinales,
      }),
    });
    if (r.ok) {
      const d = await r.json();
      setData(prev => ({ ...prev, respondidoEn: d.evaluacion.respondidoEn, actualizadoEn: d.evaluacion.actualizadoEn }));
      setEstado("saved");
    } else {
      setEstado("idle");
    }
  }, [id]);

  // Auto-guardado con debounce ante cualquier cambio.
  const actualizar = useCallback((updater: (prev: EvalPostEventoData) => EvalPostEventoData) => {
    setData(prev => {
      const next = updater(prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { persistir(next); }, 800);
      return next;
    });
  }, [persistir]);

  const setValor = (itemId: string, valor: RespValor) => {
    actualizar(prev => {
      const actual = prev.items[itemId] ?? { valor: null, comentario: "" };
      const nuevoValor = actual.valor === valor ? null : valor;
      return { ...prev, items: { ...prev.items, [itemId]: { ...actual, valor: nuevoValor } } };
    });
  };

  const setComentario = (itemId: string, comentario: string) => {
    actualizar(prev => {
      const actual = prev.items[itemId] ?? { valor: null, comentario: "" };
      return { ...prev, items: { ...prev.items, [itemId]: { ...actual, comentario } } };
    });
  };

  const setCalif = (dimId: string, n: number | null) =>
    actualizar(prev => ({ ...prev, calificaciones: { ...prev.calificaciones, [dimId]: n } }));

  const setCalifFinal = (n: number | null) => actualizar(prev => ({ ...prev, calificacionFinal: n }));

  const setPropuesta = (i: number, val: string) =>
    actualizar(prev => ({ ...prev, propuestasMejora: prev.propuestasMejora.map((p, idx) => (idx === i ? val : p)) }));
  const addPropuesta = () => actualizar(prev => ({ ...prev, propuestasMejora: [...prev.propuestasMejora, ""] }));
  const removePropuesta = (i: number) =>
    actualizar(prev => ({ ...prev, propuestasMejora: prev.propuestasMejora.filter((_, idx) => idx !== i) }));

  const setLlenadoPor = (tecnicoId: string) => {
    const m = equipo.find(e => e.id === tecnicoId);
    actualizar(prev => ({ ...prev, llenadoPorId: tecnicoId || null, llenadoPorNombre: m?.nombre ?? null }));
  };

  if (loading) return <div className="p-6 text-center text-[#444] text-sm">Cargando...</div>;
  if (!proyecto) return <div className="p-6 text-center text-[#444]">Proyecto no encontrado</div>;

  const { respondidos, total } = contarRespondidos(data.items);
  const incidencias = contarIncidencias(data.items);
  const promOperacion = promedioCalificaciones(data.calificaciones);
  const nivelOperacion = nivelResultado(promOperacion);
  const nivelFinal = nivelResultado(data.calificacionFinal);

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const estadoTxt = estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : "";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-xs">
              ← {proyecto.numeroProyecto}
            </Link>
            <span className="text-[#333]">/</span>
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Evaluación Post Evento</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{proyecto.nombre}</h1>
          <p className="text-[#555] text-sm mt-0.5">{proyecto.cliente.nombre} · {fmtDate(proyecto.fechaEvento)}</p>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <div className="ms-card px-4 py-2">
            <p className="text-white text-lg font-bold">{respondidos}<span className="text-[#444] text-sm">/{total}</span></p>
            <p className="text-[#444] text-[10px]">respondidos</p>
          </div>
          <p className={`text-[10px] h-3 ${estado === "saving" ? "text-[#666]" : "text-green-500"}`}>{estadoTxt}</p>
        </div>
      </div>

      {/* Quién llena + tablero de resultados para junta */}
      <div className="ms-card-deep p-4 space-y-4">
        <div>
          <label className="block text-[10px] text-[#666] uppercase tracking-wider mb-1.5">¿Quién realiza la evaluación?</label>
          <select
            value={data.llenadoPorId ?? ""}
            onChange={e => setLlenadoPor(e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50"
          >
            <option value="">Selecciona un miembro del equipo…</option>
            {equipo.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}{m.rol ? ` · ${m.rol}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Resultado operación */}
          <div className="rounded-lg px-3 py-2.5 border" style={{ backgroundColor: `${nivelOperacion.color}14`, borderColor: `${nivelOperacion.color}40` }}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: `${nivelOperacion.color}cc` }}>Operación y coordinación</p>
            <p className="text-lg font-bold" style={{ color: nivelOperacion.color }}>
              {promOperacion ? `${promOperacion.toFixed(1)}/5` : "—"} <span className="text-xs font-medium">{nivelOperacion.label}</span>
            </p>
          </div>
          {/* Calificación final */}
          <div className="rounded-lg px-3 py-2.5 border" style={{ backgroundColor: `${nivelFinal.color}14`, borderColor: `${nivelFinal.color}40` }}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: `${nivelFinal.color}cc` }}>Calificación final</p>
            <p className="text-lg font-bold" style={{ color: nivelFinal.color }}>
              {data.calificacionFinal ? `${data.calificacionFinal}/5` : "—"} <span className="text-xs font-medium">{nivelFinal.label}</span>
            </p>
          </div>
          {/* Incidencias */}
          <div
            className="rounded-lg px-3 py-2.5 border"
            style={incidencias > 0
              ? { backgroundColor: "#F8717114", borderColor: "#F8717140" }
              : { backgroundColor: "#34D39914", borderColor: "#34D39940" }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: incidencias > 0 ? "#F87171cc" : "#34D399cc" }}>Puntos a revisar</p>
            <p className="text-lg font-bold" style={{ color: incidencias > 0 ? "#F87171" : "#34D399" }}>
              {incidencias > 0 ? incidencias : "0"} <span className="text-xs font-medium">{incidencias > 0 ? "en junta" : "sin incidencias"}</span>
            </p>
          </div>
        </div>
        {data.respondidoEn && (
          <p className="text-[#444] text-[11px]">
            Iniciada el {new Date(data.respondidoEn).toLocaleString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {data.actualizadoEn && data.actualizadoEn !== data.respondidoEn && (
              <> · última edición {new Date(data.actualizadoEn).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        )}
      </div>

      {/* Secciones Sí/No */}
      {EVAL_SECCIONES.map((seccion, sIdx) => (
        <div key={seccion.id}>
          <SeccionHeader titulo={seccion.titulo} descripcion={seccion.descripcion} color={seccion.color} numero={sIdx + 1} />
          <div className="space-y-3">
            {seccion.items.map((item: EvalItem) => {
              const resp = data.items[item.id] ?? { valor: null, comentario: "" };
              return (
                <div key={item.id} className="ms-card-deep p-4 border-l-2" style={{ borderLeftColor: `${seccion.color}66` }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      {item.desc && <p className="text-[#666] text-xs mt-0.5">{item.desc}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {OPCIONES[item.tipo].map(op => (
                        <OpcionBtn
                          key={op.valor}
                          activo={resp.valor === op.valor}
                          tono={op.valor}
                          label={op.label}
                          onClick={() => setValor(item.id, op.valor)}
                        />
                      ))}
                    </div>
                  </div>
                  <input
                    value={resp.comentario}
                    onChange={e => setComentario(item.id, e.target.value)}
                    placeholder="Comentarios (opcional)"
                    className="w-full mt-3 bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Calificación de la operación (estrellas) */}
      <div>
        <SeccionHeader
          titulo="Calificación de la operación"
          descripcion="Califica cada dimensión de 1 a 5 estrellas. El promedio define el resultado de operación y coordinación."
          color={SECCION_CALIF_COLOR}
          numero={EVAL_SECCIONES.length + 1}
        />
        <div className="space-y-3">
          {CALIF_DIMENSIONES.map(dim => (
            <div key={dim.id} className="ms-card-deep p-4 border-l-2 flex items-center justify-between gap-4 flex-wrap" style={{ borderLeftColor: `${SECCION_CALIF_COLOR}66` }}>
              <div className="flex-1 min-w-[180px]">
                <p className="text-white text-sm font-medium">{dim.label}</p>
                <p className="text-[#666] text-xs mt-0.5">{dim.desc}</p>
              </div>
              <Estrellas valor={data.calificaciones[dim.id] ?? null} onChange={n => setCalif(dim.id, n)} />
            </div>
          ))}
        </div>
      </div>

      {/* Calificación final del coordinador */}
      <div>
        <SeccionHeader
          titulo="Calificación final del coordinador"
          descripcion="Tu valoración global del evento, considerando operación, coordinación y resultado."
          color={SECCION_MEJORA_COLOR}
          numero={EVAL_SECCIONES.length + 2}
        />
        <div className="ms-card-deep p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-medium">¿Cómo calificarías el evento en general?</p>
            <p className="text-[#666] text-xs mt-0.5">1 = deficiente · 5 = excelente</p>
          </div>
          <div className="flex items-center gap-4">
            <Estrellas valor={data.calificacionFinal} onChange={setCalifFinal} size={30} />
            {data.calificacionFinal && (
              <span className="text-2xl font-bold" style={{ color: nivelFinal.color }}>{data.calificacionFinal}<span className="text-sm text-[#555]">/5</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Propuestas de mejora */}
      <div>
        <SeccionHeader
          titulo="Propuestas de mejora"
          descripcion="Acciones concretas para el próximo evento. Agrega una por línea."
          color={SECCION_MEJORA_COLOR}
          numero={EVAL_SECCIONES.length + 3}
        />
        <div className="space-y-2">
          {data.propuestasMejora.length === 0 && (
            <p className="text-[#555] text-sm">Aún no hay propuestas. Agrega la primera abajo.</p>
          )}
          {data.propuestasMejora.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#B3985B] text-sm shrink-0 w-5 text-center">{i + 1}.</span>
              <input
                value={p}
                onChange={e => setPropuesta(i, e.target.value)}
                placeholder="Ej. Confirmar viáticos 48 h antes del evento"
                className="flex-1 bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50"
              />
              <button type="button" onClick={() => removePropuesta(i)} className="text-[#444] hover:text-red-400 text-xs shrink-0 px-2">Eliminar</button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPropuesta}
            className="mt-1 text-xs text-[#B3985B] hover:text-white border border-dashed border-[#333] hover:border-[#B3985B]/50 rounded-lg px-3 py-2 transition-colors"
          >
            + Agregar propuesta
          </button>
        </div>
      </div>

      {/* Comentarios finales del coordinador */}
      <div>
        <SeccionHeader
          titulo="Comentarios finales del coordinador"
          descripcion="Conclusión general para la junta: qué salió bien, qué mejorar, acuerdos y responsables."
          color={SECCION_MEJORA_COLOR}
          numero={EVAL_SECCIONES.length + 4}
        />
        <textarea
          value={data.comentariosFinales}
          onChange={e => actualizar(prev => ({ ...prev, comentariosFinales: e.target.value }))}
          placeholder="Escribe la conclusión general del evento para presentar en la junta…"
          rows={5}
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none"
        />
      </div>

      {/* Pie */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#1a1a1a]">
        <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-sm">← Volver al proyecto</Link>
        <span className="text-[#444] text-xs">{estado === "saving" ? "Guardando cambios…" : "Los cambios se guardan automáticamente"}</span>
      </div>

    </div>
  );
}
