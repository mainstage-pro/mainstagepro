"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Combobox } from "@/components/Combobox";
import { useConfirm } from "@/components/Confirm";
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
  tratoId: string | null;
  cliente: { id: string; nombre: string; empresa: string | null } | null;
  artista: { id: string; nombre: string } | null;
  gira: { id: string; nombre: string; shows: ShowUI[] } | null;
  trato: { id: string; nombre: string; diasServicio: number | null } | null;
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
  appUrl: string;
  servicios: ServicioUI[];
  equipos: { id: string; descripcion: string; marca: string | null; modelo: string | null; precioRenta: number; costoProveedor: number | null }[];
  roles: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
  artistas: { id: string; nombre: string }[];
  giras: { id: string; nombre: string; _count: { shows: number } }[];
  tratos: { id: string; nombre: string }[];
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
  | "tratoId"
>;

// ── Componente ───────────────────────────────────────────────────────────────

export default function PropuestaEditor({
  inicial,
  appUrl,
  servicios,
  equipos,
  roles,
  clientes,
  artistas,
  giras,
  tratos,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirmar = useConfirm();

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
    tratoId: inicial.tratoId,
  });
  const [lineas, setLineas] = useState<LineaUI[]>(inicial.lineas);
  const [guardando, setGuardando] = useState(false);
  const [token, setToken] = useState(inicial.aprobacionToken);
  const [enviadaEn, setEnviadaEn] = useState(inicial.enviadaEn);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false);

  const shows = inicial.gira?.shows ?? [];
  const conteo = useMemo(() => contarGira(shows), [shows]);

  const aprobada = cab.estado === "APROBADA";
  const enviada = Boolean(enviadaEn);
  const urlCliente = token ? `${appUrl.replace(/\/$/, "")}/aprobacion/propuesta/${token}` : "";

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

  // Arma desde la gira o desde el trato de evento, según lo que esté ligado.
  // El servidor decide la plantilla; aquí solo se evita el viaje en vano.
  async function armarDesdeRegistro() {
    if (!cab.giraId && !cab.tratoId) {
      toast.error("Liga un trato de evento o una gira primero");
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
      toast.success(`${d.agregadas} líneas agregadas · ${d.detalle}`);
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

  function copiar(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado"),
      () => toast.info(url),
    );
  }

  async function generarLink() {
    setGuardando(true);
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/link-aprobacion`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo generar el link");
      return;
    }
    setToken(d.token);
    copiar(d.url);
  }

  /// Enviar es un solo acto: genera el link si falta, sella la fecha, deja la
  /// propuesta en ENVIADA y te deja el link en el portapapeles listo para pegar
  /// en el correo. Antes eran tres botones para lo mismo.
  async function enviarAlCliente() {
    const ok = await confirmar({
      message: enviada
        ? "¿Reenviar la propuesta? Se vuelve a sellar la fecha de envío y se copia el link. El cliente sigue viendo el mismo link de siempre."
        : "¿Marcar la propuesta como enviada? Se genera el link del cliente, se copia al portapapeles y la propuesta pasa a Enviada.",
      confirmText: enviada ? "Reenviar" : "Enviar",
    });
    if (!ok) return;

    setGuardando(true);
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/enviar`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo marcar como enviada");
      return;
    }
    setToken(d.token);
    setEnviadaEn((prev) => prev ?? new Date().toISOString());
    setCab((prev) => ({ ...prev, estado: "ENVIADA" }));
    copiar(d.url);
  }

  async function revocarLink() {
    const ok = await confirmar({
      message:
        "¿Revocar el link? Quien lo tenga dejará de ver la propuesta y de poder aprobarla, y habrá que mandarle uno nuevo.",
      danger: true,
      confirmText: "Revocar",
    });
    if (!ok) return;

    setGuardando(true);
    const res = await fetch(`/api/propuestas-servicio/${inicial.id}/link-aprobacion`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo revocar el link");
      return;
    }
    setToken(null);
    toast.success("Link revocado");
  }

  const gruposUsados = TIPOS_LINEA_PROPUESTA.filter((t) => lineas.some((l) => l.tipo === t));
  const opcionesShow = [
    { value: "", label: "General" },
    ...shows.map((s) => ({
      value: s.id,
      label: `${fmtFechaCorta(s.fecha)} · ${s.venueNombre ?? s.ciudad ?? "Venue sin nombre"}`,
    })),
  ];

  return (
    <div className="ms-page space-y-5 pb-24">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="pt-1">
            <BackButton
              href={inicial.gira ? `/giras/${inicial.gira.id}/propuestas` : "/giras/propuestas"}
              label={inicial.gira ? inicial.gira.nombre : undefined}
            />
          </div>
          <div className="min-w-0">
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
                  <Link href={`/giras/${inicial.gira.id}`} className="ms-link-gold">
                    {inicial.gira.nombre}
                  </Link>{" "}
                  · {conteo.shows} shows en {conteo.venues} {conteo.venues === 1 ? "venue" : "venues"}
                </>
              ) : inicial.trato ? (
                <>
                  <Link href={`/crm/tratos/${inicial.trato.id}`} className="ms-link-gold">
                    {inicial.trato.nombre}
                  </Link>{" "}
                  · {inicial.trato.diasServicio ?? 1}{" "}
                  {(inicial.trato.diasServicio ?? 1) === 1 ? "día" : "días"} de servicio
                </>
              ) : (
                "Sin trato ni gira ligados"
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:shrink-0">
          <a
            className="ms-btn-secondary"
            href={`/api/propuestas-servicio/${inicial.id}/pdf?inline=1`}
            target="_blank"
            rel="noreferrer"
          >
            Ver PDF
          </a>
          <a className="ms-btn-secondary" href={`/api/propuestas-servicio/${inicial.id}/pdf`}>
            Descargar PDF
          </a>
          <button className="ms-btn-ghost" onClick={duplicar} disabled={guardando}>
            Duplicar como versión
          </button>
          {!aprobada && (
            <button className="ms-btn-primary" onClick={enviarAlCliente} disabled={guardando}>
              {enviada ? "Reenviar al cliente" : "Enviar al cliente"}
            </button>
          )}
        </div>
      </div>

      {/* Compartir con el cliente */}
      <section className={`ms-card p-5 space-y-4 ${aprobada ? "border-emerald-800/40" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ms-section-label">Lo que ve el cliente</h2>
            <p className="ms-meta mt-1 max-w-xl leading-relaxed">
              El link abre la propuesta en línea, con el botón para aprobarla y el mismo PDF que descargas tú. Se
              regenera en cada visita, así que siempre muestra la propuesta como está hoy.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="ms-label">Estado del envío</p>
            <p className={`text-[13px] mt-1 ${aprobada ? "text-emerald-300" : enviada ? "text-sky-300" : "text-[#6b7280]"}`}>
              {aprobada
                ? `Aprobada por ${inicial.aprobacionNombre ?? "el cliente"}`
                : enviada
                  ? `Enviada el ${fmtFechaCorta(enviadaEn)}`
                  : "Todavía sin enviar"}
            </p>
            {aprobada && inicial.aprobacionFecha && (
              <p className="ms-micro mt-0.5">el {fmtFechaCorta(inicial.aprobacionFecha)}</p>
            )}
          </div>
        </div>

        {token ? (
          <div className="ms-card-deep p-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                readOnly
                className="ms-input-inline w-full font-mono text-[11px] text-[#9ca3af]"
                value={urlCliente}
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="flex items-center gap-1 shrink-0">
                <button className="ms-btn-ghost" onClick={() => copiar(urlCliente)}>
                  Copiar
                </button>
                <Link href={`/aprobacion/propuesta/${token}`} target="_blank" className="ms-btn-ghost">
                  Abrir
                </Link>
                {!aprobada && (
                  <button className="ms-btn-ghost text-red-400" onClick={revocarLink} disabled={guardando}>
                    Revocar
                  </button>
                )}
              </div>
            </div>
            <p className="ms-micro">
              Caduca 90 días después de haberse generado. Revocarlo deja fuera a quien ya lo tenga.
            </p>
          </div>
        ) : (
          <div className="ms-card-deep p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="ms-meta max-w-md leading-relaxed">
              Esta propuesta todavía no tiene link. Genera uno para compartirla sin pedirle al cliente que entre a
              ningún sistema.
            </p>
            <button className="ms-btn-secondary shrink-0" onClick={generarLink} disabled={guardando}>
              Generar link
            </button>
          </div>
        )}
      </section>

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
                label="Show o gira"
                ayuda={inicial.gira ? `${conteo.shows} shows · ${conteo.venues} venues · ${conteo.ciudades} ciudades` : undefined}
              >
                <Combobox
                  value={cab.giraId ?? ""}
                  onChange={(v) => {
                    editarCabecera("giraId", v || null);
                    router.refresh();
                  }}
                  placeholder="Sin show ni gira ligados"
                  options={[
                    { value: "", label: "Sin show ni gira ligados" },
                    ...giras.map((g) => ({ value: g.id, label: `${g.nombre} (${g._count.shows} fechas)` })),
                  ]}
                />
              </Campo>
              {/* El trato es la otra cara: una propuesta de evento no tiene gira,
                  y de aquí salen los días de servicio con los que se cuantifica. */}
              <Campo
                label="Trato de evento"
                ayuda={
                  inicial.trato
                    ? `${inicial.trato.diasServicio ?? 1} ${(inicial.trato.diasServicio ?? 1) === 1 ? "día" : "días"} de servicio`
                    : undefined
                }
              >
                <Combobox
                  value={cab.tratoId ?? ""}
                  onChange={(v) => {
                    editarCabecera("tratoId", v || null);
                    router.refresh();
                  }}
                  placeholder="Sin trato ligado"
                  options={[
                    { value: "", label: "Sin trato ligado" },
                    ...tratos.map((t) => ({ value: t.id, label: t.nombre })),
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
                <button
                  className="ms-btn-secondary"
                  onClick={armarDesdeRegistro}
                  disabled={(!cab.giraId && !cab.tratoId) || guardando}
                  title={
                    cab.giraId || cab.tratoId
                      ? undefined
                      : "Liga un trato de evento o una gira para sembrar las líneas típicas"
                  }
                >
                  Armar desde el registro
                </button>
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
                  Sin líneas todavía. Con un trato de evento o una gira ligados, &ldquo;Armar desde el
                  registro&rdquo; siembra las líneas típicas ya cuantificadas.
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

      <div className="ms-card-deep divide-y divide-[#1a1a1a]">
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
    <div className="px-3 py-3 sm:px-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <CampoTexto
            valor={linea.concepto}
            onCommit={(v) => v.trim() && onPatch(linea.id, { concepto: v.trim() })}
            className="ms-input-inline w-full text-[13px] font-medium text-white"
          />
          <CampoTexto
            valor={linea.descripcion ?? ""}
            onCommit={(v) => onPatch(linea.id, { descripcion: v || null })}
            placeholder="Descripción que lee el cliente…"
            className="ms-input-inline w-full text-[11px] text-[#9ca3af] mt-0.5"
          />
        </div>
        <div className="text-right whitespace-nowrap">
          {linea.esIncluido ? (
            <span className="ms-badge ms-badge-gold">Sin cargo</span>
          ) : (
            <span className="text-[13px] text-white">{fmtMoneda(subtotal, moneda)}</span>
          )}
        </div>
        <button
          className="text-[#555] hover:text-red-400 transition-colors mt-0.5"
          title="Eliminar línea"
          onClick={() => onEliminar(linea.id)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 mt-2">
        <CampoMini label="Tipo">
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
        </CampoMini>
        <CampoMini label="Se cobra por">
          <select
            className="ms-input-inline text-[11px]"
            value={linea.unidad}
            onChange={(e) => onPatch(linea.id, { unidad: e.target.value })}
          >
            {UNIDADES_COBRO.map((u) => (
              <option key={u} value={u}>
                {UNIDAD_COBRO_LABEL[u]}
              </option>
            ))}
          </select>
        </CampoMini>
        <CampoMini label="Cant.">
          <CampoNumero
            valor={linea.cantidad}
            onCommit={(v) => onPatch(linea.id, { cantidad: v })}
            className="ms-input-inline w-14 text-right text-[11px]"
          />
        </CampoMini>
        <CampoMini label="Precio unitario">
          <CampoNumero
            valor={linea.precioUnitario}
            onCommit={(v) => onPatch(linea.id, { precioUnitario: v })}
            className="ms-input-inline w-24 text-right text-[11px]"
          />
        </CampoMini>
        <CampoMini label="Costo unitario">
          <CampoNumero
            valor={linea.costoUnitario}
            onCommit={(v) => onPatch(linea.id, { costoUnitario: v })}
            className="ms-input-inline w-24 text-right text-[11px]"
          />
        </CampoMini>

        <div className="flex items-center gap-1.5 ml-auto">
          <Chip
            activo={linea.esIncluido}
            titulo="Se entrega pero no se cobra: aparece en la propuesta en ceros"
            onClick={() => onPatch(linea.id, { esIncluido: !linea.esIncluido })}
          >
            Sin cargo
          </Chip>
          <Chip
            activo={linea.esReembolsable}
            titulo="Se le factura al cliente tal como se gastó, sin margen"
            onClick={() => onPatch(linea.id, { esReembolsable: !linea.esReembolsable })}
          >
            Reembolsable
          </Chip>
          <button
            className="ms-micro hover:text-[#B3985B] transition-colors px-1"
            onClick={() => setAbierto(!abierto)}
          >
            {abierto ? "ocultar detalle" : "equipo · rol · show"}
          </button>
        </div>
      </div>

      {abierto && (
        <div className="mt-3 pt-3 border-t border-[#1a1a1a] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
              placeholder="General"
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
      )}
    </div>
  );
}

/// Etiqueta chica encima de un control compacto. Las columnas de la tabla vieja
/// se volvieron rótulos para que cada dato siga diciendo qué es al envolverse.
function CampoMini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="ms-micro block mb-0.5">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  activo,
  titulo,
  onClick,
  children,
}: {
  activo: boolean;
  titulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border transition-colors ${
        activo
          ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]"
          : "border-[#222] text-[#6b7280] hover:border-[#2f2f2f] hover:text-[#9ca3af]"
      }`}
    >
      {children}
    </button>
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
