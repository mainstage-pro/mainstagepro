"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Equipo {
  id: string; tipo: string; cantidad: number;
  equipo: { descripcion: string; marca: string | null; categoria: { nombre: string } };
}
interface Proyecto {
  id: string; numeroProyecto: string; nombre: string; estado: string;
  fechaEvento: string; logisticaRenta: string | null;
  recoleccionStatus: string; recoleccionNotas: string | null;
  recoleccionFechaReal: string | null;
  protocoloSalida: string | null;
  protocoloEntrada: string | null;
  choferNombre: string | null; choferExterno: boolean; tipoServicio: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null };
  equipos: Equipo[];
  trato: { ideasReferencias: string | null; tipoServicio: string | null } | null;
}

interface RentaData {
  fechaDevolucion?: string; horaDevolucion?: string;
  direccionEntrega?: string; nivelServicio?: string;
  fechaEntrega?: string; horaEntrega?: string;
}

interface ProtocoloData {
  responsable: string;
  condicion: string;
  danios: string;
  observaciones: string;
  itemsVerificados: string[];
  timestamp: string;
}

const STATUS_CONFIG = {
  PENDIENTE:  { label: "Pendiente",   bg: "bg-yellow-900/30", text: "text-yellow-400", border: "border-yellow-800/40" },
  EN_CAMINO:  { label: "En camino",   bg: "bg-blue-900/30",   text: "text-blue-400",   border: "border-blue-800/40" },
  COMPLETADA: { label: "Recolectado", bg: "bg-green-900/30",  text: "text-green-400",  border: "border-green-800/40" },
};

