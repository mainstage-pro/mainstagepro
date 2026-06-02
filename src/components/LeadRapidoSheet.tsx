'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/Toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
}

interface ClienteSugerencia {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  clasificacion: string;
}

export function LeadRapidoSheet({ open, onOpenChange, onLeadCreated }: Props) {
  const toast = useToast();

  const [clienteMode, setClienteMode] = useState<'existente' | 'nuevo'>('nuevo');
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState<ClienteSugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteSugerencia | null>(null);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const busquedaRef = useRef<HTMLInputElement>(null);
  const sugerenciasRef = useRef<HTMLDivElement>(null);

  const [leadForm, setLeadForm] = useState({
    nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '',
    notasIniciales: '', fechaProximaAccion: '', fechaEvento: '',
  });
  const [fechaEventoSinDefinir, setFechaEventoSinDefinir] = useState(false);
  const [guardandoLead, setGuardandoLead] = useState(false);
  const [leadCreado, setLeadCreado] = useState<{ id: string; nombre: string } | null>(null);

  // Debounce search
  useEffect(() => {
    if (clienteMode !== 'existente') return;
    if (!busqueda.trim() || busqueda.length < 2) { setSugerencias([]); return; }

    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(busqueda.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSugerencias(data.clientes ?? data ?? []);
          setShowSugerencias(true);
        }
      } finally {
        setBuscando(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [busqueda, clienteMode]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        sugerenciasRef.current && !sugerenciasRef.current.contains(e.target as Node) &&
        busquedaRef.current && !busquedaRef.current.contains(e.target as Node)
      ) {
        setShowSugerencias(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function resetLocalState() {
    setLeadCreado(null);
    setLeadForm({ nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '', notasIniciales: '', fechaProximaAccion: '', fechaEvento: '' });
    setFechaEventoSinDefinir(false);
    setBusqueda('');
    setSugerencias([]);
    setClienteSeleccionado(null);
    setShowSugerencias(false);
    setClienteMode('nuevo');
  }


  async function crearLead() {
    const nombre = clienteMode === 'existente'
      ? clienteSeleccionado?.nombre ?? ''
      : leadForm.nombre.trim();
    if (!nombre || !leadForm.origenLead) return;

    setGuardandoLead(true);
    try {
      const body: Record<string, unknown> = {
        tipoProspecto: 'NURTURING',
        origenLead: leadForm.origenLead,
        tipoEvento: leadForm.tipoEvento || 'OTRO',
        nombreEvento: leadForm.notasIniciales.trim() || 'Lead sin evento definido',
        fechaEventoEstimada: (!fechaEventoSinDefinir && leadForm.fechaEvento) ? leadForm.fechaEvento : null,
      };

      if (clienteMode === 'existente' && clienteSeleccionado) {
        body.clienteId = clienteSeleccionado.id;
      } else {
        body.clienteNuevo = { nombre: leadForm.nombre.trim(), telefono: leadForm.telefono || null };
      }

      if (leadForm.fechaProximaAccion) {
        body.primerSeguimiento = { fecha: leadForm.fechaProximaAccion, canal: 'whatsapp' };
        body.fechaProximaAccion = leadForm.fechaProximaAccion;
      }

      const res = await fetch('/api/tratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error('Error al crear lead'); return; }
      const { trato } = await res.json();
      toast.success('Lead registrado ✓');
      onLeadCreated?.();
      setLeadCreado({ id: trato.id, nombre });
      setLeadForm({ nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '', notasIniciales: '', fechaProximaAccion: '', fechaEvento: '' });
      setFechaEventoSinDefinir(false);
    } finally {
      setGuardandoLead(false);
    }
  }


  const canSubmit = clienteMode === 'existente'
    ? !!clienteSeleccionado
    : !!leadForm.nombre.trim();

  return (
    <Sheet open={open} onOpenChange={(isOpen: boolean) => { onOpenChange(isOpen); if (!isOpen) resetLocalState(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-[#0d0d0d] border-l border-[#1e1e1e]">
        <SheetHeader>
          <SheetTitle className="text-white">Registrar lead</SheetTitle>
          <p className="text-gray-500 text-xs">Se guardará en el CRM automáticamente</p>
        </SheetHeader>

        {!leadCreado ? (
          <div className="mt-6 space-y-4 px-4 pb-6">

            {/* Toggle cliente existente / nuevo */}
            <div className="flex rounded-lg border border-[#2a2a2a] overflow-hidden">
              <button
                onClick={() => { setClienteMode('existente'); setClienteSeleccionado(null); setBusqueda(''); }}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  clienteMode === 'existente'
                    ? 'bg-[#B3985B] text-black'
                    : 'bg-[#111] text-gray-500 hover:text-gray-300'
                }`}
              >
                Cliente existente
              </button>
              <button
                onClick={() => { setClienteMode('nuevo'); setClienteSeleccionado(null); setBusqueda(''); }}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  clienteMode === 'nuevo'
                    ? 'bg-[#B3985B] text-black'
                    : 'bg-[#111] text-gray-500 hover:text-gray-300'
                }`}
              >
                Cliente nuevo
              </button>
            </div>

            {/* Búsqueda de cliente existente */}
            {clienteMode === 'existente' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Buscar cliente *</label>
                {clienteSeleccionado ? (
                  <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#B3985B]/40 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{clienteSeleccionado.nombre}</p>
                      {clienteSeleccionado.empresa && (
                        <p className="text-xs text-gray-500 truncate">{clienteSeleccionado.empresa}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setClienteSeleccionado(null); setBusqueda(''); setTimeout(() => busquedaRef.current?.focus(), 50); }}
                      className="text-gray-600 hover:text-gray-300 text-lg leading-none shrink-0"
                    >×</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={busquedaRef}
                      value={busqueda}
                      onChange={e => { setBusqueda(e.target.value); setShowSugerencias(true); }}
                      onFocus={() => busqueda.length >= 2 && setShowSugerencias(true)}
                      placeholder="Nombre o empresa..."
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] pr-8"
                    />
                    {buscando && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {showSugerencias && sugerencias.length > 0 && (
                      <div ref={sugerenciasRef} className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                        {sugerencias.map(c => (
                          <button
                            key={c.id}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setClienteSeleccionado(c); setBusqueda(''); setShowSugerencias(false); }}
                            className="w-full px-3 py-2.5 text-left hover:bg-[#1a1a1a] transition-colors flex items-center gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-full bg-[#B3985B]/20 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-[#B3985B]">{c.nombre.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{c.nombre}</p>
                              {c.empresa && <p className="text-[10px] text-gray-500 truncate">{c.empresa}</p>}
                            </div>
                            {c.clasificacion === 'PRIORITY' && (
                              <span className="text-[9px] text-[#B3985B] border border-[#B3985B]/30 rounded px-1 shrink-0">PRIORITY</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {showSugerencias && busqueda.length >= 2 && !buscando && sugerencias.length === 0 && (
                      <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-3 text-xs text-gray-600">
                        Sin resultados — prueba con otro nombre
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Campos nuevo cliente */}
            {clienteMode === 'nuevo' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nombre o empresa *</label>
                  <input value={leadForm.nombre} onChange={e => setLeadForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej. María García" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Teléfono / WhatsApp</label>
                  <input value={leadForm.telefono} onChange={e => setLeadForm(p => ({ ...p, telefono: e.target.value }))}
                    placeholder="+52 55 0000 0000" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">¿De dónde llegó? *</label>
              <select value={leadForm.origenLead} onChange={e => setLeadForm(p => ({ ...p, origenLead: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="ORGANICO">Orgánico</option>
                <option value="META_ADS">Meta Ads (Facebook/Instagram)</option>
                <option value="GOOGLE_ADS">Google Ads</option>
                <option value="REFERIDO">Referido</option>
                <option value="RECOMPRA">Recompra / cliente anterior</option>
                <option value="PROSPECCION">Prospección</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo de evento</label>
              <select value={leadForm.tipoEvento} onChange={e => setLeadForm(p => ({ ...p, tipoEvento: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">— Sin definir —</option>
                <option value="SOCIAL">Social</option>
                <option value="MUSICAL">Musical</option>
                <option value="EMPRESARIAL">Empresarial</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Fecha del evento</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fechaEventoSinDefinir ? '' : leadForm.fechaEvento}
                  disabled={fechaEventoSinDefinir}
                  onChange={e => setLeadForm(p => ({ ...p, fechaEvento: e.target.value }))}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] disabled:opacity-30"
                />
                <button
                  type="button"
                  onClick={() => { setFechaEventoSinDefinir(p => !p); setLeadForm(p => ({ ...p, fechaEvento: '' })); }}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    fechaEventoSinDefinir
                      ? 'bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Aún no se define
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Lo que busca / contexto</label>
              <textarea value={leadForm.notasIniciales} onChange={e => setLeadForm(p => ({ ...p, notasIniciales: e.target.value }))}
                placeholder="Boda en junio, busca sonido e iluminación..."
                rows={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Próximo seguimiento</label>
              <input type="date" value={leadForm.fechaProximaAccion}
                onChange={e => setLeadForm(p => ({ ...p, fechaProximaAccion: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <button onClick={crearLead} disabled={guardandoLead || !canSubmit}
              className="w-full px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40 mt-2">
              {guardandoLead ? 'Registrando...' : 'Registrar lead'}
            </button>
          </div>
        ) : (
          <div className="mt-6 px-4 pb-6">
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4 mb-4">
              <p className="text-emerald-400 font-medium text-sm">✓ Lead registrado</p>
              <p className="text-gray-400 text-xs mt-0.5">{leadCreado.nombre} se guardó en el CRM con seguimiento para mañana</p>
            </div>
            <button onClick={() => { resetLocalState(); onOpenChange(false); }}
              className="w-full px-4 py-2 rounded-lg border border-[#2a2a2a] text-gray-300 text-sm hover:text-white hover:border-[#3a3a3a] transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
