'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

// ── Types ──────────────────────────────────────────────────────────────────────

type AgendaItem = {
  id: string; orden: number; tipo: string; titulo: string;
  descripcion: string | null; placeholder: string | null;
  respuesta: string | null; completado: boolean;
};

type JuntaConAgenda = {
  id: string; titulo: string; area: string; tipo: string;
  fecha: string; duracionMin: number; estado: string;
  agendaItems: AgendaItem[];
  participantes: { user: { id: string; name: string } }[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getLunesActual(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getISOWeek(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function fmtRango(lunes: Date): string {
  const dom = new Date(lunes); dom.setDate(lunes.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${lunes.toLocaleDateString('es-MX', opts)} – ${dom.toLocaleDateString('es-MX', { ...opts, year: 'numeric' })}`;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const TIPO_LABEL: Record<string, string> = {
  RESULTADOS: 'Resultados', COMPROMISOS: 'Compromisos', BLOQUEO: 'Bloqueo',
  DECISION: 'Decisión', ACUERDO: 'Acuerdo', AVISO: 'Aviso',
  RECONOCIMIENTO: 'Reconocimiento', KPI_REVIEW: 'KPIs', CUSTOM: 'Agenda',
};

// ── Save Indicator ─────────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  if (status === 'idle') return null;
  return (
    <span className={`text-[11px] transition-all ${
      status === 'saving' ? 'text-gray-500' : 'text-green-500'
    }`}>
      {status === 'saving' ? 'Guardando...' : 'Guardado ✓'}
    </span>
  );
}

// ── Agenda Item Editor ─────────────────────────────────────────────────────────

function AgendaItemEditor({
  item, juntaId, onSaveStart, onSaveEnd,
}: {
  item: AgendaItem;
  juntaId: string;
  onSaveStart: () => void;
  onSaveEnd: () => void;
}) {
  const [respuesta, setRespuesta] = useState(item.respuesta ?? '');
  const [completado, setCompletado] = useState(item.completado);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (data: { respuesta?: string; completado?: boolean }) => {
    onSaveStart();
    await fetch(`/api/juntas/${juntaId}/agenda-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    onSaveEnd();
  }, [juntaId, item.id, onSaveStart, onSaveEnd]);

  function handleRespuesta(val: string) {
    setRespuesta(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save({ respuesta: val }), 800);
  }

  function handleToggle() {
    const next = !completado;
    setCompletado(next);
    save({ completado: next });
  }

  const tipoLabel = TIPO_LABEL[item.tipo] ?? item.tipo;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      completado ? 'border-[#1a1a1a] opacity-60' : 'border-[#222]'
    }`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          onClick={handleToggle}
          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            completado ? 'bg-green-500 border-green-500' : 'border-[#333] hover:border-[#B3985B]'
          }`}
        >
          {completado && <span className="text-white text-[10px] leading-none">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#B3985B]">
              {tipoLabel}
            </span>
            <span className="text-gray-700 text-[9px]">·</span>
            <span className="text-gray-600 text-[9px]">{item.orden}</span>
          </div>
          <p className={`text-sm font-medium mb-2 ${
            completado ? 'text-gray-600 line-through' : 'text-white'
          }`}>
            {item.titulo}
          </p>
          {item.descripcion && (
            <p className="text-[11px] text-gray-600 mb-2">{item.descripcion}</p>
          )}
          <textarea
            value={respuesta}
            onChange={(e) => handleRespuesta(e.target.value)}
            rows={3}
            placeholder={item.placeholder ?? 'Escribe las notas de preparación...'}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

// ── Tab de Junta ───────────────────────────────────────────────────────────────

function JuntaTab({ junta }: { junta: JuntaConAgenda }) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSaveStart() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
  }

  function handleSaveEnd() {
    setSaveStatus('saved');
    saveTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Junta info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{junta.titulo}</p>
          <p className="text-xs text-gray-500">
            {new Date(junta.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{fmtFecha(junta.fecha)}
            {' · '}{junta.duracionMin} min
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <a
            href={`/juntas/${junta.id}`}
            className="text-xs text-[#B3985B] hover:underline"
          >
            Abrir conductor →
          </a>
        </div>
      </div>

      {/* Participantes */}
      {junta.participantes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {junta.participantes.map((p) => (
            <span key={p.user.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400">
              {p.user.name}
            </span>
          ))}
        </div>
      )}

      {/* Agenda items */}
      <div className="space-y-2">
        {junta.agendaItems.map((item) => (
          <AgendaItemEditor
            key={item.id}
            item={item}
            juntaId={junta.id}
            onSaveStart={handleSaveStart}
            onSaveEnd={handleSaveEnd}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = ['GLOBAL', 'ADMINISTRACION', 'MARKETING', 'PRODUCCION'];
const TAB_LABELS: Record<string, string> = {
  GLOBAL: '🌐 Global', ADMINISTRACION: '🏢 Admón', MARKETING: '📣 Marketing', PRODUCCION: '⚙️ Producción',
};
const AREA_LABEL: Record<string, string> = {
  GLOBAL: '🌐 Global', ADMINISTRACION: '🏢 Administración',
  MARKETING: '📣 Marketing', PRODUCCION: '⚙️ Producción',
};

export default function PrepararSemanaPage() {
  const toast = useToast();

  // Week state: offset in weeks from this week (0 = this week, 1 = next, etc.)
  const [weekOffset, setWeekOffset] = useState(1); // default: next week

  const getLunes = useCallback(() => {
    const l = getLunesActual();
    l.setDate(l.getDate() + weekOffset * 7);
    return l;
  }, [weekOffset]);

  const [juntas,   setJuntas]   = useState<JuntaConAgenda[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('GLOBAL');

  const cargar = useCallback(async () => {
    setLoading(true);
    const lunes   = getLunes();
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const from = lunes.toISOString().slice(0, 10);
    const to   = domingo.toISOString().slice(0, 10);
    const res = await fetch(`/api/juntas?from=${from}&to=${to}`);
    const data = await res.json();
    setJuntas(data.juntas ?? []);
    setLoading(false);
  }, [getLunes]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleCrear() {
    setCreating(true);
    const lunes = getLunes();
    const semana = getISOWeek(lunes);
    const anio   = lunes.getFullYear();
    const res = await fetch('/api/juntas/preparar-semana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        semana,
        anio,
        fechaLunes: lunes.toISOString().slice(0, 10),
      }),
    });
    setCreating(false);
    if (res.ok) {
      const data = await res.json();
      setJuntas(data.juntas);
      toast.success('Juntas de la semana creadas');
    } else {
      toast.error('Error al crear juntas');
    }
  }

  const lunes   = getLunes();
  const semana  = getISOWeek(lunes);
  const anio    = lunes.getFullYear();
  const rango   = fmtRango(lunes);
  const hayJuntas = juntas.length >= 4;

  const juntaDelTab = juntas.find((j) => j.area === activeTab);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/juntas" className="text-gray-600 hover:text-white text-sm transition-colors">← Juntas</Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-semibold mb-1">Preparación</p>
            <h1 className="ms-h1">Preparar semana</h1>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl">
        {/* Week selector */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setWeekOffset((v) => v - 1)}
            className="w-8 h-8 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-colors flex items-center justify-center"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-white font-semibold">Semana {semana} · {anio}</p>
            <p className="text-gray-500 text-sm">{rango}</p>
          </div>
          <button
            onClick={() => setWeekOffset((v) => v + 1)}
            className="w-8 h-8 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-colors flex items-center justify-center"
          >
            →
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-600">Cargando...</div>
        ) : !hayJuntas ? (
          /* ── Empty state ── */
          <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl p-12 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-white font-semibold mb-1">No hay juntas para esta semana</p>
            <p className="text-gray-500 text-sm mb-6">
              Crea las 4 juntas de la semana (Global + 3 de área) con un solo click.
            </p>
            <button
              onClick={handleCrear}
              disabled={creating}
              className="bg-[#B3985B] text-black font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#c9a96a] disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creando juntas...' : 'Crear juntas de esta semana →'}
            </button>
          </div>
        ) : (
          /* ── Juntas exist: show tabs ── */
          <div>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1">
              {TABS.map((area) => {
                const j = juntas.find((x) => x.area === area);
                return (
                  <button
                    key={area}
                    onClick={() => setActiveTab(area)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === area
                        ? 'bg-[#1a1a1a] text-white border border-[#2a2a2a]'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {TAB_LABELS[area]}
                    {j && (
                      <span className={`ml-1 inline-block w-1.5 h-1.5 rounded-full ${
                        j.estado === 'COMPLETADA' ? 'bg-green-500' :
                        j.estado === 'EN_CURSO' ? 'bg-[#B3985B]' : 'bg-[#333]'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {juntaDelTab ? (
              <JuntaTab junta={juntaDelTab} />
            ) : (
              <div className="text-center py-12 text-gray-600">
                <p>No hay junta de {AREA_LABEL[activeTab] ?? activeTab} para esta semana</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
