"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkeletonTable } from "@/components/Skeleton";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface CxC {
  id: string;
  concepto: string;
  monto: number;
  montoCobrado: number;
  estado: string;
  tipoPago: string;
  fechaCompromiso: string;
  cliente: { id: string; nombre: string; telefono: string | null };
  proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string | null } | null;
  cotizacion: { id: string; numeroCotizacion: string } | null;
}

interface SemanaOp {
  lunesIso: string;
  miercolesIso: string;
  totalCobros: number;
  totalPagos: number;
  cobros: CxC[];
  pagos: CxP[];
}

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
  proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string; cliente: { nombre: string } | null } | null;
}

interface Semana {
  lunesIso: string;
  miercolesIso: string;
  totalMonto: number;
  items: CxP[];
}

interface GrupoPersona {
  key: string;           // tecnicoId | proveedorId | nombreLibre
  nombre: string;
  rol: string | null;
  contacto: string | null;
  items: CxP[];
  totalPendiente: number;
}

interface GrupoProyecto {
  proyectoId: string;
  proyectoNombre: string;
  proyectoNumero: string;
  fechaEvento: string | null;
  clienteNombre: string | null;
  items: CxP[];
  totalPendiente: number;
}

type Tab = "TECNICO" | "PROVEEDOR";
type Vista = "operativa" | "semana" | "elemento" | "proyecto";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}
function fmtFechaCorta(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
function fmtFechaMini(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" });
}
function isoHoy() { return new Date().toISOString().slice(0, 10); }
function lunesDeSemana(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function esVencido(item: CxP) {
  return item.estado !== "LIQUIDADO" && new Date(item.fechaCompromiso) < new Date();
}

const WA_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

// ─── Mini-form inline para confirmar cobro (CxC) ─────────────────────────────
function AccionesCobro({ item, onDone }: { item: CxC; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState(String(item.monto));
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  if (item.estado === "LIQUIDADO") return <span className="text-[10px] text-green-500">✓ Cobrado</span>;

  async function confirmar() {
    setSaving(true);
    await fetch(`/api/cuentas-cobrar/${item.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: parseFloat(monto) || item.monto, fecha }),
    });
    setSaving(false);
    setOpen(false);
    const tel = (item.cliente.telefono ?? "").replace(/\D/g, "");
    if (tel) {
      const num = tel.startsWith("52") ? tel : `52${tel}`;
      const msg = `Hola ${item.cliente.nombre.split(" ")[0]}! ✅ Confirmamos recepción de *${new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(parseFloat(monto)||item.monto)}* por concepto de ${item.concepto}. ¡Gracias! Mainstage Pro`;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    }
    onDone();
  }

  return (
    <div className="space-y-1.5">
      <button onClick={() => setOpen(p => !p)}
        className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${open ? "bg-[#B3985B] text-black" : "bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30"}`}>
        ✓ Cobrar
      </button>
      {open && (
        <div className="bg-[#111] border border-[#B3985B]/20 rounded-lg p-2.5 space-y-1.5 min-w-48">
          <div className="flex gap-1.5 items-center">
            <span className="text-[10px] text-gray-500 shrink-0">Monto:</span>
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-[#B3985B] min-w-0" />
          </div>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
          <button onClick={confirmar} disabled={saving}
            className="w-full py-1 rounded bg-[#B3985B] text-black text-[10px] font-semibold disabled:opacity-40">
            {saving ? "..." : `Confirmar ${new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(parseFloat(monto)||item.monto)}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mini-form inline para marcar pagado / extra ───────────────────────────────
function AccionesCxP({
  item,
  onDone,
}: {
  item: CxP;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<null | "pagar" | "extra">(null);
  const [pagarMonto, setPagarMonto] = useState(String(item.monto));
  const [extraConcepto, setExtraConcepto] = useState("");
  const [extraMonto, setExtraMonto] = useState("");
  const [extraCxC, setExtraCxC] = useState(false);
  const [saving, setSaving] = useState(false);

  async function marcarPagado() {
    setSaving(true);
    await fetch(`/api/cuentas-pagar/${item.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: parseFloat(pagarMonto) || item.monto }),
    });
    setSaving(false);
    setMode(null);
    // Abrir WA de confirmación si hay teléfono
    const tel = (item.tecnico?.celular ?? item.proveedor?.telefono ?? "").replace(/\D/g, "");
    const nombre = item.tecnico?.nombre ?? item.proveedor?.nombre ?? "";
    if (tel) {
      const num = tel.startsWith("52") ? tel : `52${tel}`;
      const monto = parseFloat(pagarMonto) || item.monto;
      const proyecto = item.proyecto ? `${item.proyecto.nombre} (${item.proyecto.numeroProyecto})` : "";
      const msg = `Hola ${nombre.split(" ")[0]}! 👋\n\nTe confirmamos el pago de *${new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(monto)}* correspondiente a:\n\n📋 *${item.concepto}*${proyecto ? `\n🎪 ${proyecto}` : ""}\n\n¡Gracias! 🙌 Mainstage Pro`;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    }
    onDone();
  }

  async function guardarExtra() {
    if (!extraConcepto || !extraMonto || !item.proyecto) return;
    setSaving(true);
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
        cxcConcepto: `Extra cargo cliente: ${extraConcepto}`,
        cxcMonto: extraMonto,
      }),
    });
    setSaving(false);
    setMode(null);
    setExtraConcepto(""); setExtraMonto(""); setExtraCxC(false);
    onDone();
  }

  if (item.estado === "LIQUIDADO") {
    return <span className="text-[10px] text-green-500">✓ Pagado</span>;
  }

  return (
    <div className="space-y-1.5">
      {/* Botones toggle */}
      <div className="flex gap-1">
        <button onClick={() => setMode(mode === "pagar" ? null : "pagar")}
          className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${mode === "pagar" ? "bg-green-700 text-white" : "bg-green-900/30 text-green-400 hover:bg-green-900/50"}`}>
          ✓ Pagar
        </button>
        {item.proyecto && (
          <button onClick={() => setMode(mode === "extra" ? null : "extra")}
            className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${mode === "extra" ? "bg-[#B3985B] text-black" : "bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30"}`}>
            + Extra
          </button>
        )}
      </div>

      {/* Form pagar */}
      {mode === "pagar" && (
        <div className="bg-[#111] border border-green-900/40 rounded-lg p-2.5 space-y-1.5 min-w-48">
          <div className="flex gap-1.5 items-center">
            <span className="text-[10px] text-gray-500 shrink-0">Monto:</span>
            <input type="number" value={pagarMonto} onChange={e => setPagarMonto(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-green-600 min-w-0" />
          </div>
          <button onClick={marcarPagado} disabled={saving}
            className="w-full py-1 rounded bg-green-800 hover:bg-green-700 text-white text-[10px] font-semibold disabled:opacity-40">
            {saving ? "..." : `Confirmar ${fmt(parseFloat(pagarMonto) || item.monto)}`}
          </button>
        </div>
      )}

      {/* Form extra */}
      {mode === "extra" && (
        <div className="bg-[#111] border border-[#B3985B]/20 rounded-lg p-2.5 space-y-1.5 min-w-56">
          <input value={extraConcepto} onChange={e => setExtraConcepto(e.target.value)}
            placeholder="Concepto del extra..."
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#B3985B]" />
          <input type="number" value={extraMonto} onChange={e => setExtraMonto(e.target.value)}
            placeholder="Monto"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-[10px] text-right focus:outline-none focus:border-[#B3985B]" />
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={extraCxC} onChange={e => setExtraCxC(e.target.checked)} className="accent-[#B3985B]" />
            <span className="text-[10px] text-gray-500">Cargar al cliente (CxC)</span>
          </label>
          <button onClick={guardarExtra} disabled={saving || !extraConcepto || !extraMonto}
            className="w-full py-1 rounded bg-[#B3985B] text-black text-[10px] font-semibold disabled:opacity-40">
            {saving ? "..." : "Guardar extra"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Vista por elemento: card de una persona/proveedor ────────────────────────
function CardElemento({
  grupo,
  tab,
  proyectos,
  tecnicos,
  proveedores,
  onDone,
}: {
  grupo: GrupoPersona;
  tab: Tab;
  proyectos: { id: string; nombre: string; numeroProyecto: string }[];
  tecnicos: { id: string; nombre: string; rol: { nombre: string } | null }[];
  proveedores: { id: string; nombre: string }[];
  onDone: () => void;
}) {
  const [showNoContemplado, setShowNoContemplado] = useState(false);
  const [ncProyectoId, setNcProyectoId] = useState("");
  const [ncConcepto, setNcConcepto] = useState("");
  const [ncMonto, setNcMonto] = useState("");
  const [ncCxC, setNcCxC] = useState(false);
  const [savingNc, setSavingNc] = useState(false);

  const pendientes = grupo.items.filter(i => i.estado !== "LIQUIDADO");
  const pagados = grupo.items.filter(i => i.estado === "LIQUIDADO");
  const tieneVencido = pendientes.some(i => esVencido(i));

  const contacto = grupo.contacto;
  const waText = `Hola ${grupo.nombre}! 👋 Tienes ${pendientes.length} pago(s) pendiente(s) por un total de ${fmt(grupo.totalPendiente)}. Se procesan los miércoles correspondientes a cada evento.`;
  const waLink = contacto
    ? `https://wa.me/52${contacto.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`
    : null;

  async function guardarNc() {
    if (!ncProyectoId || !ncConcepto || !ncMonto) return;
    setSavingNc(true);
    const tecnicoId = tab === "TECNICO" ? grupo.key : null;
    const proveedorId = tab === "PROVEEDOR" ? grupo.key : null;
    await fetch("/api/finanzas/pagos-semana/extra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proyectoId: ncProyectoId,
        tipoAcreedor: tab,
        tecnicoId,
        proveedorId,
        concepto: ncConcepto,
        monto: parseFloat(ncMonto),
        crearCxC: ncCxC,
        cxcConcepto: `Cargo adicional: ${ncConcepto}`,
        cxcMonto: ncMonto,
      }),
    });
    setSavingNc(false);
    setShowNoContemplado(false);
    setNcProyectoId(""); setNcConcepto(""); setNcMonto(""); setNcCxC(false);
    onDone();
  }

  return (
    <div className={`bg-[#111] border rounded-xl overflow-hidden ${tieneVencido ? "border-red-900/40" : "border-[#222]"}`}>
      {/* Header del card */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${tieneVencido ? "bg-red-900/30 text-red-400" : "bg-[#B3985B]/15 text-[#B3985B]"}`}>
          {grupo.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{grupo.nombre}</span>
            {grupo.rol && <span className="text-[10px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{grupo.rol}</span>}
            {tieneVencido && <span className="text-[10px] text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">Vencido</span>}
          </div>
          <p className="text-gray-600 text-xs">{pendientes.length} pago{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""}{pagados.length > 0 ? ` · ${pagados.length} pagado${pagados.length !== 1 ? "s" : ""}` : ""}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold text-base">{fmt(grupo.totalPendiente)}</p>
          <p className="text-gray-600 text-[10px]">pendiente</p>
        </div>
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors shrink-0"
            title={`WhatsApp a ${grupo.nombre}`}>
            {WA_ICON}
          </a>
        )}
      </div>

      {/* Tabla de pagos */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="text-left text-[10px] font-semibold text-[#555] uppercase tracking-wider px-4 py-2">Proyecto</th>
              <th className="text-left text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Concepto</th>
              <th className="text-right text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Monto</th>
              <th className="text-center text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Pago Mié</th>
              <th className="text-center text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Estado</th>
              <th className="text-left text-[10px] font-semibold text-[#555] uppercase tracking-wider px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {grupo.items.map(item => {
              const vencido = esVencido(item);
              const pagado = item.estado === "LIQUIDADO";
              return (
                <tr key={item.id} className={`${pagado ? "opacity-40" : ""} hover:bg-[#1a1a1a]/40 transition-colors`}>
                  {/* Proyecto */}
                  <td className="px-4 py-2.5">
                    {item.proyecto ? (
                      <Link href={`/proyectos/${item.proyecto.id}`}
                        className="text-[#B3985B]/80 hover:text-[#B3985B] transition-colors text-xs font-medium">
                        {item.proyecto.numeroProyecto}
                      </Link>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                    {item.proyecto && (
                      <p className="text-gray-600 text-[10px] truncate max-w-28">{item.proyecto.nombre}</p>
                    )}
                    {item.proyecto?.fechaEvento && (
                      <p className="text-[#555] text-[10px]">{fmtFechaMini(item.proyecto.fechaEvento.slice(0, 10))}</p>
                    )}
                  </td>
                  {/* Concepto */}
                  <td className="px-3 py-2.5">
                    <p className="text-gray-300 text-xs leading-snug max-w-48">{item.concepto}</p>
                    {item.notas && (
                      <span className="text-[10px] text-orange-400">★ No contemplado</span>
                    )}
                  </td>
                  {/* Monto */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-white font-semibold text-sm">{fmt(item.monto)}</span>
                  </td>
                  {/* Fecha compromiso */}
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs ${vencido && !pagado ? "text-red-400 font-semibold" : "text-gray-400"}`}>
                      {fmtFechaCorta(item.fechaCompromiso.slice(0, 10))}
                    </span>
                    {vencido && !pagado && (
                      <p className="text-[10px] text-red-500">vencido</p>
                    )}
                  </td>
                  {/* Estado */}
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      pagado ? "bg-green-900/30 text-green-400"
                      : vencido ? "bg-red-900/30 text-red-400"
                      : item.estado === "PARCIAL" ? "bg-blue-900/30 text-blue-400"
                      : "bg-yellow-900/30 text-yellow-400"
                    }`}>
                      {pagado ? "Pagado" : vencido ? "Vencido" : item.estado === "PARCIAL" ? "Parcial" : "Pendiente"}
                    </span>
                  </td>
                  {/* Acciones */}
                  <td className="px-4 py-2.5">
                    <AccionesCxP item={item} onDone={onDone} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Footer: total */}
          {pendientes.length > 1 && (
            <tfoot>
              <tr className="border-t border-[#333] bg-[#0d0d0d]">
                <td colSpan={2} className="px-4 py-2.5 text-xs text-gray-500 font-medium">
                  Total pendiente — {grupo.nombre}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-white font-bold text-sm">{fmt(grupo.totalPendiente)}</span>
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Agregar pago no contemplado para esta persona */}
      <div className="border-t border-[#1a1a1a]">
        <button onClick={() => setShowNoContemplado(p => !p)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-[#B3985B] transition-colors text-xs">
          <span className="text-sm leading-none">+</span>
          <span>Agregar pago de evento no contemplado</span>
        </button>

        {showNoContemplado && (
          <div className="px-4 pb-4 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <select value={ncProyectoId} onChange={e => setNcProyectoId(e.target.value)}
                className="flex-1 min-w-40 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]">
                <option value="">— Proyecto *</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>{p.numeroProyecto} — {p.nombre}</option>
                ))}
              </select>
              <input value={ncConcepto} onChange={e => setNcConcepto(e.target.value)}
                placeholder="Concepto del servicio *"
                className="flex-1 min-w-40 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
              <input type="number" value={ncMonto} onChange={e => setNcMonto(e.target.value)}
                placeholder="Monto *"
                className="w-28 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs text-right focus:outline-none focus:border-[#B3985B]" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={ncCxC} onChange={e => setNcCxC(e.target.checked)} className="accent-[#B3985B]" />
              <span className="text-xs text-gray-500">Cargar al cliente (crear CxC)</span>
            </label>
            <div className="flex gap-2">
              <button onClick={guardarNc} disabled={savingNc || !ncProyectoId || !ncConcepto || !ncMonto}
                className="px-4 py-1.5 rounded-lg bg-[#B3985B] text-black text-xs font-semibold disabled:opacity-40">
                {savingNc ? "Guardando..." : "Registrar"}
              </button>
              <button onClick={() => setShowNoContemplado(false)} className="px-3 py-1.5 text-gray-500 hover:text-white text-xs">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vista por proyecto: card de un proyecto ──────────────────────────────────
function CardProyecto({ grupo, tab, onDone }: { grupo: GrupoProyecto; tab: Tab; onDone: () => void }) {
  const [open, setOpen] = useState(true);
  const pendientes = grupo.items.filter(i => i.estado !== "LIQUIDADO");
  const pagados = grupo.items.filter(i => i.estado === "LIQUIDADO");
  const tieneVencido = pendientes.some(i => esVencido(i));

  return (
    <div className={`bg-[#111] border rounded-xl overflow-hidden ${tieneVencido ? "border-red-900/40" : "border-[#222]"}`}>
      {/* Header del proyecto */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#0d0d0d] border-b border-[#1a1a1a] hover:bg-[#111] transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${tieneVencido ? "bg-red-900/30 text-red-400" : "bg-[#B3985B]/15 text-[#B3985B]"}`}>
          #{grupo.proyectoNumero}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/proyectos/${grupo.proyectoId}`}
              onClick={e => e.stopPropagation()}
              className="text-white font-semibold text-sm hover:text-[#B3985B] transition-colors"
            >
              {grupo.proyectoNombre}
            </Link>
            {tieneVencido && <span className="text-[10px] text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">Vencido</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {grupo.clienteNombre && (
              <span className="text-xs text-gray-500">{grupo.clienteNombre}</span>
            )}
            {grupo.fechaEvento && (
              <span className="text-xs text-[#B3985B]/70">{fmtFechaMini(grupo.fechaEvento.slice(0, 10))}</span>
            )}
            <span className="text-[10px] text-gray-600">
              {pendientes.length} pago{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""}
              {pagados.length > 0 ? ` · ${pagados.length} pagado${pagados.length !== 1 ? "s" : ""}` : ""}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 mr-2">
          <p className="text-white font-bold text-base">{fmt(grupo.totalPendiente)}</p>
          <p className="text-gray-600 text-[10px]">pendiente</p>
        </div>
        <span className="text-gray-600 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {/* Tabla de pagos del proyecto */}
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="text-left text-[10px] font-semibold text-[#555] uppercase tracking-wider px-4 py-2">
                  {tab === "TECNICO" ? "Técnico" : "Proveedor"}
                </th>
                <th className="text-left text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Concepto</th>
                <th className="text-right text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Monto</th>
                <th className="text-center text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Fecha</th>
                <th className="text-center text-[10px] font-semibold text-[#555] uppercase tracking-wider px-3 py-2">Estado</th>
                <th className="text-left text-[10px] font-semibold text-[#555] uppercase tracking-wider px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {grupo.items.map(item => {
                const vencido = esVencido(item);
                const pagado = item.estado === "LIQUIDADO";
                const nombre = tab === "TECNICO" ? (item.tecnico?.nombre ?? "—") : (item.proveedor?.nombre ?? "—");
                const rol = tab === "TECNICO" ? item.tecnico?.rol?.nombre : null;
                const contacto = tab === "TECNICO" ? item.tecnico?.celular : item.proveedor?.telefono;
                const waText = `Hola ${nombre}! 👋 Tu pago de ${fmt(item.monto)} por "${item.concepto}" está programado.`;
                const waLink = contacto
                  ? `https://wa.me/52${contacto.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`
                  : null;

                return (
                  <tr key={item.id} className={`${pagado ? "opacity-40" : ""} hover:bg-[#1a1a1a]/40 transition-colors`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${vencido && !pagado ? "bg-red-900/30 text-red-400" : "bg-[#B3985B]/15 text-[#B3985B]"}`}>
                          {nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium leading-none">{nombre}</p>
                          {rol && <p className="text-gray-500 text-[10px]">{rol}</p>}
                        </div>
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer"
                            className="p-1 rounded bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors"
                            title="WhatsApp">
                            {WA_ICON}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-gray-300 text-xs leading-snug max-w-48">{item.concepto}</p>
                      {item.notas && <span className="text-[10px] text-orange-400">★ No contemplado</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-white font-semibold text-sm">{fmt(item.monto)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs ${vencido && !pagado ? "text-red-400 font-semibold" : "text-gray-400"}`}>
                        {fmtFechaCorta(item.fechaCompromiso.slice(0, 10))}
                      </span>
                      {vencido && !pagado && <p className="text-[10px] text-red-500">vencido</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        pagado ? "bg-green-900/30 text-green-400"
                        : vencido ? "bg-red-900/30 text-red-400"
                        : item.estado === "PARCIAL" ? "bg-blue-900/30 text-blue-400"
                        : "bg-yellow-900/30 text-yellow-400"
                      }`}>
                        {pagado ? "Pagado" : vencido ? "Vencido" : item.estado === "PARCIAL" ? "Parcial" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <AccionesCxP item={item} onDone={onDone} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {pendientes.length > 1 && (
              <tfoot>
                <tr className="border-t border-[#333] bg-[#0d0d0d]">
                  <td colSpan={2} className="px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Total pendiente — {grupo.proyectoNombre}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-white font-bold text-sm">{fmt(grupo.totalPendiente)}</span>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Vista por semana: fila de CxP ────────────────────────────────────────────
function FilaSemana({ item, tab, onDone }: { item: CxP; tab: Tab; onDone: () => void }) {
  const nombre = tab === "TECNICO" ? (item.tecnico?.nombre ?? "—") : (item.proveedor?.nombre ?? "—");
  const rol = tab === "TECNICO" ? item.tecnico?.rol?.nombre : null;
  const contacto = tab === "TECNICO" ? item.tecnico?.celular : item.proveedor?.telefono;
  const vencido = esVencido(item);
  const pagado = item.estado === "LIQUIDADO";
  const waLink = contacto
    ? `https://wa.me/52${contacto.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${nombre}! 👋 Tu pago de ${fmt(item.monto)} por "${item.concepto}" está listo para este miércoles.`)}`
    : null;

  return (
    <tr className={`border-b border-[#1a1a1a] last:border-0 ${pagado ? "opacity-40" : ""} hover:bg-[#1a1a1a]/30 transition-colors`}>
      {/* Persona */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${vencido && !pagado ? "bg-red-900/30 text-red-400" : "bg-[#B3985B]/15 text-[#B3985B]"}`}>
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium leading-none">{nombre}</p>
            {rol && <p className="text-gray-500 text-[10px]">{rol}</p>}
            {item.notas && <p className="text-orange-400 text-[10px]">★ No contemplado</p>}
          </div>
        </div>
      </td>
      {/* Proyecto */}
      <td className="px-3 py-3">
        {item.proyecto ? (
          <Link href={`/proyectos/${item.proyecto.id}`} className="text-[#B3985B]/80 hover:text-[#B3985B] text-xs font-medium transition-colors">
            {item.proyecto.numeroProyecto}
          </Link>
        ) : <span className="text-gray-600 text-xs">—</span>}
        {item.proyecto && <p className="text-gray-600 text-[10px] truncate max-w-32">{item.proyecto.nombre}</p>}
      </td>
      {/* Concepto */}
      <td className="px-3 py-3">
        <p className="text-gray-300 text-xs max-w-48 leading-snug">{item.concepto}</p>
      </td>
      {/* Monto */}
      <td className="px-3 py-3 text-right">
        <span className="text-white font-semibold">{fmt(item.monto)}</span>
      </td>
      {/* Estado */}
      <td className="px-3 py-3 text-center">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          pagado ? "bg-green-900/30 text-green-400"
          : vencido ? "bg-red-900/30 text-red-400"
          : item.estado === "PARCIAL" ? "bg-blue-900/30 text-blue-400"
          : "bg-yellow-900/30 text-yellow-400"
        }`}>
          {pagado ? "Pagado" : vencido ? "Vencido" : item.estado === "PARCIAL" ? "Parcial" : "Pendiente"}
        </span>
      </td>
      {/* WA + Acciones */}
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="mt-0.5 p-1.5 rounded bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors shrink-0"
              title="WhatsApp">
              {WA_ICON}
            </a>
          )}
          <AccionesCxP item={item} onDone={onDone} />
        </div>
      </td>
    </tr>
  );
}

// ─── Form nuevo elemento no contemplado global ────────────────────────────────
function FormNuevoNoContemplado({
  tab, proyectos, tecnicos, proveedores, onGuardado,
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
        concepto, monto: parseFloat(monto),
        crearCxC, cxcConcepto: `Cargo adicional: ${concepto}`, cxcMonto: monto,
      }),
    });
    setSaving(false);
    setShow(false);
    setProyectoId(""); setTecnicoId(""); setProveedorId(""); setNombreLibre(""); setConcepto(""); setMonto(""); setCrearCxC(false);
    onGuardado();
  }

  return (
    <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-xl overflow-hidden">
      <button onClick={() => setShow(p => !p)}
        className="w-full flex items-center gap-2 px-5 py-3.5 text-gray-500 hover:text-[#B3985B] transition-colors text-sm">
        <span className="text-lg leading-none">+</span>
        <span>Agregar {tab === "TECNICO" ? "técnico" : "proveedor"} no contemplado en cotización</span>
        <span className="ml-auto text-[10px]">{show ? "▲" : "▼"}</span>
      </button>
      {show && (
        <div className="px-5 pb-5 space-y-3 border-t border-[#1a1a1a]">
          <p className="text-[10px] text-[#B3985B] uppercase font-semibold tracking-wider pt-3">
            Nuevo pago — {tab === "TECNICO" ? "Técnico" : "Proveedor"} no contemplado
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select value={proyectoId} onChange={e => setProyectoId(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
              <option value="">— Proyecto *</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.numeroProyecto} — {p.nombre}</option>)}
            </select>
            {tab === "TECNICO" ? (
              <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">— Técnico del catálogo (o escribe abajo) —</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.rol ? ` · ${t.rol.nombre}` : ""}</option>)}
              </select>
            ) : (
              <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">— Proveedor del catálogo (o escribe abajo) —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
            {((tab === "TECNICO" && !tecnicoId) || (tab === "PROVEEDOR" && !proveedorId)) && (
              <input value={nombreLibre} onChange={e => setNombreLibre(e.target.value)}
                placeholder={`Nombre del ${tab === "TECNICO" ? "técnico" : "proveedor"} (si no está en catálogo)`}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            )}
            <input value={concepto} onChange={e => setConcepto(e.target.value)}
              placeholder="Concepto / descripción del servicio *"
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="Monto *"
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm text-right focus:outline-none focus:border-[#B3985B]" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={crearCxC} onChange={e => setCrearCxC(e.target.checked)} className="accent-[#B3985B]" />
            <span className="text-xs text-gray-400">Cargar como cargo adicional al cliente (crear CxC)</span>
          </label>
          <div className="flex gap-2">
            <button onClick={guardar} disabled={saving || !proyectoId || !concepto || !monto}
              className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">
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
  const [vista, setVista] = useState<Vista>("operativa");
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [semanasOp, setSemanasOp] = useState<SemanaOp[]>([]);
  const [totalesOp, setTotalesOp] = useState<{ cobrar: number; pagar: number; balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [semanaSelIdx, setSemanaSelIdx] = useState(0);
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string; numeroProyecto: string }[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string; rol: { nombre: string } | null }[]>([]);
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);

  async function cargar() {
    setLoading(true);
    const [semRes, opRes, provRes, tecRes, proyRes] = await Promise.all([
      fetch("/api/finanzas/pagos-semana"),
      fetch("/api/finanzas/semana"),
      fetch("/api/proveedores"),
      fetch("/api/tecnicos"),
      fetch("/api/proyectos"),
    ]);
    const [semData, opData, provData, tecData, proyData] = await Promise.all([
      semRes.json(), opRes.json(), provRes.json(), tecRes.json(), proyRes.json(),
    ]);
    const semanasData: Semana[] = semData.semanas ?? [];
    setSemanas(semanasData);
    setSemanasOp(opData.semanas ?? []);
    setTotalesOp(opData.totales ?? null);
    setProveedores(provData.proveedores ?? []);
    setTecnicos(tecData.tecnicos ?? []);
    setProyectos(proyData.proyectos?.map((p: { id: string; nombre: string; numeroProyecto: string }) => ({
      id: p.id, nombre: p.nombre, numeroProyecto: p.numeroProyecto,
    })) ?? []);

    const hoy = isoHoy();
    const lunesHoy = lunesDeSemana(hoy);
    const idx = semanasData.findIndex(s => s.lunesIso === lunesHoy);
    setSemanaSelIdx(idx >= 0 ? idx : 0);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  // ── Todos los items del tab actual (todas las semanas) ──
  const todosItems = semanas.flatMap(s => s.items).filter(i => i.tipoAcreedor === tab);
  const pendientes = todosItems.filter(i => i.estado !== "LIQUIDADO");
  const totalPendiente = pendientes.reduce((s, i) => s + i.monto, 0);
  const vencidos = pendientes.filter(i => esVencido(i));
  const totalVencido = vencidos.reduce((s, i) => s + i.monto, 0);

  // ── Semana seleccionada ──
  const semanaSel = semanas[semanaSelIdx];
  const itemsSemana = semanaSel?.items.filter(i => i.tipoAcreedor === tab) ?? [];
  const hoy = isoHoy();
  const esSemanaCurrent = semanaSel?.lunesIso === lunesDeSemana(hoy);

  // ── Agrupar por persona para vista "elemento" ──
  const gruposElemento: GrupoPersona[] = (() => {
    const map = new Map<string, GrupoPersona>();
    for (const item of todosItems) {
      const key = tab === "TECNICO"
        ? (item.tecnico?.id ?? `libre_${item.concepto}`)
        : (item.proveedor?.id ?? `libre_${item.concepto}`);
      if (!map.has(key)) {
        map.set(key, {
          key,
          nombre: tab === "TECNICO" ? (item.tecnico?.nombre ?? "Sin nombre") : (item.proveedor?.nombre ?? "Sin nombre"),
          rol: tab === "TECNICO" ? (item.tecnico?.rol?.nombre ?? null) : null,
          contacto: tab === "TECNICO" ? (item.tecnico?.celular ?? null) : (item.proveedor?.telefono ?? null),
          items: [],
          totalPendiente: 0,
        });
      }
      const g = map.get(key)!;
      g.items.push(item);
      if (item.estado !== "LIQUIDADO") g.totalPendiente += item.monto;
    }
    // Ordenar: primero con deuda, mayor a menor
    return Array.from(map.values()).sort((a, b) => b.totalPendiente - a.totalPendiente);
  })();

  // ── Agrupar por proyecto ──
  const gruposProyecto: GrupoProyecto[] = (() => {
    const map = new Map<string, GrupoProyecto>();
    for (const item of todosItems) {
      if (!item.proyecto) continue;
      const key = item.proyecto.id;
      if (!map.has(key)) {
        map.set(key, {
          proyectoId: item.proyecto.id,
          proyectoNombre: item.proyecto.nombre,
          proyectoNumero: item.proyecto.numeroProyecto,
          fechaEvento: item.proyecto.fechaEvento ?? null,
          clienteNombre: item.proyecto.cliente?.nombre ?? null,
          items: [],
          totalPendiente: 0,
        });
      }
      const g = map.get(key)!;
      g.items.push(item);
      if (item.estado !== "LIQUIDADO") g.totalPendiente += item.monto;
    }
    // Ordenar por fecha de evento más próxima primero
    return Array.from(map.values()).sort((a, b) => {
      if (!a.fechaEvento && !b.fechaEvento) return 0;
      if (!a.fechaEvento) return 1;
      if (!b.fechaEvento) return -1;
      return a.fechaEvento.localeCompare(b.fechaEvento);
    });
  })();

  // ── Próximo miércoles de la semana actual ──
  const proximoMiercoles = semanas.find(s => s.lunesIso === lunesDeSemana(hoy))?.miercolesIso
    ?? semanas[0]?.miercolesIso;
  const montoProximoMiercoles = (semanas.find(s => s.lunesIso === lunesDeSemana(hoy))?.items ?? [])
    .filter(i => i.tipoAcreedor === tab && i.estado !== "LIQUIDADO")
    .reduce((s, i) => s + i.monto, 0);

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Semana Financiera</h1>
          <p className="text-[#6b7280] text-sm">Cobros (Lun & Mié) · Pagos (Mié)</p>
        </div>
        <Link href="/finanzas/cobros-pagos" className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">
          Ver todas las CxC / CxP →
        </Link>
      </div>

      {/* Tabs vista */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Vista principal */}
        <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1">
          <button onClick={() => setVista("operativa")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${vista === "operativa" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`}>
            <span>📅</span> Semana operativa
          </button>
          <button onClick={() => setVista("proyecto")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${vista === "proyecto" ? "bg-[#222] text-white" : "text-gray-500 hover:text-white"}`}>
            <span>🎪</span> Por proyecto
          </button>
          <button onClick={() => setVista("elemento")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${vista === "elemento" ? "bg-[#222] text-white" : "text-gray-500 hover:text-white"}`}>
            <span>👤</span> Por elemento
          </button>
          <button onClick={() => setVista("semana")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${vista === "semana" ? "bg-[#222] text-white" : "text-gray-500 hover:text-white"}`}>
            <span>📋</span> Por semana
          </button>
        </div>

        {/* Tabs Personal / Proveedores — solo para vistas que no son operativa */}
        {vista !== "operativa" && (
          <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1">
            {(["TECNICO", "PROVEEDOR"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-[#222] text-white" : "text-gray-400 hover:text-white"}`}>
                {t === "TECNICO" ? "Personal" : "Proveedores"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs — diferentes según vista */}
      {vista === "operativa" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0a0a0a] border border-[#B3985B]/20 rounded-xl p-4">
            <p className="text-[#B3985B] text-[10px] uppercase tracking-wider mb-1">Por cobrar</p>
            <p className="text-white text-lg font-bold">{fmt(totalesOp?.cobrar ?? 0)}</p>
            <p className="text-gray-600 text-xs">CxC pendientes</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Por pagar</p>
            <p className="text-white text-lg font-bold">{fmt(totalesOp?.pagar ?? 0)}</p>
            <p className="text-gray-600 text-xs">CxP pendientes</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Balance neto</p>
            <p className={`text-lg font-bold ${(totalesOp?.balance ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
              {fmt(totalesOp?.balance ?? 0)}
            </p>
            <p className="text-gray-600 text-xs">cobrar − pagar</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#B3985B]/20 rounded-xl p-4">
            <p className="text-[#B3985B] text-[10px] uppercase tracking-wider mb-1">Este miércoles pagos</p>
            <p className="text-white text-lg font-bold">
              {fmt((semanasOp.find(s => s.lunesIso === lunesDeSemana(hoy))?.totalPagos ?? 0))}
            </p>
            <p className="text-gray-600 text-xs">{proximoMiercoles ? fmtFechaCorta(proximoMiercoles) : "—"}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Total pendiente</p>
            <p className="text-white text-lg font-bold">{fmt(totalPendiente)}</p>
            <p className="text-gray-600 text-xs">{pendientes.length} pago{pendientes.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Vencidos</p>
            <p className={`text-lg font-bold ${totalVencido > 0 ? "text-red-400" : "text-green-400"}`}>
              {totalVencido > 0 ? fmt(totalVencido) : "Al día ✓"}
            </p>
            <p className="text-gray-600 text-xs">{vencidos.length} vencido{vencidos.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#B3985B]/20 rounded-xl p-4">
            <p className="text-[#B3985B] text-[10px] uppercase tracking-wider mb-1">Este miércoles</p>
            <p className="text-white text-lg font-bold">{fmt(montoProximoMiercoles)}</p>
            <p className="text-gray-600 text-xs">{proximoMiercoles ? fmtFechaCorta(proximoMiercoles) : "—"}</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Proyectos</p>
            <p className="text-white text-lg font-bold">{gruposProyecto.filter(g => g.totalPendiente > 0).length}</p>
            <p className="text-gray-600 text-xs">con pagos pendientes</p>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : vista === "operativa" ? (
        /* ── VISTA SEMANA OPERATIVA ── */
        <div className="space-y-6">
          {semanasOp.length === 0 ? (
            <div className="py-10 text-center text-gray-600 text-sm">Sin cobros ni pagos pendientes</div>
          ) : semanasOp.map((sem) => {
            const esCurrent = sem.lunesIso === lunesDeSemana(hoy);
            const esVencida = sem.lunesIso < lunesDeSemana(hoy);
            const totalSem = sem.totalCobros + sem.totalPagos;
            return (
              <div key={sem.lunesIso} className={`border rounded-2xl overflow-hidden ${esCurrent ? "border-[#B3985B]/40" : esVencida ? "border-red-900/30" : "border-[#222]"}`}>
                {/* Header semana */}
                <div className={`flex items-center justify-between px-5 py-3 ${esCurrent ? "bg-[#B3985B]/8" : "bg-[#0d0d0d]"} border-b border-[#1a1a1a]`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm">
                          {esCurrent ? "Esta semana" : esVencida ? "Semana vencida" : "Próxima semana"}
                        </p>
                        {esCurrent && <span className="text-[10px] bg-[#B3985B]/20 text-[#B3985B] px-2 py-0.5 rounded-full font-medium">Activa</span>}
                        {esVencida && <span className="text-[10px] bg-red-900/20 text-red-400 px-2 py-0.5 rounded-full">Vencida</span>}
                      </div>
                      <p className="text-gray-500 text-xs">
                        Lunes {fmtFechaCorta(sem.lunesIso)} → Mié {fmtFechaCorta(sem.miercolesIso)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{fmt(totalSem)}</p>
                    <p className="text-gray-600 text-[10px]">
                      {sem.cobros.length}c / {sem.pagos.length}p
                    </p>
                  </div>
                </div>

                {/* Cuerpo: 2 columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1a1a1a]">

                  {/* Columna izquierda: COBROS (Lunes y Miércoles) */}
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                      <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Cobros · Lun & Mié</span>
                      <span className="text-[10px] text-gray-500 ml-auto">{fmt(sem.totalCobros)} · {sem.cobros.length} ítem{sem.cobros.length !== 1 ? "s" : ""}</span>
                    </div>
                    {sem.cobros.length === 0 ? (
                      <p className="text-gray-700 text-xs px-4 py-4">Sin cobros esta semana</p>
                    ) : (
                      <div className="divide-y divide-[#1a1a1a]">
                        {sem.cobros.map(c => {
                          const vencido = c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < new Date();
                          return (
                            <div key={c.id} className={`px-4 py-2.5 ${c.estado === "LIQUIDADO" ? "opacity-40" : ""}`}>
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-white text-xs font-medium truncate">{c.cliente.nombre}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.tipoPago === "ANTICIPO" ? "bg-blue-900/30 text-blue-400" : "bg-purple-900/30 text-purple-400"}`}>
                                      {c.tipoPago === "ANTICIPO" ? "Anticipo" : c.tipoPago === "LIQUIDACION" ? "Liquidación" : c.tipoPago}
                                    </span>
                                    {vencido && <span className="text-[10px] text-red-400">⚠ vencido</span>}
                                  </div>
                                  <p className="text-gray-500 text-[10px] truncate">{c.concepto}</p>
                                  {c.proyecto && (
                                    <Link href={`/proyectos/${c.proyecto.id}`}
                                      className="text-[10px] text-[#B3985B]/70 hover:text-[#B3985B] transition-colors">
                                      {c.proyecto.numeroProyecto}
                                    </Link>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-white font-semibold text-sm">{fmt(c.monto)}</p>
                                  <p className={`text-[10px] ${vencido ? "text-red-400" : "text-gray-600"}`}>{fmtFechaCorta(c.fechaCompromiso.slice(0,10))}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <AccionesCobro item={c} onDone={cargar} />
                                {c.cliente.telefono && c.estado !== "LIQUIDADO" && (
                                  <a href={`https://wa.me/52${c.cliente.telefono.replace(/\D/g,"")}?text=${encodeURIComponent(`Hola ${c.cliente.nombre.split(" ")[0]}! 👋 Te recordamos que tienes un pago pendiente de ${fmt(c.monto)} por ${c.concepto}. ¿Cuándo podemos recibirlo? Mainstage Pro`)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="p-1 rounded bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors">
                                    {WA_ICON}
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Columna derecha: PAGOS (Miércoles) */}
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                      <span className="text-[10px] bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Pagos · Miércoles</span>
                      <span className="text-[10px] text-gray-500 ml-auto">{fmt(sem.totalPagos)} · {sem.pagos.length} ítem{sem.pagos.length !== 1 ? "s" : ""}</span>
                    </div>
                    {sem.pagos.length === 0 ? (
                      <p className="text-gray-700 text-xs px-4 py-4">Sin pagos esta semana</p>
                    ) : (
                      <div className="divide-y divide-[#1a1a1a]">
                        {sem.pagos.map(p => {
                          const vencido = esVencido(p);
                          const nombre = p.tecnico?.nombre ?? p.proveedor?.nombre ?? "—";
                          const contacto = p.tecnico?.celular ?? p.proveedor?.telefono ?? null;
                          return (
                            <div key={p.id} className={`px-4 py-2.5 ${p.estado === "LIQUIDADO" ? "opacity-40" : ""}`}>
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-white text-xs font-medium">{nombre}</span>
                                    <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">
                                      {p.tipoAcreedor === "TECNICO" ? "Técnico" : p.tipoAcreedor === "PROVEEDOR" ? "Proveedor" : "Otro"}
                                    </span>
                                    {vencido && <span className="text-[10px] text-red-400">⚠ vencido</span>}
                                  </div>
                                  <p className="text-gray-500 text-[10px] truncate">{p.concepto}</p>
                                  {p.proyecto && (
                                    <Link href={`/proyectos/${p.proyecto.id}`}
                                      className="text-[10px] text-[#B3985B]/70 hover:text-[#B3985B] transition-colors">
                                      {p.proyecto.numeroProyecto}
                                    </Link>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-white font-semibold text-sm">{fmt(p.monto)}</p>
                                  <p className={`text-[10px] ${vencido ? "text-red-400" : "text-gray-600"}`}>{fmtFechaCorta(p.fechaCompromiso.slice(0,10))}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <AccionesCxP item={p} onDone={cargar} />
                                {contacto && p.estado !== "LIQUIDADO" && (
                                  <a href={`https://wa.me/52${contacto.replace(/\D/g,"")}?text=${encodeURIComponent(`Hola ${nombre.split(" ")[0]}! 👋 Tu pago de ${fmt(p.monto)} está programado para este miércoles. Mainstage Pro`)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="p-1 rounded bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors">
                                    {WA_ICON}
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : todosItems.length === 0 ? (
        <div className="py-10 text-center text-gray-600 text-sm">
          No hay pagos pendientes de {tab === "TECNICO" ? "personal" : "proveedores"}
        </div>
      ) : (
        <>
          {/* ── VISTA POR PROYECTO ── */}
          {vista === "proyecto" && (
            <div className="space-y-4">
              {gruposProyecto.length === 0 ? (
                <div className="py-10 text-center text-gray-600 text-sm">No hay pagos pendientes por proyecto</div>
              ) : (
                gruposProyecto.map(grupo => (
                  <CardProyecto key={grupo.proyectoId} grupo={grupo} tab={tab} onDone={cargar} />
                ))
              )}
            </div>
          )}

          {/* ── VISTA POR ELEMENTO ── */}
          {vista === "elemento" && (
            <div className="space-y-4">
              {gruposElemento.map(grupo => (
                <CardElemento
                  key={grupo.key}
                  grupo={grupo}
                  tab={tab}
                  proyectos={proyectos}
                  tecnicos={tecnicos}
                  proveedores={proveedores}
                  onDone={cargar}
                />
              ))}
            </div>
          )}

          {/* ── VISTA POR SEMANA ── */}
          {vista === "semana" && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              {/* Tabs de semanas */}
              <div className="flex border-b border-[#1a1a1a] overflow-x-auto">
                {semanas.map((s, idx) => {
                  const esCurrent = s.lunesIso === lunesDeSemana(hoy);
                  const itemsTab = s.items.filter(i => i.tipoAcreedor === tab);
                  const total = itemsTab.filter(i => i.estado !== "LIQUIDADO").reduce((acc, i) => acc + i.monto, 0);
                  const tieneVencidos = itemsTab.some(i => esVencido(i));
                  return (
                    <button key={s.lunesIso} onClick={() => setSemanaSelIdx(idx)}
                      className={`flex flex-col items-center px-4 py-3 text-xs shrink-0 border-b-2 transition-colors ${
                        semanaSelIdx === idx ? "border-[#B3985B] text-[#B3985B]" : "border-transparent text-gray-500 hover:text-white"
                      }`}>
                      <span className="font-medium">{esCurrent ? "Esta semana" : `Mié ${fmtFechaCorta(s.miercolesIso)}`}</span>
                      <span className={`text-[10px] mt-0.5 ${tieneVencidos ? "text-red-400" : ""}`}>
                        {total > 0 ? `${fmt(total)} · ${itemsTab.length}p` : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Header semana */}
              {semanaSel && (
                <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Miércoles {fmtFecha(semanaSel.miercolesIso)}
                      {esSemanaCurrent && (
                        <span className="ml-2 text-[10px] bg-[#B3985B]/20 text-[#B3985B] px-2 py-0.5 rounded-full">Esta semana</span>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {itemsSemana.filter(i => i.estado !== "LIQUIDADO").length} pagos · {fmt(itemsSemana.filter(i => i.estado !== "LIQUIDADO").reduce((s, i) => s + i.monto, 0))}
                    </p>
                  </div>
                </div>
              )}

              {itemsSemana.length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-sm">
                  Sin pagos de {tab === "TECNICO" ? "personal" : "proveedores"} esta semana
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        {["Persona", "Proyecto", "Concepto", "Monto", "Estado", "Acciones"].map(h => (
                          <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-3 py-2.5 font-semibold first:px-4">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itemsSemana.map(item => (
                        <FilaSemana key={item.id} item={item} tab={tab} onDone={cargar} />
                      ))}
                    </tbody>
                    {itemsSemana.filter(i => i.estado !== "LIQUIDADO").length > 1 && (
                      <tfoot>
                        <tr className="border-t border-[#333] bg-[#0d0d0d]">
                          <td colSpan={3} className="px-4 py-2.5 text-xs text-gray-500">Total esta semana</td>
                          <td className="px-3 py-2.5 text-right font-bold text-white">
                            {fmt(itemsSemana.filter(i => i.estado !== "LIQUIDADO").reduce((s, i) => s + i.monto, 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Agregar no contemplado global */}
          <FormNuevoNoContemplado
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
