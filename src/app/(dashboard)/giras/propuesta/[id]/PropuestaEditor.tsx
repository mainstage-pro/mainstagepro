"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import {
  ESTADOS_PROPUESTA,
  ESTADO_PROPUESTA_COLOR,
  ESTADO_PROPUESTA_LABEL,
  GRUPO_SUBTOTAL,
  MODELOS_COBRO,
  MODELO_COBRO_LABEL,
  TIPOS_LINEA_PROPUESTA,
  TIPO_LINEA_PROPUESTA_LABEL,
  UNIDADES_COBRO,
  UNIDAD_COBRO_LABEL,
  fmtFechaCorta,
  fmtMoneda,
} from "@/lib/giras";
import { calcularResumenPropuesta, contarGira } from "@/lib/propuesta-servicio";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface LineaUI {
  id: string;
  tipo: string;
  concepto: string;
  descripcion: string | null;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
  subtotal: number;
  esIncluido: boolean;
  esReembolsable: boolean;
  servicioId: string | null;
  equipoId: string | null;
  rolTecnicoId: string | null;
  showId: string | null;
  notas: string | null;
  orden: number;
}

interface ShowUI {
  id: string;
  fecha: string;
  ciudad: string | null;
  estado: string;
  venueId: string | null;
  venueNombre: string | null;
}

interface PropuestaUI {
  id: string;
  numero: string;
  version: number;
  titulo: string | null;
  estado: string;
  modeloCobro: string;
  moneda: string;
  vigenciaHasta: string;
  alcance: string | null;
  exclusiones: string | null;
  supuestos: string | null;
  condicionesPago: string | null;
  notasInternas: string | null;
  aplicaIva: boolean;
  descuentoMonto: number;
  descuentoRazon: string | null;
  aprobacionToken: string | null;
  aprobacionFecha: string | null;
  aprobacionNombre: string | null;
  enviadaEn: string | null;
  clienteId: string | null;
  artistaId: string | null;
  giraId: string | null;
  cliente: { id: string; nombre: string; empresa: string | null } | null;
  artista: { id: string; nombre: string } | null;
  gira: { id: string; nombre: string; shows: ShowUI[] } | null;
  lineas: LineaUI[];
}

interface ServicioUI {
  id: string;
  clave: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  unidadDefault: string;
  tipoLinea: string;
  precioSugerido: number | null;
  costoSugerido: number | null;
}

interface Props {
  inicial: PropuestaUI;
  servicios: ServicioUI[];
  equipos: { id: string; descripcion: string; marca: string | null; modelo: string | null; precioRenta: number; costoProveedor: number | null }[];
  roles: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
  artistas: { id: string; nombre: string }[];
  giras: { id: string; nombre: string; _count: { shows: number } }[];
}

type CabeceraEditable = Pick<
  PropuestaUI,
  | "titulo"
  | "estado"
  | "modeloCobro"
  | "moneda"
  | "vigenciaHasta"
  | "alcance"
  | "exclusiones"
  | "supuestos"
  | "condicionesPago"
  | "notasInternas"
  | "aplicaIva"
  | "descuentoMonto"
  | "descuentoRazon"
  | "clienteId"
  | "artistaId"
  | "giraId"
>;

// ── Componente ───────────────────────────────────────────────────────────────

