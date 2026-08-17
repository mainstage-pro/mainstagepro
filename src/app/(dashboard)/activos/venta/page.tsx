"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import { EquipoGaleria } from "@/components/EquipoGaleria";
import { CONDICION_LABEL, CONDICIONES } from "@/lib/equipo-venta-shared";

type EquipoVenta = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidadTotal: number;
  estado: string;
  precioRenta: number;
  enVenta: boolean;
  precioVenta: number | null;
  ventaCantidad: number | null;
  ventaCondicion: string | null;
  ventaDescripcion: string | null;
  ventaDesde: string | null;
  imagenUrl: string | null;
  fotos: number;
  categoria: { id: string; nombre: string; orden: number };
};

type Vendido = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  precioVenta: number | null;
  fechaVenta: string | null;
  activo: boolean;
  cantidadTotal: number;
};

type FormVenta = { precioVenta: string; ventaCantidad: string; ventaCondicion: string; ventaDescripcion: string };

const FORM_VACIO: FormVenta = { precioVenta: "", ventaCantidad: "", ventaCondicion: "USADO", ventaDescripcion: "" };

function fmx(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}
function nombreEq(eq: { marca: string | null; modelo: string | null; descripcion: string }) {
  return [eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion;
}
function fecha(s: string | null) {
  return s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

const inputCls = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] focus:outline-none";
const labelCls = "block text-[11px] uppercase tracking-wider text-[#6b7280] mb-1.5";

export default function EquiposEnVentaPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [equipos, setEquipos] = useState<EquipoVenta[]>([]);
  const [vendidos, setVendidos] = useState<Vendido[]>([]);
  const [cargando, setCargando] = useState(true);

  // Buscador de candidatos (equipo propio que aún no está a la venta)
  const [buscar, setBuscar] = useState("");
  const [candidatos, setCandidatos] = useState<EquipoVenta[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Modal de alta / edición
  const [editando, setEditando] = useState<{ equipo: EquipoVenta; nuevo: boolean } | null>(null);
  const [form, setForm] = useState<FormVenta>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  // Modal de galería
  const [galeria, setGaleria] = useState<EquipoVenta | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch("/api/equipos-venta", { cache: "no-store" });
    if (!r.ok) { toast.error("No se pudo cargar el catálogo de venta"); setCargando(false); return; }
    const d = await r.json();
    setEquipos(d.equipos ?? []);
    setVendidos(d.vendidos ?? []);
    setCargando(false);
  }, [toast]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    let cancel = false;
    setBuscando(true);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/equipos-venta?candidatos=1&q=${encodeURIComponent(buscar)}`, { cache: "no-store" });
      const d = r.ok ? await r.json() : { candidatos: [] };
      if (!cancel) { setCandidatos(d.candidatos ?? []); setBuscando(false); }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [buscar]);

  function abrirAlta(eq: EquipoVenta) {
    setForm({
      precioVenta: eq.precioVenta != null ? String(eq.precioVenta) : "",
      ventaCantidad: String(eq.cantidadTotal),
      ventaCondicion: eq.ventaCondicion ?? "USADO",
      ventaDescripcion: eq.ventaDescripcion ?? "",
    });
    setEditando({ equipo: eq, nuevo: true });
  }

  function abrirEdicion(eq: EquipoVenta) {
    setForm({
      precioVenta: eq.precioVenta != null ? String(eq.precioVenta) : "",
      ventaCantidad: eq.ventaCantidad != null ? String(eq.ventaCantidad) : String(eq.cantidadTotal),
      ventaCondicion: eq.ventaCondicion ?? "USADO",
      ventaDescripcion: eq.ventaDescripcion ?? "",
    });
    setEditando({ equipo: eq, nuevo: false });
  }

  async function guardar() {
    if (!editando) return;
    if (!form.precioVenta || Number(form.precioVenta) <= 0) { toast.error("Captura el precio de venta"); return; }
    setGuardando(true);
    const { equipo, nuevo } = editando;
    const r = await fetch(nuevo ? "/api/equipos-venta" : `/api/equipos-venta/${equipo.id}`, {
      method: nuevo ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(nuevo ? { equipoId: equipo.id } : {}), ...form }),
    });
    setGuardando(false);
    if (!r.ok) { toast.error((await r.json().catch(() => ({}))).error ?? "No se pudo guardar"); return; }
    toast.success(nuevo ? "Equipo puesto a la venta" : "Datos de venta actualizados");
    setEditando(null);
    await cargar();
    setCandidatos((c) => c.filter((x) => x.id !== equipo.id));
  }

  async function quitar(eq: EquipoVenta) {
    const ok = await confirm({
      title: "Quitar de la venta",
      message: `${nombreEq(eq)} dejará de aparecer en la presentación de venta. Sigue igual en inventario.`,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const r = await fetch(`/api/equipos-venta/${eq.id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("No se pudo quitar"); return; }
    toast.success("Quitado del catálogo de venta");
    await cargar();
  }

  async function marcarVendido(eq: EquipoVenta) {
    const ofrecidas = eq.ventaCantidad ?? eq.cantidadTotal;
    const baja = ofrecidas >= eq.cantidadTotal;
    const ok = await confirm({
      title: "Registrar venta",
      message: baja
        ? `Se venden las ${eq.cantidadTotal} unidad(es) de ${nombreEq(eq)}. El equipo se da de baja del inventario en este momento.`
        : `Se venden ${ofrecidas} de ${eq.cantidadTotal} unidades de ${nombreEq(eq)}. Quedan ${eq.cantidadTotal - ofrecidas} en inventario.`,
      confirmText: "Registrar venta",
      danger: true,
    });
    if (!ok) return;
    const r = await fetch(`/api/equipos-venta/${eq.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "vendido", cantidad: ofrecidas }),
    });
    if (!r.ok) { toast.error("No se pudo registrar la venta"); return; }
    const d = await r.json();
    toast.success(d.baja ? "Vendido — equipo dado de baja del inventario" : `Vendido — quedan ${d.restantes} en inventario`);
    await cargar();
  }

  // Los candidatos llegan ordenados por categoría, así que basta agrupar en secuencia.
  const candidatosPorCategoria = useMemo(() => {
    const grupos: { nombre: string; items: EquipoVenta[] }[] = [];
    for (const eq of candidatos) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.nombre === eq.categoria.nombre) ultimo.items.push(eq);
      else grupos.push({ nombre: eq.categoria.nombre, items: [eq] });
    }
    return grupos;
  }, [candidatos]);

  const kpis = useMemo(() => {
    const piezas = equipos.reduce((s, e) => s + (e.ventaCantidad ?? e.cantidadTotal), 0);
    const valor = equipos.reduce((s, e) => s + (e.precioVenta ?? 0) * (e.ventaCantidad ?? e.cantidadTotal), 0);
    const sinFoto = equipos.filter((e) => e.fotos === 0).length;
    return { piezas, valor, sinFoto };
  }, [equipos]);

  return (
    <div className="space-y-6 pb-24">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Equipos en venta</h1>
          <p className="text-[#6b7280] text-sm mt-1 max-w-2xl">
            Equipo propio que ofertamos a la venta. Mientras esté aquí sigue disponible y cotizable en inventario;
            al registrar la venta se da de baja en ese momento.
          </p>
        </div>
        <Link
          href="/presentacion/venta"
          target="_blank"
          className="px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          Ver presentación de venta ↗
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Equipos en venta", valor: String(equipos.length) },
          { label: "Piezas ofertadas", valor: String(kpis.piezas) },
          { label: "Valor ofertado", valor: fmx(kpis.valor) },
          { label: "Sin foto pública", valor: String(kpis.sinFoto) },
        ].map((k) => (
          <div key={k.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#6b7280]">{k.label}</p>
            <p className="text-white text-2xl font-semibold mt-1 tabular-nums">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Poner a la venta */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
        <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Poner a la venta</h2>
        <p className="text-[11px] text-[#555] mt-1 mb-3">
          Todo el equipo propio activo que aún no está a la venta, por categoría.
          {candidatos.length > 0 && ` ${candidatos.length} equipo(s) en ${candidatosPorCategoria.length} categoría(s).`}
        </p>
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por descripción, marca o modelo…"
          className={inputCls}
        />
        <div className="mt-3 max-h-[30rem] overflow-y-auto">
          {buscando && candidatos.length === 0 && <p className="text-[#555] text-xs py-4">Buscando…</p>}
          {!buscando && candidatos.length === 0 && <p className="text-[#555] text-xs py-4">Sin resultados.</p>}
          {candidatosPorCategoria.map((grupo) => (
            <div key={grupo.nombre} className="mt-4 first:mt-0">
              <div className="flex items-center gap-3 mb-1 sticky top-0 bg-[#0d0d0d] py-1.5">
                <h3 className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{grupo.nombre}</h3>
                <span className="text-[#333] text-[10px]">({grupo.items.length})</span>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
              </div>
              <div className="divide-y divide-[#161616]">
                {grupo.items.map((eq) => (
                  <div key={eq.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-10 h-10 rounded-lg bg-[#050505] border border-[#1a1a1a] shrink-0 overflow-hidden flex items-center justify-center">
                      {eq.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={eq.imagenUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[9px] text-[#333]">sin foto</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm truncate">{nombreEq(eq)}</p>
                      <p className="text-[#6b7280] text-[11px] truncate">
                        {eq.cantidadTotal} unidad(es) · renta {fmx(eq.precioRenta)}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirAlta(eq)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1a1a1a] hover:bg-[#B3985B] hover:text-black text-white transition-colors shrink-0"
                    >
                      Poner a la venta
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catálogo de venta */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Catálogo de venta</h2>
        </div>
        {cargando ? (
          <p className="text-[#555] text-xs p-5">Cargando…</p>
        ) : equipos.length === 0 ? (
          <p className="text-[#555] text-xs p-5">Aún no hay equipo a la venta.</p>
        ) : (
          <div className="divide-y divide-[#161616]">
            {equipos.map((eq) => (
              <div key={eq.id} className="p-4 flex items-start gap-4 flex-wrap sm:flex-nowrap">
                <div className="w-14 h-14 rounded-lg bg-[#050505] border border-[#1a1a1a] shrink-0 overflow-hidden flex items-center justify-center">
                  {eq.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={eq.imagenUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-[#333]">sin foto</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium">{nombreEq(eq)}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#9ca3af] uppercase tracking-wide">
                      {CONDICION_LABEL[eq.ventaCondicion ?? "USADO"]}
                    </span>
                    {eq.fotos === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400">sin foto pública</span>
                    )}
                  </div>
                  <p className="text-[#6b7280] text-[11px] mt-0.5">
                    {eq.categoria.nombre} · {eq.ventaCantidad ?? eq.cantidadTotal} de {eq.cantidadTotal} unidad(es) · desde {fecha(eq.ventaDesde)}
                  </p>
                  {eq.ventaDescripcion && <p className="text-[#4b5563] text-[11px] mt-1 line-clamp-2">{eq.ventaDescripcion}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[#B3985B] text-lg font-semibold tabular-nums">{fmx(eq.precioVenta)}</p>
                  <p className="text-[#4b5563] text-[10px]">por unidad</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button onClick={() => setGaleria(eq)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-[#1a1a1a] hover:bg-[#242424] text-white transition-colors">
                    Fotos · {eq.fotos}
                  </button>
                  <button onClick={() => abrirEdicion(eq)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-[#1a1a1a] hover:bg-[#242424] text-white transition-colors">
                    Editar
                  </button>
                  <button onClick={() => marcarVendido(eq)} className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 hover:text-white transition-colors">
                    Vendido
                  </button>
                  <button onClick={() => quitar(eq)} className="px-2.5 py-1.5 text-[11px] rounded-lg text-[#6b7280] hover:text-red-400 transition-colors">
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de ventas */}
      {vendidos.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a]">
            <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Vendidos</h2>
          </div>
          <div className="divide-y divide-[#161616]">
            {vendidos.map((v) => (
              <div key={v.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                <span className="text-white flex-1 min-w-0 truncate">{nombreEq(v)}</span>
                <span className="text-[#6b7280] text-[11px] shrink-0">{fecha(v.fechaVenta)}</span>
                <span className="text-[#B3985B] tabular-nums text-xs shrink-0 w-24 text-right">{fmx(v.precioVenta)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${v.activo ? "bg-[#1a1a1a] text-[#9ca3af]" : "bg-red-900/40 text-red-400"}`}>
                  {v.activo ? `quedan ${v.cantidadTotal}` : "dado de baja"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal alta / edición */}
      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando ? (editando.nuevo ? `Poner a la venta · ${nombreEq(editando.equipo)}` : `Editar venta · ${nombreEq(editando.equipo)}`) : ""}
        maxWidth="max-w-xl"
      >
        {editando && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Precio de venta por unidad</label>
                <input
                  type="number"
                  value={form.precioVenta}
                  onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Unidades a la venta (de {editando.equipo.cantidadTotal})</label>
                <input
                  type="number"
                  min={1}
                  max={editando.equipo.cantidadTotal}
                  value={form.ventaCantidad}
                  onChange={(e) => setForm({ ...form, ventaCantidad: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Condición</label>
              <select value={form.ventaCondicion} onChange={(e) => setForm({ ...form, ventaCondicion: e.target.value })} className={inputCls}>
                {CONDICIONES.map((c) => (
                  <option key={c} value={c}>{CONDICION_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Texto de venta (visible al comprador)</label>
              <textarea
                rows={3}
                value={form.ventaDescripcion}
                onChange={(e) => setForm({ ...form, ventaDescripcion: e.target.value })}
                placeholder="Horas de uso, accesorios incluidos, motivo de la venta, detalles a considerar…"
                className={`${inputCls} resize-y`}
              />
            </div>
            <p className="text-[11px] text-[#4b5563] leading-relaxed">
              El equipo sigue disponible en inventario y cotizable mientras esté a la venta. Al registrar la venta
              se descuentan las unidades vendidas y, si se vende completo, se da de baja de inmediato.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditando(null)} className="px-4 py-2 text-xs text-[#9ca3af] hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold rounded-lg transition-colors"
              >
                {guardando ? "Guardando…" : editando.nuevo ? "Poner a la venta" : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal galería */}
      <Modal
        open={!!galeria}
        onClose={() => { setGaleria(null); cargar(); }}
        title={galeria ? `Galería · ${nombreEq(galeria)}` : ""}
        maxWidth="max-w-3xl"
      >
        {galeria && (
          <div className="space-y-3">
            <p className="text-[11px] text-[#4b5563]">
              Las fotos marcadas como <span className="text-emerald-500">Externo</span> son las que aparecen en la
              presentación de venta. Es la misma galería del equipo en inventario.
            </p>
            <EquipoGaleria equipoId={galeria.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
