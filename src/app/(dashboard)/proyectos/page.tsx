"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ESTADO_PROYECTO_LABELS, TIPO_EVENTO_LABELS } from "@/lib/constants";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

type Proyecto = {
  id: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  tipoEvento: string;
  tipoServicio: string | null;
  fechaEvento: string;
  lugarEvento: string | null;
  avance: number;
  liquidacionCobrada: boolean;
  cliente: { id: string; nombre: string; empresa: string | null };
  cotizacion: { id: string; granTotal: number } | null;
};

const TABS = [
  { key: 'PLANEACION', label: 'Planeación' },
  { key: 'EN_CURSO',   label: 'En Curso' },
  { key: 'COMPLETADO', label: 'Completado' },
  { key: 'CANCELADO',  label: 'Cancelado' },
];

const TIPO_EVENTO_BORDER: Record<string, string> = {
  MUSICAL:     'border-l-indigo-500/30',
  SOCIAL:      'border-l-rose-500/30',
  EMPRESARIAL: 'border-l-cyan-500/30',
  OTRO:        'border-l-transparent',
};
const TIPO_EVENTO_DOT: Record<string, string> = {
  MUSICAL:     'bg-indigo-400/60',
  SOCIAL:      'bg-rose-400/60',
  EMPRESARIAL: 'bg-cyan-400/60',
  OTRO:        'bg-gray-600/50',
};
const TIPO_EVENTO_TEXT: Record<string, string> = {
  MUSICAL:     'text-indigo-400/70',
  SOCIAL:      'text-rose-400/70',
  EMPRESARIAL: 'text-cyan-400/70',
  OTRO:        'text-gray-500',
};

const TIPO_SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: 'Producción',
  RENTA:              'Renta',
  DIRECCION_TECNICA:  'Dirección',
};

