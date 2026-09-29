"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import ModalRegistrarPago, {
  type GrupoPago,
  type PagoCapturado,
} from "@/components/finanzas/ModalRegistrarPago";
import DatosBancariosAcreedor from "@/components/finanzas/DatosBancariosAcreedor";
import { fichaAcreedorHref, type DatosBancarios } from "@/lib/datos-bancarios";

// Espejo de "Pagos a personal", pero para todo lo que el proyecto le debe a
// alguien de fuera: lo rentado en preproducción, el imprevisto del día del
// evento y el gasto capturado a mano en finanzas.

interface Gasto {
  id: string;
  origen: "COORDINADO" | "IMPREVISTO" | "DIRECTO";
  proveedorEventoId: string | null;
  cuentaPagarId: string | null;
  acreedorKey: string;
  acreedorId: string | null;
  acreedorNombre: string;
  tipoAcreedor: string;
  concepto: string;
  unidades: number | null;
  monto: number;
  saldo: number;
  estado: "SIN_CXP" | "PENDIENTE" | "PARCIAL" | "PAGADO";
  solicitadoPor: string | null;
  fechaSolicitud: string | null;
}

interface ProyectoCiclo {
  id: string;
  nombre: string;
  numeroProyecto: string | null;
  cliente: string;
  fechaEvento: string;
  presupuestoTerceros: number;
  gastos: Gasto[];
}

interface Deuda {
  proyectoId: string;
  proyectoNombre: string;
  cuentaPagarId: string;
  concepto: string;
  monto: number;
  saldo: number;
  estado: Gasto["estado"];
}

interface SinCxP {
  proyectoId: string;
  proyectoNombre: string;
  proveedorEventoId: string;
  concepto: string;
  monto: number;
}

interface Acreedor {
  key: string;
  nombre: string;
  tipoAcreedor: string;
  acreedorId: string | null;
  datosBancarios: DatosBancarios | null;
  deudas: Deuda[];
  sinCxP: SinCxP[];
  porPagar: number;
  porFormalizar: number;
  todoPagado: boolean;
}

interface CicloData {
  ciclo: string;
  desde: string;
  hasta: string;
  proyectos: ProyectoCiclo[];
  cartera: Acreedor[];
  cuentas: { id: string; nombre: string; banco: string | null }[];
  proveedores: { id: string; nombre: string; empresa: string | null }[];
}

const ORIGEN_LABEL: Record<string, string> = {
  COORDINADO: "Coordinado en preproducción",
  IMPREVISTO: "Imprevisto del evento",
  DIRECTO: "Gasto directo",
};

const ORIGEN_COLOR: Record<string, string> = {
  COORDINADO: "text-[#B3985B]",
  IMPREVISTO: "text-orange-400",
  DIRECTO: "text-cyan-400",
};

const ORDEN_ORIGEN = ["COORDINADO", "IMPREVISTO", "DIRECTO"];

const TIPO_ACREEDOR_LABEL: Record<string, string> = {
  PROVEEDOR: "Proveedor",
  TECNICO: "Técnico",
  PERSONAL_INTERNO: "Mainstage",
  OTRO: "Otro",
  EMPRESA: "Empresa",
  SOCIO: "Socio",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  });
}

function cicloActual(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d.toISOString().slice(0, 10);
}

