"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  MODALIDADES_VIATICO,
  TIPOS_VIATICO,
  estadoViatico,
  montoViatico,
  type EstadoViatico,
} from "@/lib/viaticos";

/**
 * Comidas y viáticos del proyecto: el dinero que hay que soltar antes del evento.
 *
 * El renglón llega sembrado desde la cotización, pero lo que vale es lo que se corrige
 * aquí: en el proyecto ya se sabe cuánta gente va de verdad. Coordinación ajusta el
 * desglose y dirección firma; sin firma no sale el efectivo.
 */

type Viatico = {
  id: string;
  tipo: string;
  concepto: string;
  personas: number | null;
  porDia: number | null;
  dias: number | null;
  costoUnitario: number | null;
  monto: number;
  modalidad: string;
  responsable: string | null;
  notas: string | null;
  entregado: boolean;
  fechaEntrega: string | null;
  autorizadoPor: string | null;
  autorizadoEn: string | null;
};

const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const inputCls =
  "w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]";

const BADGE: Record<EstadoViatico, { label: string; cls: string }> = {
  PROPUESTO: { label: "Por autorizar", cls: "bg-amber-900/30 text-amber-500" },
  AUTORIZADO: { label: "Autorizado", cls: "bg-[#B3985B]/15 text-[#B3985B]" },
  ENTREGADO: { label: "Entregado", cls: "bg-green-900/40 text-green-400" },
};

const tipoLabel = (tipo: string) => TIPOS_VIATICO.find((t) => t.valor === tipo)?.label ?? tipo;

const num = (v: string) => v.replace(/\D/g, "");
const dec = (v: string) => v.replace(/[^\d.]/g, "");
const str = (v: number | null) => (v != null ? String(v) : "");

