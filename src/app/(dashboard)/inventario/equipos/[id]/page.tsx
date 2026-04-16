"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/30 text-green-400 border-green-800/40",
  EN_MANTENIMIENTO: "bg-yellow-900/30 text-yellow-400 border-yellow-800/40",
  DADO_DE_BAJA: "bg-red-900/30 text-red-400 border-red-800/40",
};

const TIPO_BADGE: Record<string, string> = {
  PROPIO: "bg-blue-900/30 text-blue-400 border-blue-800/40",
  EXTERNO: "bg-orange-900/30 text-orange-400 border-orange-800/40",
};

const MANT_BADGE: Record<string, string> = {
  PREVENTIVO: "bg-blue-900/30 text-blue-400",
  CORRECTIVO: "bg-red-900/30 text-red-400",
  ESTETICO: "bg-purple-900/30 text-purple-400",
  FUNCIONAL: "bg-green-900/30 text-green-400",
};

type Equipo = {
  id: string; descripcion: string; marca: string | null; modelo: string | null;
  tipo: string; estado: string; precioRenta: number; costoProveedor: number | null;
  cantidadTotal: number; notas: string | null; activo: boolean;
  amperajeRequerido: number | null; voltajeRequerido: number | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; correo: string | null; telefono: string | null } | null;
  mantenimientos: { id: string; fecha: string; tipo: string; accionRealizada: string; estadoEquipo: string | null; comentarios: string | null; proximoMantenimiento: string | null }[];
  proyectoEquipos: { id: string; cantidad: number; proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string | null; estado: string; cliente: { nombre: string } } }[];
  unidades: { id: string; codigoInterno: string | null; serie: string | null; estado: string; notas: string | null }[];
};

type EditForm = {
  descripcion: string; marca: string; modelo: string; tipo: string; estado: string;
  precioRenta: string; costoProveedor: string; cantidadTotal: string;
  notas: string; amperajeRequerido: string; voltajeRequerido: string;
};

