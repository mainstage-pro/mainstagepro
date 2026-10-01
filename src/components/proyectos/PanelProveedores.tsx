"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";
import HoraInput from "@/components/ui/HoraInput";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import SelectorEscenario, { type EscenarioOpcion } from "@/components/proyectos/SelectorEscenario";
import { fmt24to12 } from "@/lib/hora";
import {
  FASES_PROVEEDOR,
  TITULO_FASE,
  MODALIDADES_ENTREGA,
  MODALIDADES_REGRESO,
  labelModalidad,
  type FaseProveedor,
} from "@/lib/proveedor-evento";

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

/** Concepto que renta el proveedor y no corresponde a ninguna línea de la cotización. */
export type ConceptoManual = { id?: string; descripcion: string; cantidad: number };

export type ProveedorEventoItem = {
  id: string;
  escenarioId: string | null;
  proveedorId: string | null;
  nombreProveedor: string;
  servicioEquipo: string | null;
  telefonoProveedor: string | null;
  responsable: string | null;
  notas: string | null;
  modalidadEntrega: string | null;
  modalidadRegreso: string | null;
  costoAcordado: number | null;
  cuentaPagarId: string | null;
  cuentaPagar: { id: string; monto: number; montoPagado: number; estado: string; fechaCompromiso: string } | null;
  bloques: BloqueProveedor[];
  lineas: LineaProveedor[];
  items: ConceptoManual[];
};

type ProveedorCatalogo = { id: string; nombre: string; empresa: string | null; telefono: string | null };

/**
 * Equipo de tercero tal como quedó en el rider del proyecto. Aquí es de lectura:
 * quién lo trae y a cómo se captura en la pestaña de producción, junto al equipo.
 */
type EquipoTercero = {
  id: string;
  descripcion: string;
  cantidad: number;
  dias: number;
  costoExterno: number | null;
  confirmado: boolean;
  proveedor: { id: string; nombre: string; empresa: string | null } | null;
};

const FASES = FASES_PROVEEDOR;
type Fase = FaseProveedor;
const FASE_LABEL = TITULO_FASE;

type Ventana = { fase: Fase; fecha: string; horaInicio: string; horaFin: string; detalle: string };

type Borrador = {
  servicioEquipo: string;
  telefonoProveedor: string;
  responsable: string;
  notas: string;
  modalidadEntrega: string;
  modalidadRegreso: string;
  costoAcordado: string;
  ventanas: Ventana[];
  conceptos: ConceptoManual[];
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
    modalidadEntrega: prov.modalidadEntrega ?? "",
    modalidadRegreso: prov.modalidadRegreso ?? "",
    costoAcordado: prov.costoAcordado != null ? String(prov.costoAcordado) : "",
    ventanas: ventanasDe(prov),
    conceptos: (prov.items ?? []).map((it) => ({ id: it.id, descripcion: it.descripcion, cantidad: it.cantidad })),
  };
}

