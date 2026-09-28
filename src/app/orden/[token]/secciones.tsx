"use client";

/**
 * Bloques del documento que tienen lógica propia (agrupar, filtrar, alternar
 * vista). Los pares etiqueta/valor sencillos viven directo en `page.tsx`.
 */

import { useState } from "react";
import type { OrdenProduccion } from "@/lib/orden-produccion";
import { Cantidad, CatHead, Chip, Cuadro, NotaBox, PorConfirmar, Telefono, Vacio } from "./ui";

/**
 * "6:45 AM" en una sola línea. El AM/PM va en gris y pequeño para que el ojo
 * caiga en el número, que es lo que se busca al recorrer la columna.
 */
function Hora({ children, className }: { children: string; className: string }) {
  const m = /^(.*?)\s*(AM|PM)$/i.exec(children.trim());
  return (
    <span className={`block whitespace-nowrap tabular-nums ${className}`}>
      {m ? m[1] : children}
      {m && <span className="ml-0.5 text-[9px] font-semibold text-[#9a9a9a] align-baseline">{m[2].toUpperCase()}</span>}
    </span>
  );
}

/* ─── Cronología ──────────────────────────────────────────────────────────── */

/**
 * Las tres cronologías en un selector. En sitio se mira una a la vez, así que
 * apilarlas todas solo agrega scroll.
 */