export default function EquipoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [tab, setTab] = useState<"historial" | "proyectos" | "unidades">("historial");

  async function load() {
    const res = await fetch(`/api/equipos/${id}`);
    const d = await res.json();
    if (d.equipo) {
      setEquipo(d.equipo);
      setForm({
        descripcion: d.equipo.descripcion,
        marca: d.equipo.marca ?? "",
        modelo: d.equipo.modelo ?? "",
        tipo: d.equipo.tipo,
        estado: d.equipo.estado,
        precioRenta: String(d.equipo.precioRenta),
        costoProveedor: d.equipo.costoProveedor !== null ? String(d.equipo.costoProveedor) : "",
        cantidadTotal: String(d.equipo.cantidadTotal),
        notas: d.equipo.notas ?? "",
        amperajeRequerido: d.equipo.amperajeRequerido !== null ? String(d.equipo.amperajeRequerido) : "",
        voltajeRequerido: d.equipo.voltajeRequerido !== null ? String(d.equipo.voltajeRequerido) : "",
      });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function guardar() {
    if (!form) return;
    setSaving(true);
    const res = await fetch(`/api/equipos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { toast.success("Equipo actualizado"); setEditing(false); await load(); }
    else toast.error("Error al guardar");
  }

  async function eliminar() {
    const ok = await confirm({ message: `¿Eliminar "${equipo?.descripcion}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const res = await fetch(`/api/equipos/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Equipo eliminado"); router.push("/inventario/equipos"); }
    else toast.error("No se puede eliminar — puede tener registros asociados");
  }

  if (loading) return <div className="p-6 text-gray-600 text-sm">Cargando...</div>;
  if (!equipo || !form) return <div className="p-6 text-red-400 text-sm">Equipo no encontrado</div>;

  // Estadísticas de uso
  const veces = equipo.proyectoEquipos.length;
  const ultimoUso = equipo.proyectoEquipos[0]?.proyecto.fechaEvento;
  const margen = equipo.costoProveedor && equipo.costoProveedor > 0
    ? ((equipo.precioRenta - equipo.costoProveedor) / equipo.precioRenta * 100).toFixed(1)
    : null;

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/inventario/equipos" className="text-xs text-gray-500 hover:text-gray-300">← Inventario</Link>
          </div>
          <h1 className="text-2xl font-bold text-white">{equipo.descripcion}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-gray-400 text-sm">{equipo.marca}{equipo.modelo ? ` · ${equipo.modelo}` : ""}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${TIPO_BADGE[equipo.tipo] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>{equipo.tipo}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${ESTADO_BADGE[equipo.estado] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>{equipo.estado.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-2 text-sm text-gray-400 border border-[#333] rounded-lg hover:text-white">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-4 py-2 text-sm bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#c9a96a] disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm bg-[#1a1a1a] border border-[#333] text-white rounded-lg hover:bg-[#222]">Editar</button>
              <button onClick={eliminar} className="px-4 py-2 text-sm bg-red-900/20 border border-red-800/40 text-red-400 rounded-lg hover:bg-red-900/30">Eliminar</button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Precio renta</p>
          <p className="text-white font-bold text-lg">{fmt(equipo.precioRenta)}</p>
          {equipo.precioRenta === 0 && <p className="text-gray-600 text-[10px]">Incluido</p>}
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Costo proveedor</p>
          <p className="text-white font-bold text-lg">{equipo.costoProveedor !== null ? fmt(equipo.costoProveedor) : "—"}</p>
          {margen && <p className="text-green-400 text-[10px]">{margen}% margen</p>}
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Cantidad total</p>
          <p className="text-white font-bold text-lg">{equipo.cantidadTotal}</p>
          <p className="text-gray-600 text-[10px]">unidades</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Usos en proyectos</p>
          <p className="text-white font-bold text-lg">{veces}</p>
          {ultimoUso && <p className="text-gray-600 text-[10px]">último: {fmtDate(ultimoUso)}</p>}
        </div>
      </div>

      {/* Formulario de edición */}
      {editing && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5">
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-4">Editando equipo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Descripción *</label>
              <input value={form.descripcion} onChange={e => setForm(f => f ? {...f, descripcion: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Marca</label>
              <input value={form.marca} onChange={e => setForm(f => f ? {...f, marca: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Modelo</label>
              <input value={form.modelo} onChange={e => setForm(f => f ? {...f, modelo: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => f ? {...f, tipo: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="PROPIO">Propio</option>
                <option value="EXTERNO">Externo</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => f ? {...f, estado: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="ACTIVO">Activo</option>
                <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                <option value="DADO_DE_BAJA">Dado de baja</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Precio renta</label>
              <input type="number" value={form.precioRenta} onChange={e => setForm(f => f ? {...f, precioRenta: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Costo proveedor</label>
              <input type="number" value={form.costoProveedor} onChange={e => setForm(f => f ? {...f, costoProveedor: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Cantidad total</label>
              <input type="number" value={form.cantidadTotal} onChange={e => setForm(f => f ? {...f, cantidadTotal: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Amperaje (A)</label>
              <input type="number" value={form.amperajeRequerido} onChange={e => setForm(f => f ? {...f, amperajeRequerido: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Voltaje (V)</label>
              <input type="number" value={form.voltajeRequerido} onChange={e => setForm(f => f ? {...f, voltajeRequerido: e.target.value} : f)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Notas</label>
              <textarea value={form.notas} onChange={e => setForm(f => f ? {...f, notas: e.target.value} : f)} rows={2}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
          </div>
        </div>
      )}

      {/* Info básica */}
      {!editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Información</p>
            <Row label="Categoría" value={equipo.categoria.nombre} />
            <Row label="Tipo" value={equipo.tipo} />
            <Row label="Estado" value={equipo.estado.replace(/_/g, " ")} />
            {equipo.amperajeRequerido && <Row label="Amperaje" value={`${equipo.amperajeRequerido}A`} />}
            {equipo.voltajeRequerido && <Row label="Voltaje" value={`${equipo.voltajeRequerido}V`} />}
            {equipo.notas && <Row label="Notas" value={equipo.notas} />}
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Proveedor</p>
            {equipo.proveedorDefault ? (
              <>
                <Row label="Nombre" value={equipo.proveedorDefault.nombre} />
                {equipo.proveedorDefault.telefono && <Row label="Teléfono" value={equipo.proveedorDefault.telefono} />}
                {equipo.proveedorDefault.correo && <Row label="Correo" value={equipo.proveedorDefault.correo} />}
              </>
            ) : <p className="text-gray-600 text-xs">Sin proveedor asignado</p>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-[#1e1e1e] mb-4">
          {(["historial", "proyectos", "unidades"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-[#B3985B] text-[#B3985B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {t === "historial" ? `Mantenimientos (${equipo.mantenimientos.length})` : t === "proyectos" ? `Proyectos (${equipo.proyectoEquipos.length})` : `Unidades (${equipo.unidades.length})`}
            </button>
          ))}
        </div>

        {tab === "historial" && (
          <div className="space-y-2">
            {equipo.mantenimientos.length === 0 ? (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
                <p className="text-gray-600 text-sm">Sin registros de mantenimiento</p>
                <Link href="/inventario/mantenimiento" className="text-[#B3985B] text-xs hover:underline mt-1 block">Registrar mantenimiento →</Link>
              </div>
            ) : equipo.mantenimientos.map(m => (
              <div key={m.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${MANT_BADGE[m.tipo] ?? "bg-gray-800 text-gray-400"}`}>{m.tipo}</span>
                    <span className="text-gray-400 text-xs">{fmtDate(m.fecha)}</span>
                  </div>
                  {m.proximoMantenimiento && (
                    <span className="text-yellow-400 text-[10px]">próx: {fmtDate(m.proximoMantenimiento)}</span>
                  )}
                </div>
                <p className="text-white text-sm">{m.accionRealizada}</p>
                {m.estadoEquipo && <p className="text-gray-500 text-xs mt-0.5">Estado: {m.estadoEquipo}</p>}
                {m.comentarios && <p className="text-gray-500 text-xs mt-0.5">{m.comentarios}</p>}
              </div>
            ))}
            <div className="text-center pt-2">
              <Link href="/inventario/mantenimiento" className="text-[#B3985B] text-xs hover:underline">+ Registrar mantenimiento</Link>
            </div>
          </div>
        )}

        {tab === "proyectos" && (
          <div className="space-y-2">
            {equipo.proyectoEquipos.length === 0 ? (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
                <p className="text-gray-600 text-sm">Sin historial de proyectos</p>
              </div>
            ) : equipo.proyectoEquipos.map(pe => {
              const p = pe.proyecto;
              const ESTADO_C: Record<string, string> = {
                PLANEACION: "text-blue-400", CONFIRMADO: "text-green-400",
                EN_CURSO: "text-yellow-400", COMPLETADO: "text-gray-400", CANCELADO: "text-red-400",
              };
              return (
                <Link key={pe.id} href={`/proyectos/${p.id}`}
                  className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] hover:border-[#B3985B]/30 rounded-xl px-4 py-3 transition-colors">
                  <div>
                    <p className="text-white text-sm font-medium">{p.nombre}</p>
                    <p className="text-gray-500 text-xs">{p.cliente.nombre} · {p.numeroProyecto}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-xs font-semibold ${ESTADO_C[p.estado] ?? "text-gray-400"}`}>{p.estado}</p>
                    <p className="text-gray-600 text-xs">{fmtDate(p.fechaEvento)} · ×{pe.cantidad}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {tab === "unidades" && (
          <div className="space-y-2">
            {equipo.unidades.length === 0 ? (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
                <p className="text-gray-600 text-sm">Sin unidades individuales registradas</p>
                <p className="text-gray-700 text-xs mt-1">Las unidades permiten rastrear números de serie y estado de cada pieza</p>
              </div>
            ) : equipo.unidades.map(u => (
              <div key={u.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{u.codigoInterno ?? "Sin código"}</p>
                    {u.serie && <p className="text-gray-500 text-xs">Serie: {u.serie}</p>}
                    {u.notas && <p className="text-gray-500 text-xs">{u.notas}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${ESTADO_BADGE[u.estado] ?? "bg-gray-800 text-gray-400 border-gray-700"} border`}>{u.estado}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 text-xs shrink-0">{label}</span>
      <span className="text-gray-300 text-xs text-right">{value}</span>
    </div>
  );
}
