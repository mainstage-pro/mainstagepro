"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  ESTADO_PROPUESTA_COLOR,
  ESTADO_PROPUESTA_LABEL,
  MODELOS_COBRO,
  MODELO_COBRO_LABEL,
  fmtFechaCorta,
  fmtMoneda,
} from "@/lib/giras";

interface Propuesta {
  id: string;
  numero: string;
  version: number;
  titulo: string | null;
  estado: string;
  modeloCobro: string;
  moneda: string;
  vigenciaHasta: string | null;
  granTotal: number;
  subtotalReembolsables: number;
  createdAt: string;
}

interface Props {
  giraId: string;
  giraNombre: string;
  cliente: string | null;
  artista: string;
  shows: number;
  propuestas: Propuesta[];
}

export default function PropuestasGiraClient({ giraId, giraNombre, cliente, artista, shows, propuestas }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [nueva, setNueva] = useState(false);

  const aprobada = propuestas.find((p) => p.estado === "APROBADA");

  return (
    <div className="ms-page space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Propuestas de servicios</h2>
          <p className="ms-subtitle mt-0.5">
            Lo que le cobramos al cliente por production management de esta gira: alcance y honorarios, no renta de
            inventario. La propuesta hereda cliente, artista y moneda de la gira.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/giras/propuestas" className="ms-btn-secondary">
            Todas las propuestas
          </Link>
          <button className="ms-btn-primary" onClick={() => setNueva(true)}>
            Nueva propuesta
          </button>
        </div>
      </div>

      {aprobada && (
        <div className="ms-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="ms-label">Propuesta aprobada</p>
            <p className="text-white text-sm mt-0.5">
              {aprobada.titulo || "Sin título"} ·{" "}
              <span className="font-mono text-xs text-[#B3985B]">{aprobada.numero}</span>
            </p>
          </div>
          <p className="text-xl font-semibold text-[#B3985B]">{fmtMoneda(aprobada.granTotal, aprobada.moneda)}</p>
        </div>
      )}

      {propuestas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            Esta gira todavía no tiene propuesta de servicios. Ármala aquí y las líneas se siembran desde sus{" "}
            {shows === 1 ? "show" : `${shows} shows`}.
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left">Folio</th>
                <th className="ms-th text-left">Propuesta</th>
                <th className="ms-th text-left">Cobro</th>
                <th className="ms-th text-right">Gran total</th>
                <th className="ms-th text-left">Vigencia</th>
                <th className="ms-th text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {propuestas.map((p) => (
                <tr
                  key={p.id}
                  className="ms-tr cursor-pointer"
                  onClick={() => router.push(`/giras/propuesta/${p.id}`)}
                >
                  <td className="ms-td">
                    <span className="font-mono text-xs text-[#B3985B]">{p.numero}</span>
                    {p.version > 1 && <span className="ms-micro ml-1">v{p.version}</span>}
                  </td>
                  <td className="ms-td text-white">{p.titulo ?? "Sin título"}</td>
                  <td className="ms-td text-[#9ca3af] text-[13px]">
                    {MODELO_COBRO_LABEL[p.modeloCobro] ?? p.modeloCobro}
                  </td>
                  <td className="ms-td text-right">
                    <div className="text-white font-medium">{fmtMoneda(p.granTotal, p.moneda)}</div>
                    {p.subtotalReembolsables > 0 && (
                      <div className="ms-micro">
                        incl. {fmtMoneda(p.subtotalReembolsables, p.moneda)} reembolsable
                      </div>
                    )}
                  </td>
                  <td className="ms-td text-[#9ca3af] text-[13px]">
                    {p.vigenciaHasta ? fmtFechaCorta(p.vigenciaHasta) : "—"}
                  </td>
                  <td className="ms-td">
                    <span className={`ms-badge ${ESTADO_PROPUESTA_COLOR[p.estado] ?? ""}`}>
                      {ESTADO_PROPUESTA_LABEL[p.estado] ?? p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nueva && (
        <ModalNueva
          giraId={giraId}
          giraNombre={giraNombre}
          cliente={cliente}
          artista={artista}
          onCerrar={() => setNueva(false)}
          onCreada={(id) => router.push(`/giras/propuesta/${id}`)}
          onError={(m) => toast.error(m)}
        />
      )}
    </div>
  );
}

function ModalNueva({
  giraId,
  giraNombre,
  cliente,
  artista,
  onCerrar,
  onCreada,
  onError,
}: {
  giraId: string;
  giraNombre: string;
  cliente: string | null;
  artista: string;
  onCerrar: () => void;
  onCreada: (id: string) => void;
  onError: (m: string) => void;
}) {
  const [titulo, setTitulo] = useState(`Production management — ${giraNombre}`);
  const [modeloCobro, setModeloCobro] = useState("POR_SHOW");
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    if (!titulo.trim()) {
      onError("Ponle un título a la propuesta");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/propuestas-servicio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: titulo.trim(), giraId, modeloCobro }),
    });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      onError(d.error ?? "No se pudo crear la propuesta");
      return;
    }
    onCreada(d.propuesta.id);
  }

  return (
    <div className="ms-modal-overlay bg-black/70" onClick={onCerrar}>
      <div className="ms-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-[#1e1e1e]">
          <h2 className="ms-h2">Nueva propuesta de servicios</h2>
          <p className="ms-subtitle mt-1">
            Queda ligada a {giraNombre}. Hereda {cliente ? `${cliente}, ` : ""}
            {artista} y la moneda de la gira.
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="ms-label">Título</label>
            <input
              className="ms-input mt-1"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="ms-label">Modelo de cobro</label>
            <select className="ms-input mt-1" value={modeloCobro} onChange={(e) => setModeloCobro(e.target.value)}>
              {MODELOS_COBRO.map((m) => (
                <option key={m} value={m}>
                  {MODELO_COBRO_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-5 border-t border-[#1e1e1e] flex justify-end gap-2">
          <button className="ms-btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="ms-btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? "Creando…" : "Crear y editar"}
          </button>
        </div>
      </div>
    </div>
  );
}