function correrCiclo(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function PagosProveedoresPage() {
  const [ciclo, setCiclo] = useState(cicloActual);
  const [data, setData] = useState<CicloData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagoTarget, setPagoTarget] = useState<Acreedor[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [formalizando, setFormalizando] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pagos-proveedores?ciclo=${ciclo}`);
    setData(await res.json());
    setLoading(false);
  }, [ciclo]);

  useEffect(() => {
    load();
  }, [load]);

  // Solo se ofrece pagar lo que ya es cuenta por pagar y trae saldo: lo que
  // todavía no se formalizó pasa primero por "Generar nota por pagar".
  function abrirModalPago(acreedores: Acreedor[]) {
    const conSaldo = acreedores
      .map((a) => ({ ...a, deudas: a.deudas.filter((d) => d.estado !== "PAGADO" && d.saldo > 0) }))
      .filter((a) => a.deudas.length > 0);
    if (!conSaldo.length) return;
    setPagoTarget(conSaldo);
  }

  const grupos: GrupoPago[] = (pagoTarget ?? []).map((a) => ({
    id: a.key,
    titulo: a.nombre,
    datosBancarios: a.datosBancarios,
    fichaHref: fichaAcreedorHref(a.tipoAcreedor, a.acreedorId),
    lineas: a.deudas.map((d) => ({
      id: d.cuentaPagarId,
      etiqueta: d.proyectoNombre,
      detalle: d.concepto,
      monto: d.saldo,
    })),
  }));

  async function confirmarPago(pago: PagoCapturado) {
    if (!pagoTarget) return;
    setGuardando(true);
    try {
      // Un POST por acreedor: cada uno debe quedar con sus propios movimientos
      // en el ledger, aunque el pago se haya capturado de un jalón.
      for (const acreedor of pagoTarget) {
        const ids = pago.seleccion[acreedor.key] ?? [];
        if (!ids.length) continue;
        const total = pago.totalPorGrupo[acreedor.key] ?? 0;
        if (total <= 0) continue;

        const entradas =
          pagoTarget.length === 1
            ? pago.desembolsos
            : [{ ...pago.desembolsos[0], monto: total }];

        await fetch("/api/pagos-proveedores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuentasPagarIds: ids,
            fecha: pago.fecha,
            notas: pago.notas,
            entradas,
          }),
        });
      }
      setPagoTarget(null);
      await load();
    } finally {
      setGuardando(false);
    }
  }

  async function formalizar(acreedor: Acreedor) {
    if (!acreedor.sinCxP.length) return;
    setFormalizando(acreedor.key);
    try {
      await fetch("/api/pagos-proveedores/cxp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorEventoIds: acreedor.sinCxP.map((s) => s.proveedorEventoId) }),
      });
      await load();
    } finally {
      setFormalizando(null);
    }
  }

  const proyectos = data?.proyectos ?? [];
  const cartera = data?.cartera ?? [];
  const totalPresupuesto = proyectos.reduce((s, p) => s + p.presupuestoTerceros, 0);
  const totalGasto = proyectos.reduce((s, p) => s + p.gastos.reduce((ss, g) => ss + g.monto, 0), 0);
  const totalPorPagar = cartera.reduce((s, a) => s + a.porPagar, 0);
  const totalPorFormalizar = cartera.reduce((s, a) => s + a.porFormalizar, 0);
  const totalPagado = Math.round((totalGasto - totalPorPagar - totalPorFormalizar) * 100) / 100;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ms-h1">Pagos a Proveedores</h1>
          <p className="ms-subtitle mt-0.5">Rentas, imprevistos y gastos del evento · ciclo semanal</p>
        </div>
        <div className="flex items-center gap-2 ms-card px-3 py-2">
          <button
            onClick={() => setCiclo(correrCiclo(ciclo, -7))}
            className="text-gray-400 hover:text-white px-1 transition-colors"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-500">Ciclo de pago</p>
            <input
              type="date"
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none text-center"
            />
          </div>
          <button
            onClick={() => setCiclo(correrCiclo(ciclo, 7))}
            className="text-gray-400 hover:text-white px-1 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {data && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Proyectos</p>
            <p className="ms-h1">{proyectos.length}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {fmtDate(data.desde, { weekday: undefined })} – {fmtDate(data.hasta, { weekday: undefined })}
            </p>
          </div>
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Presupuesto terceros</p>
            <p className="ms-h1">{fmt(totalPresupuesto)}</p>
            <p className="text-xs text-gray-600 mt-0.5">cotizado</p>
          </div>
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Gasto real</p>
            <p className={`text-2xl font-bold ${totalGasto > totalPresupuesto ? "text-red-400" : "text-[#B3985B]"}`}>
              {fmt(totalGasto)}
            </p>
            <p className={`text-xs mt-0.5 ${totalGasto > totalPresupuesto ? "text-red-500" : "text-gray-600"}`}>
              {totalPresupuesto > 0
                ? `${Math.round((totalGasto / totalPresupuesto) * 100)}% del presupuesto`
                : "sin presupuesto"}
            </p>
          </div>
          <div className="ms-stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Por pagar</p>
            <p className="text-2xl font-bold text-yellow-400">{fmt(totalPorPagar)}</p>
            {totalPorFormalizar > 0 && (
              <p className="text-xs text-orange-400 mt-0.5">{fmt(totalPorFormalizar)} sin formalizar</p>
            )}
            {totalPorFormalizar === 0 && totalPagado > 0 && (
              <p className="text-xs text-green-500 mt-0.5">{fmt(totalPagado)} ya pagado</p>
            )}
          </div>
        </div>
      )}

      {loading && <div className="text-center py-16 text-gray-500">Cargando ciclo...</div>}

      {!loading && data && proyectos.length === 0 && (
        <div className="ms-card p-10 text-center">
          <p className="text-gray-400 text-sm">No hay gastos a proveedores en este ciclo</p>
          <p className="text-gray-600 text-xs mt-1">
            {fmtDate(data.desde)} al {fmtDate(data.hasta)}
          </p>
        </div>
      )}

      {!loading && data && proyectos.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Desglose por proyecto</h2>

            {proyectos.map((p) => {
              const total = p.gastos.reduce((s, g) => s + g.monto, 0);
              const sinFormalizar = p.gastos.filter((g) => g.estado === "SIN_CXP" && g.monto > 0).length;
              const sinMonto = p.gastos.filter((g) => g.monto <= 0).length;
              const diff = total - p.presupuestoTerceros;

              const porOrigen = new Map<string, Gasto[]>();
              for (const g of p.gastos) {
                if (!porOrigen.has(g.origen)) porOrigen.set(g.origen, []);
                porOrigen.get(g.origen)!.push(g);
              }
              const origenes = ORDEN_ORIGEN.filter((o) => porOrigen.has(o));

              return (
                <div key={p.id} className="ms-table-wrapper">
                  <div className="px-5 py-3 bg-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <Link
                        href={`/proyectos/${p.id}`}
                        className="text-white font-semibold hover:text-[#B3985B] transition-colors text-sm"
                      >
                        {p.nombre}
                      </Link>
                      <p className="text-gray-500 text-xs">
                        {p.cliente} · {fmtDate(p.fechaEvento, { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                    </div>
                    <div className="text-right">
                      {p.presupuestoTerceros > 0 && (
                        <p className="text-xs text-gray-500">
                          Presupuesto: <span className="text-gray-300">{fmt(p.presupuestoTerceros)}</span>
                        </p>
                      )}
                      {sinFormalizar > 0 && <p className="text-xs text-orange-400">{sinFormalizar} sin formalizar</p>}
                      {sinMonto > 0 && <p className="text-xs text-yellow-500">{sinMonto} sin costo</p>}
                    </div>
                  </div>

                  {p.gastos.length === 0 ? (
                    <p className="text-gray-600 text-xs text-center py-4">Sin gastos registrados</p>
                  ) : (
                    <div>
                      <div className="grid grid-cols-[1fr_1fr_60px_100px_72px] gap-2 px-4 py-1.5 border-b border-[#0d0d0d]">
                        {["Acreedor", "Concepto", "Unid.", "Monto", "Estado"].map((h) => (
                          <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
                            {h}
                          </p>
                        ))}
                      </div>

                      {origenes.map((origen) => {
                        const filas = porOrigen.get(origen)!;
                        return (
                          <div key={origen}>
                            <div className="px-4 py-1 bg-[#0d0d0d] flex items-center gap-2">
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider ${ORIGEN_COLOR[origen]}`}
                              >
                                {ORIGEN_LABEL[origen]}
                              </span>
                              <span className="text-[10px] text-gray-700 ml-auto">
                                {filas.length} renglón{filas.length !== 1 ? "es" : ""}
                              </span>
                            </div>

                            {filas.map((g) => (
                              <EditableGastoRow 
                                key={g.id} 
                                gasto={g} 
                                proveedores={data?.proveedores ?? []} 
                                proyectoId={p.id} 
                                onUpdate={load} 
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="px-5 py-3 bg-[#0d0d0d] flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-500">
                        Total terceros: <span className="text-white font-semibold">{fmt(total)}</span>
                      </span>
                      {p.presupuestoTerceros > 0 && (
                        <span
                          className={`${Math.abs(diff) < 1 ? "text-gray-500" : diff > 0 ? "text-red-400" : "text-green-400"}`}
                        >
                          {diff > 0
                            ? `+${fmt(diff)} sobre presupuesto`
                            : diff < 0
                              ? `${fmt(diff)} bajo presupuesto`
                              : "= presupuesto"}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/proyectos/${p.id}`}
                      className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors"
                    >
                      Editar en proyecto →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ms-table-wrapper sticky top-6">
            <div className="px-5 py-3 bg-[#1a1a1a] border-b border-[#222]">
              <p className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cartera de la semana</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {cartera.length} acreedor{cartera.length !== 1 ? "es" : ""}
                {" · "}miércoles{" "}
                {fmtDate(ciclo, { weekday: undefined, day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {cartera.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">Sin acreedores en este ciclo</p>
            ) : (
              <div>
                {cartera.map((a) => (
                  <div
                    key={a.key}
                    className={`border-b border-[#0d0d0d] last:border-0 ${a.todoPagado ? "opacity-60" : ""}`}
                  >
                    <div className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{a.nombre}</p>
                          <p className="text-[10px] text-gray-600">
                            {TIPO_ACREEDOR_LABEL[a.tipoAcreedor] ?? a.tipoAcreedor}
                          </p>
                        </div>
                        <p className={`text-base font-bold shrink-0 ${a.todoPagado ? "text-green-400" : "text-[#B3985B]"}`}>
                          {fmt(a.porPagar + a.porFormalizar)}
                        </p>
                      </div>

                      <div className="space-y-0.5 mb-3">
                        {a.deudas.map((d) => (
                          <div key={d.cuentaPagarId} className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500 truncate">{d.proyectoNombre}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className="text-xs text-gray-300">{fmt(d.estado === "PAGADO" ? d.monto : d.saldo)}</p>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  d.estado === "PAGADO"
                                    ? "bg-green-900/30 text-green-400"
                                    : "bg-yellow-900/20 text-yellow-500"
                                }`}
                              >
                                {d.estado === "PAGADO" ? "✓" : d.estado === "PARCIAL" ? "Parc." : "Pend."}
                              </span>
                            </div>
                          </div>
                        ))}
                        {a.sinCxP.map((s) => (
                          <div key={s.proveedorEventoId} className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500 truncate">{s.proyectoNombre}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className="text-xs text-gray-300">{fmt(s.monto)}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-900/20 text-orange-400">
                                Sin CxP
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <DatosBancariosAcreedor
                        datos={a.datosBancarios}
                        nombre={a.nombre}
                        fichaHref={fichaAcreedorHref(a.tipoAcreedor, a.acreedorId)}
                        className="mb-3"
                      />

                      {a.todoPagado ? (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-green-500">
                          <span>✓</span>
                          <span>Pagado</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {a.porPagar > 0 && (
                            <button
                              onClick={() => abrirModalPago([a])}
                              className="w-full py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold transition-colors"
                            >
                              Registrar pago · {fmt(a.porPagar)}
                            </button>
                          )}
                          {a.porFormalizar > 0 && (
                            <button
                              onClick={() => formalizar(a)}
                              disabled={formalizando === a.key}
                              className="w-full py-1.5 rounded-lg border border-[#333] hover:border-[#B3985B]/40 text-gray-500 hover:text-[#B3985B] text-xs transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                            >
                              {formalizando === a.key ? (
                                "Generando..."
                              ) : (
                                <>
                                  <FileText strokeWidth={1.75} className="w-3.5 h-3.5" /> Generar nota por pagar ·{" "}
                                  {fmt(a.porFormalizar)}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="px-5 py-3 bg-[#0d0d0d] border-t border-[#222]">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pendiente de pago</span>
                    <span className="text-yellow-400 font-semibold">{fmt(totalPorPagar)}</span>
                  </div>
                  {totalPorFormalizar > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Sin formalizar</span>
                      <span className="text-orange-400">{fmt(totalPorFormalizar)}</span>
                    </div>
                  )}
                  {totalPagado > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Ya pagado</span>
                      <span className="text-green-500">{fmt(totalPagado)}</span>
                    </div>
                  )}
                  {totalPorPagar > 0 && (
                    <button
                      onClick={() => abrirModalPago(cartera.filter((a) => a.porPagar > 0))}
                      className="w-full mt-3 py-2 rounded-lg border border-[#B3985B]/40 hover:bg-[#B3985B]/10 text-[#B3985B] text-xs font-medium transition-colors"
                    >
                      Registrar pago a todos · {fmt(totalPorPagar)}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {pagoTarget && (
        <ModalRegistrarPago
          titulo={pagoTarget.length === 1 ? `Pagar a ${pagoTarget[0].nombre}` : "Pagar a proveedores"}
          subtitulo={`Ciclo del ${fmtDate(ciclo, { weekday: undefined, day: "numeric", month: "long" })}`}
          grupos={grupos}
          cuentas={data?.cuentas ?? []}
          guardando={guardando}
          onCerrar={() => {
            if (!guardando) setPagoTarget(null);
          }}
          onConfirmar={confirmarPago}
        />
      )}
    </div>
  );
}
function EditableGastoRow({
  gasto,
  proveedores,
  proyectoId,
  onUpdate
}: {
  gasto: Gasto;
  proveedores: { id: string; nombre: string; empresa: string | null }[];
  proyectoId: string;
  onUpdate: () => void;
}) {
  const [editingAcreedor, setEditingAcreedor] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState(false);
  const [editingMonto, setEditingMonto] = useState(false);

  const [acreedorVal, setAcreedorVal] = useState(gasto.acreedorId || "");
  const [conceptoVal, setConceptoVal] = useState(gasto.concepto || "");
  const [montoVal, setMontoVal] = useState(gasto.monto?.toString() || "");

  const [saving, setSaving] = useState(false);

  async function saveAcreedor(provId: string) {
    if (provId === gasto.acreedorId) { setEditingAcreedor(false); return; }
    setSaving(true);
    try {
      if (gasto.proveedorEventoId) {
        await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${gasto.proveedorEventoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proveedorId: provId || null }),
        });
      } else if (gasto.cuentaPagarId) {
        await fetch(`/api/cuentas-pagar/${gasto.cuentaPagarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proveedorId: provId || null }),
        });
      }
      onUpdate();
    } finally {
      setSaving(false);
      setEditingAcreedor(false);
    }
  }

  async function saveConcepto() {
    const val = conceptoVal.trim();
    if (val === gasto.concepto) { setEditingConcepto(false); return; }
    setSaving(true);
    try {
      if (gasto.proveedorEventoId) {
        await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${gasto.proveedorEventoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ servicioEquipo: val }),
        });
      } else if (gasto.cuentaPagarId) {
        await fetch(`/api/cuentas-pagar/${gasto.cuentaPagarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concepto: val }),
        });
      }
      onUpdate();
    } finally {
      setSaving(false);
      setEditingConcepto(false);
    }
  }

  async function saveMonto() {
    const num = parseFloat(montoVal);
    if (isNaN(num) || num === gasto.monto) { setEditingMonto(false); return; }
    setSaving(true);
    try {
      if (gasto.proveedorEventoId) {
        await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${gasto.proveedorEventoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ costoAcordado: num }),
        });
      } else if (gasto.cuentaPagarId) {
        await fetch(`/api/cuentas-pagar/${gasto.cuentaPagarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monto: num, motivo: "Ajuste directo desde tabla de finanzas" }),
        });
      }
      onUpdate();
    } finally {
      setSaving(false);
      setEditingMonto(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_60px_100px_72px] gap-2 px-4 py-2 border-b border-[#0d0d0d] last:border-0 items-center hover:bg-[#111] transition-colors">
      <div 
        className={`min-w-0 -mx-1 px-1 py-0.5 rounded ${gasto.estado !== "PAGADO" ? "cursor-pointer hover:bg-[#222]" : ""}`}
        onClick={() => { if (!editingAcreedor && gasto.estado !== "PAGADO") setEditingAcreedor(true); }}
      >
        {editingAcreedor ? (
          <select
            autoFocus
            value={acreedorVal}
            onChange={(e) => {
              setAcreedorVal(e.target.value);
              saveAcreedor(e.target.value);
            }}
            onBlur={() => setEditingAcreedor(false)}
            disabled={saving}
            className="w-full bg-[#1a1a1a] border border-[#222] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">Sin proveedor</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.empresa || p.nombre}</option>
            ))}
          </select>
        ) : (
          <>
            <p className="text-sm text-white truncate">{gasto.acreedorNombre}</p>
            <p className="text-[10px] text-gray-600">
              {TIPO_ACREEDOR_LABEL[gasto.tipoAcreedor] ?? gasto.tipoAcreedor}
            </p>
          </>
        )}
      </div>

      <div 
        className={`min-w-0 -mx-1 px-1 py-0.5 rounded ${gasto.estado !== "PAGADO" ? "cursor-pointer hover:bg-[#222]" : ""}`}
        onClick={() => { if (!editingConcepto && gasto.estado !== "PAGADO") setEditingConcepto(true); }}
      >
        {editingConcepto ? (
          <input
            autoFocus
            type="text"
            value={conceptoVal}
            onChange={(e) => setConceptoVal(e.target.value)}
            onBlur={saveConcepto}
            onKeyDown={e => e.key === "Enter" && saveConcepto()}
            disabled={saving}
            className="w-full bg-[#1a1a1a] border border-[#222] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
          />
        ) : (
          <>
            <p className="text-xs text-gray-400 truncate">{gasto.concepto}</p>
            {gasto.solicitadoPor && (
              <p className="text-[10px] text-gray-600 truncate">pidió {gasto.solicitadoPor}</p>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-gray-500">{gasto.unidades ?? "—"}</p>

      <div 
        className={`text-right -mx-1 px-1 py-0.5 rounded ${gasto.estado !== "PAGADO" ? "cursor-pointer hover:bg-[#222]" : ""}`}
        onClick={() => { if (!editingMonto && gasto.estado !== "PAGADO") setEditingMonto(true); }}
      >
        {editingMonto ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={montoVal}
            onChange={(e) => setMontoVal(e.target.value)}
            onBlur={saveMonto}
            onKeyDown={e => e.key === "Enter" && saveMonto()}
            disabled={saving}
            className="w-full text-right bg-[#1a1a1a] border border-[#222] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
          />
        ) : (
          <>
            <p className={`text-sm font-medium ${gasto.monto > 0 ? "text-white" : "text-gray-600"}`}>
              {gasto.monto > 0 ? fmt(gasto.monto) : "—"}
            </p>
            {gasto.estado === "PARCIAL" && (
              <p className="text-[10px] text-yellow-500">resta {fmt(gasto.saldo)}</p>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            gasto.estado === "PAGADO"
              ? "bg-green-900/40 text-green-400"
              : gasto.estado === "PARCIAL"
                ? "bg-yellow-900/30 text-yellow-400"
                : gasto.estado === "PENDIENTE"
                  ? "bg-yellow-900/20 text-yellow-500"
                  : gasto.monto > 0
                    ? "bg-orange-900/20 text-orange-400"
                    : "text-gray-700"
          }`}
        >
          {gasto.estado === "PAGADO"
            ? "Pagado"
            : gasto.estado === "PARCIAL"
              ? "Parcial"
              : gasto.estado === "PENDIENTE"
                ? "Pend."
                : gasto.monto > 0
                  ? "Sin CxP"
                  : "—"}
        </span>
      </div>
    </div>
  );
}
