"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface CxP {
  id: string;
  tipoAcreedor: string;
  concepto: string;
  monto: number;
  fechaCompromiso: string;
  estado: string;
  notas: string | null;
  tecnico: { id: string; nombre: string; celular: string | null; rol: { nombre: string } | null } | null;
  proveedor: { id: string; nombre: string; telefono: string | null } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string } | null;
}

interface Semana {
  lunesIso: string;
  miercolesIso: string;
  totalMonto: number;
  items: CxP[];
}

type Tab = "TECNICO" | "PROVEEDOR";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function fmtFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

function fmtFechaCorta(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function isoHoy() {
  return new Date().toISOString().slice(0, 10);
}

function lunesDeSemana(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ─── Subcomponente: fila de pago ──────────────────────────────────────────────
function FilaPago({
  item,
  tab,
  onPagado,
  proyectos,
}: {
  item: CxP;
  tab: Tab;
  onPagado: () => void;
  proyectos: { id: string; nombre: string; numeroProyecto: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  // Extra form
  const [showExtra, setShowExtra] = useState(false);
  const [extraConcepto, setExtraConcepto] = useState("");
  const [extraMonto, setExtraMonto] = useState("");
  const [extraCxC, setExtraCxC] = useState(false);
  const [extraCxCConcepto, setExtraCxCConcepto] = useState("");
  const [extraCxCMonto, setExtraCxCMonto] = useState("");
  const [savingExtra, setSavingExtra] = useState(false);
  // Marcar pagado form
  const [showPagar, setShowPagar] = useState(false);
  const [pagarMonto, setPagarMonto] = useState(String(item.monto));
  const [pagando, setPagando] = useState(false);

  const nombre = tab === "TECNICO"
    ? (item.tecnico?.nombre ?? "Técnico")
    : (item.proveedor?.nombre ?? "Proveedor");
  const contacto = tab === "TECNICO"
    ? item.tecnico?.celular
    : item.proveedor?.telefono;
  const rol = tab === "TECNICO" ? item.tecnico?.rol?.nombre : null;
  const waLink = contacto
    ? `https://wa.me/52${contacto.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${nombre}! 👋 Tu pago de ${fmt(item.monto)} por "${item.concepto}" está programado para el miércoles.`)}`
    : null;

  async function marcarPagado() {
    setPagando(true);
    await fetch(`/api/cuentas-pagar/${item.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: parseFloat(pagarMonto) || item.monto }),
    });
    setPagando(false);
    setShowPagar(false);
    onPagado();
  }

  async function guardarExtra() {
    if (!extraConcepto || !extraMonto || !item.proyecto) return;
    setSavingExtra(true);
    await fetch("/api/finanzas/pagos-semana/extra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proyectoId: item.proyecto.id,
        tipoAcreedor: item.tipoAcreedor,
        tecnicoId: item.tecnico?.id ?? null,
        proveedorId: item.proveedor?.id ?? null,
        concepto: `Extra: ${extraConcepto}`,
        monto: parseFloat(extraMonto),
        crearCxC: extraCxC,
        cxcConcepto: extraCxCConcepto || `Extra cargo cliente: ${extraConcepto}`,
        cxcMonto: extraCxCMonto || extraMonto,
      }),
    });
    setSavingExtra(false);
    setShowExtra(false);
    setExtraConcepto(""); setExtraMonto(""); setExtraCxC(false);
    onPagado(); // recarga la lista
  }

  const esVencido = item.estado === "VENCIDO" || new Date(item.fechaCompromiso) < new Date();
  const estadoColor = item.estado === "LIQUIDADO" ? "text-green-400" : esVencido ? "text-red-400" : "text-yellow-400";

  return (
    <div className={`border-b border-[#1a1a1a] last:border-0 ${item.estado === "LIQUIDADO" ? "opacity-50" : ""}`}>
      {/* Fila principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar inicial */}
        <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#B3985B] text-xs font-bold shrink-0">
          {nombre.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm font-medium">{nombre}</span>
            {rol && <span className="text-[10px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{rol}</span>}
            {item.notas && (
              <span className="text-[10px] text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded">★ No contemplado</span>
            )}
          </div>
          <p className="text-gray-500 text-xs truncate">{item.concepto}</p>
          {item.proyecto && (
            <Link href={`/proyectos/${item.proyecto.id}`} className="text-[10px] text-[#B3985B]/70 hover:text-[#B3985B] transition-colors">
              {item.proyecto.numeroProyecto} — {item.proyecto.nombre}
            </Link>
          )}
        </div>

        {/* Monto + estado */}
        <div className="text-right shrink-0">
          <p className="text-white font-semibold text-sm">{fmt(item.monto)}</p>
          <p className={`text-[10px] ${estadoColor}`}>
            {item.estado === "LIQUIDADO" ? "Pagado" : item.estado === "PARCIAL" ? "Parcial" : esVencido ? "Vencido" : "Pendiente"}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors"
              title={`WhatsApp a ${nombre}`}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </a>
          )}
          <button onClick={() => setExpanded(p => !p)}
            className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-gray-400 transition-colors text-xs">
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Sección expandida */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-[#0a0a0a] border-t border-[#1a1a1a]">
          {/* Botones de acción */}
          {item.estado !== "LIQUIDADO" && (
            <div className="flex gap-2 pt-3">
              <button onClick={() => setShowPagar(p => !p)}
                className="flex-1 py-1.5 rounded-lg bg-green-800 hover:bg-green-700 text-white text-xs font-semibold transition-colors">
                ✓ Marcar pagado
              </button>
              {item.proyecto && (
                <button onClick={() => setShowExtra(p => !p)}
                  className="flex-1 py-1.5 rounded-lg bg-[#B3985B]/20 hover:bg-[#B3985B]/30 text-[#B3985B] text-xs font-semibold transition-colors border border-[#B3985B]/30">
                  + Agregar extra
                </button>
              )}
            </div>
          )}

          {/* Form: marcar pagado */}
          {showPagar && (
            <div className="bg-[#111] border border-[#222] rounded-lg p-3 space-y-2">
              <p className="text-[10px] text-[#B3985B] uppercase font-semibold tracking-wider">Registrar pago</p>
              <div className="flex gap-2 items-center">
                <span className="text-gray-500 text-xs shrink-0">Monto pagado:</span>
                <input type="number" value={pagarMonto} onChange={e => setPagarMonto(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-[#B3985B]" />
              </div>
              <button onClick={marcarPagado} disabled={pagando}
                className="w-full py-1.5 rounded-lg bg-green-800 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-40">
                {pagando ? "Guardando..." : `Confirmar pago de ${fmt(parseFloat(pagarMonto) || item.monto)}`}
              </button>
            </div>
          )}

          {/* Form: agregar extra */}
          {showExtra && (
            <div className="bg-[#111] border border-[#B3985B]/20 rounded-lg p-3 space-y-2">
              <p className="text-[10px] text-[#B3985B] uppercase font-semibold tracking-wider">Agregar extra a {nombre}</p>
              <input value={extraConcepto} onChange={e => setExtraConcepto(e.target.value)}
                placeholder="Concepto del extra (ej: bono por evento largo)"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
              <div className="flex gap-2">
                <input type="number" value={extraMonto} onChange={e => setExtraMonto(e.target.value)}
                  placeholder="Monto del extra"
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
              </div>
              {/* Opción CxC */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={extraCxC} onChange={e => setExtraCxC(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#B3985B]" />
                <span className="text-xs text-gray-400">Cargar este extra al cliente (crear CxC)</span>
              </label>
              {extraCxC && (
                <div className="flex gap-2 pl-5">
                  <input value={extraCxCConcepto} onChange={e => setExtraCxCConcepto(e.target.value)}
                    placeholder="Concepto para el cliente..."
                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                  <input type="number" value={extraCxCMonto} onChange={e => setExtraCxCMonto(e.target.value)}
                    placeholder={extraMonto || "Monto"}
                    className="w-24 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs text-right focus:outline-none focus:border-[#B3985B]" />
                </div>
              )}
              <button onClick={guardarExtra} disabled={savingExtra || !extraConcepto || !extraMonto}
                className="w-full py-1.5 rounded-lg bg-[#B3985B] text-black text-xs font-semibold disabled:opacity-40">
                {savingExtra ? "Guardando..." : "Guardar extra"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponente: form de no contemplado ────────────────────────────────────
function FormNoContemplado({
  tab,
  proyectos,
  tecnicos,
  proveedores,
  onGuardado,
}: {
  tab: Tab;
  proyectos: { id: string; nombre: string; numeroProyecto: string }[];
  tecnicos: { id: string; nombre: string; rol: { nombre: string } | null }[];
  proveedores: { id: string; nombre: string }[];
  onGuardado: () => void;
}) {
  const [show, setShow] = useState(false);
  const [proyectoId, setProyectoId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [nombreLibre, setNombreLibre] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [crearCxC, setCrearCxC] = useState(false);
  const [saving, setSaving] = useState(false);

  async function guardar() {
    if (!proyectoId || !concepto || !monto) return;
    setSaving(true);
    await fetch("/api/finanzas/pagos-semana/extra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proyectoId,
        tipoAcreedor: tab,
        tecnicoId: tab === "TECNICO" ? (tecnicoId || null) : null,
        proveedorId: tab === "PROVEEDOR" ? (proveedorId || null) : null,
        nombreLibre: (!tecnicoId && !proveedorId) ? nombreLibre : undefined,
        concepto,
        monto: parseFloat(monto),
        crearCxC,
        cxcConcepto: `Cargo adicional: ${concepto}`,
        cxcMonto: monto,
      }),
    });
    setSaving(false);
    setShow(false);
    setProyectoId(""); setTecnicoId(""); setProveedorId(""); setNombreLibre(""); setConcepto(""); setMonto(""); setCrearCxC(false);
    onGuardado();
  }

  return (
    <div className="bg-[#0d0d0d] border border-dashed border-[#333] rounded-xl p-4">
      <button onClick={() => setShow(p => !p)}
        className="w-full flex items-center gap-2 text-gray-500 hover:text-[#B3985B] transition-colors text-sm">
        <span className="text-lg leading-none">+</span>
        <span>Agregar {tab === "TECNICO" ? "técnico" : "proveedor"} no contemplado en cotización</span>
      </button>

      {show && (
        <div className="mt-4 space-y-3">
          <p className="text-[10px] text-[#B3985B] uppercase font-semibold tracking-wider">
            {tab === "TECNICO" ? "Técnico no contemplado" : "Proveedor no contemplado"}
          </p>

          {/* Proyecto */}
          <select value={proyectoId} onChange={e => setProyectoId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
            <option value="">— Selecciona el proyecto *</option>
            {proyectos.map(p => (
              <option key={p.id} value={p.id}>{p.numeroProyecto} — {p.nombre}</option>
            ))}
          </select>

          {/* Persona / proveedor */}
          {tab === "TECNICO" ? (
            <div className="flex gap-2">
              <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">— Selecciona técnico (o escribe abajo) —</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}{t.rol ? ` · ${t.rol.nombre}` : ""}</option>
                ))}
              </select>
            </div>
          ) : (
            <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              <option value="">— Selecciona proveedor (o escribe abajo) —</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}

          {/* Nombre libre si no está en catálogo */}
          {((tab === "TECNICO" && !tecnicoId) || (tab === "PROVEEDOR" && !proveedorId)) && (
            <input value={nombreLibre} onChange={e => setNombreLibre(e.target.value)}
              placeholder={`Nombre del ${tab === "TECNICO" ? "técnico" : "proveedor"} (si no está en catálogo)`}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          )}

          {/* Concepto y monto */}
          <div className="flex gap-2">
            <input value={concepto} onChange={e => setConcepto(e.target.value)}
              placeholder="Concepto / descripción del servicio *"
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="Monto *"
              className="w-32 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm text-right focus:outline-none focus:border-[#B3985B]" />
          </div>

          {/* CxC */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={crearCxC} onChange={e => setCrearCxC(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[#B3985B]" />
            <span className="text-xs text-gray-400">Reflejar como cargo adicional al cliente (crear CxC)</span>
          </label>

          <div className="flex gap-2">
            <button onClick={guardar} disabled={saving || !proyectoId || !concepto || !monto}
              className="flex-1 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">
              {saving ? "Guardando..." : "Registrar pago + gasto"}
            </button>
            <button onClick={() => setShow(false)} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PagosSemanaPage() {
  const [tab, setTab] = useState<Tab>("TECNICO");
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [loading, setLoading] = useState(true);
  const [semanaSelIdx, setSemanaSelIdx] = useState(0);
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string; numeroProyecto: string }[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string; rol: { nombre: string } | null }[]>([]);
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);

  async function cargar() {
    setLoading(true);
    const [semRes, provRes, tecRes] = await Promise.all([
      fetch("/api/finanzas/pagos-semana"),
      fetch("/api/proveedores"),
      fetch("/api/tecnicos"),
    ]);
    const [semData, provData, tecData] = await Promise.all([semRes.json(), provRes.json(), tecRes.json()]);
    const semanasData: Semana[] = semData.semanas ?? [];
    setSemanas(semanasData);
    setProveedores(provData.proveedores ?? []);
    setTecnicos(tecData.tecnicos ?? []);

    // Detectar semana actual
    const hoy = isoHoy();
    const lunesHoy = lunesDeSemana(hoy);
    const idx = semanasData.findIndex(s => s.lunesIso === lunesHoy);
    setSemanaSelIdx(idx >= 0 ? idx : 0);
    setLoading(false);
  }

  async function cargarProyectos() {
    const res = await fetch("/api/proyectos");
    const data = await res.json();
    setProyectos(data.proyectos?.map((p: { id: string; nombre: string; numeroProyecto: string }) => ({
      id: p.id, nombre: p.nombre, numeroProyecto: p.numeroProyecto,
    })) ?? []);
  }

  useEffect(() => {
    cargar();
    cargarProyectos();
  }, []);

  const semanaSel = semanas[semanaSelIdx];

  // Filtrar items por tab
  const itemsFiltrados = semanaSel?.items.filter(i => i.tipoAcreedor === tab) ?? [];

  // KPIs globales
  const todosPendientes = semanas.flatMap(s => s.items).filter(i => i.tipoAcreedor === tab);
  const totalPendiente = todosPendientes.reduce((s, i) => s + i.monto, 0);
  const hoy = isoHoy();
  const vencidos = todosPendientes.filter(i => new Date(i.fechaCompromiso) < new Date() && i.estado !== "LIQUIDADO");
  const totalVencido = vencidos.reduce((s, i) => s + i.monto, 0);

  // Próximos miércoles para navegación
  const miercolesActual = semanaSel?.miercolesIso;
  const esSemanaCurrent = semanaSel?.lunesIso === lunesDeSemana(hoy);

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Pagos de la Semana</h1>
          <p className="text-[#6b7280] text-sm">Pagos los miércoles · personal y proveedores</p>
        </div>
        <Link href="/finanzas/cxp" className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">
          Ver todas las CxP →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 w-fit">
        {(["TECNICO", "PROVEEDOR"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"}`}>
            {t === "TECNICO" ? "Personal" : "Proveedores"}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Total pendiente</p>
          <p className="text-white text-xl font-semibold">{fmt(totalPendiente)}</p>
          <p className="text-gray-600 text-xs mt-0.5">{todosPendientes.length} pagos</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Vencidos</p>
          <p className={`text-xl font-semibold ${totalVencido > 0 ? "text-red-400" : "text-green-400"}`}>
            {totalVencido > 0 ? fmt(totalVencido) : "Al día ✓"}
          </p>
          <p className="text-gray-600 text-xs mt-0.5">{vencidos.length} vencidos</p>
        </div>
        {miercolesActual && (
          <div className="bg-[#0a0a0a] border border-[#B3985B]/30 rounded-xl p-4">
            <p className="text-[#B3985B] text-xs uppercase tracking-wider mb-1">Próximo miércoles</p>
            <p className="text-white text-sm font-semibold">{fmtFechaCorta(miercolesActual)}</p>
            <p className="text-[#B3985B] text-xs mt-0.5">{fmt(itemsFiltrados.reduce((s, i) => s + i.monto, 0))}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-600 text-sm">Cargando...</div>
      ) : semanas.length === 0 ? (
        <div className="py-10 text-center text-gray-600 text-sm">No hay pagos pendientes</div>
      ) : (
        <>
          {/* Navegación de semanas */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="flex border-b border-[#1a1a1a] overflow-x-auto">
              {semanas.map((s, idx) => {
                const esCurrent = s.lunesIso === lunesDeSemana(hoy);
                const itemsTab = s.items.filter(i => i.tipoAcreedor === tab);
                const total = itemsTab.reduce((acc, i) => acc + i.monto, 0);
                const tieneVencidos = itemsTab.some(i => new Date(i.fechaCompromiso) < new Date() && i.estado !== "LIQUIDADO");
                return (
                  <button key={s.lunesIso} onClick={() => setSemanaSelIdx(idx)}
                    className={`flex flex-col items-center px-4 py-3 text-xs shrink-0 border-b-2 transition-colors ${
                      semanaSelIdx === idx ? "border-[#B3985B] text-[#B3985B]" : "border-transparent text-gray-500 hover:text-white"
                    }`}>
                    <span className="font-medium">
                      {esCurrent ? "Esta semana" : `Mié ${fmtFechaCorta(s.miercolesIso)}`}
                    </span>
                    <span className={`text-[10px] mt-0.5 ${tieneVencidos ? "text-red-400" : ""}`}>
                      {itemsTab.length > 0 ? `${fmt(total)} · ${itemsTab.length}p` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Header de semana seleccionada */}
            {semanaSel && (
              <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d0d]">
                <div>
                  <p className="text-white text-sm font-semibold">
                    Miércoles {fmtFecha(semanaSel.miercolesIso)}
                    {esSemanaCurrent && (
                      <span className="ml-2 text-[10px] bg-[#B3985B]/20 text-[#B3985B] px-2 py-0.5 rounded-full">Esta semana</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {itemsFiltrados.length} pagos · {fmt(itemsFiltrados.reduce((s, i) => s + i.monto, 0))}
                  </p>
                </div>
              </div>
            )}

            {/* Lista de pagos */}
            {itemsFiltrados.length === 0 ? (
              <div className="py-8 text-center text-gray-600 text-sm">
                Sin pagos de {tab === "TECNICO" ? "personal" : "proveedores"} esta semana
              </div>
            ) : (
              <div>
                {itemsFiltrados.map(item => (
                  <FilaPago
                    key={item.id}
                    item={item}
                    tab={tab}
                    onPagado={cargar}
                    proyectos={proyectos}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sección: no contemplados */}
          <FormNoContemplado
            tab={tab}
            proyectos={proyectos}
            tecnicos={tecnicos}
            proveedores={proveedores}
            onGuardado={cargar}
          />
        </>
      )}
    </div>
  );
}
