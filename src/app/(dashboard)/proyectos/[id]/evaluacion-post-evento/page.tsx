"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  EVAL_SECCIONES,
  emptyEvalData,
  contarRespondidos,
  contarIncidencias,
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
  const cargado = useRef(false);

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
    cargado.current = true;
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

  const setLlenadoPor = (tecnicoId: string) => {
    const m = equipo.find(e => e.id === tecnicoId);
    actualizar(prev => ({ ...prev, llenadoPorId: tecnicoId || null, llenadoPorNombre: m?.nombre ?? null }));
  };

  if (loading) return <div className="p-6 text-center text-[#444] text-sm">Cargando...</div>;
  if (!proyecto) return <div className="p-6 text-center text-[#444]">Proyecto no encontrado</div>;

  const { respondidos, total } = contarRespondidos(data.items);
  const incidencias = contarIncidencias(data.items);

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const estadoTxt = estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : "";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">

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

      {/* Quién llena + resumen para junta */}
      <div className="ms-card-deep p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="flex items-end">
            {incidencias > 0 ? (
              <div className="w-full bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                <p className="text-red-300 text-sm font-semibold">{incidencias} punto{incidencias === 1 ? "" : "s"} a revisar en junta</p>
                <p className="text-red-400/60 text-[10px]">Incidencias o incumplimientos marcados</p>
              </div>
            ) : (
              <div className="w-full bg-green-950/20 border border-green-900/30 rounded-lg px-3 py-2">
                <p className="text-green-300 text-sm font-semibold">Sin incidencias marcadas</p>
                <p className="text-green-400/50 text-[10px]">Se completa conforme respondes</p>
              </div>
            )}
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

      {/* Secciones */}
      {EVAL_SECCIONES.map(seccion => (
        <div key={seccion.id}>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">{seccion.titulo}</p>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
          </div>
          {seccion.descripcion && <p className="text-[#555] text-xs -mt-2 mb-4">{seccion.descripcion}</p>}

          <div className="space-y-3">
            {seccion.items.map((item: EvalItem) => {
              const resp = data.items[item.id] ?? { valor: null, comentario: "" };
              return (
                <div key={item.id} className="ms-card-deep p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <p className="text-white text-sm flex-1 min-w-[180px]">{item.label}</p>
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

      {/* Comentarios finales del coordinador */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">Comentarios finales del coordinador</p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>
        <textarea
          value={data.comentariosFinales}
          onChange={e => actualizar(prev => ({ ...prev, comentariosFinales: e.target.value }))}
          placeholder="Conclusión general para la junta: qué salió bien, qué mejorar, acuerdos y responsables para el próximo evento…"
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
