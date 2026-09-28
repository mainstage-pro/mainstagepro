// src/lib/solicitud-cliente.ts
// Pure function — no DB calls
//
// Lo que nos falta y sólo el cliente (o el venue) puede contestar.
//
// Los candados de `proyecto-documentos.ts` dicen qué le falta al documento; esto
// dice qué hay que *preguntar*, y lo deja escrito para mandarse tal cual. Es la
// diferencia entre enterarse del hueco el día del montaje y cerrarlo en
// preproducción.

export type SolicitudInput = {
  lugarEvento: string | null;
  direccionVenue: string | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  indicacionesAcceso: string | null;
  encargadoCliente: string | null;
  encargadoClienteContacto: string | null;
  encargadoLugar: string | null;
  encargadoLugarContacto: string | null;
  briefAcomodo: string | null;
  briefRestricciones: string | null;
  /** true si el proyecto lleva entarimado: entonces aplican medidas y bajadas. */
  llevaEscenario: boolean;
  escenarioMedidas: string | null;
  escenarioAccesos: string | null;
};

export type PreguntaCliente = {
  /** Campo del proyecto que se llena con la respuesta. */
  campo: string;
  /** La pregunta redactada como se le manda al cliente. */
  pregunta: string;
};

const vacio = (v: string | null | undefined) => !v || !v.trim();

/**
 * Sólo lo que el cliente puede contestar: nada de huecos internos (quién
 * coordina, qué técnico falta). Si se mezclan, el mensaje deja de ser enviable.
 */
export function preguntasAlCliente(p: SolicitudInput): PreguntaCliente[] {
  const q: PreguntaCliente[] = [];

  if (vacio(p.lugarEvento))
    q.push({ campo: "lugarEvento", pregunta: "¿En qué salón o venue es el evento?" });
  if (vacio(p.direccionVenue))
    q.push({ campo: "direccionVenue", pregunta: "¿Cuál es la dirección exacta del lugar?" });
  if (vacio(p.horaInicioEvento) || vacio(p.horaFinEvento))
    q.push({ campo: "horaInicioEvento", pregunta: "¿A qué hora arranca y a qué hora termina el evento?" });
  if (vacio(p.indicacionesAcceso))
    q.push({
      campo: "indicacionesAcceso",
      pregunta: "¿A partir de qué hora nos dejan entrar a montar y por dónde se descarga el equipo?",
    });
  if (vacio(p.encargadoLugar) || vacio(p.encargadoLugarContacto))
    q.push({
      campo: "encargadoLugar",
      pregunta: "¿Quién es el encargado del lugar el día del evento y cuál es su teléfono?",
    });
  if (vacio(p.encargadoCliente) || vacio(p.encargadoClienteContacto))
    q.push({
      campo: "encargadoCliente",
      pregunta: "¿Con quién de su equipo nos entendemos el día del evento y cuál es su teléfono?",
    });
  if (vacio(p.briefAcomodo))
    q.push({
      campo: "briefAcomodo",
      pregunta: "¿Cómo queda el acomodo del salón? (dónde va el escenario, la pista y las mesas)",
    });
  if (vacio(p.briefRestricciones))
    q.push({
      campo: "briefRestricciones",
      pregunta: "¿Hay horario de corte de ruido, límite de carga o alguna restricción del lugar?",
    });

  if (p.llevaEscenario) {
    if (vacio(p.escenarioMedidas))
      q.push({ campo: "escenarioMedidas", pregunta: "¿De qué medida y altura va el escenario?" });
    if (vacio(p.escenarioAccesos))
      q.push({
        campo: "escenarioAccesos",
        pregunta: "¿Cuántas escaleras lleva el escenario y de qué lado las quieren?",
      });
  }

  return q;
}

/**
 * El mensaje listo para pegar en WhatsApp o correo. Se manda tal cual: si hay
 * que reescribirlo, nadie lo manda.
 */
export function textoSolicitud(
  evento: { nombre: string; numeroProyecto: string; fechaTexto: string | null },
  preguntas: PreguntaCliente[]
): string {
  if (preguntas.length === 0) return "";
  const encabezado = [
    `Hola, sobre *${evento.nombre}*${evento.fechaTexto ? ` (${evento.fechaTexto})` : ""}:`,
    "",
    "Para dejar cerrada la producción nos faltan estos datos:",
    "",
  ];
  const cuerpo = preguntas.map((x, i) => `${i + 1}. ${x.pregunta}`);
  return [...encabezado, ...cuerpo, "", "En cuanto nos los confirmen lo dejamos programado. Gracias."].join("\n");
}
