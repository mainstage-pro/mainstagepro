"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EnTaller {
  tipoRegistro: "unidad" | "equipo";
  equipoId: string;
  unidadId: string | null;
  descripcion: string;
  marca: string | null;
  categoria: string | null;
  codigo: string | null;
  notas: string | null;
  tipo: string | null;
  esReparacion: boolean;
  desde: string | null;
  dias: number | null;
  accion: string | null;
  costo: number | null;
}

interface Fuera {
  id: string;
  numeroProyecto: string;
  nombre: string;
  recoleccionStatus: string;
  cliente: string | null;
  empresa: string | null;
  telefono: string | null;
  chofer: string | null;
  choferExterno: boolean;
  fechaDevolucion: string | null;
  vencida: boolean;
  diasAtraso: number;
  equiposCount: number;
}

interface Resumen {
  enReparacion: number;
  enMantenimiento: number;
  equiposFuera: number;
  recoleccionesVencidas: number;
  costoTaller: number;
}

interface Data {
  enTaller: EnTaller[];
  fuera: Fuera[];
  resumen: Resumen;
}

const TIPO_LABEL: Record<string, string> = {
  PREVENTIVO: "Preventivo",
  CORRECTIVO: "Correctivo",
  ESTETICO: "Estético",
  FUNCIONAL: "Funcional",
};

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CAMINO: "En camino",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = iso.length <= 10 ? new Date(iso + "T12:00:00") : new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
function fmtMoney(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}
function diasLabel(d: number | null) {
  if (d == null) return "—";
  if (d === 0) return "hoy";
  return `${d} ${d === 1 ? "día" : "días"}`;
}

