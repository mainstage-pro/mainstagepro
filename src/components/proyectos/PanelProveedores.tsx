"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";
import HoraInput from "@/components/ui/HoraInput";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { fmt24to12 } from "@/lib/hora";

export type BloqueProveedor = {
  id: string;
  fase: string | null;
  fecha: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  detalle: string | null;
};

export type LineaProveedor = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  dias: number;
  tipo: string;
};

export type ProveedorEventoItem = {
  id: string;
  proveedorId: string | null;
  nombreProveedor: string;
  servicioEquipo: string | null;
  telefonoProveedor: string | null;
  responsable: string | null;
  notas: string | null;
  costoAcordado: number | null;
  cuentaPagarId: string | null;
  cuentaPagar: { id: string; monto: number; montoPagado: number; estado: string; fechaCompromiso: string } | null;
  bloques: BloqueProveedor[];
  lineas: LineaProveedor[];
};

type ProveedorCatalogo = { id: string; nombre: string; telefono: string | null };

const FASES = ["INSTALACION", "OPERACION", "RECOLECCION"] as const;
type Fase = (typeof FASES)[number];
const FASE_LABEL: Record<Fase, string> = {
  INSTALACION: "Instalación",
  OPERACION: "Operación",
  RECOLECCION: "Recolección",
};

type Ventana = { fase: Fase; fecha: string; horaInicio: string; horaFin: string; detalle: string };

type Borrador = {
  servicioEquipo: string;
  telefonoProveedor: string;
  responsable: string;
  notas: string;
  costoAcordado: string;
  ventanas: Ventana[];
};

