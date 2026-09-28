"use client";

import { useParams } from "next/navigation";
import { OrdenProvider, useOrden } from "./OrdenContext";
import { ESTADO_LABEL, FONT, SERVICIO_LABEL, fechaCorta, haceCuanto, hora12 } from "./ui";

/** Celda de la banda dorada. */
function BandaItem({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="px-3 py-2 text-center min-w-0">
      <p className="text-[#6b4e1a] text-[8.5px] font-semibold uppercase tracking-[0.1em] leading-tight">{label}</p>
      <p className="text-[#0d0d0d] text-[13px] font-bold leading-tight mt-0.5 truncate">{valor}</p>
    </div>
  );
}

function Cascaron({ children }: { children: React.ReactNode }) {
  const { orden, error } = useOrden();

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-6" style={{ fontFamily: FONT }}>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-30" draggable={false} />
          <p className="text-white/50 font-semibold mb-2">{error}</p>
          <p className="text-white/25 text-sm">Pide al coordinador que te comparta el enlace vigente.</p>
        </div>
      </div>
    );
  }

  const banda = orden
    ? [
        { label: "Fecha del evento", valor: fechaCorta(orden.fechaEvento) },
        { label: "Venue", valor: orden.lugarEvento },
        { label: "Montaje", valor: hora12(orden.horaInicioMontaje) },
        { label: "Inicio", valor: hora12(orden.horaInicioEvento) },
        { label: "Fin", valor: hora12(orden.horaFinEvento) },
      ].filter((b) => b.valor)
    : [];

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d]" style={{ fontFamily: FONT }}>
      {/* HERO NEGRO — la portada del documento, igual que la Ficha Operativa impresa. */}
      <header className="bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto px-5 pt-5 pb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[#888] text-[9.5px] font-medium uppercase tracking-[0.15em] mb-1.5">
              Orden de producción
              {orden ? ` · ${orden.numeroProyecto} · ${ESTADO_LABEL[orden.estado] ?? orden.estado}` : ""}
            </p>
            <h1 className="text-white font-bold text-[19px] leading-[1.2] mb-1">{orden?.nombre ?? "Cargando…"}</h1>
            {orden && (
              <p className="text-[#aaa] text-[11.5px] leading-snug">
                {orden.cliente.nombre}
                {orden.cliente.empresa ? ` · ${orden.cliente.empresa}` : ""}
                {orden.tipoServicio ? ` · ${SERVICIO_LABEL[orden.tipoServicio] ?? orden.tipoServicio}` : ""}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 ml-auto opacity-90" draggable={false} />
            {orden && (
              <p className="text-[#666] text-[9.5px] mt-2 leading-tight">
                Actualizado
                <br />
                {haceCuanto(orden.actualizadoEn)}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* BANDA DORADA — los cinco datos que se consultan sin leer nada más. */}
      {banda.length > 0 && (
        <div className="bg-[#B3985B]">
          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:flex sm:items-stretch divide-x divide-y sm:divide-y-0 divide-[#c9a96a]">
            {banda.map((b) => (
              <div key={b.label} className="sm:flex-1 min-w-0 flex items-center justify-center">
                <BandaItem label={b.label} valor={b.valor} />
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-5 pt-6 pb-28">{children}</main>

      <footer className="max-w-3xl mx-auto px-5 pb-8">
        <div className="border-t border-[#e8e8e8] pt-3 flex items-center justify-between">
          <span className="text-[#9a9a9a] text-[9.5px]">Uso interno — Mainstage Pro</span>
          {orden && <span className="text-[#9a9a9a] text-[9.5px]">{orden.numeroProyecto}</span>}
        </div>
      </footer>
    </div>
  );
}

export default function OrdenLayout({ children }: { children: React.ReactNode }) {
  const { token } = useParams<{ token: string }>();
  return (
    <OrdenProvider token={token}>
      <Cascaron>{children}</Cascaron>
    </OrdenProvider>
  );
}