const CONDICIONES = ["Excelente", "Bueno", "Regular", "Con daños"];

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}
function fmtDateFull(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function today() { return new Date().toISOString().split("T")[0]; }
function isOverdue(fecha: string) { return fecha < today(); }
function isToday(fecha: string) { return fecha === today(); }
function isUpcoming(fecha: string) {
  const t = today(); const next7 = new Date(); next7.setDate(next7.getDate() + 7);
  return fecha > t && fecha <= next7.toISOString().split("T")[0];
}

function parseProtocolo(raw: string | null): ProtocoloData | null {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export default function RecoleccionesPage() {
  const [proyectos, setProyectos]   = useState<Proyecto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState<"todas" | "pendientes" | "completadas">("pendientes");

  // Modal state
  type ModalMode = "salida" | "entrada" | "reabrir" | "ver_salida" | "ver_entrada";
  const [modal, setModal]           = useState<{ proy: Proyecto; mode: ModalMode } | null>(null);
  const [guardando, setGuardando]   = useState(false);

  // Protocol form fields
  const [pResponsable, setPResponsable] = useState("");
  const [pCondicion, setPCondicion]     = useState("Bueno");
  const [pDanios, setPDanios]           = useState("");
  const [pObs, setPObs]                 = useState("");
  const [pItems, setPItems]             = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/proyectos/recolecciones")
      .then(r => r.json())
      .then(d => { setProyectos(d.proyectos ?? []); setLoading(false); });
  }, []);

  function getRentaData(p: Proyecto): RentaData {
    try {
      const src = p.logisticaRenta || p.trato?.ideasReferencias;
      if (src) return JSON.parse(src);
    } catch { /* ignore */ }
    return {};
  }

  function openModal(proy: Proyecto, mode: ModalMode) {
    setModal({ proy, mode });
    setPResponsable(""); setPCondicion("Bueno"); setPDanios(""); setPObs("");
    // Pre-check all equipment items
    setPItems(proy.equipos.map(eq => eq.id));
  }

  function toggleItem(id: string) {
    setPItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function confirmarSalida() {
    if (!modal) return;
    setGuardando(true);
    const protocolo: ProtocoloData = {
      responsable: pResponsable,
      condicion: pCondicion,
      danios: pDanios,
      observaciones: pObs,
      itemsVerificados: pItems,
      timestamp: new Date().toISOString(),
    };
    await fetch(`/api/proyectos/${modal.proy.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recoleccionStatus: "EN_CAMINO", protocoloSalida: JSON.stringify(protocolo) }),
    });
    setProyectos(prev => prev.map(p => p.id === modal.proy.id
      ? { ...p, recoleccionStatus: "EN_CAMINO", protocoloSalida: JSON.stringify(protocolo) } : p));
    setModal(null); setGuardando(false);
  }

  async function confirmarEntrada() {
    if (!modal) return;
    setGuardando(true);
    const protocolo: ProtocoloData = {
      responsable: pResponsable,
      condicion: pCondicion,
      danios: pDanios,
      observaciones: pObs,
      itemsVerificados: pItems,
      timestamp: new Date().toISOString(),
    };
    await fetch(`/api/proyectos/${modal.proy.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recoleccionStatus: "COMPLETADA",
        recoleccionFechaReal: new Date().toISOString(),
        recoleccionNotas: pObs || (pDanios ? `Daños: ${pDanios}` : null),
        protocoloEntrada: JSON.stringify(protocolo),
      }),
    });
    setProyectos(prev => prev.map(p => p.id === modal.proy.id
      ? { ...p, recoleccionStatus: "COMPLETADA", recoleccionFechaReal: new Date().toISOString(), protocoloEntrada: JSON.stringify(protocolo) } : p));
    setModal(null); setGuardando(false);
  }

  async function reabrir() {
    if (!modal) return;
    setGuardando(true);
    await fetch(`/api/proyectos/${modal.proy.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recoleccionStatus: "PENDIENTE" }),
    });
    setProyectos(prev => prev.map(p => p.id === modal.proy.id ? { ...p, recoleccionStatus: "PENDIENTE" } : p));
    setModal(null); setGuardando(false);
  }

  const activos     = proyectos.filter(p => p.recoleccionStatus !== "COMPLETADA");
  const vencidas    = activos.filter(p => { const rd = getRentaData(p); return rd.fechaDevolucion && isOverdue(rd.fechaDevolucion); });
  const hoy         = activos.filter(p => { const rd = getRentaData(p); return rd.fechaDevolucion && isToday(rd.fechaDevolucion); });
  const proximas    = activos.filter(p => { const rd = getRentaData(p); return rd.fechaDevolucion && isUpcoming(rd.fechaDevolucion); });
  const completadas = proyectos.filter(p => p.recoleccionStatus === "COMPLETADA");
  const lista       = filtro === "completadas" ? completadas : filtro === "pendientes" ? activos : proyectos;

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Cargando recolecciones...</div>
  );

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Recolección de equipo</h1>
        <p className="text-gray-500 text-sm mt-0.5">Protocolo de salida y entrada para equipos en renta</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { val: vencidas.length,    label: "Vencidas",       cls: "text-red-400",    bg: "bg-red-900/20 border-red-800/30" },
          { val: hoy.length,         label: "Hoy",            cls: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/30" },
          { val: proximas.length,    label: "Próx. 7 días",   cls: "text-blue-400",   bg: "bg-blue-900/20 border-blue-800/30" },
          { val: completadas.length, label: "Completadas",    cls: "text-green-400",  bg: "bg-green-900/20 border-green-800/30" },
        ].map(m => (
          <div key={m.label} className={`border rounded-xl p-4 text-center ${m.bg}`}>
            <p className={`text-3xl font-bold ${m.cls}`}>{m.val}</p>
            <p className={`text-xs mt-1 uppercase tracking-wider ${m.cls} opacity-70`}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(["pendientes", "completadas", "todas"] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtro === f ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#222] text-gray-400 hover:text-white"}`}>
            {f === "pendientes" ? `Activas (${activos.length})` : f === "completadas" ? `Completadas (${completadas.length})` : `Todas (${proyectos.length})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-400 font-medium">Sin recolecciones {filtro === "completadas" ? "completadas" : "activas"}</p>
          <p className="text-gray-600 text-sm mt-1">Los proyectos de renta aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtro !== "completadas" && vencidas.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-red-400">⚠</span>
              <p className="text-red-400 text-sm font-medium">
                {vencidas.length} {vencidas.length === 1 ? "recolección venció" : "recolecciones vencieron"} — el equipo debió regresar a bodega
              </p>
            </div>
          )}

          {lista.map(p => {
            const rd = getRentaData(p);
            const fechaDev = rd.fechaDevolucion;
            const esVencida = fechaDev && isOverdue(fechaDev) && p.recoleccionStatus !== "COMPLETADA";
            const esHoy = fechaDev && isToday(fechaDev) && p.recoleccionStatus !== "COMPLETADA";
            const sc = STATUS_CONFIG[p.recoleccionStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDIENTE;
            const salida = parseProtocolo(p.protocoloSalida);
            const entrada = parseProtocolo(p.protocoloEntrada);

            return (
              <div key={p.id} className={`bg-[#111] border rounded-xl overflow-hidden ${esVencida ? "border-red-800/50" : esHoy ? "border-yellow-800/50" : "border-[#222]"}`}>
                {/* Header */}
                <div className={`px-4 py-3 flex items-center justify-between ${esVencida ? "bg-red-900/20" : esHoy ? "bg-yellow-900/20" : "bg-[#1a1a1a]"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500">{p.numeroProyecto}</span>
                    <Link href={`/proyectos/${p.id}`} className="text-white font-semibold text-sm hover:text-[#B3985B] transition-colors">
                      {p.nombre}
                    </Link>
                    {esVencida && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full font-medium">⚠ VENCIDA</span>}
                    {esHoy && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded-full font-medium">HOY</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                </div>

                {/* Cuerpo */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {/* Col 1: Cliente + fechas */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Cliente</p>
                      <p className="text-white font-medium">{p.cliente.nombre}</p>
                      {p.cliente.empresa && <p className="text-gray-400 text-xs">{p.cliente.empresa}</p>}
                      {p.cliente.telefono && (
                        <a href={`https://wa.me/52${p.cliente.telefono.replace(/\D/g,"")}`} target="_blank"
                          className="text-xs text-[#B3985B] hover:underline">{p.cliente.telefono}</a>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Devolución</p>
                      {fechaDev ? (
                        <p className={`font-medium text-xs ${esVencida ? "text-red-400" : esHoy ? "text-yellow-400" : "text-white"}`}>
                          {fmtDateFull(fechaDev)}
                          {rd.horaDevolucion && <span className="text-gray-400 ml-1 font-normal">· {rd.horaDevolucion}</span>}
                        </p>
                      ) : (
                        <p className="text-gray-600 italic text-xs">Sin fecha</p>
                      )}
                    </div>
                    {p.choferNombre && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Chofer</p>
                        <p className="text-white text-xs">{p.choferNombre}{p.choferExterno && <span className="text-orange-400 ml-1">(externo)</span>}</p>
                      </div>
                    )}
                  </div>

                  {/* Col 2: Equipos */}
                  <div>
                    <p className="text-gray-500 text-xs mb-2">Equipos ({p.equipos.length})</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {p.equipos.map(eq => (
                        <div key={eq.id} className="flex items-center gap-2">
                          <span className="text-[#B3985B] text-xs font-bold w-5 text-center">×{eq.cantidad}</span>
                          <span className="text-gray-300 text-xs truncate">{eq.equipo.descripcion}</span>
                        </div>
                      ))}
                      {p.equipos.length === 0 && <p className="text-gray-600 text-xs italic">Sin equipos</p>}
                    </div>
                  </div>

                  {/* Col 3: Protocolos + Acciones */}
                  <div className="space-y-2">
                    {p.recoleccionStatus === "COMPLETADA" ? (
                      <div className="space-y-2">
                        {/* Badges de protocolo */}
                        {salida && (
                          <button onClick={() => openModal(p, "ver_salida")}
                            className="w-full text-left px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-800/30 hover:border-blue-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-400">Protocolo de salida</span>
                              <span className="text-xs text-blue-400/60">ver →</span>
                            </div>
                            <p className="text-xs text-blue-300/60 mt-0.5">{salida.condicion} · {salida.responsable || "Sin responsable"}</p>
                          </button>
                        )}
                        {entrada && (
                          <button onClick={() => openModal(p, "ver_entrada")}
                            className="w-full text-left px-3 py-2 rounded-lg bg-green-900/20 border border-green-800/30 hover:border-green-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-green-400">Protocolo de entrada</span>
                              <span className="text-xs text-green-400/60">ver →</span>
                            </div>
                            <p className="text-xs text-green-300/60 mt-0.5">{entrada.condicion} · {entrada.danios ? "Con daños reportados" : "Sin daños"}</p>
                          </button>
                        )}
                        <button onClick={() => openModal(p, "reabrir")}
                          className="text-xs text-gray-600 hover:text-gray-400 underline">
                          Reabrir recolección
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Protocolo de salida */}
                        {!salida ? (
                          <button onClick={() => openModal(p, "salida")}
                            className="w-full py-2 rounded-lg bg-blue-900/30 border border-blue-800/40 text-blue-400 text-xs font-semibold hover:bg-blue-900/50 transition-colors">
                            📋 Protocolo de salida
                          </button>
                        ) : (
                          <button onClick={() => openModal(p, "ver_salida")}
                            className="w-full text-left px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-800/30">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-400">✓ Salida registrada</span>
                              <span className="text-xs text-blue-400/60">ver →</span>
                            </div>
                            <p className="text-xs text-blue-300/60 mt-0.5">{salida.condicion}</p>
                          </button>
                        )}
                        {/* Protocolo de entrada */}
                        <button onClick={() => openModal(p, "entrada")}
                          className="w-full py-2 rounded-lg bg-green-900/30 border border-green-800/40 text-green-400 text-xs font-semibold hover:bg-green-900/50 transition-colors">
                          ✓ Protocolo de entrada / Recibir equipo
                        </button>
                        {p.recoleccionNotas && (
                          <p className="text-gray-500 text-xs italic">"{p.recoleccionNotas}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (() => {
        const p = modal.proy;
        const salida = parseProtocolo(p.protocoloSalida);
        const entrada = parseProtocolo(p.protocoloEntrada);

        if (modal.mode === "ver_salida" && salida) return (
          <ModalWrap title="Protocolo de salida" sub={p.nombre} onClose={() => setModal(null)}>
            <ProtocoloViewer data={salida} equipos={p.equipos} label="Salida de equipo" color="blue" />
          </ModalWrap>
        );

        if (modal.mode === "ver_entrada" && entrada) return (
          <ModalWrap title="Protocolo de entrada" sub={p.nombre} onClose={() => setModal(null)}>
            <ProtocoloViewer data={entrada} equipos={p.equipos} label="Recepción en bodega" color="green" />
          </ModalWrap>
        );

        if (modal.mode === "reabrir") return (
          <ModalWrap title="Reabrir recolección" sub={p.nombre} onClose={() => setModal(null)}>
            <p className="text-gray-400 text-sm">¿Confirmas que deseas reabrir esta recolección y marcarla como pendiente?</p>
            <div className="flex gap-3 mt-4">
              <button onClick={reabrir} disabled={guardando}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black font-bold text-sm disabled:opacity-50">
                {guardando ? "Guardando..." : "Reabrir"}
              </button>
              <button onClick={() => setModal(null)} className="px-4 py-2.5 border border-[#333] text-gray-400 hover:text-white text-sm rounded-xl">Cancelar</button>
            </div>
          </ModalWrap>
        );

        const isSalida = modal.mode === "salida";
        return (
          <ModalWrap
            title={isSalida ? "Protocolo de salida — Entrega al cliente" : "Protocolo de entrada — Recepción en bodega"}
            sub={p.nombre}
            onClose={() => setModal(null)}>
            <div className="space-y-4">
              <p className="text-gray-500 text-xs">
                {isSalida
                  ? "Verifica el equipo antes de que salga a bodega. Este registro queda vinculado al proyecto."
                  : "Verifica el equipo al recibirlo de vuelta. Documenta el estado y cualquier daño encontrado."}
              </p>

              {/* Responsable */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Responsable del {isSalida ? "despacho" : "recibo"}</label>
                <input value={pResponsable} onChange={e => setPResponsable(e.target.value)}
                  placeholder="Nombre del técnico o encargado"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>

              {/* Condición */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">Condición general del equipo al {isSalida ? "salir" : "regresar"}</label>
                <div className="flex gap-2">
                  {CONDICIONES.map(c => (
                    <button key={c} onClick={() => setPCondicion(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${pCondicion === c
                        ? c === "Con daños" ? "bg-red-900/40 border-red-700/60 text-red-400" : "bg-[#B3985B]/15 border-[#B3985B]/50 text-[#B3985B]"
                        : "border-[#333] text-gray-500 hover:text-white"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checklist de equipos */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Equipos verificados ({pItems.length}/{p.equipos.length})
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {p.equipos.map(eq => (
                    <label key={eq.id} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={pItems.includes(eq.id)} onChange={() => toggleItem(eq.id)}
                        className="w-4 h-4 rounded accent-[#B3985B]" />
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                        <span className="text-[#B3985B] font-bold mr-1">×{eq.cantidad}</span>
                        {eq.equipo.descripcion}
                      </span>
                    </label>
                  ))}
                  {p.equipos.length === 0 && <p className="text-gray-600 text-xs italic">Sin equipos registrados en este proyecto</p>}
                </div>
              </div>

              {/* Daños (solo entrada) */}
              {!isSalida && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Daños o faltantes detectados</label>
                  <textarea value={pDanios} onChange={e => setPDanios(e.target.value)} rows={2}
                    placeholder="Ej: Cable XLR roto · Caja de subwoofer con golpe · Faltó 1 adaptador..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Observaciones generales</label>
                <textarea value={pObs} onChange={e => setPObs(e.target.value)} rows={2}
                  placeholder={isSalida ? "Instrucciones de instalación, notas de entrega..." : "Notas sobre el estado del equipo recibido..."}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={isSalida ? confirmarSalida : confirmarEntrada}
                  disabled={guardando}
                  className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
                  style={{ background: "#B3985B", color: "#000" }}>
                  {guardando ? "Guardando..." : isSalida ? "Registrar salida" : "Confirmar recepción"}
                </button>
                <button onClick={() => setModal(null)}
                  className="px-4 border border-[#333] text-gray-400 hover:text-white text-sm rounded-xl">
                  Cancelar
                </button>
              </div>
            </div>
          </ModalWrap>
        );
      })()}
    </div>
  );
}

function ModalWrap({ title, sub, onClose, children }: { title: string; sub: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-base">{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors ml-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProtocoloViewer({ data, equipos, label, color }: {
  data: ProtocoloData;
  equipos: Equipo[];
  label: string;
  color: "blue" | "green";
}) {
  const textCls = color === "blue" ? "text-blue-400" : "text-green-400";
  const bgCls   = color === "blue" ? "bg-blue-900/20 border-blue-800/30" : "bg-green-900/20 border-green-800/30";
  const ts      = data.timestamp ? new Date(data.timestamp).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="space-y-4">
      <div className={`rounded-xl px-4 py-3 border ${bgCls}`}>
        <p className={`text-xs font-semibold uppercase tracking-wider ${textCls} mb-1`}>{label}</p>
        {ts && <p className="text-gray-500 text-xs">{ts}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">Responsable</p>
          <p className="text-white">{data.responsable || "—"}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-0.5">Condición</p>
          <p className={`font-medium ${data.condicion === "Con daños" ? "text-red-400" : data.condicion === "Excelente" ? "text-green-400" : "text-white"}`}>
            {data.condicion || "—"}
          </p>
        </div>
      </div>

      {data.danios && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
          <p className="text-xs text-red-400 font-medium mb-0.5">Daños / Faltantes reportados</p>
          <p className="text-red-300 text-xs">{data.danios}</p>
        </div>
      )}

      {data.observaciones && (
        <div>
          <p className="text-gray-500 text-xs mb-0.5">Observaciones</p>
          <p className="text-gray-300 text-sm">{data.observaciones}</p>
        </div>
      )}

      <div>
        <p className="text-gray-500 text-xs mb-2">Equipos verificados ({data.itemsVerificados?.length ?? 0}/{equipos.length})</p>
        <div className="space-y-1">
          {equipos.map(eq => {
            const checked = data.itemsVerificados?.includes(eq.id);
            return (
              <div key={eq.id} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${checked ? "bg-green-700/50 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                  {checked ? "✓" : "✗"}
                </span>
                <span className={`text-xs ${checked ? "text-gray-300" : "text-gray-500 line-through"}`}>
                  ×{eq.cantidad} {eq.equipo.descripcion}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Unused import warning suppression
void fmtDate;
