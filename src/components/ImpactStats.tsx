interface Props {
  eventosHoy: number;
  eventosEnCurso: number;
  eventosEsteAno: number;
  totalClientes: number;
  anosOperando: number;
}

export default function ImpactStats({ eventosHoy, eventosEnCurso, eventosEsteAno, totalClientes, anosOperando }: Props) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">Nuestro impacto</p>
        {(eventosHoy > 0 || eventosEnCurso > 0) && (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-400 bg-green-900/20 border border-green-800/30 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {eventosEnCurso > 0 ? `${eventosEnCurso} evento${eventosEnCurso > 1 ? "s" : ""} en curso` : `${eventosHoy} evento${eventosHoy > 1 ? "s" : ""} hoy`}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-bold text-white">{eventosEsteAno}</p>
          <p className="text-[#555] text-[11px] mt-0.5">eventos este año</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{totalClientes}</p>
          <p className="text-[#555] text-[11px] mt-0.5">clientes confiaron en nosotros</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#B3985B]">{anosOperando}</p>
          <p className="text-[#555] text-[11px] mt-0.5">años creando experiencias</p>
        </div>
      </div>
      {eventosHoy === 0 && eventosEnCurso === 0 && (
        <p className="text-[#333] text-[11px] mt-3 italic">
          Hoy construimos lo que mañana se convierte en un evento memorable.
        </p>
      )}
    </div>
  );
}
