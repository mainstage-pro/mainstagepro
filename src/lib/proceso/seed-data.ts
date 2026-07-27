// Estándar del proceso comercial de Mainstage Pro.
// Contenido canónico: los guiones son textos exactos, sin emojis.
// Fuente única para sembrar ProcesoSubetapa / ProcesoPaso / ProcesoRegla.
// Ver src/lib/proceso/seed.ts para la siembra idempotente.

export type PasoSeed = {
  orden: number;
  dia: number;
  diaUrgente?: number;
  titulo: string;
  objetivo: string;
  canal: string;
  herramienta?: string;
  avanzaSubetapaA?: string;
  guion: string;
};

export type SubetapaSeed = {
  etapa: string;
  etapaInterna: string;
  nombre: string;
  descripcion: string;
  orden: number;
  generacionAutomatica: boolean;
  pasos: PasoSeed[];
};

export type ReglaSeed = {
  orden: number;
  categoria: "COMUNICACION" | "CADENCIA";
  texto: string;
};

export const SUBETAPAS_SEED: SubetapaSeed[] = [
  // ─── ETAPA PROSPECCION · Primer contacto ───────────────────────────
  {
    etapa: "PROSPECCION",
    etapaInterna: "PRIMER_CONTACTO",
    nombre: "Primer contacto",
    descripcion: "Nos presentamos, abrimos conversacion y calificamos en que punto esta el prospecto",
    orden: 1,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 0,
        titulo: "Presentarnos",
        objetivo: "Establecer quienes somos antes de pedir nada",
        canal: "WHATSAPP",
        herramienta: "Presentacion Conocenos",
        guion: "Hola [Nombre], soy Mauricio Hernandez, director de Mainstage Pro. Gracias por contactarnos. Te comparto una presentacion breve de quienes somos y lo que hacemos.",
      },
      {
        orden: 2,
        dia: 0,
        titulo: "Abrir conversacion",
        objetivo: "Provocar la primera respuesta sin asumir nada",
        canal: "WHATSAPP",
        guion: "Me interesa conocer un poco mas de ti. Que te llevo a buscarnos?",
      },
      {
        orden: 3,
        dia: 0,
        titulo: "Calificar etapa",
        objetivo: "Rutear el prospecto",
        canal: "WHATSAPP",
        guion: "Una mas para saber como ayudarte mejor. En que punto estas? 1. Explorando opciones. 2. Cotizando con varios proveedores. 3. Listo para decidir. 4. Lo necesito ya.",
      },
    ],
  },
  {
    // ─── ETAPA PROSPECCION ─────────────────────────────────────────────
    etapa: "PROSPECCION",
    etapaInterna: "NURTURING",
    nombre: "Nurturing",
    descripcion: "Solo para prospectos que respondieron Explorando. Sin evento definido.",
    orden: 2,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 0,
        titulo: "Galeria",
        objetivo: "Mostrar nivel de produccion",
        canal: "WHATSAPP",
        herramienta: "Presentacion Galeria",
        guion: "[Nombre], buen dia. Te comparto nuestra galeria de eventos. Ahi puedes ver el tipo de produccion que hacemos y con que nivel trabajamos.",
      },
      {
        orden: 2,
        dia: 7,
        titulo: "Inventario",
        objetivo: "Demostrar capacidad real",
        canal: "WHATSAPP",
        herramienta: "Presentacion Inventario",
        guion: "[Nombre], buen dia. Este es nuestro inventario. Audio, iluminacion, video y montaje, todo propio. Para que tengas referencia de con que contamos.",
      },
      {
        orden: 3,
        dia: 14,
        titulo: "Proyectos",
        objetivo: "Dar prueba y escala",
        canal: "WHATSAPP",
        herramienta: "Presentacion Proyectos",
        guion: "[Nombre], buen dia. Te comparto algunos de los proyectos que hemos producido. Sirve para dimensionar hasta donde podemos llevar un evento.",
      },
      {
        orden: 4,
        dia: 21,
        titulo: "Detectar evento",
        objetivo: "Convertir a trato",
        canal: "WHATSAPP",
        avanzaSubetapaA: "FORMULARIO_ENVIADO",
        guion: "[Nombre], buen dia. Tienes algun evento en puerta que quieras cotizar? Si es asi lo vemos. Si no, quedo al pendiente para cuando llegue el momento.",
      },
      {
        orden: 5,
        dia: 60,
        titulo: "Reingreso",
        objetivo: "Reactivar el ciclo",
        canal: "WHATSAPP",
        guion: "[Nombre], buen dia. Retomo contacto. Traes algo en puerta para este trimestre?",
      },
    ],
  },
  // ─── ETAPA DESCUBRIMIENTO ──────────────────────────────────────────
  {
    etapa: "DESCUBRIMIENTO",
    etapaInterna: "FORMULARIO_ENVIADO",
    nombre: "Formulario enviado",
    descripcion: "Levantamiento de necesidades por formulario o por llamada",
    orden: 1,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 0,
        titulo: "Compartir formulario",
        objetivo: "Levantar necesidades sin llamada",
        canal: "WHATSAPP",
        herramienta: "Formulario de descubrimiento",
        guion: "[Nombre], para armarte una propuesta a la medida necesito entender bien tu evento. Te dejo este formulario, te toma unos minutos. Con esa informacion te preparo algo hecho para lo que necesitas.",
      },
      {
        orden: 2,
        dia: 2,
        diaUrgente: 1,
        titulo: "Seguimiento 1",
        objetivo: "Remover friccion",
        canal: "WHATSAPP",
        guion: "[Nombre], buen dia. Pudiste ver el formulario? Si alguna pregunta no queda clara me dices y la resolvemos.",
      },
      {
        orden: 3,
        dia: 4,
        diaUrgente: 2,
        titulo: "Seguimiento 2",
        objetivo: "Recordar con avance",
        canal: "WHATSAPP",
        guion: "[Nombre], buen dia. Sigo pendiente del formulario. En cuanto lo tenga arranco con tu propuesta.",
      },
      {
        orden: 4,
        dia: 7,
        diaUrgente: 3,
        titulo: "Seguimiento 3",
        objetivo: "Cambiar de canal",
        canal: "WHATSAPP",
        herramienta: "Agenda",
        guion: "[Nombre], buen dia. Si prefieres lo vemos por llamada, son 20 minutos y salimos con todo lo que necesito. Que dia y hora te quedan bien?",
      },
    ],
  },
  // ─── ETAPA OPORTUNIDAD ─────────────────────────────────────────────
  {
    etapa: "OPORTUNIDAD",
    etapaInterna: "PROPUESTA_EN_ELABORACION",
    nombre: "Propuesta en elaboracion",
    descripcion: "Recibir y analizar la informacion de descubrimiento y elaborar la cotizacion",
    orden: 1,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 0,
        titulo: "Acuse de recibo",
        objetivo: "Dar certeza de tiempos",
        canal: "WHATSAPP",
        avanzaSubetapaA: "COTIZACION_ENVIADA",
        guion: "[Nombre], recibi tu informacion. La reviso y te tengo la propuesta el [fecha].",
      },
    ],
  },
  {
    etapa: "OPORTUNIDAD",
    etapaInterna: "COTIZACION_ENVIADA",
    nombre: "Cotizacion enviada",
    descripcion: "Propuesta entregada y ciclo de tres seguimientos",
    orden: 2,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 1,
        diaUrgente: 0,
        titulo: "Enviar cotizacion",
        objetivo: "Entregar propuesta con contexto",
        canal: "WHATSAPP",
        herramienta: "Cotizacion + Presentacion Galeria de servicios similares",
        guion: "[Nombre], aqui esta tu propuesta. Va junto con una presentacion de eventos similares que hemos producido, para que veas en la practica lo que estas leyendo. Cualquier duda me dices y la revisamos.",
      },
      {
        orden: 2,
        dia: 2,
        diaUrgente: 1,
        titulo: "Seguimiento 1",
        objetivo: "Asegurar comprension",
        canal: "WHATSAPP",
        guion: "[Nombre], buen dia. Pudiste revisar la propuesta? Si hay algo que quieras que te explique con mas detalle, con gusto lo vemos.",
      },
      {
        orden: 3,
        dia: 4,
        diaUrgente: 2,
        titulo: "Seguimiento 2",
        objetivo: "Abrir la puerta al ajuste",
        canal: "WHATSAPP",
        guion: "[Nombre], buen dia. La propuesta se puede ajustar. Si hay algo del alcance o del presupuesto que quieras revisar, lo acomodamos a lo que necesitas.",
      },
      {
        orden: 4,
        dia: 8,
        diaUrgente: 4,
        titulo: "Seguimiento 3",
        objetivo: "Definir el siguiente paso",
        canal: "WHATSAPP",
        guion: "[Nombre], buen dia. Como vas con la propuesta? Si necesitas mas tiempo o algo cambio, me dices y lo acomodamos.",
      },
    ],
  },
  {
    etapa: "OPORTUNIDAD",
    etapaInterna: "CAMBIOS_Y_NEGOCIACION",
    nombre: "Cambios y negociacion",
    descripcion: "El cliente pidio ajustes. Los tres pasos son alternativos segun la situacion, no secuenciales.",
    orden: 3,
    generacionAutomatica: false,
    pasos: [
      {
        orden: 1,
        dia: 0,
        titulo: "Pide ajustes",
        objetivo: "Comprometer fecha de reenvio",
        canal: "WHATSAPP",
        guion: "[Nombre], tomo nota de los ajustes. Te reenvio la propuesta actualizada el [fecha].",
      },
      {
        orden: 2,
        dia: 0,
        titulo: "Pide descuento",
        objetivo: "Proteger margen sin perder el trato",
        canal: "WHATSAPP",
        guion: "[Nombre], el precio refleja lo que trae la propuesta. Lo que si puedo hacer es ajustar el alcance a tu presupuesto. Dime tu numero y te digo con claridad que entra y que no.",
      },
      {
        orden: 3,
        dia: 1,
        titulo: "Reenviar cotizacion",
        objetivo: "Reiniciar el ciclo",
        canal: "WHATSAPP",
        herramienta: "Cotizacion v2",
        avanzaSubetapaA: "COTIZACION_ENVIADA",
        guion: "[Nombre], aqui esta la propuesta ajustada con los cambios que platicamos.",
      },
    ],
  },
  // ─── ETAPA VENTA_CERRADA ───────────────────────────────────────────
  {
    etapa: "VENTA_CERRADA",
    etapaInterna: "CONFIRMADA",
    nombre: "Confirmada",
    descripcion: "El cliente confirmo el servicio",
    orden: 1,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 0,
        titulo: "Confirmacion",
        objetivo: "Cerrar formalmente",
        canal: "WHATSAPP",
        avanzaSubetapaA: "FORMALIZADA",
        guion: "[Nombre], confirmado. Reservamos la fecha para tu evento y arrancamos. Hoy mismo te mando recibo y contrato.",
      },
    ],
  },
  {
    etapa: "VENTA_CERRADA",
    etapaInterna: "FORMALIZADA",
    nombre: "Formalizada",
    descripcion: "Recibo, contrato y proyecto creado",
    orden: 2,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 1,
        diaUrgente: 0,
        titulo: "Formalizar",
        objetivo: "Documentar y transferir",
        canal: "WHATSAPP",
        herramienta: "Recibo + Contrato",
        guion: "[Nombre], te comparto recibo y contrato. Con tu autorizacion creo un grupo con el equipo de coordinacion y produccion para dar seguimiento a tu evento.",
      },
    ],
  },
  // ─── ETAPA VENTA_PERDIDA ───────────────────────────────────────────
  {
    etapa: "VENTA_PERDIDA",
    etapaInterna: "PERDIDA",
    nombre: "Perdida",
    descripcion: "Cierre del trato con motivo registrado",
    orden: 1,
    generacionAutomatica: true,
    pasos: [
      {
        orden: 1,
        dia: 0,
        titulo: "Cierre con dignidad",
        objetivo: "Dejar la puerta abierta",
        canal: "WHATSAPP",
        guion: "[Nombre], entiendo. Gracias por el tiempo y por considerarnos. Quedo a la orden para lo que venga mas adelante.",
      },
    ],
  },
];

