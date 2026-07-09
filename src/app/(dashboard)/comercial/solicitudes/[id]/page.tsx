"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ESTADO_SOLICITUD_LABELS,
  ESTADO_SOLICITUD_COLORS,
  TIPO_EVENTO_LABELS,
  TIPO_SERVICIO_LABELS,
  ENTREGABLE_LABELS,
  ETAPA_LABELS,
} from "@/lib/constants";

interface Equipo { id: string; categoria: string | null; equipo: string | null; cantidad: number; notas: string | null; }
interface Solicitud {
  id: string; folio: number; clienteNombre: string; fechaEvento: string | null; lugarEvento: string | null;
  etapa: string | null; tipoEvento: string | null; tipoServicio: string | null; asistentes: number | null;
  requiereTransporte: boolean; transporteConcepto: string | null;
  llevaDescuento: boolean; descuentoDetalle: string | null;
  notaEspecial: string | null; sumaComision: boolean; entregable: string; estado: string;
  vendedorId: string | null; tratoId: string | null; createdAt: string;
  equipos: Equipo[];
  vendedor: { id: string; name: string } | null;
  creadoPor: { id: string; name: string } | null;
  trato: { id: string; nombreEvento: string | null } | null;
}

const ESTADOS = ["NUEVA", "ASIGNADA", "COTIZADA", "CONVERTIDA"];
const ETAPA_TXT: Record<string, string> = { LEAD: "Prospección", ...ETAPA_LABELS };
const INPUT = "bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B] outline-none";

function fmtFecha(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-200">{children || "—"}</div>
    </div>
  );
}

export default function DetalleSolicitudPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sol, setSol] = useState<Solicitud | null>(null);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(() => {
    fetch(`/api/solicitudes-cotizacion/${id}`)
      .then(r => r.json())
      .then(d => setSol(d.solicitud || null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    cargar();
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios || []));
  }, [cargar]);

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/solicitudes-cotizacion/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { const d = await res.json(); setSol(prev => prev ? { ...prev, ...d.solicitud } : prev); }
  }

  async function convertir() {
    setConvirtiendo(true); setMsg("");
    try {
      const res = await fetch(`/api/solicitudes-cotizacion/${id}/convertir`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || "Error al convertir"); setConvirtiendo(false); return; }
      router.push(`/crm/tratos/${d.trato.id}`);
    } catch {
      setMsg("Error de conexión"); setConvirtiendo(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (!sol) return <div className="p-6 text-gray-500 text-sm">Solicitud no encontrada.</div>;

  const yaConvertida = !!sol.tratoId;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/comercial/solicitudes" className="text-gray-600 hover:text-white text-sm mb-2 inline-block transition-colors">← Bandeja</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="ms-h1">{sol.clienteNombre}</h1>
            <p className="text-gray-600 text-xs mt-1">Solicitud #{String(sol.folio).padStart(3, "0")} · creada {fmtFecha(sol.createdAt)}{sol.creadoPor ? ` por ${sol.creadoPor.name}` : ""}</p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full ${ESTADO_SOLICITUD_COLORS[sol.estado] || "bg-gray-500/10 text-gray-400"}`}>
            {ESTADO_SOLICITUD_LABELS[sol.estado] || sol.estado}
          </span>
        </div>
      </div>

      {msg && <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>}

      {yaConvertida && (
        <div className="bg-emerald-900/20 border border-emerald-700/50 text-emerald-300 text-sm px-4 py-3 rounded-xl mb-4 flex items-center justify-between gap-3">
          <span>Esta solicitud ya fue convertida a un trato.</span>
          <Link href={`/crm/tratos/${sol.tratoId}`} className="underline hover:text-emerald-200 whitespace-nowrap">Ver trato →</Link>
        </div>
      )}

      <div className="space-y-4">
        {/* Gestión */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Gestión</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vendedor asignado</label>
              <select value={sol.vendedorId || ""} onChange={e => patch({ vendedorId: e.target.value || null })} className={`${INPUT} w-full`} disabled={yaConvertida}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select value={sol.estado} onChange={e => patch({ estado: e.target.value })} className={`${INPUT} w-full`} disabled={yaConvertida}>
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_SOLICITUD_LABELS[e]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Datos del evento */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Datos del evento</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Dato label="Fecha del evento">{fmtFecha(sol.fechaEvento)}</Dato>
            <Dato label="Lugar">{sol.lugarEvento}</Dato>
            <Dato label="Etapa">{sol.etapa ? (ETAPA_TXT[sol.etapa] || sol.etapa) : "—"}</Dato>
            <Dato label="Tipo de evento">{sol.tipoEvento ? (TIPO_EVENTO_LABELS[sol.tipoEvento] || sol.tipoEvento) : "—"}</Dato>
            <Dato label="Tipo de servicio">{sol.tipoServicio ? (TIPO_SERVICIO_LABELS[sol.tipoServicio] || sol.tipoServicio) : "—"}</Dato>
            <Dato label="Asistentes aprox.">{sol.asistentes ?? "—"}</Dato>
          </div>
        </div>

        {/* Equipos */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Equipos a cotizar</h2>
          {sol.equipos.length === 0 ? (
            <p className="text-gray-600 text-sm">No se especificaron equipos.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-[#333]">
                  <th className="text-left font-medium py-2">Categoría</th>
                  <th className="text-left font-medium py-2">Equipo</th>
                  <th className="text-left font-medium py-2 w-16">Cant.</th>
                  <th className="text-left font-medium py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {sol.equipos.map(e => (
                  <tr key={e.id} className="border-b border-[#1a1a1a]">
                    <td className="py-2 text-gray-300">{e.categoria || "—"}</td>
                    <td className="py-2 text-gray-200">{e.equipo || "—"}</td>
                    <td className="py-2 text-gray-300">{e.cantidad}</td>
                    <td className="py-2 text-gray-400">{e.notas || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Condiciones */}
        <div className="ms-card p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Condiciones</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Dato label="Transporte">{sol.requiereTransporte ? (sol.transporteConcepto || "Sí") : "No"}</Dato>
            <Dato label="Descuento">{sol.llevaDescuento ? (sol.descuentoDetalle || "Sí") : "No"}</Dato>
            <Dato label="Comisión 10%">{sol.sumaComision ? "Sí" : "No"}</Dato>
            <Dato label="Entregable">{ENTREGABLE_LABELS[sol.entregable] || sol.entregable}</Dato>
          </div>
          {sol.notaEspecial && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-1">Nota especial</div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{sol.notaEspecial}</p>
            </div>
          )}
        </div>

        {!yaConvertida && (
          <div className="flex justify-end">
            <button onClick={convertir} disabled={convirtiendo} className="px-5 py-2.5 bg-[#B3985B] text-black font-semibold text-sm rounded-lg hover:bg-[#B3985B]/80 disabled:opacity-50 transition-colors">
              {convirtiendo ? "Convirtiendo…" : "Convertir a Trato →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
