"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { coincide } from "@/lib/buscar";
import { TIPOS_FORMACION, TIPO_FORMACION_LABEL } from "@/lib/giras";

/// Lo que la página de catálogo arma por artista. No es el modelo completo:
/// la ficha (/giras/artista/[id]) es la que lee todo.
export interface ArtistaFila {
  id: string;
  nombre: string;
  genero: string | null;
  origen: string | null;
  logoUrl: string | null;
  tipoFormacion: string | null;
  integrantesNum: number | null;
  cliente: string | null;
  riderActivo: { nombre: string; version: number } | null;
  versiones: number;
  personas: number;
  giras: number;
}

interface Props {
  artistas: ArtistaFila[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
}

const VACIO = {
  nombre: "",
  genero: "",
  origen: "",
  tipoFormacion: "",
  integrantesNum: "",
  clienteId: "",
  logoUrl: "",
};

export default function ArtistasCatalogoClient({ artistas, clientes }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [formacion, setFormacion] = useState("");
  const [rider, setRider] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibles = useMemo(
    () =>
      artistas.filter((a) => {
        if (formacion && a.tipoFormacion !== formacion) return false;
        if (rider === "CON" && !a.riderActivo) return false;
        if (rider === "SIN" && a.riderActivo) return false;
        return coincide(busqueda, a.nombre, a.genero, a.origen, a.cliente, a.riderActivo?.nombre);
      }),
    [artistas, busqueda, formacion, rider],
  );

  const totales = useMemo(
    () => ({
      artistas: visibles.length,
      conRider: visibles.filter((a) => a.riderActivo).length,
      sinRider: visibles.filter((a) => !a.riderActivo).length,
      enGira: visibles.filter((a) => a.giras > 0).length,
    }),
    [visibles],
  );

  async function crear() {
    if (!form.nombre.trim()) {
      setError("Ponle nombre al artista.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/artistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          genero: form.genero.trim() || null,
          origen: form.origen.trim() || null,
          tipoFormacion: form.tipoFormacion || null,
          integrantesNum: form.integrantesNum === "" ? null : Number(form.integrantesNum),
          clienteId: form.clienteId || null,
          logoUrl: form.logoUrl.trim() || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "No se pudo registrar el artista.");
        return;
      }
      // El endpoint devuelve el existente en lugar de duplicar: hay que decirlo.
      if (d.yaExistia) toast.info(`«${d.artista.nombre}» ya estaba en el catálogo; te llevo a su ficha.`);
      else toast.success("Artista registrado");
      router.push(`/giras/artista/${d.artista.id}`);
    } catch {
      setError("No se pudo registrar el artista.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ms-page space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ms-h1">Artistas</h1>
          <p className="ms-subtitle mt-1">
            El rider maestro vive aquí: lo que el artista pide una vez y cada plaza tiene que resolver.
          </p>
        </div>
        <button
          className="ms-btn-primary"
          onClick={() => {
            setForm(VACIO);
            setError(null);
            setAbierto(true);
          }}
        >
          Nuevo artista
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metrica titulo="Artistas" valor={String(totales.artistas)} />
        <Metrica titulo="Con rider vigente" valor={String(totales.conRider)} dorado />
        <Metrica titulo="Sin rider" valor={String(totales.sinRider)} />
        <Metrica titulo="Con giras registradas" valor={String(totales.enGira)} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="ms-input-search flex-1"
          placeholder="Buscar por nombre, género, origen o cliente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className={formacion ? "ms-filter-select-active" : "ms-filter-select"}
          value={formacion}
          onChange={(e) => setFormacion(e.target.value)}
        >
          <option value="">Toda formación</option>
          {TIPOS_FORMACION.map((t) => (
            <option key={t} value={t}>
              {TIPO_FORMACION_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          className={rider ? "ms-filter-select-active" : "ms-filter-select"}
          value={rider}
          onChange={(e) => setRider(e.target.value)}
        >
          <option value="">Con y sin rider</option>
          <option value="CON">Solo con rider vigente</option>
          <option value="SIN">Solo sin rider</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            {artistas.length === 0
              ? "Todavía no hay artistas en el catálogo. Registra el primero para armarle su rider."
              : "Ningún artista coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left">Artista</th>
                <th className="ms-th text-left">Formación</th>
                <th className="ms-th text-left">Cliente</th>
                <th className="ms-th text-left">Rider vigente</th>
                <th className="ms-th text-right">Versiones</th>
                <th className="ms-th text-right">Personas</th>
                <th className="ms-th text-right">Giras</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr
                  key={a.id}
                  className="ms-tr cursor-pointer"
                  onClick={() => router.push(`/giras/artista/${a.id}`)}
                >
                  <td className="ms-td">
                    <div className="flex items-center gap-3">
                      {a.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.logoUrl}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover border border-[#1e1e1e] shrink-0"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#252525] shrink-0 flex items-center justify-center text-[11px] text-[#555]">
                          {a.nombre.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-white text-[13px] truncate">{a.nombre}</div>
                        <div className="ms-meta truncate">
                          {[a.genero, a.origen].filter(Boolean).join(" · ") || "Sin género ni origen"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="ms-td text-[#9ca3af] text-[13px]">
                    {a.tipoFormacion ? TIPO_FORMACION_LABEL[a.tipoFormacion] ?? a.tipoFormacion : "—"}
                    {a.integrantesNum ? <span className="ms-micro ml-1">{a.integrantesNum} en escena</span> : null}
                  </td>
                  <td className="ms-td text-[#9ca3af] text-[13px]">{a.cliente ?? "—"}</td>
                  <td className="ms-td">
                    {a.riderActivo ? (
                      <>
                        <div className="text-white text-[13px] truncate">{a.riderActivo.nombre}</div>
                        <div className="ms-micro">v{a.riderActivo.version}</div>
                      </>
                    ) : (
                      <span className="ms-badge ms-badge-amber">Sin rider</span>
                    )}
                  </td>
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">{a.versiones}</td>
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">{a.personas}</td>
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">{a.giras}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Nuevo artista" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="ms-label block mb-1.5">Nombre del artista o banda</label>
            <input
              autoFocus
              className="ms-input w-full"
              placeholder="ej. aquihay aquihay"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="ms-label block mb-1.5">Género</label>
              <input
                className="ms-input w-full"
                placeholder="ej. rock alternativo"
                value={form.genero}
                onChange={(e) => setForm((p) => ({ ...p, genero: e.target.value }))}
              />
            </div>
            <div>
              <label className="ms-label block mb-1.5">Origen</label>
              <input
                className="ms-input w-full"
                placeholder="ej. Querétaro, MX"
                value={form.origen}
                onChange={(e) => setForm((p) => ({ ...p, origen: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="ms-label block mb-1.5">Formación</label>
              <select
                className="ms-input w-full"
                value={form.tipoFormacion}
                onChange={(e) => setForm((p) => ({ ...p, tipoFormacion: e.target.value }))}
              >
                <option value="">Sin definir</option>
                {TIPOS_FORMACION.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_FORMACION_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label block mb-1.5">Integrantes en escena</label>
              <input
                type="number"
                min={1}
                className="ms-input w-full"
                placeholder="ej. 5"
                value={form.integrantesNum}
                onChange={(e) => setForm((p) => ({ ...p, integrantesNum: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="ms-label block mb-1.5">Cliente que lo contrata o representa (opcional)</label>
            <Combobox
              value={form.clienteId}
              onChange={(v) => setForm((p) => ({ ...p, clienteId: v }))}
              options={clientes.map((c) => ({
                value: c.id,
                label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
              }))}
              placeholder="Sin cliente"
            />
          </div>

          <div>
            <label className="ms-label block mb-1.5">Logo (URL, opcional)</label>
            <input
              className="ms-input w-full"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
            />
            <p className="ms-micro mt-1">Encabeza riders, input lists y day sheets.</p>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={crear} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
              {guardando ? "Registrando…" : "Registrar y abrir ficha"}
            </button>
            <button onClick={() => setAbierto(false)} className="ms-btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
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
