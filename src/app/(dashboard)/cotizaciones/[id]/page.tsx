"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPct } from "@/lib/cotizador";

interface Linea {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  nivel: string | null;
  jornada: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
  esIncluido: boolean;
  notas: string | null;
}

interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  version: number;
  estado: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  diasEquipo: number;
  diasOperacion: number;
  notasSecciones: string | null;
  subtotalEquiposBruto: number;
  descuentoTotalPct: number;
  montoDescuento: number;
  subtotalEquiposNeto: number;
  subtotalOperacion: number;
  subtotalTransporte: number;
  subtotalComidas: number;
  subtotalHospedaje: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  costosTotalesEstimados: number;
  utilidadEstimada: number;
  porcentajeUtilidad: number;
  observaciones: string | null;
  vigenciaDias: number;
  createdAt: string;
  cliente: { id: string; nombre: string; empresa: string | null; tipoCliente: string };
  trato: { id: string; tipoEvento: string; etapa: string };
  creadaPor: { name: string } | null;
  lineas: Linea[];
  proyecto: { id: string; numeroProyecto: string; estado: string } | null;
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-700 text-gray-300",
  ENVIADA: "bg-blue-900/50 text-blue-300",
  EN_REVISION: "bg-yellow-900/50 text-yellow-300",
  APROBADA: "bg-green-900/50 text-green-300",
  RECHAZADA: "bg-red-900/50 text-red-300",
  VENCIDA: "bg-gray-800 text-gray-500",
};

const ESTADOS_FLUJO = ["BORRADOR", "ENVIADA", "EN_REVISION", "APROBADA", "RECHAZADA"];

