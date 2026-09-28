"use client";

import Link from "next/link";
import { useState } from "react";
import { useOrden } from "./OrdenContext";
import { Archivos, Cronologias, Equipo, EquipoExtra, Notas, Personal, Proveedores } from "./secciones";
import {
  Barra, Cargando, Chip, Cuadro, EVENTO_LABEL, KV, KVGrid, NotaBox,
  PorConfirmar, SERVICIO_LABEL, Sec, Telefono, etiqueta, fechaCorta, fechaLarga, hora12, horaCorta, mismoDia,
} from "./ui";
import { fmtRango } from "@/lib/hora";
import { PASE_LABEL, siguientePase, type TipoPase } from "@/lib/control-carga";

/**
 * La Orden de Producción como un solo documento continuo.
 *
 * Antes eran cinco pestañas; en sitio eso obliga a recordar dónde vive cada
 * dato. Ahora es un documento con secciones numeradas — igual que la ficha
 * impresa que el equipo ya conoce — y un índice para saltar a cualquiera.
 */
export default function OrdenPage() {
  const { orden, cargando, token } = useOrden();
  const [indice, setIndice] = useState(false);

  if (cargando || !orden) return <Cargando />;
  const o = orden;

  // Se arman como lista para que la numeración y el índice salgan de la misma
  // fuente: una sección que no aplica no deja hueco ni descuadra los números.
  const bloques: { id: string; titulo: string; nodo: React.ReactNode }[] = [];
  const add = (id: string, titulo: string, incluir: boolean, nodo: React.ReactNode) => {
    if (incluir) bloques.push({ id, titulo, nodo });
  };

  /* 1. Quién manda — va primero a propósito: es la duda que más cuesta en sitio. */
  add("mando", "Quién manda en este evento", o.mando.length > 0, (
    <Cuadro>
      <div className="divide-y divide-[#f0f0f0]">
        {o.mando.map((e, i) => (
          /* Rol arriba y nombre/teléfono en su propio renglón: en 375 px tres
             columnas parten los nombres a la mitad y el teléfono deja de leerse. */
          <div key={i} className="px-3 py-3">
            <p className="text-[#B3985B] text-[9.5px] font-bold uppercase tracking-[0.1em] leading-tight mb-1">
              {e.rol}
            </p>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-[14.5px] font-bold leading-snug">
                {e.nombre ? <span className="text-[#0d0d0d]">{e.nombre}</span> : <PorConfirmar>Sin asignar</PorConfirmar>}
              </p>
              {e.contacto && (
                <span className="shrink-0 text-[13px]">
                  <Telefono numero={e.contacto} />
                </span>
              )}
            </div>
            <p className="text-[#5a5a5a] text-[11.5px] mt-1 leading-relaxed">{e.regla}</p>
          </div>
        ))}
      </div>
    </Cuadro>
  ));

  /* 2. Escenario — dónde van las bajadas es lo que nadie trae anotado. */
  add("escenario", "Escenario y entarimado", !!o.escenario, o.escenario && (
    <>
      <KVGrid>
        <KV label="Medidas" fuerte valor={o.escenario.medidas ?? <PorConfirmar />} />
        <KV label="Altura" fuerte valor={o.escenario.alturaM != null ? `${o.escenario.alturaM} m` : <PorConfirmar />} />
        <KV label="Lo pone" fuerte valor={o.escenario.proveedor ?? <PorConfirmar />} />
        <KV
          label="Bajadas / escaleras"
          fuerte
          full
          valor={o.escenario.accesos ?? <PorConfirmar>Por confirmar — preguntar antes del montaje</PorConfirmar>}
        />
      </KVGrid>
      {o.escenario.notas && <div className="mt-3"><NotaBox label="Notas del escenario">{o.escenario.notas}</NotaBox></div>}
    </>
  ));

  /* 3. Brief. */
  add("brief", "Brief de producción", !!(o.briefObjetivo || o.briefAcomodo || o.briefRestricciones), (
    <Notas
      items={[
        { label: "Qué buscamos lograr", texto: o.briefObjetivo },
        { label: "Generales del acomodo", texto: o.briefAcomodo },
        { label: "Restricciones del venue", texto: o.briefRestricciones },
      ]}
    />
  ));

  /* 4. Cronología. */
  add("horarios", "Cronología y logística", o.cronologias.length > 0, <Cronologias orden={o} />);

  /* 5. Salida de bodega: la hora que determina si el día arranca bien. */
  const hayBodega = !!(o.llamadoBodega || o.horaSalidaBodega || o.lugarLlamado || o.choferNombre || o.transportes.length > 0);
  add("bodega", "Salida de bodega y traslados", hayBodega, (
    <>
      <KVGrid>
        {/* La fecha solo estorba cuando el llamado es el mismo día del evento,
            que es el caso normal; se muestra únicamente si cae en otro día. */}
        <KV
          label="Llamado"
          fuerte
          valor={[
            mismoDia(o.llamadoBodega, o.fechaEvento) ? null : fechaCorta(o.llamadoBodega),
            horaCorta(o.llamadoBodega),
          ].filter(Boolean).join(" · ")}
        />
        <KV label="Hora de salida" fuerte valor={hora12(o.horaSalidaBodega)} />
        <KV label="Punto de reunión" full valor={o.lugarLlamado || o.puntoSalidaBodega} />
        <KV label="Chofer" fuerte valor={o.choferNombre} />
      </KVGrid>
      {o.transportes.length > 0 && (
        <div className="mt-3">
          <Cuadro>
            <div className="divide-y divide-[#f0f0f0]">
              {o.transportes.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[#0d0d0d] text-[13.5px] font-medium truncate">{t.vehiculoNombre ?? "Vehículo"}</p>
                    {t.choferNombre && <p className="text-[#5a5a5a] text-[11.5px] truncate">{t.choferNombre}</p>}
                  </div>
                  {t.horaSalida && (
                    <span className="shrink-0 text-[#0d0d0d] text-[14px] font-bold tabular-nums">{hora12(t.horaSalida)}</span>
                  )}
                </div>
              ))}
            </div>
          </Cuadro>
        </div>
      )}
    </>
  ));

  /* 6. Venue. */
  add("venue", "Venue y acceso", !!(o.lugarEvento || o.direccionVenue || o.indicacionesAcceso), (
    <>
      <KVGrid>
        <KV label="Venue" fuerte full valor={o.lugarEvento} />
        <KV label="Fecha del evento" full valor={fechaLarga(o.fechaEvento)} />
        <KV label="Horario" valor={fmtRango(o.horaInicioEvento, o.horaFinEvento) || null} />
        <KV
          label="Tipo"
          valor={[etiqueta(EVENTO_LABEL, o.tipoEvento), etiqueta(SERVICIO_LABEL, o.tipoServicio)].filter(Boolean).join(" · ")}
        />
        <KV label="Dirección" full valor={o.direccionVenue} />
      </KVGrid>
      {o.linkMaps && (
        <a
          href={o.linkMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 bg-[#f7f0e2] border border-[#ddc98a] rounded-md text-[#8a6d2b] text-[12px] font-bold"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Abrir en Maps
        </a>
      )}
      {o.indicacionesAcceso && <div className="mt-3"><NotaBox label="Acceso al venue">{o.indicacionesAcceso}</NotaBox></div>}
    </>
  ));

  /* 7. Contactos. */
  add("contactos", "Cliente y contactos", true, (
    <>
      <KVGrid>
        <KV label="Cliente" fuerte valor={o.cliente.empresa || o.cliente.nombre} />
        <KV label="Coordinador Mainstage" fuerte valor={o.encargadoNombre} />
        <KV label="Encargado del cliente" fuerte valor={o.encargadoCliente} />
        <KV label="Contacto directo" valor={o.encargadoClienteContacto && <Telefono numero={o.encargadoClienteContacto} />} />
        <KV label="Encargado del venue" fuerte valor={o.encargadoLugar} />
        <KV label="Contacto del venue" valor={o.encargadoLugarContacto && <Telefono numero={o.encargadoLugarContacto} />} />
        <KV label="Catering" full valor={o.aplicaCatering ? o.proveedorCatering || "Sí aplica" : null} />
      </KVGrid>
      {o.contactosEmergencia && <div className="mt-3"><NotaBox label="Contactos de emergencia">{o.contactosEmergencia}</NotaBox></div>}
    </>
  ));

  /* 8. Equipo. */
  add("equipo", "Equipo y accesorios", o.equipos.length > 0, <Equipo orden={o} />);

  /* 9. Equipo fuera de cotización: el checklist de carga sí lo pide, así que
        tiene que estar en el documento o no cuadran las listas. */
  add("extra", "Equipo adicional (fuera de cotización)", o.equiposExtra.length > 0, <EquipoExtra orden={o} />);

  /* 10. Proveedores. */
  add("proveedores", "Proveedores y subrentas", o.proveedores.length > 0, <Proveedores orden={o} />);

  /* 11. Personal. */
  add("personal", "Equipo de trabajo", o.personal.length > 0, <Personal orden={o} />);

  /* 12. Archivos. */
  add("archivos", "Archivos operativos", o.archivos.length > 0, <Archivos orden={o} />);

  /* 13. Notas. */
  add("notas", "Notas e indicaciones", !!o.indicacionesCliente, (
    <Notas items={[{ label: "Indicaciones del cliente", texto: o.indicacionesCliente }]} />
  ));

  const siguiente = siguientePase(o.pases);

  return (
    <>
      {/* La acción del día, antes que el documento. */}
      <AccionCarga token={token} pases={o.pases} titulo={siguiente.titulo} detalle={siguiente.detalle} />

      {bloques.map((b, i) => (
        <Sec key={b.id} id={b.id} num={i + 1} titulo={b.titulo}>
          {b.nodo}
        </Sec>
      ))}

      {/* Barra fija: saltar a cualquier apartado y entrar a la carga, sin scrollear. */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-[#e8e8e8] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-5 py-2.5 flex gap-2">
          <button
            onClick={() => setIndice(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#d8d8d8] rounded-lg text-[#0d0d0d] text-[13px] font-bold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Índice
          </button>
          <Link
            href={`/orden/${token}/carga`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0d0d0d] rounded-lg text-white text-[13px] font-bold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Control de carga
          </Link>
        </div>
      </div>

      {indice && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIndice(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-[#e8e8e8]">
              <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-3 sm:hidden" />
              <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-[0.13em]">Ir a</p>
            </div>
            <div className="divide-y divide-[#f0f0f0]">
              {bloques.map((b, i) => (
                <a
                  key={b.id}
                  href={`#${b.id}`}
                  onClick={() => setIndice(false)}
                  className="flex items-center gap-3 px-5 py-3.5 active:bg-[#f6f6f6]"
                >
                  <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-[#0d0d0d] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-[#0d0d0d] text-[13.5px] font-medium">{b.titulo}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Tarjeta de control de carga. Un solo botón que dice lo que va a pasar: el
 * sistema ya sabe si toca salida o retorno, así que no lo pregunta.
 */
function AccionCarga({
  token,
  pases,
  titulo,
  detalle,
}: {
  token: string;
  pases: { id: string; tipo: string; estado: string; avance: { pct: number; revisados: number; total: number; faltantes: number; danados: number } }[];
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="border border-[#e8e8e8] rounded-lg overflow-hidden mb-8">
      <div className="bg-[#0d0d0d] px-4 py-2.5 flex items-center justify-between gap-2">
        <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em]">Control de carga</span>
        {pases.length > 0 && (
          <span className="text-[#aaa] text-[10px] tabular-nums">{pases.length} pase(s)</span>
        )}
      </div>

      {pases.length > 0 && (
        <div className="divide-y divide-[#f0f0f0]">
          {pases.map((p) => (
            <div key={p.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[#0d0d0d] text-[12.5px] font-medium">
                  {PASE_LABEL[p.tipo as TipoPase] ?? p.tipo}
                </span>
                <Chip tono={p.estado === "CERRADA" ? "verde" : "ambar"}>
                  {p.estado === "CERRADA" ? "Cerrado" : "En curso"}
                </Chip>
              </div>
              <Barra pct={p.avance.pct} tono={p.estado === "CERRADA" ? "verde" : "oro"} />
              <p className="text-[#9a9a9a] text-[10.5px] mt-1 tabular-nums">
                {p.avance.revisados}/{p.avance.total} revisados
                {p.avance.faltantes > 0 && ` · ${p.avance.faltantes} faltante(s)`}
                {p.avance.danados > 0 && ` · ${p.avance.danados} dañado(s)`}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="p-4">
        <p className="text-[#5a5a5a] text-[12px] leading-relaxed mb-3">{detalle}</p>
        <Link
          href={`/orden/${token}/carga`}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#B3985B] rounded-lg text-[#0d0d0d] text-[14px] font-bold"
        >
          {titulo}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
