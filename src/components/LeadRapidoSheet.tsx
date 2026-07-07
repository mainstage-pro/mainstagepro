'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/Toast';
import { ORIGEN_LEAD_OPTIONS } from '@/lib/constants';


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

// Opciones de origen importadas de constants (fuente única de verdad)
const ORIGEN_OPTIONS = ORIGEN_LEAD_OPTIONS.map(o => ({
  ...o,
  label: o.label, // mantener compatibilidad con el render de tarjetas
}));


const TIPO_EVENTO_OPTIONS = [
  { value: '',           label: '— Sin definir —' },
  { value: 'SOCIAL',     label: 'Social (Boda, XV, Graduación…)' },
  { value: 'MUSICAL',    label: 'Musical (Concierto, Festival…)' },
  { value: 'EMPRESARIAL',label: 'Empresarial (Conferencia, Lanzamiento…)' },
  { value: 'VARIOS',     label: 'Varios / por definir' },
];

export function LeadRapidoSheet({ open, onOpenChange, onLeadCreated }: Props) {
  const toast = useToast();

  const [clienteMode, setClienteMode] = useState<'existente' | 'nuevo'>('nuevo');
  const [busqueda, setBusqueda]       = useState('');
  const [sugerencias, setSugerencias] = useState<ClienteSugerencia[]>([]);
  const [buscando, setBuscando]       = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteSugerencia | null>(null);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const busquedaRef   = useRef<HTMLInputElement>(null);
  const sugerenciasRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    nombre:         '',
    telefono:       '',
    correo:         '',
    origenLead:     'META_ADS',
    tipoEvento:     '',
    fechaEvento:    '',
    notasIniciales: '',
  });
  const [fechaSinDefinir, setFechaSinDefinir] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado]       = useState<{ clienteId: string; nombre: string } | null>(null);

  // ── Debounce búsqueda de clientes ──────────────────────────────────────────
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

  // ── Cerrar dropdown al click fuera ─────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        sugerenciasRef.current && !sugerenciasRef.current.contains(e.target as Node) &&
        busquedaRef.current   && !busquedaRef.current.contains(e.target as Node)
      ) setShowSugerencias(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function reset() {
    setCreado(null);
    setForm({ nombre: '', telefono: '', correo: '', origenLead: 'META_ADS', tipoEvento: '', fechaEvento: '', notasIniciales: '' });
    setFechaSinDefinir(false);
    setBusqueda('');
    setSugerencias([]);
    setClienteSeleccionado(null);
    setShowSugerencias(false);
    setClienteMode('nuevo');
  }

  // ── Crear prospecto ─────────────────────────────────────────────────────────
  async function guardar() {
    const nombre = clienteMode === 'existente'
      ? clienteSeleccionado?.nombre ?? ''
      : form.nombre.trim();
    if (!nombre) return;

    setGuardando(true);
    try {
      const body: Record<string, unknown> = {
        origenLead:     form.origenLead,
        tipoEvento:     form.tipoEvento || 'VARIOS',
        notasIniciales: form.notasIniciales.trim() || null,
        fechaEventoEstimada: (!fechaSinDefinir && form.fechaEvento) ? form.fechaEvento : null,
      };

      if (clienteMode === 'existente' && clienteSeleccionado) {
        body.clienteId = clienteSeleccionado.id;
      } else {
        body.clienteNuevo = {
          nombre:   form.nombre.trim(),
          telefono: form.telefono.trim() || null,
          correo:   form.correo.trim()   || null,
        };
      }

      const res = await fetch('/api/prospeccion', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Error al crear prospecto');
        return;
      }

      const data = await res.json();
      toast.success('Prospecto registrado ✓');
      onLeadCreated?.();
      setCreado({ clienteId: data.prospeccion?.clienteId ?? '', nombre });
    } finally {
      setGuardando(false);
    }
  }

  const canSubmit = clienteMode === 'existente'
    ? !!clienteSeleccionado
    : !!form.nombre.trim();

  // ─── Shared input class ───────────────────────────────────────────────────
  const inputCls = 'w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] transition-colors placeholder:text-gray-600';

  return (
    <Sheet open={open} onOpenChange={(isOpen: boolean) => { onOpenChange(isOpen); if (!isOpen) reset(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-[#0a0a0a] border-l border-[#1a1a1a]">
        <SheetHeader className="pb-0">
          <SheetTitle className="text-white text-base font-semibold">Nuevo Prospecto</SheetTitle>
          <p className="text-gray-600 text-xs mt-0.5">Se guarda en CRM · sin cotización activa</p>
        </SheetHeader>

        {!creado ? (
          <div className="mt-5 space-y-4 px-1 pb-6">

            {/* ── Toggle cliente ── */}
            <div className="flex rounded-lg border border-[#1e1e1e] overflow-hidden text-xs font-semibold">
              {(['existente', 'nuevo'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setClienteMode(m); setClienteSeleccionado(null); setBusqueda(''); }}
                  className={`flex-1 py-2 transition-colors ${
                    clienteMode === m
                      ? 'bg-[#B3985B] text-black'
                      : 'bg-[#111] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {m === 'existente' ? 'Cliente existente' : 'Cliente nuevo'}
                </button>
              ))}
            </div>

            {/* ── Búsqueda cliente existente ── */}
            {clienteMode === 'existente' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Buscar cliente *</label>
                {clienteSeleccionado ? (
                  <div className="flex items-center gap-2 bg-[#111] border border-[#B3985B]/30 rounded-lg px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-[#B3985B]/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#B3985B]">{clienteSeleccionado.nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{clienteSeleccionado.nombre}</p>
                      {clienteSeleccionado.empresa && <p className="text-xs text-gray-500 truncate">{clienteSeleccionado.empresa}</p>}
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
                      className={inputCls}
                    />
                    {buscando && <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />}
                    {showSugerencias && sugerencias.length > 0 && (
                      <div ref={sugerenciasRef} className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
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
                      <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111] border border-[#222] rounded-xl px-3 py-3 text-xs text-gray-600">
                        Sin resultados — prueba con otro nombre
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Datos de cliente nuevo ── */}
            {clienteMode === 'nuevo' && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre completo *</label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej. María García"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Teléfono / WhatsApp</label>
                    <input
                      value={form.telefono}
                      onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                      placeholder="+52 55 0000 0000"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Correo</label>
                    <input
                      type="email"
                      value={form.correo}
                      onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
                      placeholder="hola@email.com"
                      className={inputCls}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Separador ── */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-[#1a1a1a]" />
              <span className="text-[10px] text-gray-700 uppercase tracking-widest">Contexto</span>
              <div className="flex-1 h-px bg-[#1a1a1a]" />
            </div>

            {/* ── Origen ── */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">¿De dónde llegó? *</label>
              <div className="grid grid-cols-2 gap-2">
                {ORIGEN_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, origenLead: o.value }))}
                    className={`px-2 py-1.5 rounded-lg border text-xs text-left transition-colors ${
                      form.origenLead === o.value
                        ? 'bg-[#B3985B]/15 border-[#B3985B]/50 text-[#B3985B]'
                        : 'bg-[#111] border-[#1e1e1e] text-gray-500 hover:text-gray-300 hover:border-[#2a2a2a]'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tipo de evento ── */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de evento</label>
              <div className="flex flex-wrap gap-2">
                {TIPO_EVENTO_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, tipoEvento: t.value }))}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      form.tipoEvento === t.value
                        ? 'bg-[#B3985B]/15 border-[#B3985B]/50 text-[#B3985B]'
                        : 'bg-[#111] border-[#1e1e1e] text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Fecha del evento ── */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha estimada del evento</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fechaSinDefinir ? '' : form.fechaEvento}
                  disabled={fechaSinDefinir}
                  onChange={e => setForm(p => ({ ...p, fechaEvento: e.target.value }))}
                  className={`${inputCls} flex-1 disabled:opacity-30`}
                />
                <button
                  type="button"
                  onClick={() => { setFechaSinDefinir(p => !p); setForm(p => ({ ...p, fechaEvento: '' })); }}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    fechaSinDefinir
                      ? 'bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]'
                      : 'bg-[#111] border-[#1e1e1e] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Sin definir
                </button>
              </div>
            </div>

            {/* ── Notas iniciales ── */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Lo que busca / contexto</label>
              <textarea
                value={form.notasIniciales}
                onChange={e => setForm(p => ({ ...p, notasIniciales: e.target.value }))}
                placeholder="Boda en junio, busca sonido e iluminación…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* ── Guardar ── */}
            <button
              onClick={guardar}
              disabled={guardando || !canSubmit}
              className="w-full px-4 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40 hover:bg-[#c9aa6b] transition-colors mt-2"
            >
              {guardando ? 'Registrando…' : 'Registrar prospecto'}
            </button>
          </div>
        ) : (
          <div className="mt-6 px-1 pb-6 space-y-3">
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4">
              <p className="text-emerald-400 font-semibold text-sm">✓ Prospecto registrado</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {creado.nombre} se guardó como prospecto — sin trato activo todavía.
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Ve a la lista de Prospectos para iniciar el seguimiento.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { reset(); onLeadCreated?.(); }}
                className="flex-1 px-4 py-2 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-sm font-medium hover:bg-[#B3985B]/25 transition-colors"
              >
                + Otro prospecto
              </button>
              <button
                onClick={() => { reset(); onOpenChange(false); }}
                className="flex-1 px-4 py-2 rounded-lg border border-[#222] text-gray-300 text-sm hover:text-white hover:border-[#333] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
