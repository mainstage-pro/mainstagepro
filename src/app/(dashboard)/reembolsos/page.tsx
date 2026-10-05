"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { EncabezadoResumen, Kpi } from "@/components/resumen/ui";
import { fmtMonedaCorta } from "@/lib/resumen/base";

interface Categoria { id: string; nombre: string; tipo: string }
interface Proyecto { id: string; nombre: string; numeroProyecto: string; estado: string }
interface Solicitud {
  id: string;
  folio: string;
  fechaGasto: string;
  concepto: string;
  monto: number;
  comprobanteUrl: string | null;
  notas: string | null;
  estado: string;
  revisadoEn: string | null;
  motivoRechazo: string | null;
  solicitante: { id: string; name: string };
  revisadoPor: { id: string; name: string } | null;
  categoria: { id: string; nombre: string } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
  cuentaPagar: { id: string; estado: string; monto: number; montoPagado: number; fechaCompromiso: string } | null;
}

const inputCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

function fmtDate(s: string) {
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function hoyISO() {
  return new Date().toLocaleDateString("en-CA");
}

/** Cómo va la solicitud: el pago lo manda la CxP, no la solicitud. */
function estadoVisible(s: Solicitud): { texto: string; clase: string } {
  if (s.estado === "RECHAZADO") return { texto: "Rechazado", clase: "bg-red-900/50 text-red-300" };
  if (s.estado === "PENDIENTE") return { texto: "Por revisar", clase: "bg-amber-900/50 text-amber-300" };
  if (s.cuentaPagar?.estado === "LIQUIDADO") return { texto: "Reembolsado", clase: "bg-green-900/50 text-green-300" };
  if (s.cuentaPagar?.estado === "PARCIAL") return { texto: "Pago parcial", clase: "bg-blue-900/50 text-blue-300" };
  return { texto: "Aprobado · por pagar", clase: "bg-[#B3985B]/20 text-[#B3985B]" };
}

const FORM_VACIO = { fechaGasto: hoyISO(), concepto: "", monto: "", categoriaId: "", proyectoId: "", notas: "", comprobanteUrl: "" };

export default function ReembolsosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [puedeRevisar, setPuedeRevisar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"PENDIENTE" | "APROBADO" | "RECHAZADO" | "TODAS">("PENDIENTE");

  const [form, setForm] = useState({ ...FORM_VACIO });
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const [detalle, setDetalle] = useState<Solicitud | null>(null);
  const [revision, setRevision] = useState({ categoriaId: "", proyectoId: "", fechaCompromiso: hoyISO(), motivo: "" });
  const [revisando, setRevisando] = useState(false);

  const load = useCallback(async () => {
    const [rs, rc, rp] = await Promise.all([
      fetch("/api/reembolsos", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/categorias-financieras", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/proyectos", { cache: "no-store" }).then(r => r.json()),
    ]);
    setSolicitudes(rs.solicitudes ?? []);
    setPuedeRevisar(!!rs.puedeRevisar);
    setCategorias((rc.categorias ?? []).filter((c: Categoria) => c.tipo === "GASTO"));
    setProyectos((rp.proyectos ?? []).filter((p: Proyecto) => p.estado !== "CANCELADO"));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function subirComprobante(file: File | null) {
    if (!file) return;
    setSubiendo(true);
    try {
      const blob = await upload(`reembolsos/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
      });
      setForm(p => ({ ...p, comprobanteUrl: blob.url }));
    } catch {
      toast.error("No se pudo subir el comprobante");
    } finally {
      setSubiendo(false);
    }
  }

  async function enviarSolicitud() {
    setGuardando(true);
    try {
      const res = await fetch("/api/reembolsos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "No se pudo enviar"); return; }
      toast.success("Solicitud enviada a administración");
      setForm({ ...FORM_VACIO });
      setCreando(false);
      await load();
    } finally {
      setGuardando(false);
    }
  }

  function abrirDetalle(s: Solicitud) {
    setDetalle(s);
    setRevision({
      categoriaId: s.categoria?.id ?? "",
      proyectoId: s.proyecto?.id ?? "",
      fechaCompromiso: hoyISO(),
      motivo: "",
    });
  }

  async function aprobar() {
    if (!detalle) return;
    setRevisando(true);
    try {
      const res = await fetch(`/api/reembolsos/${detalle.id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoriaId: revision.categoriaId,
          proyectoId: revision.proyectoId,
          fechaCompromiso: revision.fechaCompromiso,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "No se pudo aprobar"); return; }
      toast.success("Aprobado · ya está en Cobros y pagos para reembolsarse");
      setDetalle(null);
      await load();
    } finally {
      setRevisando(false);
    }
  }

  async function rechazar() {
    if (!detalle) return;
    setRevisando(true);
    try {
      const res = await fetch(`/api/reembolsos/${detalle.id}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: revision.motivo }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "No se pudo rechazar"); return; }
      toast.success("Solicitud rechazada");
      setDetalle(null);
      await load();
    } finally {
      setRevisando(false);
    }
  }

  async function cancelar(s: Solicitud) {
    if (!await confirm({ message: `¿Cancelar la solicitud ${s.folio}?`, danger: true, confirmText: "Cancelar solicitud" })) return;
    const res = await fetch(`/api/reembolsos/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo cancelar");
      return;
    }
    setDetalle(null);
    await load();
  }

  const visibles = filtro === "TODAS" ? solicitudes : solicitudes.filter(s => s.estado === filtro);
  const pendientes = solicitudes.filter(s => s.estado === "PENDIENTE");
  const porPagar = solicitudes.filter(s => s.estado === "APROBADO" && s.cuentaPagar?.estado !== "LIQUIDADO");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <EncabezadoResumen
        titulo="Reembolsos"
        subtitulo={puedeRevisar ? "Gastos que el equipo pagó de su bolsa · todas las solicitudes" : "Gastos que pagaste de tu bolsa"}
        acciones={
          <button onClick={() => setCreando(true)} className="ms-btn-primary whitespace-nowrap">
            + Solicitar reembolso
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Kpi
          label="Por revisar"
          valor={pendientes.length}
          nota={fmtMonedaCorta(pendientes.reduce((s, x) => s + x.monto, 0))}
          tono={pendientes.length > 0 ? "ambar" : "verde"}
        />
        <Kpi
          label="Aprobados sin pagar"
          valor={porPagar.length}
          nota={fmtMonedaCorta(porPagar.reduce((s, x) => s + x.monto, 0))}
          tono={porPagar.length > 0 ? "oro" : "verde"}
        />
        <Kpi
          label="Solicitudes"
          valor={solicitudes.length}
          nota="en total"
          tono="oro"
        />
      </div>

      <div className="ms-tabs flex-wrap w-fit max-w-full mb-4">
        {([["PENDIENTE", "Por revisar"], ["APROBADO", "Aprobados"], ["RECHAZADO", "Rechazados"], ["TODAS", "Todas"]] as const).map(([clave, label]) => (
          <button key={clave} onClick={() => setFiltro(clave)} className={filtro === clave ? "ms-tab-active" : "ms-tab"}>
            {label}
          </button>
        ))}
      </div>

      <div className="ms-card overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center ms-subtitle">Cargando...</div>
        ) : visibles.length === 0 ? (
          <div className="text-center py-16">
            <p className="ms-subtitle">Sin solicitudes aquí</p>
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead className="ms-thead">
              <tr>
                {["Folio", "Fecha del gasto", "Quién", "Concepto", "Categoría", "Monto", "Estado"].map(h => (
                  <th key={h} className="ms-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {visibles.map(s => {
                const est = estadoVisible(s);
                return (
                  <tr key={s.id} onClick={() => abrirDetalle(s)} className="ms-tr cursor-pointer">
                    <td className="ms-td text-xs text-[#6b7280] whitespace-nowrap">{s.folio}</td>
                    <td className="ms-td text-xs text-[#6b7280] whitespace-nowrap">{fmtDate(s.fechaGasto)}</td>
                    <td className="ms-td text-sm text-[#9ca3af]">{s.solicitante.name}</td>
                    <td className="ms-td">
                      <p className="text-white text-sm">{s.concepto}</p>
                      {s.proyecto && <p className="text-[#555] text-xs">{s.proyecto.nombre}</p>}
                    </td>
                    <td className="ms-td text-xs text-[#6b7280]">{s.categoria?.nombre ?? "—"}</td>
                    <td className="ms-td text-right font-medium text-white whitespace-nowrap">{formatCurrency(s.monto)}</td>
                    <td className="ms-td">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${est.clase}`}>{est.texto}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Nueva solicitud */}
      {creando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setCreando(false); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Solicitar reembolso</h3>
              <button onClick={() => setCreando(false)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">¿En qué gastaste? *</label>
                <input value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                  placeholder="Ej: Gasolina de la camioneta" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto *</label>
                  <input type="number" step="0.01" min="0" value={form.monto}
                    onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fecha del gasto *</label>
                  <input type="date" value={form.fechaGasto}
                    onChange={e => setForm(p => ({ ...p, fechaGasto: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                <Combobox
                  value={form.categoriaId}
                  onChange={v => setForm(p => ({ ...p, categoriaId: v }))}
                  options={[{ value: "", label: "— Que la elija administración —" }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))]}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">¿Fue para algún proyecto?</label>
                <Combobox
                  value={form.proyectoId}
                  onChange={v => setForm(p => ({ ...p, proyectoId: v }))}
                  options={[{ value: "", label: "— Ninguno —" }, ...proyectos.map(p => ({ value: p.id, label: `${p.numeroProyecto} - ${p.nombre}` }))]}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Comprobante (ticket o factura)</label>
                {form.comprobanteUrl ? (
                  <div className="flex items-center gap-3">
                    <a href={form.comprobanteUrl} target="_blank" rel="noreferrer" className="text-[#B3985B] text-sm hover:underline">Ver comprobante</a>
                    <button onClick={() => setForm(p => ({ ...p, comprobanteUrl: "" }))} className="text-xs text-gray-500 hover:text-red-400">Quitar</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*,application/pdf" disabled={subiendo}
                    onChange={e => subirComprobante(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#1a1a1a] file:text-gray-300 file:text-xs" />
                )}
                {subiendo && <p className="text-xs text-gray-500 mt-1">Subiendo…</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setCreando(false)} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={enviarSolicitud} disabled={guardando || subiendo || !form.concepto.trim() || !form.monto}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors">
                {guardando ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalle y revisión */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setDetalle(null); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estadoVisible(detalle).clase}`}>
                  {estadoVisible(detalle).texto}
                </span>
                <span className="text-[#6b7280] text-xs">{detalle.folio}</span>
              </div>
              <button onClick={() => setDetalle(null)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>

            <p className="text-white font-semibold text-base mb-1">{detalle.concepto}</p>
            <p className="text-2xl font-bold text-white mb-5">{formatCurrency(detalle.monto)}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Lo pagó</span>
                <span className="text-white">{detalle.solicitante.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Fecha del gasto</span>
                <span className="text-white">{fmtDate(detalle.fechaGasto)}</span>
              </div>
              {detalle.proyecto && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Proyecto</span>
                  <Link href={`/proyectos/${detalle.proyecto.id}`} className="text-[#B3985B] hover:underline">{detalle.proyecto.nombre}</Link>
                </div>
              )}
              {detalle.categoria && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Categoría</span>
                  <span className="text-white">{detalle.categoria.nombre}</span>
                </div>
              )}
              {detalle.comprobanteUrl && (
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Comprobante</span>
                  <a href={detalle.comprobanteUrl} target="_blank" rel="noreferrer" className="text-[#B3985B] hover:underline">Abrir</a>
                </div>
              )}
              {detalle.notas && (
                <div className="pt-2 border-t border-[#1e1e1e]">
                  <p className="text-[#6b7280] text-xs mb-1">Notas</p>
                  <p className="text-white text-sm whitespace-pre-wrap">{detalle.notas}</p>
                </div>
              )}
              {detalle.revisadoPor && (
                <div className="pt-2 border-t border-[#1e1e1e] text-xs">
                  <p className="text-[#6b7280]">
                    Revisado por <span className="text-white">{detalle.revisadoPor.name}</span>
                    {detalle.revisadoEn && <span className="text-[#555]"> · {fmtDate(detalle.revisadoEn)}</span>}
                  </p>
                  {detalle.motivoRechazo && <p className="text-red-400/80 mt-1">{detalle.motivoRechazo}</p>}
                </div>
              )}
              {detalle.cuentaPagar && (
                <div className="pt-2 border-t border-[#1e1e1e] text-xs">
                  <p className="text-[#6b7280]">
                    El reembolso se paga desde{" "}
                    <Link href="/finanzas/cobros-pagos" className="text-[#B3985B] hover:underline">Cobros y pagos</Link>
                    . Ahí sale el gasto con su categoría.
                  </p>
                  <p className="text-[#555] mt-1">
                    Pagado {formatCurrency(detalle.cuentaPagar.montoPagado)} de {formatCurrency(detalle.cuentaPagar.monto)}
                  </p>
                </div>
              )}
            </div>

            {/* Revisión de administración */}
            {puedeRevisar && detalle.estado === "PENDIENTE" && (
              <div className="mt-5 pt-4 border-t border-[#1e1e1e] space-y-3">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Revisión</p>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Categoría del gasto *</label>
                  <Combobox
                    value={revision.categoriaId}
                    onChange={v => setRevision(p => ({ ...p, categoriaId: v }))}
                    options={[{ value: "", label: "— Elige una —" }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))]}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Proyecto</label>
                  <Combobox
                    value={revision.proyectoId}
                    onChange={v => setRevision(p => ({ ...p, proyectoId: v }))}
                    options={[{ value: "", label: "— Ninguno —" }, ...proyectos.map(p => ({ value: p.id, label: `${p.numeroProyecto} - ${p.nombre}` }))]}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">¿Cuándo se le paga?</label>
                  <input type="date" value={revision.fechaCompromiso}
                    onChange={e => setRevision(p => ({ ...p, fechaCompromiso: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Motivo del rechazo (solo si lo rechazas)</label>
                  <input value={revision.motivo} onChange={e => setRevision(p => ({ ...p, motivo: e.target.value }))}
                    placeholder="Ej: falta el ticket" className={inputCls} />
                </div>
                <div className="flex gap-3">
                  <button onClick={rechazar} disabled={revisando || !revision.motivo.trim()}
                    className="flex-1 py-2.5 rounded-xl border border-red-900/60 text-red-300 text-sm hover:bg-red-900/20 disabled:opacity-40 transition-colors">
                    Rechazar
                  </button>
                  <button onClick={aprobar} disabled={revisando || !revision.categoriaId}
                    className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors">
                    {revisando ? "Guardando..." : "Aprobar"}
                  </button>
                </div>
              </div>
            )}

            {detalle.estado === "PENDIENTE" && (
              <button onClick={() => cancelar(detalle)} className="mt-4 text-xs text-gray-600 hover:text-red-400 transition-colors">
                Cancelar esta solicitud
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
