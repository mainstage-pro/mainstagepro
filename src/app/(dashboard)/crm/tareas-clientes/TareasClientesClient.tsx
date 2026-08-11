"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, User, Repeat, Search, Plus, Contact } from "lucide-react";
import NuevaTareaModal from "../../operaciones/components/NuevaTareaModal";
import { Combobox } from "@/components/Combobox";
import { formatearRecurrencia, type RecurrenciaConfig } from "@/lib/recurrencia";

interface Tarea {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fecha: string | null;
  recurrencia: string | null;
  clienteId: string | null;
  asignadoA: { id: string; name: string } | null;
}
interface ClienteRef { id: string; nombre: string; empresa: string | null }
interface Usuario { id: string; name: string }

const PRIO_COLOR: Record<string, string> = {
  URGENTE: "#f87171", ALTA: "#fb923c", MEDIA: "#B3985B", BAJA: "#555",
};

function fechaCorta(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}
function recurrenciaTexto(raw: string | null): string | null {
  if (!raw) return null;
  try { return formatearRecurrencia(JSON.parse(raw) as RecurrenciaConfig); } catch { return null; }
}

export default function TareasClientesClient({
  tareas: tareasIniciales, clientes, usuarios,
}: {
  tareas: Tarea[];
  clientes: ClienteRef[];
  usuarios: Usuario[];
}) {
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [verCompletadas, setVerCompletadas] = useState(false);
  const [clientePicker, setClientePicker] = useState("");
  const [modal, setModal] = useState<
    | { mode: "crear"; clienteId: string; clienteNombre: string }
    | { mode: "editar"; tareaId: string; clienteId: string; clienteNombre: string }
    | null
  >(null);

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes]);

  // Agrupa las tareas por cliente y aplica filtros de búsqueda / completadas.
  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const porCliente = new Map<string, Tarea[]>();
    for (const t of tareas) {
      if (!t.clienteId) continue;
      if (!verCompletadas && t.estado === "COMPLETADA") continue;
      const cliente = clienteMap.get(t.clienteId);
      if (q) {
        const nombre = (cliente?.nombre ?? "").toLowerCase();
        const empresa = (cliente?.empresa ?? "").toLowerCase();
        if (!nombre.includes(q) && !empresa.includes(q) && !t.titulo.toLowerCase().includes(q)) continue;
      }
      if (!porCliente.has(t.clienteId)) porCliente.set(t.clienteId, []);
      porCliente.get(t.clienteId)!.push(t);
    }
    return Array.from(porCliente.entries())
      .map(([clienteId, ts]) => ({ cliente: clienteMap.get(clienteId), clienteId, tareas: ts }))
      .sort((a, b) => (a.cliente?.nombre ?? "").localeCompare(b.cliente?.nombre ?? ""));
  }, [tareas, busqueda, verCompletadas, clienteMap]);

  const totalPendientes = useMemo(
    () => tareas.filter(t => t.estado !== "COMPLETADA").length, [tareas],
  );

  async function toggle(e: React.MouseEvent, t: Tarea) {
    e.stopPropagation();
    const next = t.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: next } : x));
    const res = await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    if (!res.ok) {
      setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: t.estado } : x));
    }
  }

  function upsertTarea(t: Tarea) {
    setTareas(prev => {
      const i = prev.findIndex(x => x.id === t.id);
      if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], ...t }; return c; }
      return [...prev, t];
    });
  }

  const opcionesClientes = useMemo(
    () => clientes.map(c => ({ value: c.id, label: c.empresa ? `${c.nombre} · ${c.empresa}` : c.nombre })),
    [clientes],
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="ms-h1 flex items-center gap-2">
            <Contact strokeWidth={1.75} className="w-6 h-6 text-[#B3985B]" />
            Tareas de clientes
          </h1>
          <p className="text-sm text-[#888] mt-1">
            Atención específica por cliente: cumpleaños, aniversarios y recordatorios.
            {" "}
            <span className="text-[#B3985B]">{totalPendientes}</span> pendientes.
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente o tarea..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] text-sm text-white placeholder:text-[#555] focus:border-[#B3985B]/40 outline-none"
          />
        </div>
        <div className="min-w-[220px] flex items-center gap-2">
          <Combobox
            value={clientePicker}
            onChange={(id) => {
              const c = clienteMap.get(id);
              if (c) setModal({ mode: "crear", clienteId: c.id, clienteNombre: c.nombre });
              setClientePicker("");
            }}
            options={opcionesClientes}
            placeholder="+ Nueva tarea para un cliente..."
            className="w-full"
          />
        </div>
        <button
          onClick={() => setVerCompletadas(v => !v)}
          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            verCompletadas
              ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
              : "bg-[#0d0d0d] border-[#1a1a1a] text-[#888] hover:text-white"
          }`}
        >
          {verCompletadas ? "Ocultar completadas" : "Ver completadas"}
        </button>
      </div>

      {/* Grupos por cliente */}
      {grupos.length === 0 ? (
        <div className="ms-card p-10 text-center">
          <Contact strokeWidth={1.5} className="w-10 h-10 text-[#333] mx-auto mb-3" />
          <p className="text-sm text-[#888]">
            {busqueda ? "Sin resultados para tu búsqueda." : "Aún no hay tareas de clientes."}
          </p>
          <p className="text-xs text-[#555] mt-1">
            Usa el selector de arriba para crear una tarea de atención para cualquier cliente.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map(({ cliente, clienteId, tareas: ts }) => (
            <div key={clienteId} className="ms-card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Link href={`/crm/clientes/${clienteId}`} className="min-w-0 group">
                  <h2 className="text-sm font-semibold text-white group-hover:text-[#B3985B] transition-colors truncate">
                    {cliente?.nombre ?? "Cliente"}
                  </h2>
                  {cliente?.empresa && <p className="text-xs text-[#666] truncate">{cliente.empresa}</p>}
                </Link>
                <button
                  onClick={() => setModal({ mode: "crear", clienteId, clienteNombre: cliente?.nombre ?? "" })}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-xs text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Tarea
                </button>
              </div>

              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#141414]">
                {ts.map(t => {
                  const done = t.estado === "COMPLETADA";
                  const rec = recurrenciaTexto(t.recurrencia);
                  return (
                    <div
                      key={t.id}
                      onClick={() => setModal({ mode: "editar", tareaId: t.id, clienteId, clienteNombre: cliente?.nombre ?? "" })}
                      className="group flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors"
                    >
                      <button
                        onClick={(e) => toggle(e, t)}
                        title={done ? "Marcar como pendiente" : "Marcar como completada"}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          done ? "border-green-500 bg-green-500/20 text-green-400 text-[10px]"
                               : "border-[#333] hover:border-[#B3985B] text-transparent"
                        }`}
                      >
                        {done ? "\u2713" : ""}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${done ? "line-through text-gray-600" : "text-white"} transition-colors`}>
                          {t.titulo}
                        </p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ color: PRIO_COLOR[t.prioridad] ?? "#555", background: (PRIO_COLOR[t.prioridad] ?? "#555") + "18" }}>
                            {t.prioridad.charAt(0) + t.prioridad.slice(1).toLowerCase()}
                          </span>
                          {rec ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#f472b6] px-2 py-0.5 rounded-full bg-[#f472b6]/12 font-medium">
                              <Repeat strokeWidth={1.75} className="w-3 h-3" /> {rec}
                            </span>
                          ) : t.fecha ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-[#111] font-medium">
                              <Calendar strokeWidth={1.75} className="w-3 h-3" /> {fechaCorta(t.fecha)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#555] px-2 py-0.5 rounded-full bg-[#111] font-medium">Sin agendar</span>
                          )}
                          {t.asignadoA && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a] font-medium">
                              <User strokeWidth={1.75} className="w-3 h-3" /> {t.asignadoA.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <NuevaTareaModal
          open
          onClose={() => setModal(null)}
          usuarios={usuarios}
          defaultArea="VENTAS"
          tipoInicial="CLIENTE"
          clienteIdInicial={modal.clienteId}
          clienteNombre={modal.clienteNombre}
          tareaIdEdicion={modal.mode === "editar" ? modal.tareaId : null}
          onCreated={(t) => upsertTarea(t as Tarea)}
        />
      )}
    </div>
  );
}
