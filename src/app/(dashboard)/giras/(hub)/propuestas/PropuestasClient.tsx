"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { coincide } from "@/lib/buscar";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import {
  ESTADOS_PROPUESTA,
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
  costoEstimado: number;
  subtotalReembolsables: number;
  createdAt: string;
  cliente: { id: string; nombre: string; empresa: string | null } | null;
  artista: { id: string; nombre: string } | null;
  gira: { id: string; nombre: string } | null;
}

interface GiraOpcion {
  id: string;
  nombre: string;
  artista: { id: string; nombre: string };
  _count: { shows: number };
}

interface Props {
  propuestas: Propuesta[];
  giras: GiraOpcion[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
  artistas: { id: string; nombre: string }[];
}

export default function PropuestasClient({ propuestas, giras, clientes, artistas }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [nueva, setNueva] = useState(false);

  const filtradas = useMemo(
    () =>
      propuestas.filter(
        (p) =>
          (!estado || p.estado === estado) &&
          coincide(
            busqueda,
            p.numero,
            p.titulo,
            p.cliente?.nombre,
            p.cliente?.empresa,
            p.artista?.nombre,
            p.gira?.nombre,
          ),
      ),
    [propuestas, busqueda, estado],
  );

  const totales = useMemo(() => {
    const abiertas = filtradas.filter((p) => ["BORRADOR", "ENVIADA", "EN_REVISION"].includes(p.estado));
    const aprobadas = filtradas.filter((p) => p.estado === "APROBADA");
    return {
      abiertas: abiertas.length,
      montoAbierto: abiertas.reduce((s, p) => s + p.granTotal, 0),
      aprobadas: aprobadas.length,
      montoAprobado: aprobadas.reduce((s, p) => s + p.granTotal, 0),
    };
  }, [filtradas]);

  return (
    <div className="ms-page space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ms-h1">Propuestas de servicios</h1>
          <p className="ms-subtitle mt-1">
            Production management de artistas: alcance y honorarios, no renta de inventario.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/giras/servicios" className="ms-btn-secondary">
            Catálogo de servicios
          </Link>
          <button className="ms-btn-primary" onClick={() => setNueva(true)}>
            Nueva propuesta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metrica titulo="Propuestas abiertas" valor={String(totales.abiertas)} />
        <Metrica titulo="Monto en negociación" valor={fmtMoneda(totales.montoAbierto)} />
        <Metrica titulo="Aprobadas" valor={String(totales.aprobadas)} />
        <Metrica titulo="Monto aprobado" valor={fmtMoneda(totales.montoAprobado)} dorado />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="ms-input-search flex-1"
          placeholder="Buscar por folio, título, cliente, artista o gira…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className={estado ? "ms-filter-select-active" : "ms-filter-select"}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PROPUESTA.map((e) => (
            <option key={e} value={e}>
              {ESTADO_PROPUESTA_LABEL[e]}
            </option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            {propuestas.length === 0
              ? "Todavía no hay propuestas de servicios. Arma la primera desde una gira."
              : "Ninguna propuesta coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left">Folio</th>
                <th className="ms-th text-left">Propuesta</th>
                <th className="ms-th text-left">Cliente / artista</th>
                <th className="ms-th text-left">Gira</th>
                <th className="ms-th text-left">Cobro</th>
                <th className="ms-th text-right">Gran total</th>
                <th className="ms-th text-left">Vigencia</th>
                <th className="ms-th text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => (
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
                  <td className="ms-td">
                    <div className="text-white text-[13px]">{p.cliente?.nombre ?? "—"}</div>
                    {p.artista && <div className="ms-meta">{p.artista.nombre}</div>}
                  </td>
                  <td className="ms-td text-[#9ca3af] text-[13px]">{p.gira?.nombre ?? "—"}</td>
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
          giras={giras}
          clientes={clientes}
          artistas={artistas}
          onCerrar={() => setNueva(false)}
          onCreada={(id) => router.push(`/giras/propuesta/${id}`)}
          onError={(m) => toast.error(m)}
        />
      )}
    </div>
  );
}

function Metrica({ titulo, valor, dorado }: { titulo: string; valor: string; dorado?: boolean }) {
  return (
    <div className="ms-stat-card">
      <p className="ms-label">{titulo}</p>
      <p className={`text-xl font-semibold mt-1 ${dorado ? "text-[#B3985B]" : "text-white"}`}>{valor}</p>
    </div>
  );
}

function ModalNueva({
  giras,
  clientes,
  artistas,
  onCerrar,
  onCreada,
  onError,
}: {
  giras: GiraOpcion[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
  artistas: { id: string; nombre: string }[];
  onCerrar: () => void;
  onCreada: (id: string) => void;
  onError: (m: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [giraId, setGiraId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [artistaId, setArtistaId] = useState("");
  const [modeloCobro, setModeloCobro] = useState("POR_SHOW");
  const [guardando, setGuardando] = useState(false);

  const gira = giras.find((g) => g.id === giraId);

  async function crear() {
    if (!titulo.trim()) {
      onError("Ponle un título a la propuesta");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/propuestas-servicio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(),
        giraId: giraId || null,
        clienteId: clienteId || null,
        artistaId: artistaId || null,
        modeloCobro,
      }),
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
          <p className="ms-subtitle mt-1">El cliente y el artista se heredan de la gira si la ligas aquí.</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="ms-label">Título</label>
            <input
              className="ms-input mt-1"
              placeholder="Production management — Gira octubre 2026"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="ms-label">Gira (opcional)</label>
            <Combobox
              className="mt-1"
              value={giraId}
              onChange={setGiraId}
              placeholder="Sin gira ligada"
              options={[
                { value: "", label: "Sin gira ligada" },
                ...giras.map((g) => ({
                  value: g.id,
                  label: `${g.nombre} — ${g.artista.nombre} (${g._count.shows} fechas)`,
                })),
              ]}
            />
            {gira && <p className="ms-micro mt-1">Hereda cliente, artista y moneda de la gira.</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ms-label">Cliente</label>
              <Combobox
                className="mt-1"
                value={clienteId}
                onChange={setClienteId}
                placeholder={gira ? "Hereda de la gira" : "Seleccionar cliente"}
                options={[
                  { value: "", label: gira ? "Heredar de la gira" : "Sin cliente" },
                  ...clientes.map((c) => ({
                    value: c.id,
                    label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="ms-label">Artista</label>
              <Combobox
                className="mt-1"
                value={artistaId}
                onChange={setArtistaId}
                placeholder={gira ? "Hereda de la gira" : "Seleccionar artista"}
                options={[
                  { value: "", label: gira ? "Heredar de la gira" : "Sin artista" },
                  ...artistas.map((a) => ({ value: a.id, label: a.nombre })),
                ]}
              />
            </div>
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
