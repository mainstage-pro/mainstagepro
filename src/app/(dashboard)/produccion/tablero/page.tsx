"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Wrench, Package, AlertTriangle, MoreHorizontal } from "lucide-react";
import { CambiarEstadoEquipoModal } from "@/components/CambiarEstadoEquipoModal";
import { ReportarFallaModal } from "@/components/ReportarFallaModal";
import {
  ESTADO_FALLA_BADGE,
  ESTADO_FALLA_LABEL,
  ORIGEN_FALLA_LABEL,
  SEVERIDAD_FALLA_BADGE,
  SEVERIDAD_FALLA_LABEL,
} from "@/lib/falla-equipo";

interface EnTaller {
  tipoRegistro: "unidad" | "equipo";
  equipoId: string;
  unidadId: string | null;
  descripcion: string;
  marca: string | null;
  categoria: string | null;
  codigo: string | null;
  notas: string | null;
  tipo: string | null;
  estado: string;
  esReparacion: boolean;
  desde: string | null;
  dias: number | null;
  accion: string | null;
  costo: number | null;
}

interface Falla {
  id: string;
  fecha: string;
  descripcion: string;
  severidad: string;
  origen: string;
  estado: string;
  dias: number | null;
  equipoId: string;
  equipoDescripcion: string;
  marca: string | null;
  categoria: string | null;
  unidadId: string | null;
  codigo: string | null;
  proyectoId: string | null;
  proyectoNombre: string | null;
}

interface Fuera {
  id: string;
  numeroProyecto: string;
  nombre: string;
  recoleccionStatus: string;
  cliente: string | null;
  empresa: string | null;
  telefono: string | null;
  chofer: string | null;
  choferExterno: boolean;
  fechaDevolucion: string | null;
  vencida: boolean;
  diasAtraso: number;
  equiposCount: number;
}

interface Resumen {
  enReparacion: number;
  enMantenimiento: number;
  equiposFuera: number;
  recoleccionesVencidas: number;
  costoTaller: number;
  fallasAbiertas: number;
  fallasCriticas: number;
}

interface Data {
  enTaller: EnTaller[];
  fuera: Fuera[];
  fallas: Falla[];
  resumen: Resumen;
}

const TIPO_LABEL: Record<string, string> = {
  PREVENTIVO: "Preventivo",
  CORRECTIVO: "Correctivo",
  ESTETICO: "Estético",
  FUNCIONAL: "Funcional",
};

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CAMINO: "En camino",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = iso.length <= 10 ? new Date(iso + "T12:00:00") : new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
function fmtMoney(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}
function diasLabel(d: number | null) {
  if (d == null) return "—";
  if (d === 0) return "hoy";
  return `${d} ${d === 1 ? "día" : "días"}`;
}

// Fila del taller sobre la que se está actuando (cambio de estado o reporte de falla).
type Objetivo = { equipoId: string; unidadId: string | null; label: string; estado: string };

