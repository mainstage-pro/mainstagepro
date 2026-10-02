"use client";

import { use, useEffect, useState } from "react";
import {
  GRUPO_SUBTOTAL,
  MODELO_COBRO_LABEL,
  TIPO_LINEA_PROPUESTA_LABEL,
  UNIDAD_COBRO_LABEL,
} from "@/lib/giras";

const FUENTE = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

interface Linea {
  id: string;
  tipo: string;
  concepto: string;
  descripcion: string | null;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esIncluido: boolean;
  esReembolsable: boolean;
  servicio: { entregables: string | null; incluye: string | null; noIncluye: string | null } | null;
  show: { fecha: string; ciudad: string | null } | null;
}

interface Propuesta {
  numero: string;
  version: number;
  titulo: string | null;
  estado: string;
  modeloCobro: string;
  moneda: string;
  vigenciaHasta: string | null;
  alcance: string | null;
  exclusiones: string | null;
  supuestos: string | null;
  condicionesPago: string | null;
  aplicaIva: boolean;
  subtotalHonorarios: number;
  subtotalEquipo: number;
  subtotalLogistica: number;
  subtotalReembolsables: number;
  descuentoMonto: number;
  descuentoRazon: string | null;
  subtotal: number;
  montoIva: number;
  granTotal: number;
  aprobacionFecha: string | null;
  aprobacionNombre: string | null;
  cliente: { nombre: string; empresa: string | null } | null;
  artista: { nombre: string; logoUrl: string | null } | null;
  gira: {
    nombre: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    shows: { id: string; fecha: string; ciudad: string | null; venue: { nombre: string } | null }[];
  } | null;
  lineas: Linea[];
}

const GRUPOS: { llave: string; titulo: string }[] = [
  { llave: "honorarios", titulo: "Honorarios de production management" },
  { llave: "equipo", titulo: "Equipo y producción local" },
  { llave: "logistica", titulo: "Logística del equipo de trabajo" },
  { llave: "reembolsables", titulo: "Gastos reembolsables" },
];