export default function TableroProduccionPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/produccion/tablero")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Cargando tablero...</div>
  );

  const r = data?.resumen;
  const enTaller = data?.enTaller ?? [];
  const fuera = data?.fuera ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="ms-h1">Estado de equipos</h1>
        <p className="text-gray-500 text-sm mt-0.5">Estado en vivo del área de producción — equipo en taller y equipo fuera</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { val: r?.enReparacion ?? 0, label: "En reparación", cls: "text-red-400", bg: "bg-red-900/20 border-red-800/30" },
          { val: r?.enMantenimiento ?? 0, label: "En mantenimiento", cls: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/30" },
          { val: r?.equiposFuera ?? 0, label: "Proyectos fuera", cls: "text-blue-400", bg: "bg-blue-900/20 border-blue-800/30" },
          { val: r?.recoleccionesVencidas ?? 0, label: "Recol. vencidas", cls: "text-orange-400", bg: "bg-orange-900/20 border-orange-800/30" },
          { val: fmtMoney(r?.costoTaller ?? 0), label: "Costo en taller", cls: "text-[#B3985B]", bg: "bg-[#B3985B]/10 border-[#B3985B]/30", small: true },
        ].map((m) => (
          <div key={m.label} className={`border rounded-xl p-4 text-center ${m.bg}`}>
            <p className={`font-bold ${m.cls} ${m.small ? "text-xl" : "text-3xl"}`}>{m.val}</p>
            <p className={`text-xs mt-1 uppercase tracking-wider ${m.cls} opacity-70`}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* En taller */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ms-h2">En taller — mantenimiento y reparación ({enTaller.length})</h2>
          <Link href="/inventario/mantenimiento" className="text-xs text-[#B3985B] hover:underline">Ir a mantenimiento →</Link>
        </div>
        {enTaller.length === 0 ? (
          <div className="ms-card p-8 text-center">
            <p className="text-3xl mb-2">🔧</p>
            <p className="text-gray-400 text-sm">Ningún equipo en taller</p>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-[#1a1a1a] text-[11px] uppercase tracking-wider text-gray-500">
              <span className="col-span-4">Equipo</span>
              <span className="col-span-2">Estado</span>
              <span className="col-span-2">Desde</span>
              <span className="col-span-1 text-center">Días</span>
              <span className="col-span-3">Trabajo / costo</span>
            </div>
            {enTaller.map((e, i) => (
              <Link key={`${e.unidadId ?? e.equipoId}-${i}`} href={`/inventario/equipos/${e.equipoId}`}
                className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-t border-[#1c1c1c] hover:bg-[#161616] transition-colors text-sm">
                <div className="col-span-2 md:col-span-4">
                  <p className="text-white font-medium truncate">{e.descripcion}</p>
                  <p className="text-gray-500 text-xs">
                    {e.marca && <span>{e.marca} · </span>}
                    {e.codigo ? `Unidad ${e.codigo}` : e.tipoRegistro === "equipo" ? "Equipo completo" : "Unidad"}
                    {e.categoria && <span className="text-gray-600"> · {e.categoria}</span>}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.esReparacion ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                    {e.esReparacion ? "En reparación" : "Mantenimiento"}
                  </span>
                  {e.tipo && <p className="text-gray-600 text-[11px] mt-0.5">{TIPO_LABEL[e.tipo] ?? e.tipo}</p>}
                </div>
                <div className="md:col-span-2 text-gray-300 text-xs self-center">{fmtDate(e.desde)}</div>
                <div className="md:col-span-1 text-center self-center">
                  <span className={`text-xs font-medium ${(e.dias ?? 0) >= 15 ? "text-red-400" : (e.dias ?? 0) >= 7 ? "text-yellow-400" : "text-gray-400"}`}>
                    {diasLabel(e.dias)}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-3 self-center">
                  {e.accion && <p className="text-gray-400 text-xs truncate">{e.accion}</p>}
                  {e.costo ? <p className="text-[#B3985B] text-xs">{fmtMoney(e.costo)}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Fuera / pendientes de recolección */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ms-h2">Equipo fuera — pendiente de recolección ({fuera.length})</h2>
          <Link href="/inventario/recolecciones" className="text-xs text-[#B3985B] hover:underline">Ir a recolecciones →</Link>
        </div>
        {fuera.length === 0 ? (
          <div className="ms-card p-8 text-center">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-gray-400 text-sm">Sin equipo fuera pendiente de recolectar</p>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-[#1a1a1a] text-[11px] uppercase tracking-wider text-gray-500">
              <span className="col-span-4">Proyecto / cliente</span>
              <span className="col-span-2">Estado</span>
              <span className="col-span-2">Devolución</span>
              <span className="col-span-2 text-center">Atraso</span>
              <span className="col-span-2 text-center">Equipos</span>
            </div>
            {fuera.map((p) => (
              <Link key={p.id} href={`/proyectos/${p.id}`}
                className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-t border-[#1c1c1c] hover:bg-[#161616] transition-colors text-sm ${p.vencida ? "bg-red-900/10" : ""}`}>
                <div className="col-span-2 md:col-span-4">
                  <p className="text-white font-medium truncate">
                    <span className="text-xs font-mono text-gray-500 mr-2">{p.numeroProyecto}</span>
                    {p.nombre}
                  </p>
                  <p className="text-gray-500 text-xs">{p.cliente}{p.empresa && <span className="text-gray-600"> · {p.empresa}</span>}</p>
                </div>
                <div className="md:col-span-2 self-center">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-900/30 text-blue-400">
                    {STATUS_LABEL[p.recoleccionStatus] ?? p.recoleccionStatus}
                  </span>
                </div>
                <div className="md:col-span-2 text-xs self-center">
                  <span className={p.vencida ? "text-red-400 font-medium" : "text-gray-300"}>{fmtDate(p.fechaDevolucion)}</span>
                </div>
                <div className="md:col-span-2 text-center self-center">
                  {p.vencida
                    ? <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full font-medium">⚠ {diasLabel(p.diasAtraso)}</span>
                    : <span className="text-gray-600 text-xs">—</span>}
                </div>
                <div className="md:col-span-2 text-center self-center text-gray-300 text-xs">{p.equiposCount}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