// Menú de fila en portal: las tablas viven dentro de contenedores con overflow
// oculto que recortarían un menú posicionado en absoluto.
function MenuFila({ rect, children }: { rect: DOMRect; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [arriba, setArriba] = useState(false);

  useLayoutEffect(() => {
    const alto = ref.current?.offsetHeight ?? 0;
    setArriba(rect.bottom + 8 + alto > window.innerHeight);
  }, [rect]);

  return createPortal(
    <div
      ref={ref}
      style={{
        top: arriba ? undefined : rect.bottom + 4,
        bottom: arriba ? window.innerHeight - rect.top + 4 : undefined,
        right: window.innerWidth - rect.right,
      }}
      className="fixed z-50 w-56 bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-xl overflow-hidden"
    >
      {children}
    </div>,
    document.body,
  );
}

export default function TableroProduccionPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [cambiarEstado, setCambiarEstado] = useState<Objetivo | null>(null);
  const [reportarFalla, setReportarFalla] = useState<Objetivo | null>(null);
  const [reportarFallaLibre, setReportarFallaLibre] = useState(false);

  const cargar = useCallback(() => {
    fetch("/api/produccion/tablero", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!menu) return;
    const cerrar = () => setMenu(null);
    document.addEventListener("click", cerrar);
    document.addEventListener("scroll", cerrar, true);
    return () => {
      document.removeEventListener("click", cerrar);
      document.removeEventListener("scroll", cerrar, true);
    };
  }, [menu]);

  async function resolverFalla(id: string, estado: string) {
    const r = await fetch(`/api/fallas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    }).catch(() => null);
    if (r?.ok) cargar();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Cargando tablero...</div>
  );

  const r = data?.resumen;
  const enTaller = data?.enTaller ?? [];
  const fuera = data?.fuera ?? [];
  const fallas = data?.fallas ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ms-h1">Estado de equipos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Estado en vivo del área de producción — equipo en taller y equipo fuera</p>
        </div>
        {/* Reportar una falla no debe exigir que el equipo ya esté en taller: desde aquí
            se elige cualquier equipo del inventario. */}
        <button
          onClick={() => setReportarFallaLibre(true)}
          className="shrink-0 px-3 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold rounded-lg transition-colors"
        >
          Reportar falla
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { val: r?.enReparacion ?? 0, label: "En reparación", cls: "text-red-400", bg: "bg-red-900/20 border-red-800/30" },
          { val: r?.enMantenimiento ?? 0, label: "En mantenimiento", cls: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/30" },
          { val: r?.fallasAbiertas ?? 0, label: "Fallas abiertas", cls: "text-fuchsia-400", bg: "bg-fuchsia-900/20 border-fuchsia-800/30" },
          { val: r?.equiposFuera ?? 0, label: "Proyectos fuera", cls: "text-blue-400", bg: "bg-blue-900/20 border-blue-800/30" },
          { val: r?.recoleccionesVencidas ?? 0, label: "Recol. vencidas", cls: "text-orange-400", bg: "bg-orange-900/20 border-orange-800/30" },
          { val: fmtMoney(r?.costoTaller ?? 0), label: "Costo en taller", cls: "text-[#B3985B]", bg: "bg-[#B3985B]/10 border-[#B3985B]/30", small: true },
        ].map((m) => (
          <div key={m.label} className={`border rounded-xl p-4 text-center ${m.bg}`}>
            <p className={`font-bold ${m.cls} ${m.small ? "text-xl" : "text-3xl"}`}>{m.val}</p>
            <p className={`text-xs mt-1 uppercase tracking-wider ${m.cls} opacity-70`}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* En taller */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ms-h2">En taller — mantenimiento y reparación ({enTaller.length})</h2>
          <Link href="/inventario/mantenimiento" className="text-xs text-[#B3985B] hover:underline">Ir a mantenimiento →</Link>
        </div>
        {enTaller.length === 0 ? (
          <div className="ms-card p-8 text-center">
            <Wrench strokeWidth={1.5} className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400 text-sm">Ningún equipo en taller</p>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-[#1a1a1a] text-[11px] uppercase tracking-wider text-gray-500">
              <span className="col-span-4">Equipo</span>
              <span className="col-span-2">Estado</span>
              <span className="col-span-2">Desde</span>
              <span className="col-span-1 text-center">Días</span>
              <span className="col-span-2">Trabajo / costo</span>
              <span className="col-span-1" />
            </div>
            {enTaller.map((e, i) => {
              const filaId = `${e.unidadId ?? e.equipoId}-${i}`;
              const label = `${e.descripcion}${e.codigo ? ` · ${e.codigo}` : ""}`;
              const objetivo: Objetivo = { equipoId: e.equipoId, unidadId: e.unidadId, label, estado: e.estado };
              return (
                <div key={filaId}
                  className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-t border-[#1c1c1c] hover:bg-[#161616] transition-colors text-sm">
                  <div className="col-span-2 md:col-span-4">
                    <Link href={`/inventario/equipos/${e.equipoId}`} className="text-white font-medium truncate hover:text-[#B3985B] transition-colors block">
                      {e.descripcion}
                    </Link>
                    <p className="text-gray-500 text-xs">
                      {e.marca && <span>{e.marca} · </span>}
                      {e.codigo ? `Unidad ${e.codigo}` : e.tipoRegistro === "equipo" ? "Equipo completo" : "Unidad"}
                      {e.categoria && <span className="text-gray-600"> · {e.categoria}</span>}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.esReparacion ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                      {e.esReparacion ? "En reparación" : "Mantenimiento"}
                    </span>
                    {e.tipo && <p className="text-gray-600 text-[11px] mt-0.5">{TIPO_LABEL[e.tipo] ?? e.tipo}</p>}
                  </div>
                  <div className="md:col-span-2 text-gray-300 text-xs self-center">{fmtDate(e.desde)}</div>
                  <div className="md:col-span-1 text-center self-center">
                    <span className={`text-xs font-medium ${(e.dias ?? 0) >= 15 ? "text-red-400" : (e.dias ?? 0) >= 7 ? "text-yellow-400" : "text-gray-400"}`}>
                      {diasLabel(e.dias)}
                    </span>
                  </div>
                  <div className="col-span-2 md:col-span-2 self-center">
                    {e.accion && <p className="text-gray-400 text-xs truncate">{e.accion}</p>}
                    {e.costo ? <p className="text-[#B3985B] text-xs">{fmtMoney(e.costo)}</p> : null}
                  </div>
                  <div className="col-span-2 md:col-span-1 self-center flex justify-end">
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        const rect = ev.currentTarget.getBoundingClientRect();
                        setMenu(menu?.id === filaId ? null : { id: filaId, rect });
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#222] transition-colors"
                      title="Acciones"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menu?.id === filaId && (
                      <MenuFila rect={menu.rect}>
                        <button
                          onClick={() => { setCambiarEstado(objetivo); setMenu(null); }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-[#222] hover:text-white transition-colors"
                        >
                          Cambiar estado
                        </button>
                        <button
                          onClick={() => { setReportarFalla(objetivo); setMenu(null); }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-[#222] hover:text-white transition-colors border-t border-[#1f1f1f]"
                        >
                          Reportar falla
                        </button>
                        <Link
                          href="/inventario/mantenimiento"
                          className="block px-4 py-2.5 text-xs text-gray-300 hover:bg-[#222] hover:text-white transition-colors border-t border-[#1f1f1f]"
                        >
                          Registrar mantenimiento
                        </Link>
                        <Link
                          href={`/inventario/equipos/${e.equipoId}`}
                          className="block px-4 py-2.5 text-xs text-gray-300 hover:bg-[#222] hover:text-white transition-colors border-t border-[#1f1f1f]"
                        >
                          Ver ficha del equipo
                        </Link>
                      </MenuFila>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Fuera / pendientes de recolección */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ms-h2">Equipo fuera — pendiente de recolección ({fuera.length})</h2>
          <Link href="/inventario/recolecciones" className="text-xs text-[#B3985B] hover:underline">Ir a recolecciones →</Link>
        </div>
        {fuera.length === 0 ? (
          <div className="ms-card p-8 text-center">
            <Package strokeWidth={1.5} className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400 text-sm">Sin equipo fuera pendiente de recolectar</p>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-[#1a1a1a] text-[11px] uppercase tracking-wider text-gray-500">
              <span className="col-span-4">Proyecto / cliente</span>
              <span className="col-span-2">Estado</span>
              <span className="col-span-2">Devolución</span>
              <span className="col-span-2 text-center">Atraso</span>
              <span className="col-span-2 text-center">Equipos</span>
            </div>
            {fuera.map((p) => (
              <Link key={p.id} href={`/proyectos/${p.id}`}
                className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-t border-[#1c1c1c] hover:bg-[#161616] transition-colors text-sm ${p.vencida ? "bg-red-900/10" : ""}`}>
                <div className="col-span-2 md:col-span-4">
                  <p className="text-white font-medium truncate">
                    <span className="text-xs font-mono text-gray-500 mr-2">{p.numeroProyecto}</span>
                    {p.nombre}
                  </p>
                  <p className="text-gray-500 text-xs">{p.cliente}{p.empresa && <span className="text-gray-600"> · {p.empresa}</span>}</p>
                </div>
                <div className="md:col-span-2 self-center">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-900/30 text-blue-400">
                    {STATUS_LABEL[p.recoleccionStatus] ?? p.recoleccionStatus}
                  </span>
                </div>
                <div className="md:col-span-2 text-xs self-center">
                  <span className={p.vencida ? "text-red-400 font-medium" : "text-gray-300"}>{fmtDate(p.fechaDevolucion)}</span>
                </div>
                <div className="md:col-span-2 text-center self-center">
                  {p.vencida
                    ? <span className="inline-flex items-center gap-1 text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full font-medium"><AlertTriangle strokeWidth={1.75} className="w-3 h-3" /> {diasLabel(p.diasAtraso)}</span>
                    : <span className="text-gray-600 text-xs">—</span>}
                </div>
                <div className="md:col-span-2 text-center self-center text-gray-300 text-xs">{p.equiposCount}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Fallas reportadas sin resolver */}
      <section className="space-y-3">
        <h2 className="ms-h2">Fallas reportadas — sin atender ({fallas.length})</h2>
        {fallas.length === 0 ? (
          <div className="ms-card p-8 text-center">
            <AlertTriangle strokeWidth={1.5} className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400 text-sm">Ninguna falla abierta</p>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-[#1a1a1a] text-[11px] uppercase tracking-wider text-gray-500">
              <span className="col-span-3">Equipo</span>
              <span className="col-span-4">Falla</span>
              <span className="col-span-2">Origen</span>
              <span className="col-span-1 text-center">Días</span>
              <span className="col-span-2 text-right">Acciones</span>
            </div>
            {fallas.map((f) => (
              <div key={f.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-t border-[#1c1c1c] hover:bg-[#161616] transition-colors text-sm">
                <div className="col-span-2 md:col-span-3">
                  <Link href={`/inventario/equipos/${f.equipoId}`} className="text-white font-medium truncate hover:text-[#B3985B] transition-colors block">
                    {f.equipoDescripcion}
                  </Link>
                  <p className="text-gray-500 text-xs">
                    {f.marca && <span>{f.marca} · </span>}
                    {f.codigo ? `Unidad ${f.codigo}` : "Equipo completo"}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERIDAD_FALLA_BADGE[f.severidad] ?? ""}`}>
                      {SEVERIDAD_FALLA_LABEL[f.severidad] ?? f.severidad}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ESTADO_FALLA_BADGE[f.estado] ?? ""}`}>
                      {ESTADO_FALLA_LABEL[f.estado] ?? f.estado}
                    </span>
                  </div>
                  <p className="text-gray-300 text-xs">{f.descripcion}</p>
                </div>
                <div className="md:col-span-2 self-center text-xs">
                  <p className="text-gray-400">{ORIGEN_FALLA_LABEL[f.origen] ?? f.origen}</p>
                  {f.proyectoId && (
                    <Link href={`/proyectos/${f.proyectoId}`} className="text-gray-600 hover:text-[#B3985B] transition-colors">
                      {f.proyectoNombre}
                    </Link>
                  )}
                </div>
                <div className="md:col-span-1 text-center self-center">
                  <span className={`text-xs font-medium ${(f.dias ?? 0) >= 15 ? "text-red-400" : (f.dias ?? 0) >= 7 ? "text-yellow-400" : "text-gray-400"}`}>
                    {diasLabel(f.dias)}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-2 self-center flex items-center justify-end gap-3">
                  <button onClick={() => resolverFalla(f.id, "RESUELTA")} className="text-[11px] text-green-500 hover:text-green-400 transition-colors">Resolver</button>
                  <button onClick={() => resolverFalla(f.id, "DESCARTADA")} className="text-[11px] text-gray-600 hover:text-white transition-colors">Descartar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {cambiarEstado && (
        <CambiarEstadoEquipoModal
          open
          equipoId={cambiarEstado.equipoId}
          unidadId={cambiarEstado.unidadId}
          equipoLabel={cambiarEstado.label}
          estadoActual={cambiarEstado.estado}
          onClose={() => setCambiarEstado(null)}
          onSaved={cargar}
        />
      )}

      {reportarFalla && (
        <ReportarFallaModal
          open
          equipoId={reportarFalla.equipoId}
          unidadId={reportarFalla.unidadId}
          equipoLabel={reportarFalla.label}
          onClose={() => setReportarFalla(null)}
          onSaved={cargar}
        />
      )}

      {/* Reporte libre: el modal pide el equipo porque aquí no hay uno preseleccionado. */}
      <ReportarFallaModal
        open={reportarFallaLibre}
        onClose={() => setReportarFallaLibre(false)}
        onSaved={cargar}
      />
    </div>
  );
}
