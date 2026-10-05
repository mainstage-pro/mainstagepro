"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { coincide } from "@/lib/buscar";
import { useToast } from "@/components/Toast";
import { iconoServicio, ICONO_SERVICIO_OPCIONES } from "@/lib/servicio-iconos";
import {
  CATEGORIAS_SERVICIO,
  CATEGORIA_SERVICIO_LABEL,
  NIVELES_SERVICIO,
  NIVEL_SERVICIO_LABEL,
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
  subcategoria: string | null;
  icono: string;
  nivelServicio: string;
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

/** Cómo se cobra, en una línea. Es la respuesta que el catálogo debe dar de golpe. */
function metodoDeCobro(s: ServicioFila): string {
  const unidad = UNIDAD_COBRO_LABEL[s.unidadDefault] ?? s.unidadDefault;
  return s.precioSugerido != null ? `${fmtMoneda(s.precioSugerido)} ${unidad}` : `Sin precio · ${unidad}`;
}

export default function ServiciosClient({ servicios }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nivel, setNivel] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [vista, setVista] = useState<"tarjetas" | "tabla">("tarjetas");
  const [ficha, setFicha] = useState<ServicioFila | null>(null);
  const [editando, setEditando] = useState<ServicioFila | null>(null);
  const [creando, setCreando] = useState(false);

  const filtrados = useMemo(
    () =>
      servicios.filter(
        (s) =>
          (verInactivos || s.activo) &&
          (!categoria || (s.categoria ?? SIN_CATEGORIA) === categoria) &&
          (!nivel || s.nivelServicio === nivel || s.nivelServicio === "AMBOS") &&
          coincide(busqueda, s.clave, s.nombre, s.descripcion, s.entregables, s.subcategoria),
      ),
    [servicios, busqueda, categoria, nivel, verInactivos],
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
    return {
      activos: activos.length,
      sinPrecio: activos.filter((s) => s.precioSugerido == null).length,
      sinAlcance: activos.filter((s) => !s.descripcion || !s.entregables).length,
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
    setFicha(null);
    router.refresh();
  }

  return (
    <div className="ms-page space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ms-h1">Catálogo de servicios</h1>
          <p className="ms-subtitle mt-1">
            Lo que vendemos cuando lo que se cobra es criterio y tiempo, no equipo. Cada servicio trae su
            alcance y su método de cobro; el precio de aquí es sugerido y cada propuesta puede moverlo.
          </p>
        </div>
        <button className="ms-btn-primary shrink-0" onClick={() => setCreando(true)}>
          Nuevo servicio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metrica titulo="Servicios activos" valor={String(totales.activos)} />
        <Metrica titulo="Sin precio sugerido" valor={String(totales.sinPrecio)} />
        <Metrica titulo="Sin alcance escrito" valor={String(totales.sinAlcance)} />
        <Metrica titulo="Usos en propuestas" valor={String(totales.usos)} dorado />
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          className="ms-input-search flex-1"
          placeholder="Buscar por clave, nombre o entregable…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className={nivel ? "ms-filter-select-active" : "ms-filter-select"}
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
        >
          <option value="">Giras y eventos</option>
          <option value="GIRA">{NIVEL_SERVICIO_LABEL.GIRA}</option>
          <option value="EVENTO">{NIVEL_SERVICIO_LABEL.EVENTO}</option>
        </select>
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
        <button
          className="ms-filter-select"
          onClick={() => setVista((v) => (v === "tarjetas" ? "tabla" : "tarjetas"))}
        >
          {vista === "tarjetas" ? "Ver como lista" : "Ver como tarjetas"}
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

              {vista === "tarjetas" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {lista.map((s) => (
                    <TarjetaServicio key={s.id} servicio={s} onAbrir={() => setFicha(s)} />
                  ))}
                </div>
              ) : (
                <div className="ms-table-wrapper overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead className="ms-thead">
                      <tr>
                        <th className="ms-th text-left">Servicio</th>
                        <th className="ms-th text-left">Se vende en</th>
                        <th className="ms-th text-left">Tipo de línea</th>
                        <th className="ms-th text-left">Se cobra</th>
                        <th className="ms-th text-right">Costo</th>
                        <th className="ms-th text-right">Usos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((s) => {
                        const Icono = iconoServicio(s.icono);
                        return (
                          <tr
                            key={s.id}
                            className={`ms-tr cursor-pointer ${s.activo ? "" : "opacity-50"}`}
                            onClick={() => setFicha(s)}
                          >
                            <td className="ms-td">
                              <div className="flex items-center gap-2.5">
                                <Icono className="w-4 h-4 text-[#B3985B] shrink-0" />
                                <div>
                                  <div className="text-white text-[13px]">{s.nombre}</div>
                                  <div className="ms-micro font-mono text-[#6b7280]">{s.clave}</div>
                                </div>
                              </div>
                            </td>
                            <td className="ms-td text-[#9ca3af] text-[13px]">
                              {NIVEL_SERVICIO_LABEL[s.nivelServicio] ?? s.nivelServicio}
                            </td>
                            <td className="ms-td text-[#9ca3af] text-[13px]">
                              {TIPO_LINEA_PROPUESTA_LABEL[s.tipoLinea] ?? s.tipoLinea}
                            </td>
                            <td
                              className={`ms-td text-[13px] ${s.precioSugerido != null ? "text-white" : "text-amber-600"}`}
                            >
                              {metodoDeCobro(s)}
                            </td>
                            <td className="ms-td text-right text-[#9ca3af] text-[13px]">
                              {s.costoSugerido != null ? fmtMoneda(s.costoSugerido) : "—"}
                            </td>
                            <td className="ms-td text-right text-[#9ca3af] text-[13px]">{s.usos}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ficha && !editando && (
        <FichaServicio
          servicio={ficha}
          onCerrar={() => setFicha(null)}
          onEditar={() => setEditando(ficha)}
          onAlternarActivo={() => void alternarActivo(ficha)}
        />
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
            setFicha(null);
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

function TarjetaServicio({ servicio, onAbrir }: { servicio: ServicioFila; onAbrir: () => void }) {
  const Icono = iconoServicio(servicio.icono);
  return (
    <button
      onClick={onAbrir}
      className={`ms-card p-4 text-left w-full hover:border-[#B3985B]/50 transition-colors ${servicio.activo ? "" : "opacity-50"}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/25 flex items-center justify-center shrink-0">
          <Icono className="w-5 h-5 text-[#B3985B]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white text-sm font-medium leading-snug">{servicio.nombre}</p>
            {!servicio.activo && <span className="ms-badge ms-badge-gray shrink-0">Inactivo</span>}
          </div>
          <p className="ms-micro font-mono text-[#6b7280] mt-0.5">{servicio.clave}</p>
          {servicio.descripcion && (
            <p className="ms-meta mt-1.5 line-clamp-2">{servicio.descripcion}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#9ca3af]">
          {NIVEL_SERVICIO_LABEL[servicio.nivelServicio] ?? servicio.nivelServicio}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#9ca3af]">
          {TIPO_LINEA_PROPUESTA_LABEL[servicio.tipoLinea] ?? servicio.tipoLinea}
        </span>
        {servicio.subcategoria && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#9ca3af]">
            {servicio.subcategoria}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2 mt-3 pt-3 border-t border-[#1a1a1a]">
        <p className={`text-[13px] ${servicio.precioSugerido != null ? "text-white" : "text-amber-600"}`}>
          {metodoDeCobro(servicio)}
        </p>
        <p className="ms-micro text-[#6b7280] shrink-0">
          {servicio.usos} uso{servicio.usos === 1 ? "" : "s"}
        </p>
      </div>
    </button>
  );
}

function FichaServicio({
  servicio,
  onCerrar,
  onEditar,
  onAlternarActivo,
}: {
  servicio: ServicioFila;
  onCerrar: () => void;
  onEditar: () => void;
  onAlternarActivo: () => void;
}) {
  const Icono = iconoServicio(servicio.icono);
  return (
    <div className="ms-modal-overlay bg-black/70" onClick={onCerrar}>
      <div className="ms-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-[#1e1e1e] flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/25 flex items-center justify-center shrink-0">
            <Icono className="w-6 h-6 text-[#B3985B]" />
          </div>
          <div className="min-w-0">
            <h2 className="ms-h2">{servicio.nombre}</h2>
            <p className="ms-micro font-mono text-[#6b7280] mt-0.5">{servicio.clave}</p>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Dato titulo="Se vende en" valor={NIVEL_SERVICIO_LABEL[servicio.nivelServicio] ?? servicio.nivelServicio} />
            <Dato titulo="Tipo de línea" valor={TIPO_LINEA_PROPUESTA_LABEL[servicio.tipoLinea] ?? servicio.tipoLinea} />
            <Dato
              titulo="Categoría"
              valor={
                servicio.subcategoria ??
                CATEGORIA_SERVICIO_LABEL[servicio.categoria ?? ""] ??
                "Sin categoría"
              }
            />
          </div>

          <div className="ms-card p-4 space-y-1">
            <p className="ms-label">Cómo se cobra</p>
            <p className={`text-base ${servicio.precioSugerido != null ? "text-white" : "text-amber-600"}`}>
              {metodoDeCobro(servicio)}
            </p>
            <p className="ms-micro text-[#6b7280]">
              {servicio.costoSugerido != null
                ? `Costo estimado ${fmtMoneda(servicio.costoSugerido)} · `
                : ""}
              Usado en {servicio.usos} línea{servicio.usos === 1 ? "" : "s"} de propuesta.
            </p>
          </div>

          <Bloque titulo="Qué hacemos" texto={servicio.descripcion} />
          <Bloque titulo="Entregables" texto={servicio.entregables} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Bloque titulo="Incluye" texto={servicio.incluye} />
            <Bloque titulo="No incluye" texto={servicio.noIncluye} />
          </div>
        </div>

        <div className="p-5 border-t border-[#1e1e1e] flex items-center justify-between gap-2">
          <button className="ms-btn-ghost" onClick={onAlternarActivo}>
            {servicio.activo ? "Desactivar" : "Reactivar"}
          </button>
          <div className="flex gap-2">
            <button className="ms-btn-ghost" onClick={onCerrar}>
              Cerrar
            </button>
            <button className="ms-btn-primary" onClick={onEditar}>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <p className="ms-label">{titulo}</p>
      <p className="text-[13px] text-white mt-0.5">{valor}</p>
    </div>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string | null }) {
  return (
    <div>
      <p className="ms-label">{titulo}</p>
      {texto ? (
        <p className="text-[13px] text-[#d1d5db] mt-1 whitespace-pre-line">{texto}</p>
      ) : (
        <p className="ms-micro text-amber-600 mt-1">Sin capturar.</p>
      )}
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
  const [subcategoria, setSubcategoria] = useState(servicio?.subcategoria ?? "");
  const [icono, setIcono] = useState(servicio?.icono ?? "Briefcase");
  const [nivelServicio, setNivelServicio] = useState(servicio?.nivelServicio ?? "AMBOS");
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
      subcategoria: subcategoria.trim() || null,
      icono,
      nivelServicio,
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

          <div>
            <label className="ms-label">Icono</label>
            <div className="grid grid-cols-8 sm:grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5 mt-1">
              {ICONO_SERVICIO_OPCIONES.map((nombreIcono) => {
                const Icono = iconoServicio(nombreIcono);
                const activo = icono === nombreIcono;
                return (
                  <button
                    key={nombreIcono}
                    type="button"
                    title={nombreIcono}
                    onClick={() => setIcono(nombreIcono)}
                    className={`aspect-square rounded-lg border flex items-center justify-center transition-colors ${
                      activo
                        ? "border-[#B3985B] bg-[#B3985B]/15 text-[#B3985B]"
                        : "border-[#1e1e1e] text-[#6b7280] hover:text-[#9ca3af]"
                    }`}
                  >
                    <Icono className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="ms-label">Se vende en</label>
              <select
                className="ms-input mt-1"
                value={nivelServicio}
                onChange={(e) => setNivelServicio(e.target.value)}
              >
                {NIVELES_SERVICIO.map((n) => (
                  <option key={n} value={n}>
                    {NIVEL_SERVICIO_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
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
              <label className="ms-label">Subcategoría</label>
              <input
                className="ms-input mt-1"
                placeholder="Opcional"
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="ms-label">Unidad de cobro</label>
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
            <label className="ms-label">Qué hacemos</label>
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
