'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LeadRapidoSheet } from '@/components/LeadRapidoSheet';

const CATEGORIAS = ['SIN_CATEGORIZAR', 'KEEP', 'ATTAIN', 'RECOVER', 'EXPAND'] as const;
type Categoria = typeof CATEGORIAS[number];

const CATEGORIA_LABELS: Record<Categoria, string> = {
  SIN_CATEGORIZAR: 'Sin categorizar',
  KEEP: 'Keep',
  ATTAIN: 'Attain',
  RECOVER: 'Recover',
  EXPAND: 'Expand',
};

const CATEGORIA_EMOJIS: Record<Categoria, string> = {
  SIN_CATEGORIZAR: '❓',
  KEEP: '💚',
  ATTAIN: '🎯',
  RECOVER: '🔄',
  EXPAND: '📈',
};

const DEFAULT_PROTOCOLOS: Record<Categoria, string> = {
  SIN_CATEGORIZAR: 'Clasificar cada cliente antes del lunes',
  KEEP: 'Check-in mensual + contenido de valor',
  ATTAIN: 'Primer contacto → descubrimiento → cotización en 48 hrs',
  RECOVER: 'Propuesta específica basada en su último evento',
  EXPAND: 'Propuesta de upgrade o servicios adicionales',
};

const KARE_DESCRIPTIONS: Record<Exclude<Categoria, 'SIN_CATEGORIZAR'>, string> = {
  KEEP: 'Clientes recurrentes. Mantener relación activa.',
  ATTAIN: 'Prospectos nuevos. Convertir en primera venta.',
  RECOVER: 'Clientes perdidos o inactivos. Recuperar.',
  EXPAND: 'Clientes actuales. Incrementar ticket o frecuencia.',
};

interface UltimoTrato {
  id: string;
  etapa: string;
  fechaCierre: string | null;
  monto: number | null;
  updatedAt: string;
}

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  tipoCliente: string;
  clasificacion: string;
  categoriaKARE: string | null;
  telefono: string | null;
  ultimoTrato: UltimoTrato | null;
  diasSinContacto: number | null;
}

