'use client';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/Toast';

export interface SeguimientoDrawerProps {
  open: boolean;
  onClose: () => void;
  tratoId: string;
  tratoNombre: string;
  onSaved?: (seguimiento: Record<string, unknown>) => void;
}

const TIPOS = [
  { value: 'primer_contacto', label: 'Primer contacto' },
  { value: 'llamada_descubrimiento', label: 'Llamada de descubrimiento' },
  { value: 'envio_cotizacion', label: 'Envío de cotización' },
  { value: 'seguimiento_postcotizacion', label: 'Seguimiento post-cotización' },
  { value: 'cierre', label: 'Cierre' },
  { value: 'otro', label: 'Otro' },
];

const CANALES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'email', label: 'Email' },
];

export function SeguimientoDrawer({ open, onClose, tratoId, tratoNombre, onSaved }: SeguimientoDrawerProps) {
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];
  const [tipo, setTipo] = useState('primer_contacto');
  const [canal, setCanal] = useState('whatsapp');
  const [fecha, setFecha] = useState(today);
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!fecha) return;
    setLoading(true);
    try {
      const res = await fetch('/api/seguimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tratoId,
          titulo: TIPOS.find(t => t.value === tipo)?.label ?? tipo,
          canal,
          fechaProgramada: new Date(fecha + 'T10:00:00').toISOString(),
          nota: nota || undefined,
          tipo: 'manual',
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const data = await res.json();
      toast.success('Seguimiento registrado');
      onSaved?.(data.seguimiento ?? data);
      onClose();
      // Reset form
      setTipo('primer_contacto');
      setCanal('whatsapp');
      setFecha(today);
      setNota('');
    } catch {
      toast.error('Error al guardar el seguimiento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[400px] bg-[#111] border-l border-[#222] flex flex-col p-0">
        <SheetHeader className="px-6 py-5 border-b border-[#222]">
          <SheetTitle className="text-white text-[15px] font-medium">
            Nuevo seguimiento
          </SheetTitle>
          <p className="text-[#555] text-[12px] mt-0.5 truncate">{tratoNombre}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-[11px] text-[#666] uppercase tracking-wider mb-2">Tipo</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/60"
            >
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Canal */}
          <div>
            <label className="block text-[11px] text-[#666] uppercase tracking-wider mb-2">Canal</label>
            <div className="flex gap-2 flex-wrap">
              {CANALES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCanal(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                    canal === c.value
                      ? 'bg-[#B3985B]/15 border-[#B3985B]/60 text-[#B3985B]'
                      : 'bg-transparent border-[#2a2a2a] text-[#666] hover:border-[#444]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-[11px] text-[#666] uppercase tracking-wider mb-2">Fecha programada</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#B3985B]/60"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[11px] text-[#666] uppercase tracking-wider mb-2">Notas / contexto</label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="¿Qué se va a hacer o qué pasó?"
              rows={4}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#444] resize-none focus:outline-none focus:border-[#B3985B]/60"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#222]">
          <button
            onClick={handleSave}
            disabled={loading || !fecha}
            className="w-full py-3 rounded-xl bg-[#B3985B] text-black font-semibold text-[14px] hover:bg-[#C9A84C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar seguimiento'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