const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** "2026-09-24T12:00:00.000Z" → "2026-09-24" sin que la zona horaria corra el día. */
function aDiaISO(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function etiquetaDia(dia: string): string {
  const d = new Date(`${dia}T12:00:00.000Z`);
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function ventanasDe(prov: ProveedorEventoItem): Ventana[] {
  return FASES.map((fase) => {
    const b = prov.bloques.find((x) => x.fase === fase);
    return {
      fase,
      fecha: aDiaISO(b?.fecha ?? null),
      horaInicio: b?.horaInicio ?? "",
      horaFin: b?.horaFin ?? "",
      detalle: b?.detalle ?? "",
    };
  });
}

function borradorDe(prov: ProveedorEventoItem): Borrador {
  return {
    servicioEquipo: prov.servicioEquipo ?? "",
    telefonoProveedor: prov.telefonoProveedor ?? "",
    responsable: prov.responsable ?? "",
    notas: prov.notas ?? "",
    costoAcordado: prov.costoAcordado != null ? String(prov.costoAcordado) : "",
    ventanas: ventanasDe(prov),
  };
}

const inputCls =
  "w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]";

export function PanelProveedores({
  proyectoId,
  dias,
  evento,
}: {
  proyectoId: string;
  /** Días del evento en "YYYY-MM-DD", para acotar las fechas de las ventanas. */
  dias: string[];
  evento: { numeroProyecto: string; nombre: string; venue: string | null; direccion: string | null };
}) {
  const toast = useToast();
  const confirm = useConfirm();

  const [proveedores, setProveedores] = useState<ProveedorEventoItem[]>([]);
  const [catalogo, setCatalogo] = useState<ProveedorCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});

  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [altaCatalogoId, setAltaCatalogoId] = useState("");
  const [altaNombre, setAltaNombre] = useState("");
  const [altaCelular, setAltaCelular] = useState("");
  const [altaServicio, setAltaServicio] = useState("");
  const [altaNuevo, setAltaNuevo] = useState(false);
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    (async () => {
      const [rp, rc] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}/proveedores-evento`),
        fetch("/api/proveedores"),
      ]);
      if (rp.ok) setProveedores((await rp.json()).proveedores ?? []);
      if (rc.ok) {
        const d = await rc.json();
        setCatalogo((d.proveedores ?? []).map((p: ProveedorCatalogo) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono })));
      }
      setCargando(false);
    })();
  }, [proyectoId]);

  const opcionesCatalogo = useMemo(
    () => catalogo.map((p) => ({ value: p.id, label: p.nombre })),
    [catalogo],
  );

  function reemplazar(prov: ProveedorEventoItem) {
    setProveedores((prev) => prev.map((p) => (p.id === prov.id ? prov : p)));
    setBorradores((prev) => ({ ...prev, [prov.id]: borradorDe(prov) }));
  }

  function editar(pid: string, patch: Partial<Borrador>) {
    setBorradores((prev) => ({ ...prev, [pid]: { ...prev[pid], ...patch } }));
  }

  function editarVentana(pid: string, fase: Fase, patch: Partial<Ventana>) {
    setBorradores((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], ventanas: prev[pid].ventanas.map((v) => (v.fase === fase ? { ...v, ...patch } : v)) },
    }));
  }

  function alternar(prov: ProveedorEventoItem) {
    if (abierto === prov.id) return setAbierto(null);
    setBorradores((prev) => ({ ...prev, [prov.id]: prev[prov.id] ?? borradorDe(prov) }));
    setAbierto(prov.id);
  }

  async function agregar() {
    const delCatalogo = catalogo.find((c) => c.id === altaCatalogoId);
    const nombre = (altaNuevo ? altaNombre : delCatalogo?.nombre ?? altaNombre).trim();
    if (!nombre) return;
    setAgregando(true);
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proveedorId: altaNuevo ? null : altaCatalogoId || null,
        crearEnCatalogo: altaNuevo,
        nombreProveedor: nombre,
        telefonoProveedor: altaNuevo ? altaCelular : delCatalogo?.telefono ?? null,
        servicioEquipo: altaServicio || null,
      }),
    });
    if (res.ok) {
      const { proveedor } = await res.json();
      setProveedores((prev) => [...prev, proveedor]);
      if (altaNuevo && proveedor.proveedorId) {
        setCatalogo((prev) => [...prev, { id: proveedor.proveedorId, nombre, telefono: altaCelular || null }]);
      }
      setAltaCatalogoId(""); setAltaNombre(""); setAltaCelular(""); setAltaServicio(""); setAltaNuevo(false);
      setMostrarAlta(false);
      alternar(proveedor);
    } else {
      toast.error((await res.json().catch(() => ({}))).error ?? "No se pudo agregar el proveedor");
    }
    setAgregando(false);
  }

  async function guardar(prov: ProveedorEventoItem) {
    const b = borradores[prov.id];
    if (!b) return;
    setGuardando(prov.id);
    try {
      const rDatos = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioEquipo: b.servicioEquipo,
          telefonoProveedor: b.telefonoProveedor,
          responsable: b.responsable,
          notas: b.notas,
          costoAcordado: b.costoAcordado === "" ? null : b.costoAcordado,
          proveedorId: prov.proveedorId,
        }),
      });
      if (!rDatos.ok) throw new Error("datos");
      const { proveedor } = await rDatos.json();

      const rVentanas = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}/ventanas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ventanas: b.ventanas }),
      });
      if (!rVentanas.ok) throw new Error("ventanas");
      const { bloques } = await rVentanas.json();

      reemplazar({ ...proveedor, bloques });
      toast.success("Proveedor actualizado");
    } catch {
      toast.error("No se pudo guardar el proveedor");
    }
    setGuardando(null);
  }

  /** Liga un bloque que nació como nombre suelto al catálogo, con nombre y celular. */
  async function ligarACatalogo(prov: ProveedorEventoItem) {
    const b = borradores[prov.id];
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crearEnCatalogo: true, telefonoProveedor: b?.telefonoProveedor ?? prov.telefonoProveedor }),
    });
    if (!res.ok) return toast.error("No se pudo registrar en el catálogo");
    const { proveedor } = await res.json();
    reemplazar(proveedor);
    setCatalogo((prev) => [...prev, { id: proveedor.proveedorId, nombre: proveedor.nombreProveedor, telefono: proveedor.telefonoProveedor }]);
    toast.success("Proveedor registrado en el catálogo");
  }

  async function generarCxP(prov: ProveedorEventoItem) {
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}/cxp`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(d.error ?? "No se pudo generar la cuenta por pagar");
    reemplazar({ ...prov, cuentaPagarId: d.cuentaPagar.id, cuentaPagar: d.cuentaPagar });
    toast.success(d.creada ? "Cuenta por pagar generada" : "Cuenta por pagar actualizada");
  }

  async function eliminar(prov: ProveedorEventoItem) {
    const ok = await confirm({
      message: `¿Quitar a ${prov.nombreProveedor} del evento? Sus horarios se borran y los equipos quedan sin proveedor asignado.`,
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("No se pudo quitar el proveedor");
    setProveedores((prev) => prev.filter((p) => p.id !== prov.id));
  }

  /** Texto de la participación del proveedor, listo para WhatsApp. */
  function mensaje(prov: ProveedorEventoItem): string {
    const b = borradores[prov.id];
    const ventanas = (b?.ventanas ?? ventanasDe(prov)).filter((v) => v.horaInicio || v.detalle);
    const lineas = [
      `*${evento.nombre}* · ${evento.numeroProyecto}`,
      evento.venue ? `Sede: ${evento.venue}` : null,
      evento.direccion ? `Dirección: ${evento.direccion}` : null,
      "",
      `Hola${prov.responsable ? ` ${prov.responsable}` : ""}, esta es su participación en el evento:`,
      prov.servicioEquipo ? `Servicio: ${prov.servicioEquipo}` : null,
      "",
      ...ventanas.map((v) => {
        const horas = [fmt24to12(v.horaInicio), v.horaFin ? fmt24to12(v.horaFin) : null].filter(Boolean).join(" a ");
        return `• ${FASE_LABEL[v.fase]}: ${[v.fecha ? etiquetaDia(v.fecha) : null, horas || "por confirmar"].filter(Boolean).join(" ")}${v.detalle ? ` — ${v.detalle}` : ""}`;
      }),
      prov.lineas.length ? "" : null,
      prov.lineas.length ? "Equipo a su cargo:" : null,
      ...prov.lineas.map((l) => `• ${l.cantidad} × ${[l.marca, l.modelo].filter(Boolean).join(" ") || l.descripcion}`),
      b?.notas?.trim() ? `\n${b.notas.trim()}` : null,
    ];
    return lineas.filter((l) => l !== null).join("\n");
  }

  function enviarWhatsApp(prov: ProveedorEventoItem) {
    const tel = (borradores[prov.id]?.telefonoProveedor ?? prov.telefonoProveedor ?? "").replace(/\D/g, "");
    const numero = tel.length === 10 ? `52${tel}` : tel;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje(prov))}`, "_blank");
  }

  if (cargando) {
    return <div className="ms-stat-card text-gray-600 text-xs">Cargando proveedores…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="ms-stat-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em]">Proveedores y subrentas</p>
          <button
            onClick={() => setMostrarAlta((v) => !v)}
            className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium"
          >
            {mostrarAlta ? "− Cancelar" : "+ Agregar proveedor"}
          </button>
        </div>

        {mostrarAlta && (
          <div className="mt-4 space-y-3">
            {altaNuevo ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre *</label>
                  <input value={altaNombre} onChange={(e) => setAltaNombre(e.target.value)} placeholder="Proveedor nuevo" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Celular</label>
                  <input value={altaCelular} onChange={(e) => setAltaCelular(e.target.value)} placeholder="10 dígitos" className={inputCls} />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Proveedor del catálogo</label>
                <Combobox value={altaCatalogoId} onChange={setAltaCatalogoId} options={opcionesCatalogo} placeholder="Buscar proveedor..." />
              </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => setAltaNuevo((v) => !v)}
                className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors"
              >
                {altaNuevo ? "← Elegir uno del catálogo" : "¿Es nuevo? Regístralo aquí con nombre y celular"}
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Equipo / servicio que provee</label>
              <input value={altaServicio} onChange={(e) => setAltaServicio(e.target.value)} placeholder="Ej. Pantalla LED 4×3" className={inputCls} />
            </div>
            <button
              disabled={agregando || (altaNuevo ? !altaNombre.trim() : !altaCatalogoId)}
              onClick={agregar}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {agregando ? "Guardando..." : "Agregar al evento"}
            </button>
          </div>
        )}
      </div>

      {proveedores.length > 0 && (
        <div className="ms-table-wrapper">
          <div className="divide-y divide-[#1a1a1a]">
            {proveedores.map((prov) => {
              const b = borradores[prov.id];
              const expandido = abierto === prov.id;
              const ventanasResumen = ventanasDe(prov).filter((v) => v.horaInicio);
              return (
                <div key={prov.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => alternar(prov)} className="flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium">{prov.nombreProveedor}</p>
                        {!prov.proveedorId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400">sin catálogo</span>
                        )}
                        {prov.lineas.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-400">
                            {prov.lineas.length} equipo{prov.lineas.length === 1 ? "" : "s"}
                          </span>
                        )}
                        {prov.cuentaPagar && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">CxP {money(prov.cuentaPagar.monto)}</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {[
                          prov.servicioEquipo,
                          prov.responsable,
                          prov.telefonoProveedor,
                          ventanasResumen.length
                            ? ventanasResumen.map((v) => `${FASE_LABEL[v.fase]} ${fmt24to12(v.horaInicio)}`).join(" · ")
                            : "sin horarios",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => alternar(prov)} className="text-xs px-1.5 py-0.5 rounded border border-transparent text-gray-600 hover:text-gray-300 hover:border-[#333] transition-colors">
                        {expandido ? "Cerrar" : "Editar"}
                      </button>
                      <button onClick={() => eliminar(prov)} className="text-gray-600 hover:text-red-400 text-base leading-none transition-colors px-1">×</button>
                    </div>
                  </div>

                  {expandido && b && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Equipo / servicio</label>
                          <input value={b.servicioEquipo} onChange={(e) => editar(prov.id, { servicioEquipo: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Responsable</label>
                          <input value={b.responsable} onChange={(e) => editar(prov.id, { responsable: e.target.value })} placeholder="Quién responde" className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Teléfono</label>
                          <input value={b.telefonoProveedor} onChange={(e) => editar(prov.id, { telefonoProveedor: e.target.value })} className={inputCls} />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Notas y especificaciones de su participación</label>
                        <textarea
                          value={b.notas}
                          onChange={(e) => editar(prov.id, { notas: e.target.value })}
                          rows={2}
                          placeholder="Qué aporta, condiciones, requerimientos de acceso..."
                          className={`${inputCls} resize-y`}
                        />
                      </div>

                      <div>
                        <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em] mb-2">Instalación, operación y recolección</p>
                        <div className="space-y-2">
                          {b.ventanas.map((v) => (
                            <div key={v.fase} className="grid grid-cols-12 gap-2 items-center">
                              <span className="col-span-12 md:col-span-2 text-xs text-gray-400">{FASE_LABEL[v.fase]}</span>
                              <select
                                value={v.fecha}
                                onChange={(e) => editarVentana(prov.id, v.fase, { fecha: e.target.value })}
                                className={`col-span-4 md:col-span-3 ${inputCls}`}
                              >
                                <option value="">Día…</option>
                                {dias.map((d) => (
                                  <option key={d} value={d}>{etiquetaDia(d)}</option>
                                ))}
                              </select>
                              <div className="col-span-4 md:col-span-2">
                                <HoraInput value={v.horaInicio} onChange={(val) => editarVentana(prov.id, v.fase, { horaInicio: val })} size="sm" placeholder="Inicio" className={inputCls} />
                              </div>
                              <div className="col-span-4 md:col-span-2">
                                <HoraInput value={v.horaFin} onChange={(val) => editarVentana(prov.id, v.fase, { horaFin: val })} size="sm" placeholder="Fin" className={inputCls} />
                              </div>
                              <input
                                value={v.detalle}
                                onChange={(e) => editarVentana(prov.id, v.fase, { detalle: e.target.value })}
                                placeholder="Nota"
                                className={`col-span-12 md:col-span-3 ${inputCls}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {prov.lineas.length > 0 && (
                        <div>
                          <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em] mb-2">Equipo a su cargo</p>
                          <div className="flex flex-wrap gap-1.5">
                            {prov.lineas.map((l) => (
                              <span key={l.id} className="text-[11px] px-2 py-1 rounded bg-[#111] border border-[#222] text-gray-300">
                                {l.cantidad} × {[l.marca, l.modelo].filter(Boolean).join(" ") || l.descripcion}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Costo acordado (lo que nos cuesta)</label>
                          <input
                            value={b.costoAcordado}
                            onChange={(e) => editar(prov.id, { costoAcordado: e.target.value.replace(/[^\d.]/g, "") })}
                            inputMode="decimal"
                            placeholder="0.00"
                            className={inputCls}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-2 text-xs text-gray-500">
                          {prov.cuentaPagar ? (
                            <>
                              CxP por {money(prov.cuentaPagar.monto)} · {prov.cuentaPagar.estado.toLowerCase()} · vence{" "}
                              {new Date(prov.cuentaPagar.fechaCompromiso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                            </>
                          ) : !prov.proveedorId ? (
                            <button onClick={() => ligarACatalogo(prov)} className="text-[#B3985B] hover:text-white transition-colors">
                              Registrar en el catálogo para poder generarle la CxP →
                            </button>
                          ) : (
                            "Guarda el costo y genera la cuenta por pagar."
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          disabled={guardando === prov.id}
                          onClick={() => guardar(prov)}
                          className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          {guardando === prov.id ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={() => generarCxP(prov)}
                          className="border border-[#333] hover:border-[#B3985B] text-gray-300 hover:text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          {prov.cuentaPagar ? "Actualizar CxP" : "Generar CxP"}
                        </button>
                        <button
                          onClick={() => enviarWhatsApp(prov)}
                          className="border border-[#333] hover:border-[#B3985B] text-gray-300 hover:text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          Enviar por WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