export default function PropuestaEditor({ inicial, servicios, equipos, roles, clientes, artistas, giras }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [cab, setCab] = useState<CabeceraEditable>({
    titulo: inicial.titulo,
    estado: inicial.estado,
    modeloCobro: inicial.modeloCobro,
    moneda: inicial.moneda,
    vigenciaHasta: inicial.vigenciaHasta,
    alcance: inicial.alcance,
    exclusiones: inicial.exclusiones,
    supuestos: inicial.supuestos,
    condicionesPago: inicial.condicionesPago,
    notasInternas: inicial.notasInternas,
    aplicaIva: inicial.aplicaIva,
    descuentoMonto: inicial.descuentoMonto,
    descuentoRazon: inicial.descuentoRazon,
    clienteId: inicial.clienteId,
    artistaId: inicial.artistaId,
    giraId: inicial.giraId,
  });
  const [lineas, setLineas] = useState<LineaUI[]>(inicial.lineas);
  const [guardando, setGuardando] = useState(false);
  const [token, setToken] = useState(inicial.aprobacionToken);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false);

  const shows = inicial.gira?.shows ?? [];
  const conteo = useMemo(() => contarGira(shows), [shows]);

  // El resumen se recalcula en vivo con el mismo motor que usa el servidor al
  // guardar, así que el número de la pantalla y el de la BD no pueden divergir.
  const resumen = useMemo(
    () => calcularResumenPropuesta(lineas, { descuentoMonto: cab.descuentoMonto, aplicaIva: cab.aplicaIva }),
    [lineas, cab.descuentoMonto, cab.aplicaIva],
  );

  async function patchCabecera(data: Partial<CabeceraEditable>) {
    setGuardando(true);
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setGuardando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar");
    }
  }

  function editarCabecera<K extends keyof CabeceraEditable>(campo: K, valor: CabeceraEditable[K], guardar = true) {
    setCab((prev) => ({ ...prev, [campo]: valor }));
    if (guardar) void patchCabecera({ [campo]: valor } as Partial<CabeceraEditable>);
  }

  async function patchLinea(id: string, data: Partial<LineaUI>) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/lineas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar la línea");
      return;
    }
    const d = await res.json();
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, subtotal: d.linea.subtotal } : l)));
  }

  async function agregarLinea(body: Record<string, unknown>) {
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/lineas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar la línea");
      return;
    }
    setLineas((prev) => [...prev, d.linea as LineaUI]);
  }

  async function eliminarLinea(id: string) {
    const previas = lineas;
    setLineas((prev) => prev.filter((l) => l.id !== id));
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/lineas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setLineas(previas);
      toast.error("No se pudo eliminar la línea");
    }
  }

  async function armarDesdeGira() {
    if (!cab.giraId) {
      toast.error("Liga una gira primero");
      return;
    }
    setGuardando(true);
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/armar`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo armar la propuesta");
      return;
    }
    if (d.agregadas === 0) {
      toast.info("Las líneas típicas ya estaban puestas");
    } else {
      toast.success(`${d.agregadas} líneas agregadas · ${d.conteo.shows} shows en ${d.conteo.venues} venues`);
    }
    if (Array.isArray(d.faltanEnCatalogo) && d.faltanEnCatalogo.length) {
      toast.warning(`Faltan en el catálogo: ${d.faltanEnCatalogo.join(", ")}`);
    }
    router.refresh();
  }

  async function duplicar() {
    setGuardando(true);
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/duplicar`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo duplicar");
      return;
    }
    toast.success(`Creada ${d.propuesta.numero} v${d.propuesta.version}`);
    router.push(`/giras/propuesta/${d.propuesta.id}`);
  }

  async function generarLink() {
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/link-aprobacion`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo generar el link");
      return;
    }
    setToken(d.token);
    try {
      await navigator.clipboard.writeText(d.url);
      toast.success("Link de aprobación copiado");
    } catch {
      toast.info(d.url);
    }
  }

  async function marcarEnviada() {
    setGuardando(true);
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/enviar`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo marcar como enviada");
      return;
    }
    setToken(d.token);
    setCab((prev) => ({ ...prev, estado: "ENVIADA" }));
    toast.success("Propuesta marcada como enviada");
  }

  const gruposUsados = TIPOS_LINEA_PROPUESTA.filter((t) => lineas.some((l) => l.tipo === t));
  const opcionesShow = [
    { value: "", label: "Toda la gira" },
    ...shows.map((s) => ({
      value: s.id,
      label: `${fmtFechaCorta(s.fecha)} · ${s.venueNombre ?? s.ciudad ?? "Venue sin nombre"}`,
    })),
  ];

  return (
    <div className="ms-page space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <BackButton href="/giras/propuestas" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#B3985B]">{inicial.numero}</span>
              {inicial.version > 1 && <span className="ms-micro">v{inicial.version}</span>}
              <span className={`ms-badge ${ESTADO_PROPUESTA_COLOR[cab.estado] ?? ""}`}>
                {ESTADO_PROPUESTA_LABEL[cab.estado] ?? cab.estado}
              </span>
              {guardando && <span className="ms-micro">guardando…</span>}
            </div>
            <h1 className="ms-h1 mt-1">{cab.titulo || "Propuesta sin título"}</h1>
            <p className="ms-subtitle mt-1">
              {inicial.gira ? (
                <>
                  {inicial.gira.nombre} · {conteo.shows} shows en {conteo.venues}{" "}
                  {conteo.venues === 1 ? "venue" : "venues"}
                </>
              ) : (
                "Sin gira ligada"
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="ms-btn-secondary" onClick={armarDesdeGira} disabled={!cab.giraId || guardando}>
            Armar propuesta de gira
          </button>
          <button className="ms-btn-ghost" onClick={duplicar} disabled={guardando}>
            Duplicar como versión
          </button>
          <button className="ms-btn-ghost" onClick={generarLink}>
            {token ? "Copiar link" : "Generar link"}
          </button>
          <button className="ms-btn-primary" onClick={marcarEnviada} disabled={guardando}>
            Marcar enviada
          </button>
        </div>
      </div>

      {inicial.aprobacionFecha && (
        <div className="ms-card p-4 border-emerald-800/40">
          <p className="text-sm text-emerald-300">
            Aprobada por {inicial.aprobacionNombre} el {fmtFechaCorta(inicial.aprobacionFecha)}.
          </p>
        </div>
      )}

      {token && (
        <div className="ms-card-deep p-3 flex flex-wrap items-center gap-2">
          <span className="ms-label">Link del cliente</span>
          <Link href={`/propuesta/${token}`} target="_blank" className="ms-link-gold text-xs font-mono break-all">
            /propuesta/{token}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Cabecera */}
          <section className="ms-card p-5 space-y-4">
            <h2 className="ms-section-label">Datos de la propuesta</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Campo label="Título">
                <CampoTexto
                  valor={cab.titulo ?? ""}
                  onCommit={(v) => editarCabecera("titulo", v || null)}
                  placeholder="Production management — Gira octubre 2026"
                />
              </Campo>
              <Campo label="Estado">
                <select
                  className="ms-input"
                  value={cab.estado}
                  onChange={(e) => editarCabecera("estado", e.target.value)}
                >
                  {ESTADOS_PROPUESTA.map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_PROPUESTA_LABEL[e]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Cliente">
                <Combobox
                  value={cab.clienteId ?? ""}
                  onChange={(v) => editarCabecera("clienteId", v || null)}
                  placeholder="Sin cliente"
                  options={[
                    { value: "", label: "Sin cliente" },
                    ...clientes.map((c) => ({
                      value: c.id,
                      label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
                    })),
                  ]}
                />
              </Campo>
              <Campo label="Artista">
                <Combobox
                  value={cab.artistaId ?? ""}
                  onChange={(v) => editarCabecera("artistaId", v || null)}
                  placeholder="Sin artista"
                  options={[{ value: "", label: "Sin artista" }, ...artistas.map((a) => ({ value: a.id, label: a.nombre }))]}
                />
              </Campo>
              <Campo
                label="Gira"
                ayuda={inicial.gira ? `${conteo.shows} shows · ${conteo.venues} venues · ${conteo.ciudades} ciudades` : undefined}
              >
                <Combobox
                  value={cab.giraId ?? ""}
                  onChange={(v) => {
                    editarCabecera("giraId", v || null);
                    router.refresh();
                  }}
                  placeholder="Sin gira ligada"
                  options={[
                    { value: "", label: "Sin gira ligada" },
                    ...giras.map((g) => ({ value: g.id, label: `${g.nombre} (${g._count.shows} fechas)` })),
                  ]}
                />
              </Campo>
              <Campo label="Modelo de cobro">
                <select
                  className="ms-input"
                  value={cab.modeloCobro}
                  onChange={(e) => editarCabecera("modeloCobro", e.target.value)}
                >
                  {MODELOS_COBRO.map((m) => (
                    <option key={m} value={m}>
                      {MODELO_COBRO_LABEL[m]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Moneda">
                <select className="ms-input" value={cab.moneda} onChange={(e) => editarCabecera("moneda", e.target.value)}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </Campo>
              <Campo label="Vigencia hasta">
                <input
                  type="date"
                  className="ms-input"
                  value={cab.vigenciaHasta}
                  onChange={(e) => editarCabecera("vigenciaHasta", e.target.value)}
                />
              </Campo>
            </div>
          </section>

          {/* Alcance en palabras */}
          <section className="ms-card p-5 space-y-4">
            <div>
              <h2 className="ms-section-label">Alcance en palabras</h2>
              <p className="ms-meta mt-1">
                Es lo que hace que la propuesta se lea profesional y no como un número suelto. El cliente lo ve tal cual.
              </p>
            </div>

            <CampoLargo
              label="Alcance del servicio"
              valor={cab.alcance ?? ""}
              onCommit={(v) => editarCabecera("alcance", v || null)}
              placeholder="Mainstage Pro asume la responsabilidad de audio del artista y la coordinación técnica de los cinco shows…"
              filas={7}
            />
            <CampoLargo
              label="Exclusiones"
              valor={cab.exclusiones ?? ""}
              onCommit={(v) => editarCabecera("exclusiones", v || null)}
              placeholder="No incluye renta de PA, consolas ni microfonía; no incluye permisos ni seguros del recinto…"
              filas={5}
            />
            <CampoLargo
              label="Supuestos"
              valor={cab.supuestos ?? ""}
              onCommit={(v) => editarCabecera("supuestos", v || null)}
              placeholder="Se asume que cada venue entrega su ficha técnica con 15 días de anticipación…"
              filas={5}
            />
            <CampoLargo
              label="Condiciones de pago"
              valor={cab.condicionesPago ?? ""}
              onCommit={(v) => editarCabecera("condicionesPago", v || null)}
              placeholder="50% a la firma, 50% al cierre de la gira. Reembolsables contra comprobante…"
              filas={4}
            />
            <CampoLargo
              label="Notas internas (nunca se muestran al cliente)"
              valor={cab.notasInternas ?? ""}
              onCommit={(v) => editarCabecera("notasInternas", v || null)}
              placeholder="Margen apretado en Guadalajara; checar si el promotor cubre el hotel…"
              filas={3}
            />
          </section>

          {/* Líneas */}
          <section className="ms-card p-5 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="ms-section-label">Líneas de la propuesta</h2>
                <p className="ms-meta mt-1">
                  {lineas.length} {lineas.length === 1 ? "línea" : "líneas"}
                  {resumen.cantidadIncluidas > 0 && ` · ${resumen.cantidadIncluidas} sin cargo`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="ms-btn-secondary" onClick={() => setCatalogoAbierto(true)}>
                  Agregar del catálogo
                </button>
                <button
                  className="ms-btn-ghost"
                  onClick={() =>
                    agregarLinea({ concepto: "Concepto nuevo", tipo: "HONORARIO", unidad: "SHOW", cantidad: 1 })
                  }
                >
                  Línea libre
                </button>
              </div>
            </div>

            {lineas.length === 0 ? (
              <div className="ms-empty-state">
                <p className="text-sm text-[#6b7280] px-6">
                  Sin líneas todavía. Con una gira ligada, &ldquo;Armar propuesta de gira&rdquo; siembra las líneas típicas ya
                  cuantificadas.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {gruposUsados.map((tipo) => (
                  <GrupoLineas
                    key={tipo}
                    tipo={tipo}
                    lineas={lineas.filter((l) => l.tipo === tipo)}
                    moneda={cab.moneda}
                    equipos={equipos}
                    roles={roles}
                    opcionesShow={opcionesShow}
                    onPatch={patchLinea}
                    onEliminar={eliminarLinea}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Resumen */}
        <aside className="xl:sticky xl:top-4 space-y-3">
          <section className="ms-card p-5 space-y-3">
            <h2 className="ms-section-label">Resumen</h2>

            <Renglon etiqueta="Honorarios" valor={fmtMoneda(resumen.subtotalHonorarios, cab.moneda)} />
            <Renglon etiqueta="Equipo" valor={fmtMoneda(resumen.subtotalEquipo, cab.moneda)} />
            <Renglon etiqueta="Logística" valor={fmtMoneda(resumen.subtotalLogistica, cab.moneda)} />
            <Renglon
              etiqueta="Reembolsables"
              valor={fmtMoneda(resumen.subtotalReembolsables, cab.moneda)}
              ayuda="Por cuenta del cliente o a costo"
            />

            <div className="ms-divider-mid pt-3 space-y-2">
              <div>
                <label className="ms-label">Descuento</label>
                <CampoNumero
                  valor={cab.descuentoMonto}
                  onCommit={(v) => editarCabecera("descuentoMonto", v)}
                  className="ms-input mt-1"
                />
              </div>
              <CampoTexto
                valor={cab.descuentoRazon ?? ""}
                onCommit={(v) => editarCabecera("descuentoRazon", v || null)}
                placeholder="Razón del descuento"
                className="ms-input-inline w-full"
              />
            </div>

            <div className="ms-divider-mid pt-3 space-y-2">
              <Renglon etiqueta="Subtotal" valor={fmtMoneda(resumen.subtotal, cab.moneda)} />
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-[13px] text-[#9ca3af]">IVA 16%</span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-white">{fmtMoneda(resumen.montoIva, cab.moneda)}</span>
                  <input
                    type="checkbox"
                    checked={cab.aplicaIva}
                    onChange={(e) => editarCabecera("aplicaIva", e.target.checked)}
                    className="accent-[#B3985B]"
                  />
                </div>
              </label>
              <div className="flex items-center justify-between pt-2">
                <span className="ms-h2">Gran total</span>
                <span className="text-lg font-semibold text-[#B3985B]">
                  {fmtMoneda(resumen.granTotal, cab.moneda)}
                </span>
              </div>
            </div>
          </section>

          <section className="ms-card-deep p-5 space-y-3">
            <h2 className="ms-section-label">Margen estimado</h2>
            <p className="ms-meta">
              Sólo sobre venta propia. Los reembolsables van a costo y no entran al margen.
            </p>
            <Renglon etiqueta="Venta propia" valor={fmtMoneda(resumen.ventaPropia, cab.moneda)} />
            <Renglon etiqueta="Costo operativo" valor={fmtMoneda(resumen.costoOperativo, cab.moneda)} />
            <div className="ms-divider-mid pt-3 flex items-center justify-between">
              <span className="text-[13px] text-[#9ca3af]">Utilidad</span>
              <div className="text-right">
                <div className={`font-semibold ${resumen.utilidad >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtMoneda(resumen.utilidad, cab.moneda)}
                </div>
                {resumen.margenPct !== null && (
                  <div className="ms-micro">{resumen.margenPct.toFixed(1)}% de margen</div>
                )}
              </div>
            </div>
            {resumen.reembolsables.venta > 0 && (
              <div className="ms-divider-mid pt-3">
                <Renglon
                  etiqueta="Reembolsable (venta)"
                  valor={fmtMoneda(resumen.reembolsables.venta, cab.moneda)}
                />
                <Renglon etiqueta="Reembolsable (costo)" valor={fmtMoneda(resumen.reembolsables.costo, cab.moneda)} />
              </div>
            )}
          </section>
        </aside>
      </div>

      {catalogoAbierto && (
        <ModalCatalogo
          servicios={servicios}
          conteo={conteo}
          onCerrar={() => setCatalogoAbierto(false)}
          onAgregar={async (body) => {
            await agregarLinea(body);
            setCatalogoAbierto(false);
          }}
        />
      )}
    </div>
  );
}

// ── Grupo de líneas ──────────────────────────────────────────────────────────

function GrupoLineas({
  tipo,
  lineas,
  moneda,
  equipos,
  roles,
  opcionesShow,
  onPatch,
  onEliminar,
}: {
  tipo: string;
  lineas: LineaUI[];
  moneda: string;
  equipos: Props["equipos"];
  roles: Props["roles"];
  opcionesShow: { value: string; label: string }[];
  onPatch: (id: string, data: Partial<LineaUI>) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}) {
  const grupo = GRUPO_SUBTOTAL[tipo] ?? "honorarios";
  const total = lineas.reduce((s, l) => s + (l.esIncluido ? 0 : l.cantidad * l.precioUnitario), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-white">{TIPO_LINEA_PROPUESTA_LABEL[tipo] ?? tipo}</h3>
          <span className="ms-micro uppercase tracking-wider">suma a {grupo}</span>
        </div>
        <span className="text-[13px] text-[#9ca3af]">{fmtMoneda(total, moneda)}</span>
      </div>

      <div className="ms-card-deep overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="ms-thead">
            <tr>
              <th className="ms-th text-left">Concepto</th>
              <th className="ms-th text-left w-36">Unidad</th>
              <th className="ms-th text-right w-20">Cant.</th>
              <th className="ms-th text-right w-28">P. unitario</th>
              <th className="ms-th text-right w-28">Costo unit.</th>
              <th className="ms-th text-right w-28">Subtotal</th>
              <th className="ms-th text-center w-16">Incl.</th>
              <th className="ms-th text-center w-16">Reemb.</th>
              <th className="ms-th w-10" />
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <FilaLinea
                key={l.id}
                linea={l}
                moneda={moneda}
                equipos={equipos}
                roles={roles}
                opcionesShow={opcionesShow}
                onPatch={onPatch}
                onEliminar={onEliminar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilaLinea({
  linea,
  moneda,
  equipos,
  roles,
  opcionesShow,
  onPatch,
  onEliminar,
}: {
  linea: LineaUI;
  moneda: string;
  equipos: Props["equipos"];
  roles: Props["roles"];
  opcionesShow: { value: string; label: string }[];
  onPatch: (id: string, data: Partial<LineaUI>) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const subtotal = linea.esIncluido ? 0 : linea.cantidad * linea.precioUnitario;

  return (
    <>
      <tr className="ms-tr align-top">
        <td className="ms-td">
          <CampoTexto
            valor={linea.concepto}
            onCommit={(v) => v.trim() && onPatch(linea.id, { concepto: v.trim() })}
            className="ms-input-inline w-full font-medium text-white"
          />
          <CampoTexto
            valor={linea.descripcion ?? ""}
            onCommit={(v) => onPatch(linea.id, { descripcion: v || null })}
            placeholder="Descripción que lee el cliente…"
            className="ms-input-inline w-full text-[11px] text-[#9ca3af] mt-0.5"
          />
          <div className="flex items-center gap-2 mt-1">
            <select
              className="ms-input-inline text-[11px]"
              value={linea.tipo}
              onChange={(e) => onPatch(linea.id, { tipo: e.target.value })}
            >
              {TIPOS_LINEA_PROPUESTA.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LINEA_PROPUESTA_LABEL[t]}
                </option>
              ))}
            </select>
            <button className="ms-micro hover:text-[#B3985B] transition-colors" onClick={() => setAbierto(!abierto)}>
              {abierto ? "ocultar detalle" : "equipo · rol · show"}
            </button>
          </div>
        </td>
        <td className="ms-td">
          <select
            className="ms-input-inline w-full text-xs"
            value={linea.unidad}
            onChange={(e) => onPatch(linea.id, { unidad: e.target.value })}
          >
            {UNIDADES_COBRO.map((u) => (
              <option key={u} value={u}>
                {UNIDAD_COBRO_LABEL[u]}
              </option>
            ))}
          </select>
        </td>
        <td className="ms-td text-right">
          <CampoNumero
            valor={linea.cantidad}
            onCommit={(v) => onPatch(linea.id, { cantidad: v })}
            className="ms-input-inline w-16 text-right"
          />
        </td>
        <td className="ms-td text-right">
          <CampoNumero
            valor={linea.precioUnitario}
            onCommit={(v) => onPatch(linea.id, { precioUnitario: v })}
            className="ms-input-inline w-24 text-right"
          />
        </td>
        <td className="ms-td text-right">
          <CampoNumero
            valor={linea.costoUnitario}
            onCommit={(v) => onPatch(linea.id, { costoUnitario: v })}
            className="ms-input-inline w-24 text-right"
          />
        </td>
        <td className="ms-td text-right">
          {linea.esIncluido ? (
            <span className="ms-badge ms-badge-gold">Incluido</span>
          ) : (
            <span className="text-white">{fmtMoneda(subtotal, moneda)}</span>
          )}
        </td>
        <td className="ms-td text-center">
          <input
            type="checkbox"
            checked={linea.esIncluido}
            onChange={(e) => onPatch(linea.id, { esIncluido: e.target.checked })}
            className="accent-[#B3985B]"
          />
        </td>
        <td className="ms-td text-center">
          <input
            type="checkbox"
            checked={linea.esReembolsable}
            onChange={(e) => onPatch(linea.id, { esReembolsable: e.target.checked })}
            className="accent-[#B3985B]"
          />
        </td>
        <td className="ms-td text-right">
          <button
            className="text-[#555] hover:text-red-400 transition-colors"
            title="Eliminar línea"
            onClick={() => onEliminar(linea.id)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </td>
      </tr>

      {abierto && (
        <tr className="border-b border-[#1a1a1a] bg-[#0b0b0b]">
          <td colSpan={9} className="px-4 py-3">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <Campo label="Equipo del catálogo">
                <Combobox
                  value={linea.equipoId ?? ""}
                  onChange={(v) => onPatch(linea.id, { equipoId: v || null })}
                  placeholder="Sin equipo"
                  options={[
                    { value: "", label: "Sin equipo" },
                    ...equipos.map((e) => ({
                      value: e.id,
                      label: [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion,
                    })),
                  ]}
                />
              </Campo>
              <Campo label="Rol técnico">
                <Combobox
                  value={linea.rolTecnicoId ?? ""}
                  onChange={(v) => onPatch(linea.id, { rolTecnicoId: v || null })}
                  placeholder="Sin rol"
                  options={[{ value: "", label: "Sin rol" }, ...roles.map((r) => ({ value: r.id, label: r.nombre }))]}
                />
              </Campo>
              <Campo label="Show" ayuda="Prorratea la línea a una fecha concreta">
                <Combobox
                  value={linea.showId ?? ""}
                  onChange={(v) => onPatch(linea.id, { showId: v || null })}
                  placeholder="Toda la gira"
                  options={opcionesShow}
                />
              </Campo>
              <Campo label="Notas internas">
                <CampoTexto
                  valor={linea.notas ?? ""}
                  onCommit={(v) => onPatch(linea.id, { notas: v || null })}
                  placeholder="No se muestra al cliente"
                  className="ms-input"
                />
              </Campo>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Modal del catálogo ───────────────────────────────────────────────────────

function ModalCatalogo({
  servicios,
  conteo,
  onCerrar,
  onAgregar,
}: {
  servicios: ServicioUI[];
  conteo: { shows: number; venues: number; ciudades: number };
  onCerrar: () => void;
  onAgregar: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [seleccionado, setSeleccionado] = useState<ServicioUI | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);
  const [costo, setCosto] = useState(0);
  const [unidad, setUnidad] = useState("SHOW");
  const [tipo, setTipo] = useState("HONORARIO");
  const [guardando, setGuardando] = useState(false);

  function elegir(s: ServicioUI) {
    setSeleccionado(s);
    setUnidad(s.unidadDefault);
    setTipo(s.tipoLinea);
    setPrecio(s.precioSugerido ?? 0);
    setCosto(s.costoSugerido ?? 0);
    // Un mismo venue puede repetirse en varias fechas: el advance se cobra por
    // venue y la operación por show, así que la cantidad depende de la unidad.
    setCantidad(
      s.unidadDefault === "PLAZA"
        ? Math.max(1, conteo.venues)
        : s.unidadDefault === "SHOW" || s.unidadDefault === "DIA" || s.unidadDefault === "PERSONA_DIA"
          ? Math.max(1, conteo.shows)
          : 1,
    );
  }

  async function agregar() {
    if (!seleccionado) return;
    setGuardando(true);
    await onAgregar({
      servicioId: seleccionado.id,
      tipo,
      unidad,
      cantidad,
      precioUnitario: precio,
      costoUnitario: costo,
    });
    setGuardando(false);
  }

  return (
    <div className="ms-modal-overlay bg-black/70" onClick={onCerrar}>
      <div className="ms-modal max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-[#1e1e1e] flex items-start justify-between gap-3">
          <div>
            <h2 className="ms-h2">Agregar del catálogo de servicios</h2>
            <p className="ms-subtitle mt-1">
              Precarga unidad, tipo y precio sugerido. Todo se puede ajustar antes y después de agregar.
            </p>
          </div>
          <Link href="/giras/servicios" className="ms-link-gold text-xs whitespace-nowrap">
            Editar catálogo
          </Link>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1 max-h-[46vh] overflow-y-auto pr-1">
            {servicios.length === 0 && (
              <p className="text-sm text-[#6b7280]">
                El catálogo está vacío. Siembra los servicios con el script <code>seed-servicios-pm.ts</code>.
              </p>
            )}
            {servicios.map((s) => (
              <button
                key={s.id}
                onClick={() => elegir(s)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  seleccionado?.id === s.id
                    ? "border-[#B3985B]/50 bg-[#B3985B]/10"
                    : "border-[#1e1e1e] hover:border-[#2a2a2a]"
                }`}
              >
                <div className="text-[13px] text-white">{s.nombre}</div>
                <div className="ms-micro">
                  {UNIDAD_COBRO_LABEL[s.unidadDefault] ?? s.unidadDefault}
                  {s.precioSugerido !== null && ` · ${fmtMoneda(s.precioSugerido)}`}
                </div>
              </button>
            ))}
          </div>

          <div>
            {!seleccionado ? (
              <p className="text-sm text-[#6b7280]">Elige un servicio de la lista.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-white font-medium">{seleccionado.nombre}</p>
                  {seleccionado.descripcion && (
                    <p className="ms-meta mt-1 leading-relaxed">{seleccionado.descripcion}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo label="Tipo de línea">
                    <select className="ms-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                      {TIPOS_LINEA_PROPUESTA.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_LINEA_PROPUESTA_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Unidad">
                    <select className="ms-input" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                      {UNIDADES_COBRO.map((u) => (
                        <option key={u} value={u}>
                          {UNIDAD_COBRO_LABEL[u]}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Cantidad">
                    <CampoNumero valor={cantidad} onCommit={setCantidad} className="ms-input" />
                  </Campo>
                  <Campo label="Precio unitario">
                    <CampoNumero valor={precio} onCommit={setPrecio} className="ms-input" />
                  </Campo>
                  <Campo label="Costo unitario">
                    <CampoNumero valor={costo} onCommit={setCosto} className="ms-input" />
                  </Campo>
                  <Campo label="Subtotal">
                    <p className="text-sm text-[#B3985B] pt-2">{fmtMoneda(cantidad * precio)}</p>
                  </Campo>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-[#1e1e1e] flex justify-end gap-2">
          <button className="ms-btn-ghost" onClick={onCerrar}>
            Cerrar
          </button>
          <button className="ms-btn-primary" onClick={agregar} disabled={!seleccionado || guardando}>
            {guardando ? "Agregando…" : "Agregar línea"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Piezas de formulario ─────────────────────────────────────────────────────

function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="ms-label">{label}</label>
      <div className="mt-1">{children}</div>
      {ayuda && <p className="ms-micro mt-1">{ayuda}</p>}
    </div>
  );
}

function Renglon({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <span className="text-[13px] text-[#9ca3af]">{etiqueta}</span>
        {ayuda && <p className="ms-micro">{ayuda}</p>}
      </div>
      <span className="text-[13px] text-white whitespace-nowrap">{valor}</span>
    </div>
  );
}

/// Input que mantiene su propio texto mientras se escribe y sólo avisa al salir
/// o con Enter: así cada tecla no dispara un PATCH.
function CampoTexto({
  valor,
  onCommit,
  placeholder,
  className = "ms-input",
}: {
  valor: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [texto, setTexto] = useState(valor);
  const ultimoExterno = useRef(valor);

  useEffect(() => {
    if (valor !== ultimoExterno.current) {
      ultimoExterno.current = valor;
      setTexto(valor);
    }
  }, [valor]);

  return (
    <input
      className={className}
      value={texto}
      placeholder={placeholder}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        if (texto !== valor) {
          ultimoExterno.current = texto;
          onCommit(texto);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function CampoLargo({
  label,
  valor,
  onCommit,
  placeholder,
  filas = 4,
}: {
  label: string;
  valor: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  filas?: number;
}) {
  const [texto, setTexto] = useState(valor);
  const ultimoExterno = useRef(valor);

  useEffect(() => {
    if (valor !== ultimoExterno.current) {
      ultimoExterno.current = valor;
      setTexto(valor);
    }
  }, [valor]);

  return (
    <div>
      <label className="ms-label">{label}</label>
      <textarea
        className="ms-textarea mt-1"
        rows={filas}
        value={texto}
        placeholder={placeholder}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          if (texto !== valor) {
            ultimoExterno.current = texto;
            onCommit(texto);
          }
        }}
      />
    </div>
  );
}

function CampoNumero({
  valor,
  onCommit,
  className = "ms-input",
}: {
  valor: number;
  onCommit: (v: number) => void;
  className?: string;
}) {
  const [texto, setTexto] = useState(String(valor));
  const ultimoExterno = useRef(valor);

  useEffect(() => {
    if (valor !== ultimoExterno.current) {
      ultimoExterno.current = valor;
      setTexto(String(valor));
    }
  }, [valor]);

  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => {
        const n = Number(texto);
        const limpio = Number.isFinite(n) ? n : 0;
        if (limpio !== valor) {
          ultimoExterno.current = limpio;
          onCommit(limpio);
        }
        setTexto(String(limpio));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