export const REGLAS_SEED: ReglaSeed[] = [
  { orden: 1, categoria: "COMUNICACION", texto: "Maximo tres lineas por mensaje. Si necesita mas, es una llamada." },
  { orden: 2, categoria: "COMUNICACION", texto: "Cada mensaje aporta algo nuevo. Un contenido, una pregunta o una definicion de tiempo. Nunca dando seguimiento." },
  { orden: 3, categoria: "COMUNICACION", texto: "Siempre cierra con pregunta o accion. Un mensaje sin cierre no genera respuesta." },
  { orden: 4, categoria: "COMUNICACION", texto: "Siempre dejas margen. Ofreces tiempo, ajuste o alternativa. Nunca pides una definicion forzada." },
  { orden: 5, categoria: "COMUNICACION", texto: "Saludo breve en cada contacto nuevo. Cada mensaje es un dia distinto, no la continuacion del anterior." },
  { orden: 6, categoria: "COMUNICACION", texto: "Sin emojis, sin adornos, sin espero te encuentres bien. El tono es de director, no de call center." },
  { orden: 7, categoria: "COMUNICACION", texto: "Nunca bajas precio, ajustas alcance." },
  { orden: 8, categoria: "COMUNICACION", texto: "Nombre propio en todos los mensajes. Es la diferencia entre un contacto y un envio masivo." },
  { orden: 9, categoria: "CADENCIA", texto: "Dia 0 es el dia que el trato entra a esa etapa, no el dia que entro el prospecto." },
  { orden: 10, categoria: "CADENCIA", texto: "Cada reenvio de cotizacion reinicia el ciclo: vuelve a dia 1 y se reagendan los tres seguimientos." },
  { orden: 11, categoria: "CADENCIA", texto: "Ninguna oportunidad sin fecha de proxima accion. Sin fecha, no hay etapa." },
  { orden: 12, categoria: "CADENCIA", texto: "Cadencia urgente si se califica como urgente o faltan menos de 15 dias para el evento. Mismos guiones, mitad de tiempos." },
  { orden: 13, categoria: "CADENCIA", texto: "Nurturing no tiene version urgente: quien esta explorando no es urgente por definicion." },
];
