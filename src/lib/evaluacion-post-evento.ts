// Configuración de la "Evaluación Post Evento" (cierre operativo del coordinador).
// Compartida entre el formulario (página) y el resumen dentro del proyecto.

export type RespValor = "si" | "no" | "na";

export type ItemResp = { valor: RespValor | null; comentario: string };

export type EvalPostEventoData = {
  llenadoPorId: string | null;
  llenadoPorNombre: string | null;
  respondidoEn: string | null; // primera vez que se guardó
  actualizadoEn: string | null; // última edición
  items: Record<string, ItemResp>;
  comentariosFinales: string;
};

export type EvalItem = {
  id: string;
  label: string;
  // "si-no": Sí / No · "si-no-na": Sí / No / No fue necesario (documentos opcionales)
  tipo: "si-no" | "si-no-na";
  // Cuando "si" refleja una incidencia (no un logro), lo marcamos para el resumen.
  incidenciaSiSi?: boolean;
};

export type EvalSeccion = {
  id: string;
  titulo: string;
  descripcion?: string;
  items: EvalItem[];
};

export const EVAL_SECCIONES: EvalSeccion[] = [
  {
    id: "operativo",
    titulo: "Cumplimiento operativo",
    descripcion: "Cumplimiento del protocolo del equipo técnico durante la jornada.",
    items: [
      { id: "llamado", label: "Se llegó al llamado en tiempo y forma", tipo: "si-no" },
      { id: "uniforme", label: "El equipo técnico portó uniforme (o en su defecto ropa negra)", tipo: "si-no" },
      { id: "viaticos", label: "Se solicitaron los viáticos correspondientes", tipo: "si-no" },
      { id: "celular", label: "Se hizo uso del celular de la empresa", tipo: "si-no" },
      { id: "reporteMovimientos", label: "Se reportó cada movimiento importante (llegada a venue, inicio de montaje, inicio del evento, fin del evento, llegada a bodega y término de operación)", tipo: "si-no" },
      { id: "evidenciaFoto", label: "Se cumplió con la evidencia fotográfica (montaje, operación, momentos importantes y fallas, o se marcó que no hubo fallas)", tipo: "si-no" },
    ],
  },
  {
    id: "montaje",
    titulo: "Montaje y ejecución",
    descripcion: "Desarrollo del montaje, el evento y el cierre en sitio.",
    items: [
      { id: "montajeInicio", label: "El montaje inició en tiempo", tipo: "si-no" },
      { id: "montajeTermino", label: "El montaje terminó en tiempo", tipo: "si-no" },
      { id: "pruebas", label: "Se pudieron realizar pruebas", tipo: "si-no" },
      { id: "eventoInicio", label: "El evento inició en tiempo y forma", tipo: "si-no" },
      { id: "incidenciaCliente", label: "Hubo incidencia con el cliente (previo, durante o post evento)", tipo: "si-no", incidenciaSiSi: true },
      { id: "incidenciaEquipo", label: "Hubo incidencia con algún equipo (falla o mala operación)", tipo: "si-no", incidenciaSiSi: true },
      { id: "eventoEnTiempo", label: "El evento terminó en tiempo (no se extendió)", tipo: "si-no" },
      { id: "equipoOrdenado", label: "El equipo quedó ordenado en zona de carga/descarga", tipo: "si-no" },
    ],
  },
  {
    id: "documentos",
    titulo: "Documentos operativos",
    descripcion: "Documentación técnica generada para el evento. Render, lighting plot y stage plot son opcionales.",
    items: [
      { id: "riderCarga", label: "Se generó el rider de carga", tipo: "si-no" },
      { id: "fichaOperativa", label: "Se generó la ficha técnica / operativa", tipo: "si-no" },
      { id: "render", label: "Render", tipo: "si-no-na" },
      { id: "lightingPlot", label: "Lighting plot", tipo: "si-no-na" },
      { id: "stagePlot", label: "Stage plot", tipo: "si-no-na" },
    ],
  },
];

export const EVAL_ITEMS: EvalItem[] = EVAL_SECCIONES.flatMap((s) => s.items);

export function emptyEvalData(): EvalPostEventoData {
  return {
    llenadoPorId: null,
    llenadoPorNombre: null,
    respondidoEn: null,
    actualizadoEn: null,
    items: {},
    comentariosFinales: "",
  };
}

// Un ítem "requiere respuesta" salvo los opcionales marcados como "No fue necesario".
export function contarRespondidos(items: Record<string, ItemResp>) {
  let respondidos = 0;
  for (const it of EVAL_ITEMS) {
    const v = items?.[it.id]?.valor;
    if (v === "si" || v === "no" || v === "na") respondidos++;
  }
  return { respondidos, total: EVAL_ITEMS.length };
}

// Ítems que representan una incidencia detectada (para destacar en la junta).
export function contarIncidencias(items: Record<string, ItemResp>) {
  let n = 0;
  for (const it of EVAL_ITEMS) {
    const v = items?.[it.id]?.valor;
    if (it.incidenciaSiSi && v === "si") n++;
    else if (!it.incidenciaSiSi && it.tipo === "si-no" && v === "no") n++;
  }
  return n;
}