/** Días seleccionables: del montaje (o dos días antes del evento) al desmontaje. */
function rangoDias(dias: string[], montaje: string | null, desmontaje: string | null): string[] {
  if (!dias.length) return [montaje, desmontaje].filter((d): d is string => !!d);
  const corre = (dia: string, n: number) => {
    const d = new Date(`${dia}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const inicio = [montaje, corre(dias[0], -2)].filter(Boolean).sort()[0]!;
  const fin = [desmontaje, corre(dias[dias.length - 1], 2)].filter(Boolean).sort().pop()!;
  const out: string[] = [];
  for (let d = inicio; d <= fin && out.length < 40; d = corre(d, 1)) out.push(d);
  return out;
}

const inputCls =
  "w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]";

export function PanelProveedores({
  proyectoId,
  dias,
  evento,
  equipo = [],
  escenarios = [],
  sinPrecios = false,
}: {
  proyectoId: string;
  /** Vista discreta: el panel sirve igual para operar, pero sin el costo acordado. */
  sinPrecios?: boolean;
  /** Escenarios del proyecto. Con menos de dos, el selector por renglón no aparece. */
  escenarios?: EscenarioOpcion[];
  /** Días del evento en "YYYY-MM-DD". La operación siempre cae en uno de ellos. */
  dias: string[];
  /**
   * Personal del proyecto, para elegir quién atiende a cada proveedor.
   * Un proveedor sin dueño es un proveedor que nadie recibe ni revisa.
   */
  equipo?: { nombre: string; coordinaEnSitio: boolean }[];
  evento: {
    numeroProyecto: string;
    nombre: string;
    venue: string | null;
    direccion: string | null;
    /** Extremos del proyecto, para ofrecer días de entrega y recolección fuera del evento. */
    fechaMontaje?: string | null;
    fechaDesmontaje?: string | null;
  };
}) {
  const toast = useToast();
  const confirm = useConfirm();

  const [proveedores, setProveedores] = useState<ProveedorEventoItem[]>([]);
  const [catalogo, setCatalogo] = useState<ProveedorCatalogo[]>([]);
  const [equiposTercero, setEquiposTercero] = useState<EquipoTercero[]>([]);
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
      const [rp, rc, rl] = await Promise.all([
        // Los imprevistos del día viven en su propia tarjeta, no en la coordinación previa.
        fetch(`/api/proyectos/${proyectoId}/proveedores-evento?imprevisto=0${sinPrecios ? "&discreto=1" : ""}`),
        fetch("/api/proveedores"),
        fetch(`/api/proyectos/${proyectoId}/equipos-cotizacion${sinPrecios ? "?discreto=1" : ""}`),
      ]);
      if (rp.ok) setProveedores((await rp.json()).proveedores ?? []);
      if (rc.ok) {
        const d = await rc.json();
        setCatalogo(
          (d.proveedores ?? []).map((p: ProveedorCatalogo) => ({
            id: p.id, nombre: p.nombre, empresa: p.empresa, telefono: p.telefono,
          })),
        );
      }
      if (rl.ok) setEquiposTercero((await rl.json()).equiposTercero ?? []);
      setCargando(false);
    })();
  }, [proyectoId, sinPrecios]);

  const opcionesCatalogo = useMemo(
    () => catalogo.map((p) => ({ value: p.id, label: p.empresa ? `${p.nombre} — ${p.empresa}` : p.nombre })),
    [catalogo],
  );

  /** Lo que trae cada proveedor, según el rider. */
  const equiposDe = (proveedorId: string | null) =>
    proveedorId ? equiposTercero.filter((e) => e.proveedor?.id === proveedorId) : [];

  const diasSeleccionables = useMemo(
    () => rangoDias(dias, aDiaISO(evento.fechaMontaje ?? null) || null, aDiaISO(evento.fechaDesmontaje ?? null) || null),
    [dias, evento.fechaMontaje, evento.fechaDesmontaje],
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

  function editarConcepto(pid: string, i: number, patch: Partial<ConceptoManual>) {
    setBorradores((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], conceptos: prev[pid].conceptos.map((c, j) => (j === i ? { ...c, ...patch } : c)) },
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
        setCatalogo((prev) => [...prev, { id: proveedor.proveedorId, nombre, empresa: null, telefono: altaCelular || null }]);
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
          modalidadEntrega: b.modalidadEntrega,
          modalidadRegreso: b.modalidadRegreso,
          // En vista discreta el costo no llegó al navegador: mandarlo lo borraría.
          ...(sinPrecios ? {} : { costoAcordado: b.costoAcordado === "" ? null : b.costoAcordado }),
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

      const rItems = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: b.conceptos }),
      });
      if (!rItems.ok) throw new Error("items");
      const { items } = await rItems.json();

      reemplazar({ ...proveedor, bloques, items });
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
    setCatalogo((prev) => [...prev, { id: proveedor.proveedorId, nombre: proveedor.nombreProveedor, empresa: null, telefono: proveedor.telefonoProveedor }]);
    toast.success("Proveedor registrado en el catálogo");
  }

  async function generarCxP(prov: ProveedorEventoItem) {
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}/cxp`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(d.error ?? "No se pudo generar la cuenta por pagar");
    reemplazar({ ...prov, cuentaPagarId: d.cuentaPagar.id, cuentaPagar: d.cuentaPagar });
    toast.success(d.creada ? "Cuenta por pagar generada" : "Cuenta por pagar actualizada");
  }

  async function asignarEscenario(prov: ProveedorEventoItem, escenarioId: string | null) {
    reemplazar({ ...prov, escenarioId });
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${prov.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escenarioId }),
    });
    if (!res.ok) toast.error("No se pudo asignar el escenario");
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
    const ventanas = (b?.ventanas ?? ventanasDe(prov)).filter((v) => v.fecha || v.horaInicio || v.detalle);
    const rentado = [
      ...prov.lineas.map((l) => `• ${l.cantidad} × ${[l.marca, l.modelo].filter(Boolean).join(" ") || l.descripcion}`),
      ...(b?.conceptos ?? prov.items ?? [])
        .filter((c) => c.descripcion.trim())
        .map((c) => `• ${c.cantidad} × ${c.descripcion}`),
    ];
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
      "",
      labelModalidad(b?.modalidadEntrega ?? prov.modalidadEntrega) ? `Entrega: ${labelModalidad(b?.modalidadEntrega ?? prov.modalidadEntrega)}` : null,
      labelModalidad(b?.modalidadRegreso ?? prov.modalidadRegreso) ? `Regreso: ${labelModalidad(b?.modalidadRegreso ?? prov.modalidadRegreso)}` : null,
      rentado.length ? "" : null,
      rentado.length ? "Equipo a su cargo:" : null,
      ...rentado,
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
                        {prov.cuentaPagar && !sinPrecios && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">CxP {money(prov.cuentaPagar.monto)}</span>
                        )}
                        {/* Sin dueño nadie lo recibe ni lo revisa: bloquea la orden de producción. */}
                        {!prov.responsable?.trim() && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">sin responsable</span>
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
                      <SelectorEscenario
                        escenarios={escenarios}
                        value={prov.escenarioId}
                        onChange={(esc) => asignarEscenario(prov, esc)}
                        className="mr-1"
                      />
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
                          <label className="text-xs text-gray-500 block mb-1">Quién lo atiende</label>
                          {equipo.length > 0 ? (
                            <select
                              value={b.responsable}
                              onChange={(e) => editar(prov.id, { responsable: e.target.value })}
                              className={inputCls}
                            >
                              <option value="">— Sin asignar —</option>
                              {equipo.map((t) => (
                                <option key={t.nombre} value={t.nombre}>
                                  {t.coordinaEnSitio ? `★ ${t.nombre}` : t.nombre}
                                </option>
                              ))}
                              {/* Lo capturado antes puede no estar en el equipo: no se pierde. */}
                              {b.responsable && !equipo.some((t) => t.nombre === b.responsable) && (
                                <option value={b.responsable}>{b.responsable}</option>
                              )}
                            </select>
                          ) : (
                            <input value={b.responsable} onChange={(e) => editar(prov.id, { responsable: e.target.value })} placeholder="Quién responde" className={inputCls} />
                          )}
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Entrega de equipos</label>
                          <select
                            value={b.modalidadEntrega}
                            onChange={(e) => editar(prov.id, { modalidadEntrega: e.target.value })}
                            className={inputCls}
                          >
                            <option value="">Cómo nos llega…</option>
                            {MODALIDADES_ENTREGA.map((m) => (
                              <option key={m.valor} value={m.valor}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Regreso de equipos</label>
                          <select
                            value={b.modalidadRegreso}
                            onChange={(e) => editar(prov.id, { modalidadRegreso: e.target.value })}
                            className={inputCls}
                          >
                            <option value="">Cómo se regresa…</option>
                            {MODALIDADES_REGRESO.map((m) => (
                              <option key={m.valor} value={m.valor}>{m.label}</option>
                            ))}
                          </select>
                        </div>
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
                                {/* La operación siempre cae en un día del evento; entrega y
                                    recolección pueden ser antes o después. */}
                                {(v.fase === "OPERACION" ? dias : diasSeleccionables).map((d) => (
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

                      <div>
                        <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em] mb-2">Qué nos renta</p>
                        {equiposDe(prov.proveedorId).length > 0 ? (
                          <div className="rounded-lg border border-[#222] divide-y divide-[#1a1a1a]">
                            {equiposDe(prov.proveedorId).map((e) => (
                              <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                                <span className="text-gray-300">{e.cantidad} × {e.descripcion}</span>
                                {(e.costoExterno ?? 0) > 0 && !sinPrecios && (
                                  <span className="text-[10px] text-gray-600 ml-auto">
                                    {money((e.costoExterno ?? 0) * e.cantidad * Math.max(1, e.dias))}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">
                            Sin equipo asignado en el rider del proyecto.
                          </p>
                        )}

                        <p className="text-xs text-gray-500 mt-3 mb-1.5">Y lo que renta sin estar en la cotización:</p>
                        <div className="space-y-1.5">
                          {b.conceptos.map((c, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input
                                value={c.cantidad}
                                onChange={(e) => editarConcepto(prov.id, i, { cantidad: Number(e.target.value.replace(/\D/g, "")) || 1 })}
                                inputMode="numeric"
                                className={`w-14 shrink-0 ${inputCls}`}
                              />
                              <input
                                value={c.descripcion}
                                onChange={(e) => editarConcepto(prov.id, i, { descripcion: e.target.value })}
                                placeholder="Ej. Planta de luz 20 kVA"
                                className={inputCls}
                              />
                              <button
                                onClick={() => editar(prov.id, { conceptos: b.conceptos.filter((_, j) => j !== i) })}
                                className="text-gray-600 hover:text-red-400 text-base leading-none px-1 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => editar(prov.id, { conceptos: [...b.conceptos, { descripcion: "", cantidad: 1 }] })}
                            className="text-xs text-[#B3985B] hover:text-white transition-colors"
                          >
                            + Agregar concepto manual
                          </button>
                        </div>
                      </div>

                      {!sinPrecios && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Costo acordado (lo que nos cuesta)</label>
                          {/* Con equipo en el rider, el costo sale de ahí: un solo lugar donde
                              corregir el precio, y nunca dos cifras que no cuadran. */}
                          {equiposDe(prov.proveedorId).length > 0 ? (
                            <div className="text-sm text-[#B3985B] font-semibold py-1.5">
                              {money(prov.costoAcordado ?? 0)}
                              <span className="block text-[10px] text-gray-600 font-normal">
                                Sale del costo de sus equipos
                              </span>
                            </div>
                          ) : (
                            <input
                              value={b.costoAcordado}
                              onChange={(e) => editar(prov.id, { costoAcordado: e.target.value.replace(/[^\d.]/g, "") })}
                              inputMode="decimal"
                              placeholder="0.00"
                              className={inputCls}
                            />
                          )}
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
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <button
                          disabled={guardando === prov.id}
                          onClick={() => guardar(prov)}
                          className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          {guardando === prov.id ? "Guardando..." : "Guardar"}
                        </button>
                        {!sinPrecios && (
                        <button
                          onClick={() => generarCxP(prov)}
                          className="border border-[#333] hover:border-[#B3985B] text-gray-300 hover:text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          {prov.cuentaPagar ? "Actualizar CxP" : "Generar CxP"}
                        </button>
                        )}
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