export function Cronologias({ orden }: { orden: OrdenProduccion }) {
  const [vista, setVista] = useState(0);
  const crono = orden.cronologias[vista];
  const bloques = crono?.bloques.filter((b) => b.items.length > 0) ?? [];

  return (
    <>
      {/* Se envuelven en vez de desplazarse: un chip cortado a la derecha parece
          un error de maquetación y nadie lo busca deslizando. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {orden.cronologias.map((c, i) => {
          const n = c.bloques.reduce((acc, b) => acc + b.items.length, 0);
          return (
            <button
              key={c.vista}
              onClick={() => setVista(i)}
              className={`px-3 py-1.5 rounded-md text-[11.5px] font-semibold border transition-colors ${
                i === vista
                  ? "bg-[#0d0d0d] border-[#0d0d0d] text-white"
                  : "bg-white border-[#e0e0e0] text-[#5a5a5a]"
              }`}
            >
              {c.titulo}
              {n > 0 && <span className="ml-1.5 opacity-50 tabular-nums">{n}</span>}
            </button>
          );
        })}
      </div>

      {crono?.descripcion && <p className="text-[#9a9a9a] text-xs mb-3 leading-relaxed">{crono.descripcion}</p>}

      {bloques.length === 0 ? (
        <Vacio>Sin horarios capturados en esta vista.</Vacio>
      ) : (
        bloques.map((bloque, bi) => (
          <div key={bi} className="mb-4 last:mb-0">
            <Cuadro>
              <CatHead extra={bloque.subtitulo ? <span className="text-[#aaa] text-[9.5px] shrink-0">{bloque.subtitulo}</span> : undefined}>
                {bloque.titulo}
              </CatHead>
              <div className="divide-y divide-[#f0f0f0]">
                {bloque.items.map((it, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                    {/* La hora manda: columna fija y grande, como en el impreso. */}
                    <div className="shrink-0 w-[70px] text-right">
                      <Hora className="text-[#0d0d0d] text-[14px] font-bold leading-tight">{it.hora}</Hora>
                      {it.horaFin && (
                        <Hora className="text-[#9a9a9a] text-[10px] leading-tight">{`a ${it.horaFin}`}</Hora>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[#0d0d0d] text-[13.5px] font-medium leading-snug">{it.label}</p>
                      {(it.nota || it.proveedor || it.responsable || it.fecha) && (
                        <p className="text-[#5a5a5a] text-[11.5px] mt-0.5 leading-relaxed">
                          {[it.proveedor, it.responsable, it.nota, it.fecha].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Cuadro>
          </div>
        ))
      )}
    </>
  );
}

/* ─── Equipo ──────────────────────────────────────────────────────────────── */

/**
 * Tarjetas de equipo agrupadas por categoría, con la misma estructura que el
 * rider impreso. El buscador aparece solo cuando la lista es larga: con diez
 * renglones estorba más de lo que ayuda.
 */
export function Equipo({ orden }: { orden: OrdenProduccion }) {
  const [q, setQ] = useState("");
  const termino = q.trim().toLowerCase();

  const filtrados = termino
    ? orden.equipos.filter((e) =>
        [e.descripcion, e.marca, e.modelo, e.categoria, ...e.accesorios.map((a) => a.nombre)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(termino)
      )
    : orden.equipos;

  const grupos = new Map<string, typeof orden.equipos>();
  for (const e of filtrados) {
    const lista = grupos.get(e.categoria);
    if (lista) lista.push(e);
    else grupos.set(e.categoria, [e]);
  }

  const piezas = orden.equipos.reduce((n, e) => n + e.cantidad, 0);

  return (
    <>
      <p className="text-[#9a9a9a] text-xs mb-3">
        {orden.equipos.length} concepto(s) · {piezas} pieza(s)
      </p>

      {orden.equipos.length > 8 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar equipo o accesorio…"
          className="w-full border border-[#e0e0e0] rounded-md px-3 py-2.5 text-[13.5px] outline-none focus:border-[#B3985B] mb-3"
          type="search"
        />
      )}

      {filtrados.length === 0 ? (
        <Vacio>Nada coincide con “{q}”.</Vacio>
      ) : (
        [...grupos.entries()].map(([categoria, items]) => (
          <div key={categoria} className="mb-4 last:mb-0">
            <CatHead>{categoria}</CatHead>
            <div className="mt-2 space-y-2">
              {items.map((e) => {
                const titulo = [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion;
                const subtitulo = titulo !== e.descripcion ? e.descripcion : null;
                return (
                  <Cuadro key={e.id}>
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#0d0d0d] text-[14px] font-bold leading-snug">{titulo}</p>
                        {subtitulo && <p className="text-[#888] text-[11.5px] leading-snug">{subtitulo}</p>}
                      </div>
                      <Cantidad n={e.cantidad} />
                      {e.tipo === "EXTERNO" && <Chip tono="ambar">Externo</Chip>}
                    </div>

                    {e.montaje && (
                      <p className="px-3 pb-2 text-[#9A7A3F] text-[11.5px] leading-snug">{e.montaje}</p>
                    )}

                    {e.notas && (
                      <p className="px-3 py-2 bg-[#f8f8f8] border-t border-[#e8e8e8] text-[#5a5a5a] text-[11.5px] italic leading-snug">
                        Nota: {e.notas}
                      </p>
                    )}

                    {e.accesorios.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#f8f8f8] border-t border-[#e8e8e8]">
                        {e.accesorios.map((a, j) => (
                          <div key={j} className="flex items-center gap-1.5 bg-[#f0f0f0] rounded px-2 py-1.5 min-w-0">
                            <span className="flex-1 min-w-0 text-[#5a5a5a] text-[11.5px] truncate">{a.nombre}</span>
                            {a.cantidad > 1 && (
                              <span className="shrink-0 text-[#9A7A3F] text-[10px] font-bold tabular-nums">
                                ×{a.cantidad}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Cuadro>
                );
              })}
            </div>
          </div>
        ))
      )}
    </>
  );
}

/* ─── Personal ────────────────────────────────────────────────────────────── */

const PARTICIPACION: Record<string, string> = {
  OPERACION: "Operación técnica", MONTAJE: "Montaje", DESMONTAJE: "Desmontaje",
  TRANSPORTE: "Transporte", OTRO: "Otro",
};

/** Agrupado por participación: en sitio la pregunta es "¿quién viene al montaje?". */
export function Personal({ orden }: { orden: OrdenProduccion }) {
  const grupos = new Map<string, typeof orden.personal>();
  for (const t of orden.personal) {
    const k = t.participacion ?? "OTRO";
    const lista = grupos.get(k);
    if (lista) lista.push(t);
    else grupos.set(k, [t]);
  }

  return (
    <div className="space-y-3">
      {[...grupos.entries()].map(([k, items]) => (
        <Cuadro key={k}>
          <CatHead extra={<span className="text-[#aaa] text-[9.5px] shrink-0">{items.length}</span>}>
            {PARTICIPACION[k] ?? k}
          </CatHead>
          <div className="divide-y divide-[#f0f0f0]">
            {items.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[#0d0d0d] text-[13.5px] font-bold leading-snug">
                    {t.coordinaEnSitio && <span className="text-[#B3985B]">★ </span>}
                    {t.nombre}
                  </p>
                  <p className="text-[#5a5a5a] text-[11.5px] leading-snug">{t.rol ?? "Sin rol asignado"}</p>
                  {t.responsabilidad && (
                    <p className="text-[#5a5a5a] text-[11.5px] mt-0.5 leading-relaxed">{t.responsabilidad}</p>
                  )}
                </div>
                <div className="shrink-0 text-right space-y-1">
                  {t.celular && (
                    <p className="text-[13px]">
                      <Telefono numero={t.celular} />
                    </p>
                  )}
                  {!t.confirmado && <Chip tono="ambar">Sin confirmar</Chip>}
                </div>
              </div>
            ))}
          </div>
        </Cuadro>
      ))}
    </div>
  );
}

/* ─── Proveedores ─────────────────────────────────────────────────────────── */

export function Proveedores({ orden }: { orden: OrdenProduccion }) {
  return (
    <Cuadro>
      <div className="divide-y divide-[#f0f0f0]">
        {orden.proveedores.map((pv, i) => (
          <div key={i} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[#0d0d0d] text-[13.5px] font-bold leading-snug">{pv.nombre}</p>
              {pv.servicio && <p className="text-[#5a5a5a] text-[11.5px] leading-snug">{pv.servicio}</p>}
              {/* Sin dueño nadie lo recibe ni lo revisa: se ve como pendiente. */}
              <p className="text-[11.5px] mt-0.5">
                {pv.responsable ? (
                  <span className="text-[#5a5a5a]">Lo atiende {pv.responsable}</span>
                ) : (
                  <PorConfirmar>Sin responsable asignado</PorConfirmar>
                )}
              </p>
            </div>
            {pv.telefono && (
              <p className="shrink-0 text-[13px]">
                <Telefono numero={pv.telefono} />
              </p>
            )}
          </div>
        ))}
      </div>
    </Cuadro>
  );
}

/* ─── Archivos ────────────────────────────────────────────────────────────── */

const ARCHIVO_TIPO: Record<string, string> = {
  RENDER: "Render", PLOT_PATCH: "Plot / Patch", INPUT_LIST: "Input List",
  RIDER: "Rider", ITINERARIO: "Itinerario", DOCUMENTO: "Documento",
  PLANO: "Plano", CONTRATO: "Contrato", FOTO: "Foto", OTRO: "Otro",
};

export function Archivos({ orden }: { orden: OrdenProduccion }) {
  return (
    <Cuadro>
      <div className="divide-y divide-[#f0f0f0]">
        {orden.archivos.map((a, i) => (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-3 active:bg-[#f6f6f6]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#B3985B]">
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
              <path d="M13 2v7h7" />
            </svg>
            <span className="flex-1 min-w-0">
              <span className="block text-[#0d0d0d] text-[13.5px] font-medium truncate">{a.nombre}</span>
              <span className="block text-[#9a9a9a] text-[10.5px]">{ARCHIVO_TIPO[a.tipo] ?? a.tipo}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#c0c0c0]">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>
        ))}
      </div>
    </Cuadro>
  );
}

/* ─── Notas sueltas ───────────────────────────────────────────────────────── */

export function Notas({ items }: { items: { label: string; texto: string | null }[] }) {
  const conTexto = items.filter((i) => i.texto);
  if (conTexto.length === 0) return null;
  return (
    <>
      {conTexto.map((i) => (
        <NotaBox key={i.label} label={i.label}>
          {i.texto}
        </NotaBox>
      ))}
    </>
  );
}
