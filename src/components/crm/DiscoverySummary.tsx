import { Trato } from "@prisma/client";

export default function DiscoverySummary({ trato }: { trato: any }) {
  if (!trato) return null;

  const cliente = trato.cliente || {};
  
  // Parse ideasReferencias which holds renta details for RENTA type
  let rentaDetails = null;
  if (trato.tipoServicio === "RENTA" && trato.ideasReferencias) {
    try {
      rentaDetails = JSON.parse(trato.ideasReferencias);
    } catch (e) {
      // ignore
    }
  }

  // Parse serviciosInteres
  let serviciosInteres: string[] = [];
  if (trato.serviciosInteres) {
    try {
      serviciosInteres = JSON.parse(trato.serviciosInteres);
    } catch(e) {
      // ignore
    }
  }

  const formatTime = (timeStr?: string | null) => timeStr || 'No definido';
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr || dateStr === "por-definir") return 'Por definir';
    return dateStr;
  };

  const RENTA_MODALIDADES: Record<string, string> = {
    "SOLO_RENTA": "Solo renta",
    "RENTA_ENTREGA": "Renta + entrega",
    "RENTA_MONTAJE": "Renta + montaje",
    "RENTA_FULL": "Renta + operación",
  };

  const isRenta = trato.tipoServicio === "RENTA";

  return (
    <div className="space-y-4">
      {/* 1. Contacto */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold mb-3">1. Contacto</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Nombre</span>
            <span className="text-white font-medium">{cliente.nombre || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Empresa</span>
            <span className="text-white">{cliente.empresa || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Teléfono</span>
            <span className="text-white">{cliente.telefono || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Correo</span>
            <span className="text-white">{cliente.correo || "-"}</span>
          </div>
        </div>
      </div>

      {/* 2. Info Básica */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold mb-3">2. Info Básica</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Tipo de Evento</span>
            <span className="text-white font-medium">{trato.tipoEvento}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Tipo de Servicio</span>
            <span className="text-white font-medium">{trato.tipoServicio === "PRODUCCION_TECNICA" ? "Producción Técnica" : (trato.tipoServicio || "-")}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 text-xs block mb-0.5">Subtipo(s) de Evento</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {trato.subtipoEvento ? trato.subtipoEvento.split(', ').map((st: string) => (
                <span key={st} className="px-2 py-0.5 rounded-md bg-[#222] border border-[#333] text-gray-300 text-xs">{st}</span>
              )) : <span className="text-gray-500">-</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detalles */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold mb-3">3. Detalles y Requerimientos</h3>
        
        {isRenta && rentaDetails ? (
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
            <div className="col-span-2">
              <span className="text-gray-500 text-xs block mb-0.5">Modalidad de servicio</span>
              <span className="text-white">{RENTA_MODALIDADES[rentaDetails.modalidadServicio] || rentaDetails.modalidadServicio || "-"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 text-xs block mb-0.5">Equipos solicitados</span>
              <span className="text-white whitespace-pre-wrap">{rentaDetails.descripcionEquipos || "-"}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm mb-4">
            <div>
              <span className="text-gray-500 text-xs block mb-1">Categorías de interés</span>
              <div className="flex flex-wrap gap-2">
                {serviciosInteres.length > 0 ? serviciosInteres.map(si => (
                  <span key={si} className="px-2 py-0.5 rounded-md bg-[#222] border border-[#333] text-gray-300 text-xs">{si}</span>
                )) : <span className="text-gray-500">-</span>}
              </div>
            </div>
            {trato.equiposInteres && (
              <div>
                <span className="text-gray-500 text-xs block mb-0.5">Equipos específicos solicitados</span>
                <p className="text-white">{trato.equiposInteres}</p>
              </div>
            )}
            {trato.notas && (
              <div>
                <span className="text-gray-500 text-xs block mb-0.5">Notas adicionales</span>
                <p className="text-white whitespace-pre-wrap">{trato.notas}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Operativo */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold mb-3">4. Operativo y Logística</h3>
        
        {isRenta && rentaDetails ? (
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Fecha de Entrega</span>
              <span className="text-white">{formatDate(rentaDetails.fechaEntrega)} {formatTime(rentaDetails.horaEntrega)}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Fecha de Devolución</span>
              <span className="text-white">{formatDate(rentaDetails.fechaDevolucion)} {formatTime(rentaDetails.horaDevolucion)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 text-xs block mb-0.5">Dirección de Entrega</span>
              <span className="text-white">{rentaDetails.direccionEntrega || "En bodega"}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Lugar del Evento</span>
              <span className="text-white">{trato.lugarEstimado || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Fecha Estimada</span>
              <span className="text-white">{formatDate(trato.fechaEventoEstimada)}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Horario del evento</span>
              <span className="text-white">{formatTime(trato.horaInicioEvento)} a {formatTime(trato.horaFinEvento)}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Ventana de montaje</span>
              <span className="text-white">{formatTime(trato.ventanaMontajeInicio)} a {formatTime(trato.ventanaMontajeFin)}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Contacto en Venue</span>
              <span className="text-white">{trato.contactoVenueNombre || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">Teléfono Venue</span>
              <span className="text-white">{trato.contactoVenueTelefono || "-"}</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Comercial */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold mb-3">5. Comercial</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Presupuesto Estimado</span>
            <span className="text-white">{trato.presupuestoEstimado ? `$${trato.presupuestoEstimado.toLocaleString()}` : "-"}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Aplica Trade</span>
            <span className="text-white">{trato.tradeCalificado ? "Sí" : "No"}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Se requiere render</span>
            <span className="text-white">{trato.realizarRender ? "Sí" : "No"}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