const ESTADO_BADGE_COLORS: Record<string, string> = {
  PLANEACION: 'text-blue-400/70 border-blue-500/20',
  EN_CURSO:   'text-yellow-400/70 border-yellow-500/20',
  COMPLETADO: 'text-gray-400/60 border-gray-500/20',
  CANCELADO:  'text-red-400/60 border-red-500/20',
};
const ESTADO_BADGE_LABELS: Record<string, string> = {
  PLANEACION: 'Planeación',
  EN_CURSO:   'En Curso',
  COMPLETADO: 'Completado',
  CANCELADO:  'Cancelado',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

function fmtFecha(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso.substring(0, 10) + 'T12:00:00Z').toLocaleDateString('es-MX', {
      timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function ProyectoRow({ p, onEliminar, deletingId }: {
  p: Proyecto;
  onEliminar: () => void;
  deletingId: string | null;
}) {
  return (
    <div className={`group flex items-center gap-2 px-3 py-2.5 hover:bg-[#0a0a0a] border-b border-[#0f0f0f] last:border-0 transition-colors border-l-2 ${TIPO_EVENTO_BORDER[p.tipoEvento] ?? 'border-l-transparent'}`}>

      {/* Nombre + número */}
      <Link href={`/proyectos/${p.id}`} className="flex-1 min-w-0 cursor-pointer">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TIPO_EVENTO_DOT[p.tipoEvento] ?? 'bg-gray-600/50'}`} />
          <p className="text-white text-sm font-medium leading-snug truncate">{p.cliente.nombre}</p>
        </div>
        <p className="text-gray-600 text-[11px] truncate pl-3 mt-0.5">
          {p.numeroProyecto}
          {p.nombre && p.nombre !== p.cliente.nombre && ` · ${p.nombre}`}
        </p>
      </Link>

      {/* Tipo evento */}
      <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded border border-[#1a1a1a] shrink-0 whitespace-nowrap ${TIPO_EVENTO_TEXT[p.tipoEvento] ?? 'text-gray-500'}`}>
        {TIPO_EVENTO_LABELS[p.tipoEvento] ?? p.tipoEvento}
      </span>

      {/* Estado badge */}
      {(() => {
        const estadoNorm = p.estado === 'CONFIRMADO' ? 'PLANEACION'
          : p.estado === 'PENDIENTE_CIERRE' ? 'EN_CURSO'
          : p.estado;
        return (
          <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded border shrink-0 whitespace-nowrap ${
            ESTADO_BADGE_COLORS[estadoNorm] ?? 'text-gray-500 border-gray-500/20'
          }`}>
            {ESTADO_BADGE_LABELS[estadoNorm] ?? estadoNorm}
          </span>
        );
      })()}

      {/* Tipo servicio */}
      {p.tipoServicio && (
        <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded border border-[#1a1a1a] text-gray-500 shrink-0 whitespace-nowrap">
          {TIPO_SERVICIO_LABELS[p.tipoServicio] ?? p.tipoServicio}
        </span>
      )}

      {/* Venue */}
      {p.lugarEvento && (
        <span className="hidden md:inline text-[10px] text-gray-600 shrink-0 truncate max-w-[120px]">{p.lugarEvento}</span>
      )}

      {/* Fecha */}
      <span className="hidden sm:inline text-[11px] text-gray-500 shrink-0 whitespace-nowrap">{fmtFecha(p.fechaEvento)}</span>

      {/* Monto */}
      {p.cotizacion?.granTotal ? (
        <span className="hidden lg:inline text-[11px] text-[#B3985B] shrink-0 whitespace-nowrap">{formatCurrency(p.cotizacion.granTotal)}</span>
      ) : null}

      {/* Avance */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <div className="w-16 h-0.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#B3985B] transition-all" style={{ width: `${p.avance}%` }} />
        </div>
        <span className="text-[10px] text-gray-600 tabular-nums w-7">{p.avance}%</span>
      </div>

      {/* Eliminar */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onEliminar(); }}
        disabled={deletingId === p.id}
        className="shrink-0 text-[#2a2a2a] hover:text-red-500/60 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100"
        title="Eliminar proyecto"
      >
        {deletingId === p.id ? (
          <span className="text-[10px] text-gray-600">...</span>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tabActivo, setTabActivo] = useState<string>('PLANEACION');
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetch('/api/proyectos')
      .then(r => r.json())
      .then(d => setProyectos(d.proyectos ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function eliminar(p: Proyecto) {
    const ok = await confirm({ message: `¿Eliminar el proyecto "${p.nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: 'Eliminar' });
    if (!ok) return;
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/proyectos/${p.id}`, { method: 'DELETE' });
      if (res.ok) { setProyectos(prev => prev.filter(x => x.id !== p.id)); toast.success('Proyecto eliminado'); }
      else { const d = await res.json(); toast.error(d.error ?? 'Error al eliminar'); }
    } finally { setDeletingId(null); }
  }

  const q = busqueda.toLowerCase();
  const tabProyectos = proyectos
    .filter(p => {
      // Map old states to new tabs gracefully
      const estadoMapped = p.estado === 'CONFIRMADO' ? 'PLANEACION'
        : p.estado === 'PENDIENTE_CIERRE' ? 'EN_CURSO'
        : p.estado;
      const matchTab = estadoMapped === tabActivo;
      const matchTipo = !filtroTipo || p.tipoEvento === filtroTipo;
      const matchSearch = !q ||
        p.cliente.nombre.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.numeroProyecto.toLowerCase().includes(q) ||
        (p.lugarEvento ?? '').toLowerCase().includes(q);
      return matchTab && matchTipo && matchSearch;
    })
    .sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime());

  // Split past vs upcoming
  const hoyStr = new Date().toISOString().slice(0, 10);
  const proximos = tabProyectos.filter(p => p.fechaEvento.slice(0, 10) >= hoyStr);
  const pasados  = tabProyectos.filter(p => p.fechaEvento.slice(0, 10) < hoyStr)
    .sort((a, b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime());

  // Group proximos by month
  function groupByMonth(list: Proyecto[]) {
    const groups: { ym: string; label: string; items: Proyecto[] }[] = [];
    for (const p of list) {
      const ym = p.fechaEvento.slice(0, 7);
      const [y, m] = ym.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      const existing = groups.find(g => g.ym === ym);
      if (existing) existing.items.push(p);
      else groups.push({ ym, label, items: [p] });
    }
    return groups;
  }

  const grupos = groupByMonth(proximos);

  function tabCount(key: string) {
    return proyectos.filter(p => {
      const mapped = p.estado === 'CONFIRMADO' ? 'PLANEACION'
        : p.estado === 'PENDIENTE_CIERRE' ? 'EN_CURSO'
        : p.estado;
      return mapped === key;
    }).length;
  }

  const renderRow = (p: Proyecto) => (
    <ProyectoRow key={p.id} p={p} onEliminar={() => eliminar(p)} deletingId={deletingId} />
  );

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Proyectos de evento</h1>
          <p className="text-[#6b7280] text-sm">
            {loading ? 'Cargando...' : `${proyectos.length} proyectos`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, número o venue..."
          className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs">✕</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#111] mb-4 overflow-x-auto">
        {TABS.map(({ key, label }) => {
          const count = tabCount(key);
          return (
            <button
              key={key}
              onClick={() => setTabActivo(key)}
              className={`relative flex items-center gap-1 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                tabActivo === key ? 'text-white' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden text-[10px] font-semibold">{label.slice(0, 4)}</span>
              <span className={`text-[10px] tabular-nums ${
                tabActivo === key ? 'text-gray-400' : 'text-gray-700'
              }`}>({count})</span>
              {tabActivo === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B3985B] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filtro tipo */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Tipo:</span>
        {([null, 'MUSICAL', 'SOCIAL', 'EMPRESARIAL', 'OTRO'] as const).map(tipo => (
          <button
            key={tipo ?? 'todos'}
            onClick={() => setFiltroTipo(tipo)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              filtroTipo === tipo
                ? 'border-[#B3985B]/40 text-[#B3985B] bg-[#B3985B]/5'
                : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            {tipo === null ? 'Todos' : TIPO_EVENTO_LABELS[tipo] ?? tipo}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonPage rows={6} cols={3} />
      ) : tabProyectos.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
          <p className="text-gray-600 text-sm">{busqueda ? 'Sin resultados' : `No hay proyectos en ${ESTADO_PROYECTO_LABELS[tabActivo] ?? tabActivo}`}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Próximos — grouped by month */}
          {grupos.map(g => (
            <div key={g.ym}>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-600 font-semibold capitalize">{g.label}</p>
                <div className="h-px flex-1 bg-[#111]" />
                <span className="text-[10px] text-gray-700">{g.items.length}</span>
              </div>
              <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
                {g.items.map(renderRow)}
              </div>
            </div>
          ))}

          {/* Pasados */}
          {pasados.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-[#111]" />
                <p className="text-[10px] uppercase tracking-wider text-gray-700">Eventos pasados</p>
                <div className="h-px flex-1 bg-[#111]" />
              </div>
              <div className="rounded-xl border border-[#1a1a1a] overflow-hidden opacity-50">
                {pasados.map(renderRow)}
              </div>
            </div>
          )}

          {proximos.length === 0 && pasados.length === 0 && (
            <div className="text-center py-16 text-gray-700">
              <p className="text-sm">Sin proyectos en esta sección</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
