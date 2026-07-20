"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link2, PartyPopper } from "lucide-react";

type Trato = {
  id: string;
  etapa: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  lugarEstimado: string | null;
  fechaEventoEstimada: string | null;
  presupuestoEstimado: number | null;
  asistentesEstimados: number | null;
  briefRecibidoEn: string | null;
  clienteNombre: string;
  clienteEmpresa: string | null;
};

const TIPOS_EVENTO = [
  "BODA", "XV_ANOS", "CORPORATIVO", "SOCIAL", "CONCIERTO", "GRADUACION",
  "CUMPLEANOS", "ANIVERSARIO", "CONFERENCIA", "OTRO",
];

const TIPO_LABEL: Record<string, string> = {
  BODA: "Boda", XV_ANOS: "XV Años", CORPORATIVO: "Corporativo", SOCIAL: "Social",
  CONCIERTO: "Concierto", GRADUACION: "Graduación", CUMPLEANOS: "Cumpleaños",
  ANIVERSARIO: "Aniversario", CONFERENCIA: "Conferencia", OTRO: "Otro",
};

export default function BriefPage() {
  const { token } = useParams<{ token: string }>();
  const [trato, setTrato] = useState<Trato | null>(null);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [sending, setSending] = useState(false);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState("");
  const [asistentes, setAsistentes] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    fetch(`/api/brief/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const t = d.trato as Trato;
        setTrato(t);
        if (t.briefRecibidoEn) { setEnviado(true); return; }
        // Pre-fill from trato
        setNombre(t.nombreEvento ?? "");
        setTipo(t.tipoEvento ?? "");
        setLugar(t.lugarEstimado ?? "");
        setFecha(t.fechaEventoEstimada ? t.fechaEventoEstimada.split("T")[0] : "");
        setAsistentes(t.asistentesEstimados ? String(t.asistentesEstimados) : "");
        setPresupuesto(t.presupuestoEstimado ? String(t.presupuestoEstimado) : "");
      })
      .catch(() => setError("No se pudo cargar el formulario."));
  }, [token]);

  async function enviar() {
    setSending(true);
    const res = await fetch(`/api/brief/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombreEvento: nombre || undefined,
        tipoEvento: tipo || undefined,
        lugarEstimado: lugar || undefined,
        fechaEventoEstimada: fecha ? new Date(fecha).toISOString() : undefined,
        asistentesEstimados: asistentes ? parseInt(asistentes) : undefined,
        presupuestoEstimado: presupuesto ? parseFloat(presupuesto) : undefined,
        horaInicioEvento: horaInicio || undefined,
        horaFinEvento: horaFin || undefined,
        notas: notas || undefined,
      }),
    });
    setSending(false);
    if (res.ok) setEnviado(true);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="flex justify-center mb-4"><Link2 strokeWidth={1.75} className="w-9 h-9 text-[#666]" /></div>
          <p className="text-white text-lg font-semibold mb-2">Link inválido</p>
          <p className="text-[#666] text-sm">Este enlace no es válido o ya expiró.</p>
        </div>
      </div>
    );
  }

  if (!trato) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#555] text-sm">Cargando…</p>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-5"><PartyPopper strokeWidth={1.75} className="w-11 h-11 text-[#B3985B]" /></div>
          <p className="text-white text-xl font-bold mb-2">¡Información recibida!</p>
          <p className="text-[#666] text-sm">
            Gracias {trato.clienteNombre}. Tu equipo de Mainstage revisará los detalles y se pondrá en contacto pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <div className="px-5 py-6 border-b border-[#1a1a1a]">
        <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-1">Mainstage Pro</p>
        <h1 className="text-white text-xl font-bold">Brief del evento</h1>
        <p className="text-[#666] text-sm mt-1">
          Hola {trato.clienteNombre}, comparte los detalles de tu evento para que podamos preparar la mejor propuesta.
        </p>
      </div>

      <div className="px-5 pt-6 max-w-xl mx-auto space-y-5">
        {/* Nombre del evento */}
        <div>
          <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Nombre o descripción del evento</label>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="ej: Boda García & López"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        {/* Tipo de evento */}
        <div>
          <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Tipo de evento</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TIPOS_EVENTO.map(t => (
              <button
                key={t}
                onClick={() => setTipo(t === tipo ? "" : t)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  tipo === t
                    ? "bg-[#B3985B] border-[#B3985B] text-black"
                    : "bg-[#111] border-[#2a2a2a] text-[#999] hover:text-white hover:border-[#444]"
                }`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha */}
        <div>
          <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Fecha del evento</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        {/* Horarios */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Hora inicio</label>
            <input
              type="time"
              value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <div>
            <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Hora fin</label>
            <input
              type="time"
              value={horaFin}
              onChange={e => setHoraFin(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
        </div>

        {/* Lugar */}
        <div>
          <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Lugar o venue</label>
          <input
            value={lugar}
            onChange={e => setLugar(e.target.value)}
            placeholder="ej: Hacienda San José, Guadalajara"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        {/* Asistentes */}
        <div>
          <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Número de invitados (estimado)</label>
          <input
            type="number"
            value={asistentes}
            onChange={e => setAsistentes(e.target.value)}
            placeholder="ej: 250"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        {/* Presupuesto */}
        <div>
          <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Presupuesto estimado (MXN)</label>
          <input
            type="number"
            value={presupuesto}
            onChange={e => setPresupuesto(e.target.value)}
            placeholder="ej: 150000"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>

        {/* Notas adicionales */}
        <div>
          <label className="text-[#999] text-xs uppercase tracking-wider block mb-1.5">Información adicional</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={4}
            placeholder="Cuéntanos más sobre tu evento, requerimientos especiales, inspiraciones, etc."
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
          />
        </div>

        <button
          onClick={enviar}
          disabled={sending}
          className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-base transition-colors"
        >
          {sending ? "Enviando…" : "Enviar información"}
        </button>
      </div>
    </div>
  );
}