export default function AprobacionPropuestaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [aprobando, setAprobando] = useState(false);
  const [aprobada, setAprobada] = useState(false);

  useEffect(() => {
    fetch(`/api/propuestas-servicio/publica/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setPropuesta(d.propuesta);
          if (d.propuesta.estado === "APROBADA") setAprobada(true);
        }
        setCargando(false);
      })
      .catch(() => {
        setError("No se pudo cargar la propuesta");
        setCargando(false);
      });
  }, [token]);

  async function aprobar() {
    if (nombre.trim().length < 2) {
      setError("Escribe tu nombre para confirmar la aprobación.");
      return;
    }
    setAprobando(true);
    const res = await fetch(`/api/propuestas-servicio/publica/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    setAprobando(false);
    if (d.ok) setAprobada(true);
    else setError(d.error ?? "No se pudo registrar la aprobación");
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: FUENTE }}>
        <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!propuesta) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6" style={{ fontFamily: FUENTE }}>
        <div className="bg-[#0d0d0d] border border-white/8 rounded-2xl p-10 max-w-sm w-full text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-40" draggable={false} />
          <p className="text-white/60 text-base font-semibold mb-2">Link no válido</p>
          <p className="text-white/25 text-sm">{error ?? "Esta propuesta no existe o el link ya expiró."}</p>
        </div>
      </div>
    );
  }

  const moneda = propuesta.moneda || "MXN";

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: FUENTE }}>
      <div className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <header className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto opacity-50" draggable={false} />
          {propuesta.artista?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={propuesta.artista.logoUrl}
              alt={propuesta.artista.nombre}
              className="h-16 mx-auto mt-8 object-contain"
              draggable={false}
            />
          )}
          <p className="mt-8 text-[11px] tracking-[0.2em] uppercase text-[#B3985B]">
            Propuesta de servicios · {propuesta.numero}
            {propuesta.version > 1 && ` v${propuesta.version}`}
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold">
            {propuesta.titulo ?? "Production management"}
          </h1>
          <p className="mt-3 text-sm text-white/40">
            {[propuesta.cliente?.empresa || propuesta.cliente?.nombre, propuesta.artista?.nombre, propuesta.gira?.nombre]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>

        {propuesta.gira && propuesta.gira.shows.length > 0 && (
          <Seccion titulo="Fechas que cubre">
            <ul className="space-y-2">
              {propuesta.gira.shows.map((s) => (
                <li key={s.id} className="flex justify-between gap-4 text-sm border-b border-white/5 pb-2">
                  <span className="text-white/80 capitalize">{fmtFecha(s.fecha)}</span>
                  <span className="text-white/40 text-right">
                    {[s.ciudad, s.venue?.nombre].filter(Boolean).join(" · ") || "Venue por confirmar"}
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        {propuesta.alcance && <SeccionTexto titulo="Alcance" texto={propuesta.alcance} />}

        {GRUPOS.map((g) => {
          const lineas = propuesta.lineas.filter((l) => (GRUPO_SUBTOTAL[l.tipo] ?? "honorarios") === g.llave);
          if (lineas.length === 0) return null;
          return (
            <Seccion key={g.llave} titulo={g.titulo}>
              <div className="space-y-4">
                {lineas.map((l) => (
                  <div key={l.id} className="border-b border-white/5 pb-4 last:border-0">
                    <div className="flex justify-between gap-4 items-baseline">
                      <div className="min-w-0">
                        <p className="text-[15px] text-white/90">{l.concepto}</p>
                        <p className="text-xs text-white/35 mt-0.5">
                          {TIPO_LINEA_PROPUESTA_LABEL[l.tipo] ?? l.tipo}
                          {" · "}
                          {l.cantidad} {UNIDAD_COBRO_LABEL[l.unidad] ?? l.unidad}
                          {l.show && ` · ${fmtFecha(l.show.fecha)}${l.show.ciudad ? ` ${l.show.ciudad}` : ""}`}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums text-white/90">
                        {l.esIncluido ? (
                          <span className="text-[#B3985B] text-xs uppercase tracking-wider">Incluido</span>
                        ) : (
                          fmtMoneda(l.subtotal, moneda)
                        )}
                      </p>
                    </div>
                    {l.descripcion && <p className="mt-2 text-[13px] text-white/50 leading-relaxed">{l.descripcion}</p>}
                    {l.servicio?.entregables && (
                      <p className="mt-2 text-[12px] text-white/35 leading-relaxed">
                        <span className="text-[#B3985B]/70">Entregables: </span>
                        {l.servicio.entregables}
                      </p>
                    )}
                    {l.esReembolsable && (
                      <p className="mt-2 text-[11px] text-white/30">
                        Se factura contra comprobante, al costo.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Seccion>
          );
        })}

        <Seccion titulo="Inversión">
          <div className="space-y-2 text-sm">
            <Renglon etiqueta="Honorarios" valor={fmtMoneda(propuesta.subtotalHonorarios, moneda)} />
            {propuesta.subtotalEquipo > 0 && (
              <Renglon etiqueta="Equipo y producción" valor={fmtMoneda(propuesta.subtotalEquipo, moneda)} />
            )}
            {propuesta.subtotalLogistica > 0 && (
              <Renglon etiqueta="Logística" valor={fmtMoneda(propuesta.subtotalLogistica, moneda)} />
            )}
            {propuesta.subtotalReembolsables > 0 && (
              <Renglon etiqueta="Reembolsables (estimado)" valor={fmtMoneda(propuesta.subtotalReembolsables, moneda)} />
            )}
            {propuesta.descuentoMonto > 0 && (
              <Renglon
                etiqueta={propuesta.descuentoRazon ? `Descuento — ${propuesta.descuentoRazon}` : "Descuento"}
                valor={`− ${fmtMoneda(propuesta.descuentoMonto, moneda)}`}
              />
            )}
            <div className="h-px bg-white/10 my-3" />
            <Renglon etiqueta="Subtotal" valor={fmtMoneda(propuesta.subtotal, moneda)} />
            {propuesta.aplicaIva && <Renglon etiqueta="IVA 16%" valor={fmtMoneda(propuesta.montoIva, moneda)} />}
            <div className="flex justify-between items-baseline pt-3">
              <span className="text-[11px] tracking-[0.2em] uppercase text-[#B3985B]">Total</span>
              <span className="text-2xl font-semibold tabular-nums">{fmtMoneda(propuesta.granTotal, moneda)}</span>
            </div>
            <p className="text-xs text-white/30 pt-1">
              Modelo de cobro: {MODELO_COBRO_LABEL[propuesta.modeloCobro] ?? propuesta.modeloCobro}
              {propuesta.aplicaIva ? "" : " · precios sin IVA"}
            </p>
          </div>
        </Seccion>

        {propuesta.condicionesPago && <SeccionTexto titulo="Condiciones de pago" texto={propuesta.condicionesPago} />}
        {propuesta.supuestos && <SeccionTexto titulo="Supuestos" texto={propuesta.supuestos} />}
        {propuesta.exclusiones && <SeccionTexto titulo="No incluye" texto={propuesta.exclusiones} />}

        <div className="mt-12 bg-[#0d0d0d] border border-white/8 rounded-2xl p-6 sm:p-8">
          {aprobada ? (
            <div className="text-center">
              <p className="text-[#B3985B] text-sm font-semibold">Propuesta aprobada</p>
              <p className="text-white/40 text-sm mt-2">
                {propuesta.aprobacionNombre
                  ? `Confirmada por ${propuesta.aprobacionNombre}`
                  : "Gracias, ya la recibimos."}
                {propuesta.aprobacionFecha ? ` el ${fmtFecha(propuesta.aprobacionFecha)}` : ""}
              </p>
              <p className="text-white/25 text-xs mt-4">Nos pondremos en contacto para arrancar el advance.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/70">
                Para aprobar esta propuesta escribe tu nombre completo. Queda registrado con la fecha y hora.
              </p>
              {propuesta.vigenciaHasta && (
                <p className="text-xs text-white/30 mt-1">Vigente hasta el {fmtFecha(propuesta.vigenciaHasta)}.</p>
              )}
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <input
                  className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#B3985B]/50"
                  placeholder="Tu nombre completo"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setError(null);
                  }}
                />
                <button
                  className="bg-[#B3985B] text-black font-semibold rounded-lg px-6 py-3 text-sm disabled:opacity-50"
                  onClick={aprobar}
                  disabled={aprobando}
                >
                  {aprobando ? "Registrando…" : "Aprobar propuesta"}
                </button>
              </div>
              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={`/api/propuestas-servicio/publica/${token}/pdf?inline=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/12 rounded-lg px-5 py-2.5 text-xs text-white/70 hover:text-white hover:border-white/25 transition-colors"
          >
            Ver en PDF
          </a>
          <a
            href={`/api/propuestas-servicio/publica/${token}/pdf`}
            className="border border-white/12 rounded-lg px-5 py-2.5 text-xs text-white/70 hover:text-white hover:border-white/25 transition-colors"
          >
            Descargar PDF
          </a>
        </div>

        <p className="mt-10 text-center text-[11px] text-white/20">
          Mainstage Pro · Producción técnica para eventos
        </p>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#B3985B] mb-4">{titulo}</h2>
      {children}
    </section>
  );
}

function SeccionTexto({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Seccion titulo={titulo}>
      <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{texto}</p>
    </Seccion>
  );
}

function Renglon({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/50">{etiqueta}</span>
      <span className="tabular-nums text-white/80">{valor}</span>
    </div>
  );
}

function fmtMoneda(n: number, moneda: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}
