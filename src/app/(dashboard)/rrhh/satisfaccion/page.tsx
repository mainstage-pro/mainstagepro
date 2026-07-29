"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { SECCIONES, type Respuestas } from "@/lib/satisfaccion-form";

type PersonalOption = { id: string; nombre: string; puesto: string; departamento: string; tipo: string; activo?: boolean };

type Encuesta = {
  id: string;
  periodo: string;
  token: string;
  respondida: boolean;
  respondidaEn?: string | null;
  promedioCalculado?: number | null;
  probabilidadRecomendar?: number | null;
  respuestas?: Respuestas | null;
  loMejor?: string | null;
  loMejorable?: string | null;
  comentarios?: string | null;
  personal: { id: string; nombre: string; puesto: string; departamento: string; tipo: string };
};

function RespuestasDetalle({ respuestas }: { respuestas: Respuestas }) {
  return (
    <div className="space-y-3">
      {SECCIONES.map(sec => {
        const contestadas = sec.preguntas.filter(p => {
          const v = respuestas[p.id];
          return v != null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
        });
        if (contestadas.length === 0) return null;
        return (
          <div key={sec.id}>
            <p className="text-[10px] text-[#B3985B] font-bold uppercase tracking-wider mb-1.5">{sec.titulo}</p>
            <div className="space-y-2">
              {contestadas.map(p => {
                const v = respuestas[p.id]!;
                return (
                  <div key={p.id}>
                    <p className="text-[#555] text-xs">{p.label}</p>
                    <p className="text-gray-300 text-sm">
                      {p.tipo === "scale5" ? `${v}/5`
                        : Array.isArray(v) ? v.join(", ")
                        : String(v)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DEPT_LABEL: Record<string, string> = {
  BODEGA: "Bodega", COORDINACION: "Coordinación", PRODUCCION: "Producción",
  ADMINISTRACION: "Administración", VENTAS: "Ventas", GENERAL: "General",
};

function periodoActual() {
  const d = new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q}-${d.getFullYear()}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? "text-green-400 bg-green-900/20 border-green-900/40"
    : score >= 6 ? "text-yellow-400 bg-yellow-900/20 border-yellow-900/40"
    : "text-red-400 bg-red-900/20 border-red-900/40";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

export default function SatisfaccionPage() {
  const toast = useToast();
  const [periodo, setPeriodo] = useState(periodoActual);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [personal, setPersonal] = useState<PersonalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const linkPublico = typeof window !== "undefined" ? `${window.location.origin}/satisfaccion` : "/satisfaccion";

  const cargar = useCallback(async () => {
    setLoading(true);
    // Todas las encuestas (todos los períodos) para armar el expediente por miembro
    const r = await fetch("/api/rrhh/encuestas-satisfaccion");
    const d = await r.json();
    setEncuestas(d.encuestas ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch("/api/rrhh/personal").then(r => r.json()).then(d =>
      setPersonal((d.personal ?? []).filter((p: PersonalOption) => p.activo !== false))
    );
  }, []);

  const copiarLink = () => {
    navigator.clipboard.writeText(linkPublico).then(() => {
      setLinkCopiado(true);
      toast.success("Link copiado al portapapeles");
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  };

  const eliminar = async (id: string) => {
    const r = await fetch(`/api/rrhh/encuestas-satisfaccion?id=${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Respuesta eliminada"); await cargar(); }
  };

  // Stats del período seleccionado
  const delPeriodo = encuestas.filter(e => e.periodo === periodo);
  const respondidasPeriodo = delPeriodo.filter(e => e.respondida && e.promedioCalculado != null);
  const promedioPeriodo = respondidasPeriodo.length > 0
    ? respondidasPeriodo.reduce((s, e) => s + (e.promedioCalculado ?? 0), 0) / respondidasPeriodo.length
    : null;
  const animoPeriodo = (() => {
    const a = delPeriodo.filter(e => e.respondida && e.probabilidadRecomendar != null);
    return a.length > 0 ? a.reduce((s, e) => s + (e.probabilidadRecomendar ?? 0), 0) / a.length : null;
  })();

  // Expediente por miembro: agrupa respuestas por persona (todos los períodos)
  const porPersona = new Map<string, Encuesta[]>();
  for (const e of encuestas.filter(e => e.respondida)) {
    const arr = porPersona.get(e.personal.id) ?? [];
    arr.push(e);
    porPersona.set(e.personal.id, arr);
  }

  const expedientes = personal.map(p => {
    const respuestas = (porPersona.get(p.id) ?? []).sort((a, b) => b.periodo.localeCompare(a.periodo));
    const conProm = respuestas.filter(r => r.promedioCalculado != null);
    const promedio = conProm.length > 0 ? conProm.reduce((s, r) => s + (r.promedioCalculado ?? 0), 0) / conProm.length : null;
    const ultima = respuestas[0] ?? null;
    const respondioPeriodo = respuestas.some(r => r.periodo === periodo);
    return { persona: p, respuestas, promedio, ultima, respondioPeriodo };
  }).sort((a, b) => {
    // Con respuestas primero, luego por nombre
    if ((b.respuestas.length > 0 ? 1 : 0) !== (a.respuestas.length > 0 ? 1 : 0)) {
      return (b.respuestas.length > 0 ? 1 : 0) - (a.respuestas.length > 0 ? 1 : 0);
    }
    return a.persona.nombre.localeCompare(b.persona.nombre);
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">RR.HH. · Satisfacción</p>
        <h1 className="ms-h1">Encuestas de Satisfacción</h1>
        <p className="ms-subtitle mt-1">Pulso del equipo por período</p>
      </div>

      {/* Acceso directo — ruta única del formulario */}
      <div className="ms-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white text-sm font-semibold">Link de la encuesta</p>
            <p className="text-[#555] text-xs mt-0.5">Comparte este único link con el equipo. Cada quien selecciona su nombre y responde.</p>
          </div>
          <a
            href="/satisfaccion"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[#B3985B] text-xs font-semibold hover:underline"
          >
            Abrir formulario →
          </a>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-[#888] text-xs break-all">{linkPublico}</code>
          <button
            onClick={copiarLink}
            className="shrink-0 bg-[#B3985B] hover:bg-[#c9aa6a] text-black text-xs font-semibold px-4 py-2 rounded-lg transition-all"
          >
            {linkCopiado ? "¡Copiado!" : "Copiar link"}
          </button>
        </div>
      </div>

      {/* Selector período */}
      <div className="flex items-center gap-3 ms-card px-4 py-3">
        <label className="text-[#555] text-xs uppercase tracking-wider font-bold">Período</label>
        <input
          type="text"
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          placeholder="Q1-2026"
          className="flex-1 bg-transparent text-white text-sm focus:outline-none"
        />
        {promedioPeriodo != null && <ScoreBadge score={promedioPeriodo} />}
        <span className="text-[#444] text-xs">{respondidasPeriodo.length} respondidas</span>
      </div>

      {/* Stats del período */}
      {respondidasPeriodo.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="ms-stat-card text-center">
            <p className={`text-2xl font-bold ${promedioPeriodo != null && promedioPeriodo >= 8 ? "text-green-400" : promedioPeriodo != null && promedioPeriodo >= 6 ? "text-yellow-400" : "text-red-400"}`}>
              {promedioPeriodo?.toFixed(1) ?? "—"}
            </p>
            <p className="text-[#555] text-[11px] mt-0.5 uppercase tracking-wider">Promedio</p>
          </div>
          <div className="ms-stat-card text-center">
            <p className="ms-h1">{respondidasPeriodo.length}/{personal.length}</p>
            <p className="text-[#555] text-[11px] mt-0.5 uppercase tracking-wider">Respondidas</p>
          </div>
          <div className="ms-stat-card text-center">
            <p className={`text-2xl font-bold ${animoPeriodo != null && animoPeriodo >= 8 ? "text-green-400" : animoPeriodo != null && animoPeriodo >= 6 ? "text-yellow-400" : "text-[#555]"}`}>
              {animoPeriodo?.toFixed(1) ?? "—"}
            </p>
            <p className="text-[#555] text-[11px] mt-0.5 uppercase tracking-wider">Ánimo promedio</p>
          </div>
        </div>
      )}

      {/* Expedientes por miembro */}
      <div>
        <p className="text-[#555] text-xs uppercase tracking-wider font-bold mb-3">Expediente por miembro</p>
        {loading ? (
          <div className="text-center py-12 text-[#444] text-sm">Cargando...</div>
        ) : expedientes.length === 0 ? (
          <div className="text-center py-12 text-[#444] text-sm">Sin personal activo registrado</div>
        ) : (
          <div className="space-y-2">
            {expedientes.map(({ persona, respuestas, promedio, ultima, respondioPeriodo }) => (
              <div key={persona.id} className={`bg-[#111] border rounded-xl overflow-hidden transition-all ${respuestas.length > 0 ? "border-[#1e1e1e]" : "border-[#1a1a1a] opacity-70"}`}>
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-[#141414]"
                  onClick={() => setExpandedId(expandedId === persona.id ? null : persona.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${respondioPeriodo ? "bg-green-500" : respuestas.length > 0 ? "bg-[#555]" : "bg-[#2a2a2a]"}`} />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{persona.nombre}</p>
                      <p className="text-[#555] text-xs">{persona.puesto} · {DEPT_LABEL[persona.departamento] ?? persona.departamento}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {promedio != null && <ScoreBadge score={promedio} />}
                    <span className="text-[10px] text-[#555]">
                      {respuestas.length === 0 ? "Sin respuestas" : `${respuestas.length} respuesta${respuestas.length > 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>

                {/* Historial expandido */}
                {expandedId === persona.id && (
                  <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-3">
                    {respuestas.length === 0 ? (
                      <p className="text-[#555] text-xs">Este miembro aún no ha respondido ninguna encuesta.</p>
                    ) : (
                      respuestas.map(e => (
                        <div key={e.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#888] text-xs font-semibold">{e.periodo}</span>
                            <div className="flex items-center gap-2">
                              {e.promedioCalculado != null && <ScoreBadge score={e.promedioCalculado} />}
                            </div>
                          </div>
                          {e.respuestas && Object.keys(e.respuestas).length > 0 ? (
                            <RespuestasDetalle respuestas={e.respuestas} />
                          ) : (
                            <>
                              {e.loMejor && (
                                <div>
                                  <p className="text-[10px] text-[#555] font-bold uppercase tracking-wider mb-0.5">Lo que más valora</p>
                                  <p className="text-gray-300 text-sm">{e.loMejor}</p>
                                </div>
                              )}
                              {e.loMejorable && (
                                <div>
                                  <p className="text-[10px] text-[#555] font-bold uppercase tracking-wider mb-0.5">Lo que cambiaría</p>
                                  <p className="text-gray-300 text-sm">{e.loMejorable}</p>
                                </div>
                              )}
                              {e.comentarios && (
                                <div>
                                  <p className="text-[10px] text-[#555] font-bold uppercase tracking-wider mb-0.5">Comentarios</p>
                                  <p className="text-gray-300 text-sm">{e.comentarios}</p>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex items-center justify-between">
                            {e.respondidaEn && (
                              <p className="text-[#444] text-[10px]">
                                {new Date(e.respondidaEn).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                              </p>
                            )}
                            <button onClick={() => eliminar(e.id)} className="text-[10px] text-[#333] hover:text-red-400">Eliminar</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
