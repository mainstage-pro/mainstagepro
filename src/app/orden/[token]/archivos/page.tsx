"use client";

import { useOrden } from "../OrdenContext";
import { Cargando, Vacio } from "../ui";

const TIPO_LABEL: Record<string, string> = {
  PLANO: "Planos",
  RIDER: "Riders",
  CONTRATO: "Contratos",
  FOTO: "Fotos",
  OTRO: "Otros",
};

/** Planos, riders del artista y cualquier adjunto que en papel se quedaba fuera. */
export default function ArchivosPage() {
  const { orden, cargando } = useOrden();
  if (cargando || !orden) return <Cargando />;

  const grupos = new Map<string, typeof orden.archivos>();
  for (const a of orden.archivos) {
    const lista = grupos.get(a.tipo);
    if (lista) lista.push(a);
    else grupos.set(a.tipo, [a]);
  }

  if (orden.archivos.length === 0) {
    return <Vacio>No hay archivos adjuntos en este proyecto.</Vacio>;
  }

  return (
    <>
      {[...grupos.entries()].map(([tipo, archivos]) => (
        <section key={tipo} className="mb-5">
          <h2 className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-2">
            {TIPO_LABEL[tipo] ?? tipo}
          </h2>
          <div className="bg-white/[0.025] border border-white/8 rounded-2xl divide-y divide-white/5">
            {archivos.map((a, i) => (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 active:bg-white/[0.04]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#B3985B]">
                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                  <path d="M13 2v7h7" />
                </svg>
                <span className="flex-1 min-w-0 text-white/80 text-sm truncate">{a.nombre}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/20">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