export function PanelViaticos({ proyectoId, puedeAutorizar }: { proyectoId: string; puedeAutorizar: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [filas, setFilas] = useState<Viatico[]>([]);
  const [personasProyecto, setPersonasProyecto] = useState(0);
  const [personasCotizadas, setPersonasCotizadas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [agregando, setAgregando] = useState(false);

  const [tipo, setTipo] = useState("COMIDA");
  const [concepto, setConcepto] = useState("");
  const [personas, setPersonas] = useState("");
  const [porDia, setPorDia] = useState("1");
  const [dias, setDias] = useState("1");
  const [costo, setCosto] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/proyectos/${proyectoId}/viaticos`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setFilas(d.viaticos ?? []);
        setPersonasProyecto(d.personasProyecto ?? 0);
        setPersonasCotizadas(d.personasCotizadas ?? 0);
      }
      setCargando(false);
    })();
  }, [proyectoId]);

  const total = filas.reduce((s, f) => s + f.monto, 0);
  const porAutorizar = filas.filter((f) => !f.autorizadoEn);
  const totalPorAutorizar = porAutorizar.reduce((s, f) => s + f.monto, 0);

  async function editar(fila: Viatico, campos: Record<string, unknown>) {
    setGuardando(fila.id);
    const res = await fetch(`/api/proyectos/${proyectoId}/viaticos/${fila.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setFilas((prev) => prev.map((f) => (f.id === fila.id ? d.viatico : f)));
    else toast.error(d.error ?? "No se pudo guardar");
    setGuardando(null);
  }

  async function agregar() {
    if (!concepto.trim()) return;
    setAgregando(true);
    const res = await fetch(`/api/proyectos/${proyectoId}/viaticos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        concepto,
        personas: personas || null,
        porDia: porDia || 1,
        dias: dias || 1,
        costoUnitario: costo || 0,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setFilas((prev) => [...prev, d.viatico]);
      setConcepto(""); setPersonas(""); setPorDia("1"); setDias("1"); setCosto("");
      setMostrarAlta(false);
    } else {
      toast.error(d.error ?? "No se pudo agregar el renglón");
    }
    setAgregando(false);
  }

  async function eliminar(fila: Viatico) {
    const ok = await confirm({
      title: "Quitar renglón",
      message: `Se elimina «${fila.concepto}» del cuadro de viáticos.`,
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/proyectos/${proyectoId}/viaticos/${fila.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setFilas((prev) => prev.filter((f) => f.id !== fila.id));
    else toast.error(d.error ?? "No se pudo quitar");
  }

  async function autorizarTodas() {
    for (const f of porAutorizar) await editar(f, { accion: "AUTORIZAR" });
  }

  if (cargando) return <div className="ms-stat-card text-gray-600 text-xs">Cargando comidas y viáticos…</div>;

  const previoAlta = montoViatico({
    personas: parseInt(personas) || 1,
    porDia: parseInt(porDia) || 1,
    dias: parseInt(dias) || 1,
    costoUnitario: parseFloat(costo) || 0,
  });

  return (
    <div className="space-y-3">
      <div className="ms-stat-card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em]">
              Comidas y viáticos
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Van <span className="text-white font-semibold">{personasProyecto}</span>{" "}
              {personasProyecto === 1 ? "persona" : "personas"} según los puestos asignados
              {personasCotizadas > 0 && (
                <>
                  {" "}· se cotizaron{" "}
                  <span className={personasCotizadas !== personasProyecto ? "text-amber-500 font-semibold" : "text-gray-400"}>
                    {personasCotizadas}
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setMostrarAlta((v) => !v)}
            className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium"
          >
            {mostrarAlta ? "− Cancelar" : "+ Agregar renglón"}
          </button>
        </div>

        {mostrarAlta && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {TIPOS_VIATICO.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => setTipo(t.valor)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    tipo === t.valor
                      ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]"
                      : "border-[#333] text-gray-500 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Concepto *</label>
              <input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej. Comidas del crew"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Personas</label>
                <input
                  value={personas}
                  onChange={(e) => setPersonas(num(e.target.value))}
                  inputMode="numeric"
                  placeholder={String(personasProyecto)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Al día</label>
                <input value={porDia} onChange={(e) => setPorDia(num(e.target.value))} inputMode="numeric" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Días</label>
                <input value={dias} onChange={(e) => setDias(num(e.target.value))} inputMode="numeric" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Costo unitario</label>
                <input value={costo} onChange={(e) => setCosto(dec(e.target.value))} inputMode="decimal" placeholder="0" className={inputCls} />
              </div>
            </div>
            <button
              disabled={agregando || !concepto.trim()}
              onClick={agregar}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {agregando ? "Guardando..." : `Agregar · ${money(previoAlta)}`}
            </button>
          </div>
        )}
      </div>

      {filas.length > 0 && (
        <div className="ms-table-wrapper">
          <div className="divide-y divide-[#1a1a1a]">
            {filas.map((f) => {
              const estado = estadoViatico(f);
              const badge = BADGE[estado];
              const desajuste = f.personas != null && f.personas !== personasProyecto;
              return (
                <div key={f.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-medium">{f.concepto}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-gray-400">{tipoLabel(f.tipo)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                      <span className="text-sm text-white font-semibold">{money(f.monto)}</span>
                      {guardando === f.id && <span className="text-[10px] text-gray-600">guardando…</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {estado === "PROPUESTO" && puedeAutorizar && (
                        <button
                          onClick={() => editar(f, { accion: "AUTORIZAR" })}
                          className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Autorizar
                        </button>
                      )}
                      {estado === "AUTORIZADO" && (
                        <button
                          onClick={() => editar(f, { accion: "ENTREGAR" })}
                          className="text-xs text-[#B3985B] hover:text-white transition-colors font-medium"
                        >
                          {f.modalidad === "SERVICIO" ? "Marcar pagado" : "Marcar entregado"}
                        </button>
                      )}
                      {estado === "ENTREGADO" && (
                        <button
                          onClick={() => editar(f, { accion: "DESHACER_ENTREGA" })}
                          className="text-xs text-gray-600 hover:text-white transition-colors"
                        >
                          Deshacer entrega
                        </button>
                      )}
                      {estado !== "PROPUESTO" && puedeAutorizar && (
                        <button
                          onClick={() => editar(f, { accion: "REVOCAR" })}
                          className="text-xs text-gray-600 hover:text-amber-500 transition-colors"
                        >
                          Revocar
                        </button>
                      )}
                      {!f.entregado && (
                        <button onClick={() => eliminar(f)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-gray-600 block mb-0.5">Personas</label>
                      <input
                        defaultValue={str(f.personas)}
                        onBlur={(e) => e.target.value !== str(f.personas) && editar(f, { personas: num(e.target.value) })}
                        inputMode="numeric"
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-gray-600 block mb-0.5">Al día</label>
                      <input
                        defaultValue={str(f.porDia)}
                        onBlur={(e) => e.target.value !== str(f.porDia) && editar(f, { porDia: num(e.target.value) })}
                        inputMode="numeric"
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-gray-600 block mb-0.5">Días</label>
                      <input
                        defaultValue={str(f.dias)}
                        onBlur={(e) => e.target.value !== str(f.dias) && editar(f, { dias: num(e.target.value) })}
                        inputMode="numeric"
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-gray-600 block mb-0.5">Costo unitario</label>
                      <input
                        defaultValue={str(f.costoUnitario)}
                        onBlur={(e) => e.target.value !== str(f.costoUnitario) && editar(f, { costoUnitario: dec(e.target.value) })}
                        inputMode="decimal"
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-gray-600 block mb-0.5">Cómo se libera</label>
                      <select
                        value={f.modalidad}
                        onChange={(e) => editar(f, { modalidad: e.target.value })}
                        className={inputCls}
                      >
                        {MODALIDADES_VIATICO.map((m) => (
                          <option key={m.valor} value={m.valor}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-gray-600 block mb-0.5">
                        {f.modalidad === "SERVICIO" ? "Proveedor" : "Quién recibe"}
                      </label>
                      <input
                        defaultValue={f.responsable ?? ""}
                        onBlur={(e) => e.target.value !== (f.responsable ?? "") && editar(f, { responsable: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {desajuste && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-2 flex-wrap">
                      Este renglón va para {f.personas} y en el proyecto quedaron {personasProyecto}.
                      <button
                        onClick={() => editar(f, { personas: String(personasProyecto) })}
                        className="text-[#B3985B] hover:text-white transition-colors font-medium"
                      >
                        Actualizar a {personasProyecto}
                      </button>
                    </p>
                  )}

                  {f.autorizadoEn && (
                    <p className="text-[11px] text-gray-600">
                      Autorizó {f.autorizadoPor ?? "dirección"} ·{" "}
                      {new Date(f.autorizadoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      {f.fechaEntrega && (
                        <>
                          {" "}· entregado el{" "}
                          {new Date(f.fechaEntrega).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">
              {filas.length} {filas.length === 1 ? "renglón" : "renglones"} ·{" "}
              <span className="text-white font-semibold">{money(total)}</span>
              {totalPorAutorizar > 0 && <> · {money(totalPorAutorizar)} sin autorizar</>}
            </p>
            {porAutorizar.length > 0 && puedeAutorizar && (
              <button
                onClick={autorizarTodas}
                className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Autorizar los {porAutorizar.length} renglones pendientes
              </button>
            )}
            {porAutorizar.length > 0 && !puedeAutorizar && (
              <p className="text-xs text-amber-600">Falta la firma de dirección para liberar el dinero.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
