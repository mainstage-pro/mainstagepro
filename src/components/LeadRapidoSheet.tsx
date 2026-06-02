'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/Toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
}

export function LeadRapidoSheet({ open, onOpenChange, onLeadCreated }: Props) {
  const toast = useToast();

  const [leadForm, setLeadForm] = useState({
    nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '',
    notasIniciales: '', fechaProximaAccion: '',
  });
  const [guardandoLead, setGuardandoLead] = useState(false);
  const [leadCreado, setLeadCreado] = useState<{ id: string; nombre: string } | null>(null);
  const [showSeguimientoInline, setShowSeguimientoInline] = useState(false);
  const [seguimientoInlineForm, setSeguimientoInlineForm] = useState({ fecha: '', nota: '' });
  const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);

  function resetLocalState() {
    setLeadCreado(null);
    setShowSeguimientoInline(false);
    setLeadForm({ nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '', notasIniciales: '', fechaProximaAccion: '' });
    setSeguimientoInlineForm({ fecha: '', nota: '' });
  }

  async function crearLead() {
    if (!leadForm.nombre.trim() || !leadForm.origenLead) return;
    setGuardandoLead(true);
    try {
      const body: Record<string, unknown> = {
        clienteNuevo: { nombre: leadForm.nombre.trim(), telefono: leadForm.telefono || null },
        tipoProspecto: 'NURTURING',
        origenLead: leadForm.origenLead,
        tipoEvento: leadForm.tipoEvento || 'OTRO',
        nombreEvento: leadForm.notasIniciales.trim() || 'Lead sin evento definido',
      };
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
      setLeadCreado({ id: trato.id, nombre: leadForm.nombre.trim() });
      setLeadForm({ nombre: '', telefono: '', origenLead: 'ORGANICO', tipoEvento: '', notasIniciales: '', fechaProximaAccion: '' });
    } finally {
      setGuardandoLead(false);
    }
  }

  async function agregarSeguimientoInline() {
    if (!leadCreado || !seguimientoInlineForm.fecha) return;
    setGuardandoSeguimiento(true);
    try {
      await fetch('/api/seguimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tratoId: leadCreado.id,
          tipo: 'manual',
          canal: 'whatsapp',
          titulo: 'Seguimiento programado',
          fechaProgramada: seguimientoInlineForm.fecha,
          nota: seguimientoInlineForm.nota || null,
        }),
      });
      toast.success('Seguimiento creado ✓');
      resetLocalState();
      onOpenChange(false);
    } finally {
      setGuardandoSeguimiento(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen: boolean) => { onOpenChange(isOpen); if (!isOpen) resetLocalState(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-[#0d0d0d] border-l border-[#1e1e1e]">
        <SheetHeader>
          <SheetTitle className="text-white">Registrar lead</SheetTitle>
          <p className="text-gray-500 text-xs">Se guardará en el CRM automáticamente</p>
        </SheetHeader>

        {!leadCreado ? (
          <div className="mt-6 space-y-4 px-4 pb-6">
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
            <button onClick={crearLead} disabled={guardandoLead || !leadForm.nombre.trim()}
              className="w-full px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40 mt-2">
              {guardandoLead ? 'Registrando...' : 'Registrar lead'}
            </button>
          </div>
        ) : (
          <div className="mt-6 px-4 pb-6">
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4 mb-4">
              <p className="text-emerald-400 font-medium text-sm">✓ Lead registrado</p>
              <p className="text-gray-400 text-xs mt-0.5">{leadCreado.nombre} se guardó en el CRM</p>
            </div>
            {!showSeguimientoInline ? (
              <div>
                <p className="text-gray-300 text-sm mb-3">¿Agregar seguimiento ahora?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowSeguimientoInline(true)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold">Sí, agregar</button>
                  <button onClick={() => { resetLocalState(); onOpenChange(false); }}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#2a2a2a] text-gray-400 text-sm hover:text-white">No, cerrar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Fecha del seguimiento *</label>
                  <input type="date" value={seguimientoInlineForm.fecha}
                    onChange={e => setSeguimientoInlineForm(p => ({ ...p, fecha: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nota</label>
                  <textarea value={seguimientoInlineForm.nota}
                    onChange={e => setSeguimientoInlineForm(p => ({ ...p, nota: e.target.value }))}
                    placeholder="Llamar para confirmar disponibilidad..."
                    rows={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
                <button onClick={agregarSeguimientoInline} disabled={guardandoSeguimiento || !seguimientoInlineForm.fecha}
                  className="w-full px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">
                  {guardandoSeguimiento ? 'Guardando...' : 'Guardar seguimiento'}
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