const TIPO_LINEA_LABELS: Record<string, string> = {
  TRANSPORTE: "Transporte",
  COMIDA: "Alimentación",
  HOSPEDAJE: "Hospedaje",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CotizacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [cot, setCot] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aprobando, setAprobando] = useState(false);

  useEffect(() => {
    fetch(`/api/cotizaciones/${id}`)
      .then((r) => r.json())
      .then((d) => { setCot(d.cotizacion); setLoading(false); });
  }, [id]);

  async function cambiarEstado(estado: string) {
    setSaving(true);
    const res = await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    const d = await res.json();
    setCot((prev) => prev ? { ...prev, estado: d.cotizacion.estado } : prev);
    setSaving(false);
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta cotización? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
    router.push("/cotizaciones");
  }

  async function aprobar() {
    if (!confirm("¿Aprobar esta cotización y crear el proyecto? El trato pasará a Venta Cerrada.")) return;
    setAprobando(true);
    const res = await fetch(`/api/cotizaciones/${id}/aprobar`, { method: "POST" });
    const data = await res.json();
    if (data.proyectoId) {
      router.push(`/proyectos/${data.proyectoId}`);
    } else {
      alert(`Error al crear proyecto: ${data.error ?? "Error desconocido"}`);
      setAprobando(false);
    }
  }

  if (loading) return <div className="text-gray-400 text-sm p-6">Cargando...</div>;
  if (!cot) return <div className="text-red-400 text-sm p-6">Cotización no encontrada</div>;

  // Viabilidad recalculada en vivo (ignora valor guardado en BD)
  const costoVivo = cot.lineas
    .filter(l => !l.esIncluido && ["OPERACION_TECNICA", "DJ", "TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo))
    .reduce((s, l) => s + l.subtotal, 0);
  const utilidadViva = cot.total - costoVivo;
  const pctVivo = cot.total > 0 ? utilidadViva / cot.total : 0;
  const semaforo = pctVivo >= 0.55 ? "IDEAL" : pctVivo >= 0.40 ? "REGULAR" : pctVivo >= 0.25 ? "MINIMO" : "RIESGO";
  const semaforoColor = { IDEAL: "text-green-400", REGULAR: "text-yellow-400", MINIMO: "text-orange-400", RIESGO: "text-red-400" }[semaforo];

  const lineasEquipo = cot.lineas.filter((l) => l.tipo === "EQUIPO_PROPIO");
  const lineasExterno = cot.lineas.filter((l) => l.tipo === "EQUIPO_EXTERNO");
  const lineasOp = cot.lineas.filter((l) => l.tipo === "OPERACION_TECNICA" || l.tipo === "DJ");
  const lineasLog = cot.lineas.filter((l) => ["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo));

  const subtotalEquipo = lineasEquipo.reduce((s, l) => s + l.subtotal, 0);
  const subtotalExterno = lineasExterno.reduce((s, l) => s + l.subtotal, 0);
  const subtotalOp = lineasOp.reduce((s, l) => s + l.subtotal, 0);
  const subtotalLog = lineasLog.reduce((s, l) => s + l.subtotal, 0);

  // Notas por sección (guardadas en notasSecciones JSON)
  const notasSecciones: Record<string, string> = cot.notasSecciones
    ? JSON.parse(cot.notasSecciones) : {};

  // Agrupar equipos propios por categoría (usando notas que guardan categoria:NombreCat)
  const equiposPorCat: Record<string, Linea[]> = {};
  for (const l of lineasEquipo) {
    const cat = l.notas?.startsWith("cat:") ? l.notas.slice(4) : "Equipos";
    if (!equiposPorCat[cat]) equiposPorCat[cat] = [];
    equiposPorCat[cat].push(l);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-gray-400 text-sm font-mono">{cot.numeroCotizacion}</span>
            <span className="text-gray-500 text-sm">v{cot.version}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[cot.estado] || "bg-gray-700 text-gray-300"}`}>
              {cot.estado}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{cot.nombreEvento || "Sin nombre"}</h1>
          <Link href={`/crm/clientes/${cot.cliente.id}`} className="text-[#B3985B] text-sm hover:underline">
            {cot.cliente.nombre}{cot.cliente.empresa ? ` · ${cot.cliente.empresa}` : ""}
          </Link>
        </div>
        <div className="sm:text-right space-y-2 shrink-0">
          <p className="text-2xl font-bold text-white">{formatCurrency(cot.granTotal)}</p>
          {cot.aplicaIva && <p className="text-gray-400 text-xs">IVA incluido</p>}
          <p className={`text-sm font-medium ${semaforoColor}`}>
            {semaforo} · {formatPct(pctVivo)} margen
          </p>
          <div className="flex gap-2 flex-wrap">
            {cot.estado === "BORRADOR" && (
              <Link
                href={`/cotizaciones/${cot.id}/editar`}
                className="inline-block bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Editar
              </Link>
            )}
            {cot.estado === "APROBADA" && !cot.proyecto && (
              <button
                onClick={aprobar}
                disabled={aprobando}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {aprobando ? "Creando proyecto..." : "✓ Crear proyecto"}
              </button>
            )}
            <a
              href={`/presentacion/${cot.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#B3985B]/40 text-[#B3985B] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
              Ver presentación
            </a>
            <a
              href={`/api/cotizaciones/${cot.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Descargar PDF
            </a>
          </div>
        </div>
      </div>

      {/* Banner proyecto creado */}
      {cot.proyecto && (
        <Link href={`/proyectos/${cot.proyecto.id}`}
          className="flex items-center justify-between bg-green-900/20 border border-green-700/50 rounded-xl px-4 py-3 hover:bg-green-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-lg">✓</span>
            <div>
              <p className="text-green-300 text-sm font-semibold">Proyecto creado: {cot.proyecto.numeroProyecto}</p>
              <p className="text-green-600 text-xs">Haz clic para abrir el proyecto</p>
            </div>
          </div>
          <span className="text-green-500 text-xs px-2 py-1 bg-green-900/40 rounded-full">{cot.proyecto.estado}</span>
        </Link>
      )}

      {/* Estado flujo */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Estado</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {ESTADOS_FLUJO.map((e) => (
            <button key={e} disabled={saving || e === cot.estado} onClick={() => cambiarEstado(e)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                e === cot.estado ? ESTADO_COLORS[e] : "bg-[#1a1a1a] text-gray-500 hover:text-white border border-[#2a2a2a]"
              }`}>
              {e.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Columna principal */}
        <div className="md:col-span-2 space-y-4">
          {/* Info evento */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs mb-0.5">Fecha del evento</p><p className="text-white">{fmtDate(cot.fechaEvento)}</p></div>
            <div><p className="text-gray-500 text-xs mb-0.5">Lugar</p><p className="text-white">{cot.lugarEvento || "—"}</p></div>
            <div><p className="text-gray-500 text-xs mb-0.5">Tipo de evento</p><p className="text-white">{cot.tipoEvento || "—"}</p></div>
            <div><p className="text-gray-500 text-xs mb-0.5">Creado por</p><p className="text-white">{cot.creadaPor?.name || "—"}</p></div>
          </div>

          {/* Equipos propios — subsecciones por categoría */}
          {lineasEquipo.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Equipos Mainstage</h3>
                <Link href="/catalogo/equipos" className="text-[10px] text-[#6b7280] hover:text-[#B3985B] transition-colors">
                  → Ir al catálogo
                </Link>
              </div>
              {Object.entries(equiposPorCat).map(([cat, lins]) => {
                const subTotal = lins.reduce((s, l) => s + l.subtotal, 0);
                const notaCat = notasSecciones[cat];
                return (
                  <div key={cat} className="border-t border-[#1a1a1a]">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d]">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{cat}</span>
                      <span className="text-xs text-gray-400 font-medium">{formatCurrency(subTotal)}</span>
                    </div>
                    {notaCat && (
                      <div className="px-4 py-2 bg-[#0a0a0a] border-b border-[#111]">
                        <p className="text-xs text-[#6b7280] italic">{notaCat}</p>
                      </div>
                    )}
                    {lins.map((l) => (
                      <div key={l.id} className={`flex justify-between items-center px-4 py-2 border-b border-[#111] last:border-0 text-sm ${l.esIncluido ? "opacity-50" : ""}`}>
                        <div>
                          <span className={l.esIncluido ? "text-gray-500 italic" : "text-white"}>{l.descripcion}</span>
                          {l.marca && <span className="text-gray-500 text-xs ml-2">{l.marca}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-gray-400 text-xs">
                          {!l.esIncluido && <span>{l.cantidad} × {l.dias}d · {formatCurrency(l.precioUnitario)}</span>}
                          <span className={`font-medium w-24 text-right ${l.esIncluido ? "text-gray-600" : "text-white"}`}>
                            {l.esIncluido ? "INCLUYE" : formatCurrency(l.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal equipos</span>
                <span className="text-white font-bold">{formatCurrency(subtotalEquipo)}</span>
              </div>
              {cot.montoDescuento > 0 && (
                <div className="flex justify-between items-center px-4 py-2 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                  <span className="text-xs text-red-400">Precio preferencial</span>
                  <span className="text-red-400 font-medium text-sm">-{formatCurrency(cot.montoDescuento)}</span>
                </div>
              )}
            </div>
          )}

          {/* Equipos externos */}
          {lineasExterno.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Equipos Adicionales (Terceros)</h3>
              </div>
              {lineasExterno.map((l) => (
                <div key={l.id} className="flex justify-between items-center px-4 py-2 border-t border-[#1a1a1a] text-sm">
                  <div>
                    <span className="text-white">{l.descripcion}</span>
                    {l.marca && <span className="text-gray-500 text-xs ml-2">{l.marca}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 text-xs">
                    <span>{l.cantidad} × {l.dias}d</span>
                    <span className="text-white font-medium w-24 text-right">{formatCurrency(l.subtotal)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal terceros</span>
                <span className="text-white font-bold">{formatCurrency(subtotalExterno)}</span>
              </div>
            </div>
          )}

          {/* Operación técnica */}
          {lineasOp.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Operación técnica</h3>
              </div>
              {lineasOp.map((l) => (
                <div key={l.id} className="flex justify-between items-center px-4 py-2 border-t border-[#1a1a1a] text-sm">
                  <div>
                    <span className="text-white">{l.descripcion}</span>
                    <span className="text-gray-500 text-xs ml-2">
                      {l.nivel && `${l.nivel} · `}{l.jornada && `${l.jornada} · `}×{l.cantidad}
                    </span>
                  </div>
                  <span className="text-white font-medium">{formatCurrency(l.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal operación</span>
                <span className="text-white font-bold">{formatCurrency(subtotalOp)}</span>
              </div>
            </div>
          )}

          {/* Logística */}
          {lineasLog.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Logística y Viáticos</h3>
              </div>
              {lineasLog.map((l) => (
                <div key={l.id} className="flex justify-between items-center px-4 py-2 border-t border-[#1a1a1a] text-sm">
                  <span className="text-gray-300">{TIPO_LINEA_LABELS[l.tipo] || l.tipo} — {l.descripcion}
                    <span className="text-gray-500 text-xs ml-2">×{l.cantidad} · {l.dias}d</span>
                  </span>
                  <span className="text-white font-medium">{formatCurrency(l.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal logística</span>
                <span className="text-white font-bold">{formatCurrency(subtotalLog)}</span>
              </div>
            </div>
          )}

          {cot.observaciones && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-sm">
              <p className="text-gray-500 text-xs mb-1">Observaciones</p>
              <p className="text-gray-300">{cot.observaciones}</p>
            </div>
          )}

          {/* Eliminar */}
          <div className="pt-2">
            <button onClick={eliminar} disabled={deleting}
              className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50">
              {deleting ? "Eliminando..." : "Eliminar cotización"}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Equipos bruto</span><span>{formatCurrency(cot.subtotalEquiposBruto)}</span>
            </div>
            {cot.montoDescuento > 0 && (
              <div className="flex justify-between text-red-400 text-xs">
                <span>Precio preferencial</span>
                <span>-{formatCurrency(cot.montoDescuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-white">
              <span>Equipos neto</span><span>{formatCurrency(cot.subtotalEquiposNeto)}</span>
            </div>
            {subtotalExterno > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Equipos externos</span><span>{formatCurrency(subtotalExterno)}</span>
              </div>
            )}
            {cot.subtotalOperacion > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Operación</span><span>{formatCurrency(cot.subtotalOperacion)}</span>
              </div>
            )}
            {subtotalLog > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Logística</span><span>{formatCurrency(subtotalLog)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-white border-t border-[#333] pt-2">
              <span>Subtotal</span><span>{formatCurrency(cot.total)}</span>
            </div>
            {cot.aplicaIva && (
              <div className="flex justify-between text-gray-400">
                <span>IVA 16%</span><span>{formatCurrency(cot.montoIva)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[#B3985B] text-base border-t border-[#333] pt-2">
              <span>Total</span><span>{formatCurrency(cot.granTotal)}</span>
            </div>
            <div className="border-t border-[#222] pt-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Anticipo 50%</span><span className="text-white">{formatCurrency(cot.granTotal * 0.5)}</span>
              </div>
              <div className="flex justify-between">
                <span>Liquidación 50%</span><span className="text-white">{formatCurrency(cot.granTotal * 0.5)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Costos operativos</span><span>{formatCurrency(costoVivo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Utilidad estimada</span>
              <span className={utilidadViva >= 0 ? "text-green-400" : "text-red-400"}>{formatCurrency(utilidadViva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Margen</span>
              <span className={`font-semibold ${semaforoColor}`}>{formatPct(pctVivo)} — {semaforo}</span>
            </div>
          </div>

          <Link href={`/crm/tratos/${cot.trato.id}`}
            className="block bg-[#111] border border-[#222] rounded-xl p-4 text-sm hover:border-[#B3985B] transition-colors">
            <p className="text-gray-500 text-xs mb-1">Trato vinculado</p>
            <p className="text-white">{cot.trato.tipoEvento}</p>
            <p className="text-gray-400 text-xs">{cot.trato.etapa.replace(/_/g, " ")}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