function semaforo(dias: number | null): string {
  if (dias === null) return '⚫';
  if (dias < 30) return '🟢';
  if (dias < 60) return '🟡';
  return '🔴';
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

export default function CarteraPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Categoria>('SIN_CATEGORIZAR');
  const [protocolos, setProtocolos] = useState<Record<Categoria, string>>(DEFAULT_PROTOCOLOS);
  const [editingProtocolo, setEditingProtocolo] = useState(false);
  const [protocoloEdit, setProtocoloEdit] = useState('');
  const [clasificandoId, setClasificandoId] = useState<string | null>(null);
  const [savingClasificacion, setSavingClasificacion] = useState(false);
  const [showLeadSheet, setShowLeadSheet] = useState(false);

  // Load protocolos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cartera-protocolos');
      if (saved) setProtocolos({ ...DEFAULT_PROTOCOLOS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ventas/cartera');
      const data = await res.json();
      setClientes(data.clientes ?? []);
      setConteos(data.conteos ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  function saveProtocolo() {
    const updated = { ...protocolos, [activeTab]: protocoloEdit };
    setProtocolos(updated);
    localStorage.setItem('cartera-protocolos', JSON.stringify(updated));
    setEditingProtocolo(false);
  }

  async function clasificar(clienteId: string, categoria: Categoria) {
    setSavingClasificacion(true);
    try {
      await fetch(`/api/clientes/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoriaKARE: categoria }),
      });
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, categoriaKARE: categoria } : c));
      setConteos(prev => ({
        ...prev,
        SIN_CATEGORIZAR: Math.max(0, (prev.SIN_CATEGORIZAR ?? 0) - 1),
        [categoria]: (prev[categoria] ?? 0) + 1,
      }));
      setClasificandoId(null);
    } finally {
      setSavingClasificacion(false);
    }
  }

  const filteredClientes = clientes.filter(c => (c.categoriaKARE ?? 'SIN_CATEGORIZAR') === activeTab);

  // Sugerencia KARE for a client
  function sugerenciaKARE(c: Cliente): string | null {
    if (!c.ultimoTrato) return 'ATTAIN'; // sin tratos previos
    if (c.ultimoTrato.etapa === 'VENTA_PERDIDA') return 'RECOVER';
    if (c.ultimoTrato.etapa === 'VENTA_CERRADA' && c.diasSinContacto !== null && c.diasSinContacto > 60) return 'EXPAND';
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b border-[#111]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🗂</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cartera de Clientes</h1>
            <p className="text-gray-600 text-xs mt-0.5">Metodología KARE — Keep · Attain · Recover · Expand</p>
          </div>
        </div>

        {/* Conteo chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map(cat => (
            <button key={cat}
              id={`cartera-tab-${cat.toLowerCase()}`}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeTab === cat
                  ? 'bg-[#B3985B] text-black border-[#B3985B]'
                  : 'bg-[#111] border-[#222] text-gray-400 hover:text-white'
              }`}
            >
              <span>{CATEGORIA_EMOJIS[cat]}</span>
              <span>{CATEGORIA_LABELS[cat]}</span>
              <span className={`font-bold ${
                activeTab === cat ? 'text-black' : 'text-white'
              }`}>{conteos[cat] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl">
        {/* Protocol banner */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          {editingProtocolo ? (
            <>
              <input
                id="protocolo-edit-input"
                value={protocoloEdit}
                onChange={e => setProtocoloEdit(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#333] text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#B3985B]"
              />
              <div className="flex gap-2">
                <button id="protocolo-save-btn" onClick={saveProtocolo} className="px-3 py-1 bg-[#B3985B] text-black text-xs font-semibold rounded-lg">Guardar</button>
                <button id="protocolo-cancel-btn" onClick={() => setEditingProtocolo(false)} className="px-3 py-1 bg-[#222] text-gray-400 text-xs rounded-lg">Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-300 flex-1">
                <span className="text-gray-600 text-xs font-semibold uppercase tracking-wider mr-2">Protocolo:</span>
                {protocolos[activeTab]}
              </p>
              <button id="protocolo-edit-btn" onClick={() => { setProtocoloEdit(protocolos[activeTab]); setEditingProtocolo(true); }}
                className="text-gray-600 hover:text-[#B3985B] text-xs shrink-0">✏️ Editar</button>
            </>
          )}
        </div>

        {/* Client list */}
        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 py-8">
            <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin" />
            Cargando clientes...
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">{CATEGORIA_EMOJIS[activeTab]}</p>
            <p>No hay clientes en {CATEGORIA_LABELS[activeTab]}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClientes.map(c => {
              const sug = sugerenciaKARE(c);
              return (
                <div key={c.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 hover:border-[#2a2a2a] transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{c.nombre}</span>
                        {c.empresa && <span className="text-xs text-gray-500">{c.empresa}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                          c.tipoCliente === 'B2B' ? 'text-blue-400 border-blue-800 bg-blue-900/20'
                          : c.tipoCliente === 'B2C' ? 'text-purple-400 border-purple-800 bg-purple-900/20'
                          : 'text-gray-500 border-gray-700'
                        }`}>{c.tipoCliente}</span>
                        {c.clasificacion === 'PRIORITY' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium text-[#B3985B] border-[#B3985B]/40 bg-[#B3985B]/10">PRIORITY</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {c.ultimoTrato ? (
                          <span className="text-xs text-gray-500">
                            Último trato: <span className="text-gray-400">{c.ultimoTrato.etapa}</span>
                            {c.ultimoTrato.monto ? ` · ${fmt(c.ultimoTrato.monto)}` : ''}
                            {c.ultimoTrato.fechaCierre ? ` · cerrado ${new Date(c.ultimoTrato.fechaCierre).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })}` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">Sin tratos</span>
                        )}
                        <span className="text-xs">
                          {semaforo(c.diasSinContacto)}
                          <span className="text-gray-600 ml-1">
                            {c.diasSinContacto !== null ? `${c.diasSinContacto}d sin contacto` : 'Sin historial'}
                          </span>
                        </span>
                      </div>

                      {/* KARE suggestion */}
                      {activeTab === 'SIN_CATEGORIZAR' && sug && (
                        <p className="text-[10px] text-gray-600 mt-1">💡 Sugerencia: {sug}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {activeTab === 'SIN_CATEGORIZAR' && (
                        <div className="relative">
                          <button
                            id={`clasificar-btn-${c.id}`}
                            onClick={() => setClasificandoId(clasificandoId === c.id ? null : c.id)}
                            className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors"
                          >
                            Clasificar
                          </button>
                          {clasificandoId === c.id && (
                            <div className="absolute right-0 top-8 z-10 w-52 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
                              {(['KEEP', 'ATTAIN', 'RECOVER', 'EXPAND'] as const).map(cat => (
                                <button
                                  key={cat}
                                  id={`clasificar-${cat.toLowerCase()}-${c.id}`}
                                  onClick={() => clasificar(c.id, cat)}
                                  disabled={savingClasificacion}
                                  className="w-full px-3 py-2.5 text-left hover:bg-[#1a1a1a] transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{CATEGORIA_EMOJIS[cat]}</span>
                                    <div>
                                      <p className="text-xs font-semibold text-white">{CATEGORIA_LABELS[cat]}</p>
                                      <p className="text-[10px] text-gray-500">{KARE_DESCRIPTIONS[cat]}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        id={`registrar-contacto-${c.id}`}
                        onClick={() => setShowLeadSheet(true)}
                        className="px-3 py-1.5 bg-[#111] border border-[#222] text-gray-400 hover:text-white text-xs rounded-lg transition-colors"
                      >
                        Registrar contacto
                      </button>
                      <button
                        id={`ver-historial-${c.id}`}
                        onClick={() => router.push(`/crm/clientes/${c.id}`)}
                        className="px-3 py-1.5 bg-[#111] border border-[#222] text-gray-400 hover:text-white text-xs rounded-lg transition-colors"
                      >
                        Ver historial
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LeadRapidoSheet for "Registrar contacto" */}
      <LeadRapidoSheet
        open={showLeadSheet}
        onOpenChange={setShowLeadSheet}
        onLeadCreated={fetchClientes}
      />
    </div>
  );
}
