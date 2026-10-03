"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { coincide } from "@/lib/buscar";
import { useToast } from "@/components/Toast";
import {
  CATEGORIAS_SERVICIO,
  CATEGORIA_SERVICIO_LABEL,
  TIPOS_LINEA_PROPUESTA,
  TIPO_LINEA_PROPUESTA_LABEL,
  UNIDADES_COBRO,
  UNIDAD_COBRO_LABEL,
  fmtMoneda,
} from "@/lib/giras";

export interface ServicioFila {
  id: string;
  clave: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  entregables: string | null;
  incluye: string | null;
  noIncluye: string | null;
  unidadDefault: string;
  tipoLinea: string;
  precioSugerido: number | null;
  costoSugerido: number | null;
  activo: boolean;
  orden: number;
  usos: number;
}

interface Props {
  servicios: ServicioFila[];
}

const SIN_CATEGORIA = "SIN_CATEGORIA";

export default function ServiciosClient({ servicios }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [editando, setEditando] = useState<ServicioFila | null>(null);
  const [creando, setCreando] = useState(false);

  const filtrados = useMemo(
    () =>
      servicios.filter(
        (s) =>
          (verInactivos || s.activo) &&
          (!categoria || (s.categoria ?? SIN_CATEGORIA) === categoria) &&
          coincide(busqueda, s.clave, s.nombre, s.descripcion, s.entregables),
      ),
    [servicios, busqueda, categoria, verInactivos],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, ServicioFila[]>();
    for (const s of filtrados) {
      const llave = s.categoria ?? SIN_CATEGORIA;
      const actual = mapa.get(llave);
      if (actual) actual.push(s);
      else mapa.set(llave, [s]);
    }
    const orden = [...CATEGORIAS_SERVICIO, SIN_CATEGORIA];
    return [...mapa.entries()].sort((a, b) => orden.indexOf(a[0]) - orden.indexOf(b[0]));
  }, [filtrados]);

  const totales = useMemo(() => {
    const activos = servicios.filter((s) => s.activo);
    const conPrecio = activos.filter((s) => s.precioSugerido != null);
    return {
      activos: activos.length,
      sinPrecio: activos.length - conPrecio.length,
      usos: servicios.reduce((s, x) => s + x.usos, 0),
    };
  }, [servicios]);

  async function alternarActivo(s: ServicioFila) {
    const res = await fetch(
      `/api/servicios-pm/${s.id}`,
      s.activo
        ? { method: "DELETE" }
        : {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activo: true }),
          },
    );
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo actualizar el servicio");
      return;
    }
    toast.success(s.activo ? `${s.clave} desactivado` : `${s.clave} reactivado`);
    router.refresh();
  }

  return (
    <div className="ms-page space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ms-h1">Catálogo de servicios</h1>
          <p className="ms-subtitle mt-1">
            El vocabulario con el que se arman las propuestas de production management. El precio de aquí es
            sugerido: cada propuesta puede moverlo sin tocar el catálogo.
          </p>
        </div>
        <button className="ms-btn-primary shrink-0" onClick={() => setCreando(true)}>
          Nuevo servicio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metrica titulo="Servicios activos" valor={String(totales.activos)} />
        <Metrica titulo="Sin precio sugerido" valor={String(totales.sinPrecio)} />
        <Metrica titulo="Usos en propuestas" valor={String(totales.usos)} dorado />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="ms-input-search flex-1"
          placeholder="Buscar por clave, nombre o entregable…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className={categoria ? "ms-filter-select-active" : "ms-filter-select"}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_SERVICIO.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_SERVICIO_LABEL[c]}
            </option>
          ))}
          <option value={SIN_CATEGORIA}>Sin categoría</option>
        </select>
        <button
          className={verInactivos ? "ms-filter-select-active" : "ms-filter-select"}
          onClick={() => setVerInactivos((v) => !v)}
        >
          {verInactivos ? "Ocultar inactivos" : "Ver inactivos"}
        </button>
      </div>

      {grupos.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            {servicios.length === 0
              ? "El catálogo está vacío. Da de alta el primer servicio para empezar a cotizar."
              : "Ningún servicio coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([llave, lista]) => (
            <div key={llave} className="space-y-2">
              <p className="ms-section-label">
                {CATEGORIA_SERVICIO_LABEL[llave] ?? "Sin categoría"}{" "}
                <span className="ms-micro">({lista.length})</span>
              </p>
              <div className="ms-table-wrapper overflow-x-auto">
                <table className="w-full min-w-[880px]">
                  <thead className="ms-thead">
                    <tr>
                      <th className="ms-th text-left">Clave</th>
                      <th className="ms-th text-left">Servicio</th>
                      <th className="ms-th text-left">Tipo de línea</th>
                      <th className="ms-th text-left">Unidad</th>
                      <th className="ms-th text-right">Precio sugerido</th>
                      <th className="ms-th text-right">Costo</th>
                      <th className="ms-th text-right">Usos</th>
                      <th className="ms-th text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((s) => (
                      <tr
                        key={s.id}
                        className={`ms-tr cursor-pointer ${s.activo ? "" : "opacity-50"}`}
                        onClick={() => setEditando(s)}
                      >
                        <td className="ms-td">
                          <span className="font-mono text-xs text-[#B3985B]">{s.clave}</span>
                          {!s.activo && <span className="ms-badge ms-badge-gray ml-2">Inactivo</span>}
                        </td>
                        <td className="ms-td">
                          <div className="text-white text-[13px]">{s.nombre}</div>
                          {s.descripcion && <div className="ms-meta line-clamp-1">{s.descripcion}</div>}
                        </td>
                        <td className="ms-td text-[#9ca3af] text-[13px]">
                          {TIPO_LINEA_PROPUESTA_LABEL[s.tipoLinea] ?? s.tipoLinea}
                        </td>
                        <td className="ms-td text-[#9ca3af] text-[13px]">
                          {UNIDAD_COBRO_LABEL[s.unidadDefault] ?? s.unidadDefault}
                        </td>
                        <td className="ms-td text-right text-white">
                          {s.precioSugerido != null ? fmtMoneda(s.precioSugerido) : "—"}
                        </td>
                        <td className="ms-td text-right text-[#9ca3af] text-[13px]">
                          {s.costoSugerido != null ? fmtMoneda(s.costoSugerido) : "—"}
                        </td>
                        <td className="ms-td text-right text-[#9ca3af] text-[13px]">{s.usos}</td>
                        <td className="ms-td text-right">
                          <button
                            className="ms-btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              void alternarActivo(s);
                            }}
                          >
                            {s.activo ? "Desactivar" : "Reactivar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creando || editando) && (
        <ModalServicio
          servicio={editando}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={(msg) => {
            setCreando(false);
            setEditando(null);
            toast.success(msg);
            router.refresh();
          }}
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

function claveDesdeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function ModalServicio({
  servicio,
  onCerrar,
  onGuardado,
  onError,
}: {
  servicio: ServicioFila | null;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}) {
  const [nombre, setNombre] = useState(servicio?.nombre ?? "");
  const [clave, setClave] = useState(servicio?.clave ?? "");
  const [claveTocada, setClaveTocada] = useState(Boolean(servicio));
  const [categoria, setCategoria] = useState(servicio?.categoria ?? "");
  const [tipoLinea, setTipoLinea] = useState(servicio?.tipoLinea ?? "HONORARIO");
  const [unidadDefault, setUnidadDefault] = useState(servicio?.unidadDefault ?? "SHOW");
  const [precioSugerido, setPrecioSugerido] = useState(servicio?.precioSugerido?.toString() ?? "");
  const [costoSugerido, setCostoSugerido] = useState(servicio?.costoSugerido?.toString() ?? "");
  const [orden, setOrden] = useState(servicio?.orden?.toString() ?? "0");
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? "");
  const [entregables, setEntregables] = useState(servicio?.entregables ?? "");
  const [incluye, setIncluye] = useState(servicio?.incluye ?? "");
  const [noIncluye, setNoIncluye] = useState(servicio?.noIncluye ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) {
      onError("El servicio necesita un nombre");
      return;
    }
    const claveFinal = clave.trim() || claveDesdeNombre(nombre);
    if (!claveFinal) {
      onError("La clave no puede quedar vacía");
      return;
    }

    const cuerpo = {
      nombre: nombre.trim(),
      categoria: categoria || null,
      tipoLinea,
      unidadDefault,
      precioSugerido: precioSugerido.trim() === "" ? null : Number(precioSugerido),
      costoSugerido: costoSugerido.trim() === "" ? null : Number(costoSugerido),
      orden: Number(orden) || 0,
      descripcion: descripcion.trim() || null,
      entregables: entregables.trim() || null,
      incluye: incluye.trim() || null,
      noIncluye: noIncluye.trim() || null,
    };

    setGuardando(true);
    const res = await fetch(servicio ? `/api/servicios-pm/${servicio.id}` : "/api/servicios-pm", {
      method: servicio ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicio ? cuerpo : { ...cuerpo, clave: claveFinal }),
    });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      onError(d.error ?? "No se pudo guardar el servicio");
      return;
    }
    onGuardado(servicio ? `${claveFinal} actualizado` : `${claveFinal} agregado al catálogo`);
  }

  return (
    <div className="ms-modal-overlay bg-black/70" onClick={onCerrar}>
      <div className="ms-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-[#1e1e1e]">
          <h2 className="ms-h2">{servicio ? "Editar servicio" : "Nuevo servicio"}</h2>
          <p className="ms-subtitle mt-1">
            {servicio
              ? `Usado en ${servicio.usos} línea${servicio.usos === 1 ? "" : "s"} de propuesta. Editarlo no cambia las propuestas ya armadas.`
              : "La clave identifica al servicio dentro de las propuestas y no se puede cambiar después."}
          </p>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="ms-label">Nombre</label>
              <input
                className="ms-input mt-1"
                placeholder="Advance técnico por venue"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (!claveTocada) setClave(claveDesdeNombre(e.target.value));
                }}
                autoFocus
              />
            </div>
            <div>
              <label className="ms-label">Clave</label>
              <input
                className="ms-input mt-1 font-mono text-xs disabled:opacity-60"
                value={clave}
                disabled={Boolean(servicio)}
                onChange={(e) => {
                  setClaveTocada(true);
                  setClave(e.target.value.toUpperCase());
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="ms-label">Categoría</label>
              <select
                className="ms-input mt-1"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="">Sin categoría</option>
                {CATEGORIAS_SERVICIO.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_SERVICIO_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label">Tipo de línea</label>
              <select
                className="ms-input mt-1"
                value={tipoLinea}
                onChange={(e) => setTipoLinea(e.target.value)}
              >
                {TIPOS_LINEA_PROPUESTA.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LINEA_PROPUESTA_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label">Unidad</label>
              <select
                className="ms-input mt-1"
                value={unidadDefault}
                onChange={(e) => setUnidadDefault(e.target.value)}
              >
                {UNIDADES_COBRO.map((u) => (
                  <option key={u} value={u}>
                    {UNIDAD_COBRO_LABEL[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="ms-label">Precio sugerido</label>
              <input
                className="ms-input mt-1"
                type="number"
                min="0"
                placeholder="Sin precio"
                value={precioSugerido}
                onChange={(e) => setPrecioSugerido(e.target.value)}
              />
            </div>
            <div>
              <label className="ms-label">Costo estimado</label>
              <input
                className="ms-input mt-1"
                type="number"
                min="0"
                placeholder="Sin costo"
                value={costoSugerido}
                onChange={(e) => setCostoSugerido(e.target.value)}
              />
            </div>
            <div>
              <label className="ms-label">Orden en el catálogo</label>
              <input
                className="ms-input mt-1"
                type="number"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="ms-label">Descripción</label>
            <textarea
              className="ms-textarea mt-1"
              rows={2}
              placeholder="Qué hace Mainstage cuando se vende este servicio."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div>
            <label className="ms-label">Entregables</label>
            <textarea
              className="ms-textarea mt-1"
              rows={2}
              placeholder="Ficha técnica del venue, input list conciliado, day sheet…"
              value={entregables}
              onChange={(e) => setEntregables(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="ms-label">Incluye</label>
              <textarea
                className="ms-textarea mt-1"
                rows={3}
                value={incluye}
                onChange={(e) => setIncluye(e.target.value)}
              />
            </div>
            <div>
              <label className="ms-label">No incluye</label>
              <textarea
                className="ms-textarea mt-1"
                rows={3}
                value={noIncluye}
                onChange={(e) => setNoIncluye(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#1e1e1e] flex items-center justify-between gap-2">
          <Link href="/giras/propuestas" className="ms-micro ms-link-gold">
            Ver propuestas
          </Link>
          <div className="flex gap-2">
            <button className="ms-btn-ghost" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="ms-btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : servicio ? "Guardar cambios" : "Agregar al catálogo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
