"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { ESTADO_COTIZACION_LABELS } from "@/lib/constants";
import { ESTADO_PROPUESTA_COLOR, ESTADO_SHOW_LABEL, esGira, fmtFechaCorta, fmtMoneda } from "@/lib/giras";

/// El valor vacío lo ocupa el placeholder del select, así que "sin fecha" viaja
/// con su propia llave o el onChange nunca dispararía.
const SIN_FECHA = "__gira__";

interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  nombreCotizacion: string | null;
  estado: string;
  granTotal: number;
  lineas: number;
}

interface Show {
  id: string;
  fecha: string;
  plaza: string | null;
  estado: string;
  tieneProyecto: boolean;
  cotizaciones: Cotizacion[];
}

interface Props {
  giraId: string;
  giraNombre: string;
  tipo: string;
  moneda: string;
  artista: string;
  cliente: string | null;
  sinCliente: boolean;
  base: Cotizacion[];
  shows: Show[];
}

export default function CotizacionesGiraClient({
  giraId,
  giraNombre,
  tipo,
  moneda,
  artista,
  cliente,
  sinCliente,
  base,
  shows,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [ocupado, setOcupado] = useState<string | null>(null);

  const tour = esGira(tipo);
  const conCotizacion = shows.filter((s) => s.cotizaciones.length > 0).length;
  const totalFechas = shows.reduce((a, s) => a + s.cotizaciones.reduce((b, c) => b + c.granTotal, 0), 0);

  async function pedir(clave: string, url: string, body: unknown, metodo = "POST") {
    if (sinCliente) {
      toast.error("Liga un cliente a la gira antes de cotizar equipo");
      return null;
    }
    setOcupado(clave);
    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setOcupado(null);
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo completar");
      return null;
    }
    return d;
  }

  async function crear(showId: string | null, desdeId: string | null, clave: string) {
    const d = await pedir(clave, `/api/giras/${giraId}/cotizaciones`, { showId, desdeId });
    if (d?.id) router.push(`/cotizaciones/nuevo?editId=${d.id}`);
  }

  async function copiarAFecha(cotizacionId: string, showId: string, clave: string) {
    const d = await pedir(clave, `/api/giras/${giraId}/cotizaciones`, { showId, desdeId: cotizacionId });
    if (d?.id) {
      toast.success(`Cotización ${d.numeroCotizacion} creada con el mismo equipo`);
      router.refresh();
    }
  }

  async function asignarFecha(cotizacionId: string, showId: string | null, clave: string) {
    const d = await pedir(clave, `/api/cotizaciones/${cotizacionId}/fecha-gira`, { showId }, "PATCH");
    if (d?.ok) router.refresh();
  }

  return (
    <div className="ms-page space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Cotizaciones de equipo</h2>
          <p className="ms-subtitle mt-0.5">
            La renta de inventario de {tour ? "la gira" : "el show"}. Carga el equipo una vez en la cotización de{" "}
            {tour ? "toda la gira" : "este registro"} y cópialo a cada fecha; cada copia queda editable por su cuenta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/cotizaciones" className="ms-btn-secondary">
            Todas las cotizaciones
          </Link>
          <button
            className="ms-btn-primary"
            disabled={ocupado === "base"}
            onClick={() => crear(null, null, "base")}
          >
            {ocupado === "base" ? "Creando…" : tour ? "Nueva cotización de la gira" : "Nueva cotización"}
          </button>
        </div>
      </div>

      {sinCliente && (
        <div className="ms-card p-4 border-amber-500/30">
          <p className="text-[13px] text-amber-300">
            Esta gira no tiene cliente ligado. Elígelo en el resumen de la gira antes de cotizar: sin cliente no hay a
            quién cobrarle.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Dato titulo="Cotización base" valor={base.length ? `${base.length}` : "—"} pie="alcance de toda la gira" />
        <Dato
          titulo="Fechas cotizadas"
          valor={`${conCotizacion}/${shows.length}`}
          pie={shows.length === 1 ? "fecha" : "fechas de la gira"}
        />
        <Dato titulo="Equipo cotizado por fecha" valor={fmtMoneda(totalFechas, moneda)} pie="suma de las fechas" />
      </div>

      <section className="space-y-2">
        <h3 className="ms-label">{tour ? "Base de toda la gira" : "Sin fecha asignada"}</h3>
        {base.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-[#6b7280]">
              Todavía no hay cotización de {tour ? "toda la gira" : "alcance general"}. Ábrela, carga el equipo de{" "}
              {artista} una vez y de ahí se copia a cada fecha.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {base.map((c) => (
              <FilaCotizacion
                key={c.id}
                cot={c}
                moneda={moneda}
                shows={shows}
                showActual={null}
                ocupado={ocupado}
                onAsignar={(showId) => asignarFecha(c.id, showId, `asignar-${c.id}`)}
                onCopiar={(showId) => copiarAFecha(c.id, showId, `copiar-${c.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="ms-label">Por fecha</h3>
        {shows.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-[#6b7280]">Esta gira todavía no tiene fechas. Agrégalas en Shows.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shows.map((s) => (
              <div key={s.id} className="ms-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white">
                      {fmtFechaCorta(s.fecha)}
                      {s.plaza ? ` · ${s.plaza}` : ""}
                    </p>
                    <p className="ms-micro mt-0.5">
                      {ESTADO_SHOW_LABEL[s.estado] ?? s.estado}
                      {s.tieneProyecto ? " · con proyecto operativo" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {base.length > 0 && (
                      <SelectorAccion
                        etiqueta={base.length === 1 ? "Copiar la base aquí" : "Copiar base…"}
                        deshabilitado={ocupado !== null}
                        opciones={base.map((b) => ({
                          valor: b.id,
                          texto: `${b.numeroCotizacion} · ${b.lineas} líneas`,
                        }))}
                        onElegir={(cotId) => copiarAFecha(cotId, s.id, `copiar-${cotId}`)}
                      />
                    )}
                    <button
                      className="ms-btn-ghost text-xs"
                      disabled={ocupado === `blanco-${s.id}`}
                      onClick={() => crear(s.id, null, `blanco-${s.id}`)}
                    >
                      {ocupado === `blanco-${s.id}` ? "Creando…" : "En blanco"}
                    </button>
                  </div>
                </div>

                {s.cotizaciones.length > 0 && (
                  <div className="space-y-2">
                    {s.cotizaciones.map((c) => (
                      <FilaCotizacion
                        key={c.id}
                        cot={c}
                        moneda={moneda}
                        shows={shows}
                        showActual={s.id}
                        bloqueada={s.tieneProyecto}
                        ocupado={ocupado}
                        onAsignar={(showId) => asignarFecha(c.id, showId, `asignar-${c.id}`)}
                        onCopiar={(showId) => copiarAFecha(c.id, showId, `copiar-${c.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="ms-micro">
        {cliente ? `Se cotiza a ${cliente}. ` : ""}
        Las cotizaciones de {giraNombre} también aparecen en el módulo de Cotizaciones; aquí solo se ven juntas y se
        mueven de fecha.
      </p>
    </div>
  );
}

function Dato({ titulo, valor, pie }: { titulo: string; valor: string; pie: string }) {
  return (
    <div className="ms-card p-4">
      <p className="ms-label">{titulo}</p>
      <p className="text-xl font-semibold text-white mt-1">{valor}</p>
      <p className="ms-micro mt-0.5">{pie}</p>
    </div>
  );
}

function FilaCotizacion({
  cot,
  moneda,
  shows,
  showActual,
  bloqueada = false,
  ocupado,
  onAsignar,
  onCopiar,
}: {
  cot: Cotizacion;
  moneda: string;
  shows: Show[];
  showActual: string | null;
  bloqueada?: boolean;
  ocupado: string | null;
  onAsignar: (showId: string | null) => void;
  onCopiar: (showId: string) => void;
}) {
  const otras = shows.filter((s) => s.id !== showActual);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex flex-wrap items-center gap-3">
      <Link href={`/cotizaciones/nuevo?editId=${cot.id}`} className="min-w-0 flex-1 group">
        <p className="text-[13px] text-white truncate group-hover:text-[#B3985B]">
          {cot.nombreCotizacion || cot.numeroCotizacion}
        </p>
        <p className="ms-micro mt-0.5">
          <span className="font-mono text-[#B3985B]">{cot.numeroCotizacion}</span> · {cot.lineas}{" "}
          {cot.lineas === 1 ? "línea" : "líneas"}
        </p>
      </Link>

      <span className={`ms-badge ${ESTADO_PROPUESTA_COLOR[cot.estado] ?? ESTADO_PROPUESTA_COLOR.BORRADOR}`}>
        {ESTADO_COTIZACION_LABELS[cot.estado] ?? cot.estado}
      </span>

      <p className="text-sm font-medium text-white tabular-nums">{fmtMoneda(cot.granTotal, moneda)}</p>

      <div className="flex items-center gap-2">
        {otras.length > 0 && (
          <SelectorAccion
            etiqueta="Copiar a fecha…"
            deshabilitado={ocupado !== null}
            opciones={otras.map((s) => ({
              valor: s.id,
              texto: `${fmtFechaCorta(s.fecha)}${s.plaza ? ` · ${s.plaza}` : ""}`,
            }))}
            onElegir={onCopiar}
          />
        )}
        {bloqueada ? (
          <span className="ms-micro" title="La fecha ya tiene proyecto operativo">
            fecha fija
          </span>
        ) : (
          <SelectorAccion
            etiqueta="Mover a…"
            deshabilitado={ocupado !== null}
            opciones={[
              ...(showActual ? [{ valor: SIN_FECHA, texto: "Toda la gira" }] : []),
              ...otras.map((s) => ({
                valor: s.id,
                texto: `${fmtFechaCorta(s.fecha)}${s.plaza ? ` · ${s.plaza}` : ""}`,
              })),
            ]}
            onElegir={(v) => onAsignar(v === SIN_FECHA ? null : v)}
          />
        )}
      </div>
    </div>
  );
}

/// Un select que dispara la acción al elegir y vuelve a su etiqueta. No guarda
/// estado: lo que eligiste ya pasó, el renglón se recarga del servidor.
function SelectorAccion({
  etiqueta,
  opciones,
  deshabilitado,
  onElegir,
}: {
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
  deshabilitado: boolean;
  onElegir: (valor: string) => void;
}) {
  return (
    <select
      className="ms-input text-xs py-1 px-2 w-auto"
      value=""
      disabled={deshabilitado || opciones.length === 0}
      onChange={(e) => {
        const v = e.target.value;
        e.target.value = "";
        onElegir(v);
      }}
    >
      <option value="" disabled>
        {etiqueta}
      </option>
      {opciones.map((o) => (
        <option key={o.valor || "nula"} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}
