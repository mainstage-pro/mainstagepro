// src/lib/proyecto-documentos.ts
// Pure function — no DB calls
//
// Candados de descarga: qué información debe existir para que un documento del
// proyecto tenga sentido. `bloqueos` impide la descarga (el PDF saldría vacío o
// sería peligroso operarlo); `advertencias` deja descargar pero avisa.

export type TipoDocumento =
  | "FICHA_OPERATIVA"
  | "FICHA_CLIENTE"
  | "HOJA_ENTREGA"
  | "RIDER_CARGA"
  | "BRIEF_TECNICO";

export const DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  FICHA_OPERATIVA: "Ficha operativa",
  FICHA_CLIENTE: "Confirmación al cliente",
  HOJA_ENTREGA: "Hoja de entrega",
  RIDER_CARGA: "Rider de carga",
  BRIEF_TECNICO: "Info para técnicos",
};

export interface ProyectoDocumentoInput {
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  fechaMontaje: Date | string | null;
  horaInicioMontaje: string | null;
  horaInicioEvento: string | null;
  horaInicio: string | null;
  llamadoBodega: Date | string | null;
  lugarLlamado: string | null;
  /** Coordinador interno del proyecto (User.name). */
  encargadoNombre: string | null;
  encargadoLugar: string | null;
  encargadoCliente: string | null;
  contactosEmergencia: string | null;
  /** Bloques de la cronología unificada (montaje, soundcheck, programa, proveedores, desmontaje). */
  bloquesCronologia: number;
  /** JSON de logística de renta, ya resuelto el fallback a trato.ideasReferencias. */
  logisticaRenta: string | null;
  equiposCount: number;
  /** Renglones de personal con técnico ya asignado (los únicos que salen en los PDFs). */
  personalCount: number;
  /** Renglones de personal que siguen siendo un hueco sin técnico. */
  personalSinAsignar: number;
  personalSinRol: number;
  equiposSinConfirmar: number;
}

export interface RequisitosDocumento {
  listo: boolean;
  bloqueos: string[];
  advertencias: string[];
}

const falta = (s: string | null | undefined) => !s || !s.trim();

function modalidadEntrega(raw: string | null): { modalidad: string; direccion: string } {
  if (!raw) return { modalidad: "", direccion: "" };
  try {
    const d = JSON.parse(raw) as Record<string, string>;
    return {
      modalidad: d.entrega ?? d.modalidadEntrega ?? "",
      direccion: d.direccionEntrega ?? "",
    };
  } catch {
    return { modalidad: "", direccion: "" };
  }
}

export function requisitosDocumento(
  tipo: TipoDocumento,
  p: ProyectoDocumentoInput
): RequisitosDocumento {
  const bloqueos: string[] = [];
  const advertencias: string[] = [];

  const sinVenue = falta(p.lugarEvento);
  const sinComoLlegar = falta(p.direccionVenue) && falta(p.linkMaps);
  const sinMontaje = !p.fechaMontaje || falta(p.horaInicioMontaje);
  const sinContactoEnSitio = falta(p.encargadoLugar) && falta(p.encargadoCliente);

  switch (tipo) {
    case "HOJA_ENTREGA": {
      const { modalidad, direccion } = modalidadEntrega(p.logisticaRenta);
      if (p.equiposCount === 0) bloqueos.push("No hay equipo cargado: la hoja saldría en blanco");
      if (!modalidad) bloqueos.push("Falta definir la modalidad de entrega en logística de renta");
      if (modalidad.startsWith("ENTREGA_") && falta(direccion))
        bloqueos.push("Falta la dirección de entrega");
      if (p.equiposSinConfirmar > 0)
        advertencias.push(`${p.equiposSinConfirmar} equipo(s) sin confirmar`);
      break;
    }

    case "RIDER_CARGA": {
      if (p.equiposCount === 0) bloqueos.push("No hay equipo cargado: no hay nada que cargar");
      if (sinVenue) advertencias.push("Falta el lugar del evento");
      if (sinMontaje) advertencias.push("Falta fecha u hora de montaje");
      if (p.equiposSinConfirmar > 0)
        advertencias.push(`${p.equiposSinConfirmar} equipo(s) sin confirmar`);
      break;
    }

    case "FICHA_CLIENTE": {
      if (sinVenue) bloqueos.push("Falta el lugar del evento");
      if (p.equiposCount === 0) bloqueos.push("No hay equipo cargado: el cliente no vería qué contrató");
      if (falta(p.horaInicioEvento) && falta(p.horaInicio))
        bloqueos.push("Falta la hora de inicio del evento");
      if (sinComoLlegar) advertencias.push("Falta dirección del venue o link de Maps");
      if (falta(p.encargadoNombre)) advertencias.push("Sin coordinador asignado");
      break;
    }

    case "FICHA_OPERATIVA": {
      if (sinVenue) bloqueos.push("Falta el lugar del evento");
      if (p.equiposCount === 0) bloqueos.push("No hay equipo cargado");
      if (p.personalCount === 0) bloqueos.push("No hay técnicos asignados al proyecto");
      if (falta(p.encargadoNombre)) bloqueos.push("Falta el coordinador de producción");
      if (sinComoLlegar) bloqueos.push("Falta dirección del venue o link de Maps");
      if (sinMontaje) bloqueos.push("Falta fecha u hora de montaje");
      if (sinContactoEnSitio) advertencias.push("Sin encargado del lugar ni del cliente");
      if (p.bloquesCronologia === 0) advertencias.push("Cronología vacía");
      if (p.personalSinAsignar > 0)
        advertencias.push(`${p.personalSinAsignar} lugar(es) de personal sin técnico`);
      if (p.personalSinRol > 0) advertencias.push(`${p.personalSinRol} técnico(s) sin rol asignado`);
      if (p.equiposSinConfirmar > 0)
        advertencias.push(`${p.equiposSinConfirmar} equipo(s) sin confirmar`);
      if (falta(p.contactosEmergencia)) advertencias.push("Sin contactos de emergencia");
      break;
    }

    case "BRIEF_TECNICO": {
      if (!p.llamadoBodega && falta(p.lugarLlamado))
        bloqueos.push("Falta el llamado: hora y lugar de presentación");
      if (sinVenue) bloqueos.push("Falta el lugar del evento");
      if (sinComoLlegar) bloqueos.push("Falta dirección del venue o link de Maps");
      if (sinMontaje) bloqueos.push("Falta fecha u hora de montaje");
      if (p.personalCount === 0) advertencias.push("No hay técnicos asignados a quién enviárselo");
      if (p.personalSinAsignar > 0)
        advertencias.push(`${p.personalSinAsignar} lugar(es) de personal sin técnico`);
      if (sinContactoEnSitio) advertencias.push("Sin encargado del lugar ni del cliente");
      if (falta(p.contactosEmergencia)) advertencias.push("Sin contactos de emergencia");
      break;
    }
  }

  return { listo: bloqueos.length === 0, bloqueos, advertencias };
}
